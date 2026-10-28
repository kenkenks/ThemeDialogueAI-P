# ThemeDialogueAI AI開発環境の実現可能性調査

> 公開用資料：旧履歴の識別子や内部参照を省略しています。記載日当時の仕様・計画・実験記録であり、現在の実装範囲と検証手順はREADMEを参照してください。

目的：Firebase側AIを実装担当、Codexを開発監督とする開発方式について、事前調査の結果を正式な資料として保存する。

対象範囲：Google側のAI開発環境、Codexとの連携、作業・成果物の受け渡し、事前準備、Codex利用枠の測定、必要なユーザー操作、未確認事項と検証項目。

- 調査基準日：2026-10-28
- 基準コミット：（公開版では履歴IDを省略）（完全なID：（公開版では履歴IDを省略））
- 基準仕様：[REQUIREMENTS.md](REQUIREMENTS.md)、[ARCHITECTURE.md](ARCHITECTURE.md)、[DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md)
- 調査方法：公式資料とローカル環境の確認。アカウント接続や実装動作の実証は行っていない。
- 本書は上記基準日の調査報告を保存したものであり、保存時点での追加調査や仕様決定を意味しない。調査結果にない情報は補完しない。

## 総合判断と判定区分

開発方式は **条件付きで実現可能**。当面は、Codexが作業指示とレビューを担当し、ユーザーがGoogle側の実装AIへ指示を渡す方式を推奨する。CodexからFirebase側AIへの直接指示は未確認。

本書では「実現可能」「条件付き」「未確認」「実現不可」を区別する。「実現不可」は記載した経路・環境に限定した判定であり、他の方式も不可能という意味ではない。

## 1. 利用できるAIと操作方法

| 候補 | 判定 | 操作方法・適性 |
| --- | --- | --- |
| Google AI StudioのBuildエージェント | 条件付き | Build画面のチャットから実装を指示。複数ファイルの変更、Firestore・Authentication連携が公式に案内されている。実装担当の有力候補 |
| Google Antigravity＋Firebase MCP | 条件付き | 開発環境のエージェントに指示し、Firebase MCPを接続する方式。既存コードを中心に開発する候補 |
| Gemini in Firebase | 実現可能：相談・補助用途 | Firebaseコンソールの自然言語チャットで質問、コード例生成、問題調査。リポジトリを編集する実装担当としての適性は未確認 |
| Firebase Studio | 新規利用は実現不可／既存利用は条件付き | 新規登録・ワークスペース作成は2026-06-22に停止。既存環境も2027-03-22に終了予定 |

Firebase Studioの終了は、FirestoreなどFirebase本体の終了ではない。新規のThemeDialogueAI開発では、AI StudioかAntigravityを検討するのが妥当。

公式資料：[Firebase Studio終了案内](https://firebase.google.com/docs/studio/migrating-project)、[AI Studio Build](https://ai.google.dev/gemini-api/docs/aistudio-build-mode)、[Gemini in Firebase](https://firebase.google.com/docs/ai-assistance/gemini-in-firebase)

## 2. Codexから直接作業指示を出せるか

| 経路 | 判定 | 調査結果 |
| --- | --- | --- |
| Codex → AI Studio／Firebase Studioの実装エージェント | 未確認 | 今回調べた公式資料では、外部から作業を投入し、完了結果を取得する公開インターフェースを確認できなかった |
| Codex → Firebase MCP → Firebaseサービス | 条件付き | CodexはMCP接続に対応し、Firebase MCPはstdioで利用可能。ただし、これはFirebase操作用ツールであり、別の実装AIへの指示ではない |
| 調査時のチャットからFirebase用ツールを呼ぶ | 現環境では実現不可 | 調査時のセッションで公開されているツールにFirebase MCPはない。設定追加後の可否は未確認 |

「Firebase MCPを入れればFirebase側AIへ指示できる」とは判断できない。MCP接続の技術的な組み合わせは可能と考えられるが、この環境での接続試験は別途必要。

公式資料：[Firebase MCP](https://firebase.google.com/docs/ai-assistance/mcp-server)、[CodexのMCP対応](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)

## 3. 直接連携できない場合の代替手段

### 人が指示を受け渡す

判定：**実現可能。推奨する初期方式。**

Codexが「基準コミット・要求ID・変更範囲・禁止事項・合格条件」をまとめ、ユーザーが実装AIへ渡す。成果は差分と検証結果で受け取る。

### GitHubを成果物の受け渡しに使う

判定：**条件付き。**

AI Studioには既存リポジトリへの接続、双方向同期、競合解決が公式にある。ただし、IssueやPRコメントを書くだけで実装AIが自動起動することは確認できていない。

公式資料：[AI StudioのGitHub連携](https://ai.google.dev/gemini-api/docs/aistudio-build-mode)

### Gemini CLIを実装担当にする

判定：**条件付き。**

非対話モードの `--prompt` と構造化出力を利用できるため、Codexがシェル経由で指示・結果取得を行う代替候補。ただし、AI Studioのエージェントとは別の担当になる。導入、認証、編集権限、実行制御の検証が必要。

公式資料：[Gemini CLI非対話モード](https://geminicli.com/docs/cli/headless/)

## 4. GitHubを介した受け渡し・レビュー

推奨フローは次のとおり。調査では実施していない。

1. （公開版では履歴IDを省略） を基準として作業指示を固定する。
2. 実装AIは専用ブランチで、指定範囲だけを変更する。
3. PRに要求ID、変更内容、検証手順・結果、残る問題を記載する。
4. Codexが対象コミットの差分をレビューし、同じコミットで検証する。
5. 修正後に再確認し、ユーザーがマージを判断する。

AI Studioでの対象ブランチ選択、Privateリポジトリへの権限、PR作成の操作は、実アカウントで確認が必要。ブランチ運用が合わなければ、ZIPを受け取りローカルの作業ブランチで差分化する方式を使える。

Privateリポジトリでレビュー必須などのブランチ保護を強制できるかはGitHubプランに依存する。

公式資料：[GitHubのブランチ保護](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)

### ローカル環境の確認結果

以下は2026-10-28の調査時点の観測であり、本書保存後のGit状態を表すものではない。

- HEADは （公開版では履歴IDを省略）、作業ツリーはクリーン。
- `origin` は `kenkenks/ThemeDialogueAI`。GitHub側のPrivate設定・アクセス権は未確認。
- Node.js、npm、Git、Firebaseコマンドが存在。
- `gh` と `gemini` はPATH上では検出されず。
- Firebaseへのログイン状態、CLIバージョン、対象プロジェクトは未確認。

## 5. Firebase・Firestore・Gemini APIの事前準備

| 対象 | 次工程前に確認・決定すること |
| --- | --- |
| Google側の開発環境 | AI Studio／Antigravityの利用可否、利用規約、コードを渡す範囲 |
| Firebase | 開発専用プロジェクト、所有者・権限、利用サービス、課金が必要になる条件 |
| Firestore | データ所在地、認証方法、ユーザーごとのデータ分離、Security Rules、保存・削除方針 |
| Gemini API | 呼び出し方式、モデル、利用上限、キー管理、送信データと取り扱い条件 |
| ローカル検証 | Firebase Emulator Suite、必要ランタイム、疑似データ、外部API呼び出しを止める方法 |

AI Studioの「Enable Firebase」は確認だけの操作ではない。プロジェクトやデータベース、認証、権限などの設定につながる。所在地を決めてから実施する必要がある。

公式資料：[AI StudioのFirebase連携](https://firebase.google.com/docs/ai-assistance/ai-studio-integration)

Firestoreのテストモードは第三者からの読み書きを許すため、個人の対話・感想を入れる前にルール設計が必要。最初の検証は、実クラウド資源を持たないdemoプロジェクトのエミュレーターを候補にできる。

公式資料：[Firestore開始手順](https://firebase.google.com/docs/firestore/quickstart)、[エミュレーターのdemoプロジェクト](https://firebase.google.com/docs/emulator-suite/use_hosting)

GeminiのキーはGitへ保存せず、サーバー側の秘密情報として扱うか、Firebase AI Logicなど適切な方式を選ぶ。無料／有料サービスでデータの扱いが異なるため、初期検証には架空の対話を推奨する。具体的な方式・課金要否は未決定。

公式資料：[APIキー管理](https://ai.google.dev/gemini-api/docs/api-key)、[Gemini API利用条件](https://ai.google.dev/gemini-api/terms)

## 6. Codex利用枠の工程別測定

判定：**観測差分の測定は実現可能だが、工程単独の厳密な消費量は条件付き。**

| 工程 | 測定する作業単位の例 |
| --- | --- |
| 調査 | 調査テーマ1件と根拠の整理 |
| 指示作成 | 要求ID1件の作業指示 |
| レビュー | 固定したコミット差分1件 |
| 検証 | 固定した検証ケース群の実行と判定 |
| 修正確認 | 指摘に対する追加差分の再レビュー |

各単位の開始・終了時に、同じ利用状況表示から枠ごとの使用率／残量とリセット日時を記録する。あわせてモデル・設定、所要時間、成果、再実行、同時期の別作業を記録する。使用率差はパーセントポイントで比較し、リセットをまたいだ測定は単純比較しない。

公式の確認手段は利用状況ダッシュボード、CLIでは `/status`。共有枠、表示丸め、反映遅延があるため、消費差分は観測値として扱う。今回の調査は開始前の測定値を採っていないため、消費量を後付けでは算出できない。

公式資料：[OpenAI公式の利用枠案内](https://learn.chatgpt.com/docs/pricing)

## 7. 必要なユーザー操作と推奨する次工程

1. **実装担当の候補を選ぶ。** ブラウザー中心ならAI Studio、コード・Git操作を中心にするならAntigravityを候補とする。
2. **Googleアカウントで利用可否を確認する。** この段階ではFirebase有効化・プロジェクト作成・課金設定を行う必要はない。
3. **GitHub側のPrivate設定と権限を確認する。** 接続する場合は対象リポジトリへのアクセス範囲も確認する。
4. **実装前に受け渡し試験を行う。** 3文書を実装AIに読ませ、「仕様の要約と未決定事項だけを返す。ファイル変更・クラウド操作は禁止」と指示し、結果をCodexが照合する方法を推奨する。
5. **受け渡しが成立してから、最小の検証実装を計画する。** まず疑似データとエミュレーターを使い、クラウド設定・課金・デプロイは別の段階で判断する。

## 8. 未確認事項と検証が必要な項目

以下は本文に記載した未確認事項・条件の再掲であり、新たな調査結果や仕様決定ではない。

- AI Studio／Antigravityの実アカウントでの利用可否と、Gemini in Firebaseの実装担当としての適性。
- CodexからAI Studio／Firebase Studioの実装エージェントへの公開された作業投入・結果取得インターフェース。
- Firebase MCPの設定追加後の接続可否と、この環境での接続試験。
- IssueやPRコメントを起点とする実装AIの自動起動。
- Gemini CLIの導入、認証、編集権限、実行制御。
- GitHub側のPrivate設定・アクセス権・プラン、AI Studioでの対象ブランチ選択とPR作成の操作。
- Firebaseへのログイン状態、CLIバージョン、対象プロジェクト。
- 開発環境・コード共有範囲、Firebaseの所有者・利用サービス・課金条件。
- Firestoreの所在地、認証・データ分離・Security Rules、保存・削除方針。
- Gemini APIの呼び出し方式・モデル・上限・キー管理・送信データ・課金要否。
- エミュレーターと必要ランタイム、疑似データ、外部API呼び出しの停止方法。
- 指示と結果の受け渡し試験、最小の検証実装。
- Codex利用枠の工程別測定。今回の調査の消費量は開始前の観測値がなく算出不可。

## 9. 調査時の実施範囲

調査のみを実施。ファイル変更、コード実装、Firebase操作、課金設定、コミット、push、デプロイは行っていない。調査完了時のHEADは （公開版では履歴IDを省略） のまま。

上記は調査時点の記録。本書の作成と保存用コミットは、その後の別作業として行う。
