# 認証プロトタイプのローカル検証

> 公開用資料：旧履歴の識別子や内部参照を省略しています。記載日当時の仕様・計画・実験記録であり、現在の実装範囲と検証手順はREADMEを参照してください。

目的・対象範囲：EXP-002のGoogleログイン・ユーザーマスタ初期化を、実Firebaseへ接続せず検証する手順を記す。既存の要求・設計・実験原文は変更しない。

## 準備と起動

検証環境はWindows、Node.js 24.16.0、npm 11.13.0、Java 21.0.12.1。初回は依存取得とFirebase CLIによるEmulator取得にネットワークが必要。GoogleアカウントによるCLIログインやFirebaseプロジェクト作成は不要。

```powershell
npm install
Copy-Item .env.example .env.local
npm run emulators
```

別ターミナルで `npm run dev` を実行し、`http://127.0.0.1:3000` を開く。Auth Emulatorは9099、Firestore Emulatorは18080を使用する。ブラウザーのログインはEmulatorの模擬Google認証であり、実Google OAuthの検証ではない。

`.env.local` はGit対象外。実キー・サービスアカウント・本番プロジェクトIDを設定しない。`VITE_USE_FIREBASE_EMULATOR=true` の明示が必要。ループバック以外の接続先、無関係の既存Firebase App、永続化失敗は起動エラーとする。接続先の設定完了を待つが、Emulatorの稼働確認を完了扱いにするものではない。停止中のEmulatorへの操作は失敗として表示され、モックへ切り替わらない。

## 自動検証

```powershell
npm test
npm run test:contracts
npm run verify:emulator
npm run lint
npm run build
```

`verify:emulator` はローカルdemoプロジェクトでAuth／Firestore Emulatorを起動し、Rules・Repositoryの試験後に停止する。既に同じポートのEmulatorが起動している場合は停止してから実行する。`test:emulator` 単体は起動済みFirestore Emulatorに接続する。データ消去を含む試験のため、検証用demo環境だけで実行する。

## 実接続への移行条件

現実装はビルド種別にかかわらずEmulator専用で、実Firebase接続を無効にしている。実接続工程では、別途承認後に対象プロジェクト・Googleプロバイダー・許可ドメイン・Firestore／Rulesを確認し、実環境用初期化を追加して実Google OAuthとブラウザーE2Eを検証する。今回これらの操作・接続・配備は実施しない。
