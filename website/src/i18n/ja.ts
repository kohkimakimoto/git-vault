import type { Messages } from './utils';

export const ja = {
  common: {
    description: '暗号化されたファイルをアプリケーションのコードとは別のorphanブランチに保存します。',
    docs: 'ドキュメント', home: 'ホーム', primary: 'メイン', language: '言語', untranslated: '未翻訳',
    openNavigation: 'ナビゲーションを開く', closeNavigation: 'ナビゲーションを閉じる', mobileNavigation: 'モバイル',
    switchToLight: 'ライトモードに切り替え', switchToDark: 'ダークモードに切り替え',
    lightMode: 'ライトモード', darkMode: 'ダークモード', license: 'MITライセンス',
  },
  docs: { guide: 'ガイド', reference: 'コマンドリファレンス', pagination: 'ドキュメントの前後移動' },
  home: {
    heading: 'シークレットを独立したGitブランチへ',
    intro: 'APIキーやパスワードなどのシークレット管理では、リスクと運用コストのバランスが重要です。小規模なプロジェクトなら、独立したorphanブランチへ暗号化して保存し、アプリケーションの履歴を汚さずコードと一緒に扱う方法が実用的です。',
    getStarted: 'はじめる', readDocs: 'ドキュメントを読む',
    demoNote: 'このデモは、vaultが初期化済みであることを前提としています。各マシンにはidentityが設定され、その公開鍵が受信者として登録されています。',
    anotherClone: '別のクローンを用意する →',
    howItFits: '仕組み',
    howItFitsDescription: 'git-vaultは、ファイルを暗号化して専用のorphanブランチに保存するGitサブコマンドです。作業ツリーとアプリケーションのコミットには、vaultの設定も暗号文も入りません。',
    encrypt: 'ageで暗号化する', encryptionBefore: '暗号化にはシンプルなファイル暗号化ツールの',
    encryptionAfter: 'を使います。受信者はageの公開鍵です。',
    commit: 'vaultへコミットする', commitBefore: '',
    commitAfter: 'は、ブランチをチェックアウトせず、インデックスにも触れずにorphanブランチを更新します。',
    restore: '必要なときに復元する', restoreDescription: '平文が必要になったら、作業ツリーへ復号して取り出します。',
    profiles: 'プロファイル', profilesDescription: '開発や本番など環境ごとにシークレットを分け、それぞれ復号できる受信者を設定できます。',
    install: 'インストール', installDescription: 'Homebrewならgit-vaultとageをまとめて入れられます。手動インストールは、実行ファイルを1つPATHに置くだけです。',
    installationDetails: 'インストールの詳細 →',
  },
  notFound: {
    title: 'ページが見つかりません', description: 'このページは存在しません。',
    message: 'お探しのページは存在しないか、移動しました。',
  },
  demo: {
    workflowLabel: 'git-vaultワークフローデモ', workflowTitle: 'ワークフローデモ',
    pause: 'デモを一時停止', resume: 'デモを再開', progress: 'デモの進行状況',
    workingTree: '作業ツリー', new: 'NEW', missing: 'MISSING', vaultBranch: 'vaultブランチ',
    local: 'ローカル', remote: 'リモート', empty: '空',
    encryptCallout: '.envを暗号化してvaultブランチへ保存', publishCallout: 'vaultブランチをoriginへ公開',
    anotherMachine: '別のマシンで', fetchCallout: '最新のvaultブランチを取得',
    trackCallout: 'origin/vaultを追跡するローカルvaultブランチを作成', restoreCallout: '暗号化した.envを復元',
  },
} as const satisfies Messages;
