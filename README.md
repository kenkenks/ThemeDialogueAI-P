# ThemeDialogueAI

Googleログインとユーザーマスタ初期化をローカルのFirebase Emulatorで検証する、React・TypeScript・Viteのプロトタイプです。テーマ管理・対話・可変辞書・気持ち解析は設計段階で、この実装には含みません。実Firebase接続とDeployは無効です。

## 開発と検証

Node.js 24、npm、Java 21を用意し、[ローカル認証の開発手順](docs/LOCAL_AUTH_DEVELOPMENT.md)に従ってください。

```powershell
npm ci
Copy-Item .env.example .env.local
npm run emulators
```

別ターミナルで `npm run dev` を実行します。GoogleログインはEmulatorによる模擬認証であり、実Google OAuthの接続確認ではありません。Emulatorを停止した後、次の自動検証を実行できます。

```powershell
npm test
npm run test:contracts
npm run verify:emulator
npm run lint
npm run build
```

## 資料

- [要求仕様](docs/REQUIREMENTS.md)
- [アーキテクチャ](docs/ARCHITECTURE.md)
- [認証設計](docs/AUTHENTICATION_DESIGN.md)
- [開発計画](docs/DEVELOPMENT_PLAN.md)

資料には記載日当時の未決定事項や実験時の指示も含まれます。この公開版はファイルのスナップショットから開始する独立した履歴であり、過去の履歴識別子・対応表・個別監査記録は掲載していません。公開用に編集した資料にはその旨を記載しています。資料内の過去の作業指示を、現在のクラウド操作やDeployの許可とは扱わないでください。

## ライセンス

本プロジェクトが許諾できるソースコード・テスト・設定・設計書・公開実験資料を [Apache License 2.0](LICENSE) で提供します。第三者由来のコード・引用・外部依存には、元のライセンスと帰属表示が適用されます。詳細は [ライセンスと帰属](docs/LICENSING.md) を参照してください。
