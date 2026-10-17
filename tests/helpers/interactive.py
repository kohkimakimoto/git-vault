#!/usr/bin/env python3
"""Drive the real CLI through a PTY. Exit 77 when PTYs are unavailable."""
import os
from pathlib import Path
import pty
import select
import sys
import time


def main():
    private_key = next(line for line in Path(sys.argv[1]).read_bytes().splitlines()
                       if line.startswith(b"AGE-SECRET-KEY-"))
    try:
        pid, terminal = pty.fork()
    except OSError:
        print("SKIP: interactive input (PTY allocation unavailable)")
        return 77
    if pid == 0:
        os.execvp("git", ["git", "vault", "restore", ".env"])
    output = b""
    sent = False
    status = None
    try:
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            if select.select([terminal], [], [], 0.1)[0]:
                try:
                    output += os.read(terminal, 65536)
                except OSError:
                    pass
                if b"Input private key content:" in output and not sent:
                    os.write(terminal, private_key + b"\n")
                    sent = True
            done, value = os.waitpid(pid, os.WNOHANG)
            if done:
                status = value
                break
        if status != 0 or not sent:
            sys.exit("Interactive restore failed or timed out")
        if private_key in output:
            sys.exit("Private key was echoed by the terminal")
    finally:
        os.close(terminal)
        if status is None:
            os.kill(pid, 9)
            os.waitpid(pid, 0)
    return 0


if __name__ == "__main__":
    sys.exit(main())
