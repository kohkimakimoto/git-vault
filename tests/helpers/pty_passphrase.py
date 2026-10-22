#!/usr/bin/env python3
"""Run a command under a PTY and answer age passphrase prompts."""

from __future__ import annotations

import os
import pty
import re
import select
import sys
import time

PROMPT = re.compile(rb"(?:Enter|Confirm) passphrase[^\n]*:\s*")
DEFAULT_TIMEOUT = 30.0


def usage(argv0: str) -> None:
    print(
        f"Usage: {argv0} PASSPHRASE [--stdin FILE] -- COMMAND [ARGS...]",
        file=sys.stderr,
    )


def main(argv: list[str]) -> int:
    if len(argv) < 3 or argv[1] in ("-h", "--help"):
        usage(argv[0])
        return 2
    passphrase = argv[1]
    stdin_path = None
    index = 2
    if index < len(argv) and argv[index] == "--stdin":
        if index + 1 >= len(argv):
            usage(argv[0])
            return 2
        stdin_path = argv[index + 1]
        index += 2
    if index >= len(argv) or argv[index] != "--" or index + 1 >= len(argv):
        usage(argv[0])
        return 2
    command = argv[index + 1 :]

    pid, master = pty.fork()
    if pid == 0:
        if stdin_path is not None:
            fd = os.open(stdin_path, os.O_RDONLY)
            os.dup2(fd, 0)
            os.close(fd)
        os.execvp(command[0], command)

    answered = 0
    buf = b""
    deadline = time.monotonic() + DEFAULT_TIMEOUT
    while True:
        if time.monotonic() > deadline:
            try:
                os.kill(pid, 9)
            except OSError:
                pass
            try:
                os.waitpid(pid, 0)
            except ChildProcessError:
                pass
            try:
                os.close(master)
            except OSError:
                pass
            print(f"pty_passphrase: timed out after {DEFAULT_TIMEOUT:.0f}s", file=sys.stderr)
            return 1
        try:
            ready, _, _ = select.select([master], [], [], 0.2)
        except (ValueError, OSError):
            break
        if master in ready:
            try:
                chunk = os.read(master, 4096)
            except OSError:
                break
            if not chunk:
                break
            sys.stderr.buffer.write(chunk)
            sys.stderr.buffer.flush()
            buf += chunk
            while True:
                match = PROMPT.search(buf)
                if match is None:
                    break
                os.write(master, (passphrase + "\n").encode())
                answered += 1
                buf = buf[match.end() :]
        try:
            waited_pid, status = os.waitpid(pid, os.WNOHANG)
        except ChildProcessError:
            break
        if waited_pid == pid:
            while True:
                try:
                    ready, _, _ = select.select([master], [], [], 0)
                except (ValueError, OSError):
                    break
                if master not in ready:
                    break
                try:
                    chunk = os.read(master, 4096)
                except OSError:
                    chunk = b""
                if not chunk:
                    break
                sys.stderr.buffer.write(chunk)
                sys.stderr.buffer.flush()
            os.close(master)
            if answered == 0:
                print("pty_passphrase: no passphrase prompt seen", file=sys.stderr)
            return os.waitstatus_to_exitcode(status)

    try:
        os.close(master)
    except OSError:
        pass
    try:
        _, status = os.waitpid(pid, 0)
        return os.waitstatus_to_exitcode(status)
    except ChildProcessError:
        return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
