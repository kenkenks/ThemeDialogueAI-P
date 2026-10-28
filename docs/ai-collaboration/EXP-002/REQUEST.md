# EXP-002：Googleログイン・ユーザーマスタ実装指示書

> 公開用資料：旧履歴の識別子や内部参照を省略しています。記載日当時の仕様・計画・実験記録であり、現在の実装範囲と検証手順はREADMEを参照してください。

目的：Google AI Studio Buildへ、EXP-001のレビューを反映した最小実装を指示するための資料を用意する。

対象範囲：後日のローカル実装とエミュレーター検証。**本書は未送信の指示書であり、今回の実装開始許可ではない。** ユーザーが明示的に実装開始を指示してから送信・実行する。Google側AIの回答・変更・試験はまだ存在しないため、RESPONSE.mdやREVIEW.mdを実施済みとして作らない。

作成日：2026-10-28。実験ID：EXP-002。実装担当候補：Google AI Studio Build（実行時のモデル・設定は未確認）。監督・レビュー：Codex。受け渡し・Google画面操作：ユーザー。

## 添付資料と版の確認

- [REQUIREMENTS.md](../../REQUIREMENTS.md)：R-01〜R-20と現行Googleログイン要求。
- [ARCHITECTURE.md](../../ARCHITECTURE.md)：全体構成とユーザー識別関係。
- [DEVELOPMENT_PLAN.md](../../DEVELOPMENT_PLAN.md)：担当、順序、完了条件、利用枠測定。
- [AUTHENTICATION_DESIGN.md](../../AUTHENTICATION_DESIGN.md)：今回の構造・Rules契約・CMRP・試験の詳細。
- [FIREBASE_SETUP.md](../../FIREBASE_SETUP.md)：管理者が行う後日の設定とクラウド操作境界。
- EXP-001/REVIEW.md（評価記録は公開対象外）：過去指摘。現行の方式決定は上記の認証設計を優先。

設計開始前の基準コミットは （公開版では履歴IDを省略）。それだけでは今回の更新を含まない。送信時は本書を含む設計更新後のコミットIDをユーザーが添える。添付はその同一コミットから取得し、Google側AIは読めた資料・不足・モデル表示・設定を最初に報告する。矛盾・未添付は勝手に補完しない。

## 以下をGoogle側AIへ渡す（実装開始の明示後）

### 依頼と禁止事項

ThemeDialogueAIのGoogleログインと初期ユーザーマスタを、添付設計に従って最小実装してください。今回の実装指示が許可するのは、ローカルのソース・設定ファイル・テスト作成と、ローカルのビルド・型検査・エミュレーター検証です。

Firebaseプロジェクト作成・設定変更・課金設定、Google側のEnable Firebase、自動プロビジョニング、実クラウド接続、Rulesのクラウド反映、push、deploy、Publishは行わないでください。管理用鍵を要求・保存しないでください。コミット・GitHub同期・PR作成も別指示がない限り行わず、変更一覧と差分を提出してください。ローカル設定ファイルの作成はクラウド操作の許可ではありません。

### 採用する設計

1. React＋TypeScript＋Vite、FirebaseモジュラーWeb SDK、GoogleAuthProvider＋signInWithPopupを使う。SDKのセッション管理を使い、browserSessionPersistenceを初期化する。ログインボタンからポップアップまで不要なawaitを挟まない。
2. Google認証UIDとは別のuser_idをFirestoreの自動IDで生成する。メール・表示名・UIDから合成しない。ニックネーム認証、仮想メール、パスワード入力・ハッシュ・一意索引を作らない。
3. `auth_bindings/{auth_uid}` と `users/{user_id}` のフィールドはAUTHENTICATION_DESIGN.mdの定義だけを許可する。role・status・メール・表示名・last_login_at等を勝手に追加しない。
4. ensureUserは対応文書をトランザクションで読む。既存なら正規マスタを検証して返す。未作成なら候補user_idのマスタと対応を同時作成する。候補はコールバック外で生成し、Auth APIやUI操作をコールバック内で行わない。候補usersの事前getは不要とする。
5. 同時初期化ではSDKの競合再試行で正規IDへ収束する。応答消失後も同UIDから再確認する。Auth成功・マスタ失敗は準備未完了とし、Auth補償削除や独自分散補償基盤を作らない。一般的な手動再試行と冪等性で回復する。
6. Rulesは本人Google認証のget、相互参照と時刻・型・schemaを検証した2文書createだけを許可する。本人の未存在binding getは許可する。users作成時は既存bindingなしを要求し、getAfterで同時作成後の対応を確認する。全update/delete/list、未認証・他者・別プロバイダ・余分なフィールド・その他パスは拒否する。
7. Rulesを迂回するAdmin SDKや専用サーバー、Cloud Functions、Gemini呼び出しは導入しない。保護を実装できない場合は公開ルールで回避せず、理由と代案を報告する。
8. onAuthStateChangedを状態の入口にし、認証復元中／未認証／操作中／マスタ準備中／準備失敗／readyを区別する。UID・世代ごとに初期化をまとめ、ログアウト・切替後に旧Job結果を公開しない。キャッシュだけでreadyにしない。
9. Google表示名を表示する場合はテキストとして扱い、同名でも別UIDは別ユーザーとする。データ帰属は確認済みuser_idに基づく。

### Core／Wrapper／Job（CMRP）

- CoreにAppUser、AuthIdentity、状態、Job、GoogleSignInJob／EnsureUserJob／SignOutJob、AuthPort、UserRepositoryを置く。Firebase／Reactに依存させない。
- WrapperにSDK Adapter、FirestoreRepository、AuthWrapperを置き、DI、エラー変換、認証監視と解除、世代管理を行う。UIはFacadeだけを呼ぶ。
- prepare→collect→make→record→post、常時cleanup。不要な工程はno-opでよい。Google認証のポップアップ前に非同期境界を置かないJob契約とする。
- makeは純粋な判断・要求生成、recordは認証やRepositoryの外部副作用。Firestoreのread/modify/writeをCMRPの都合でtransaction外へ分割しない。
- recordの確定結果を後段へ返す。Post失敗・cleanup失敗で主結果を失わず、confirmed／not-confirmed／unknownを区別する。エラー・ログにトークンや生の個人情報を出さない。
- 道場システム由来の「仕事を6工程で表し、外部DAOを注入する」という考え方を参考にする。参照元を利用できなくても、添付認証設計の契約を優先し、コードを取得するために他システムへ接続しない。

### 許可する実装範囲

- アプリのsrc配下、起動に必要なindex.html、package.json・ロックファイル、Vite／TypeScript設定、エミュレーター用Firebase設定、firestore.rules、テスト、秘密を含まない環境設定例、gitignore、ローカル実行手順のREADME。
- ファイル名は最小構成に合わせて選び、変更・追加・削除の一覧を提出する。既存仕様、EXP-001原文、調査報告書を変更しない。テーマ・会話・辞書・気持ち解析・管理UIは実装しない。
- 開発モードはdemo-themedialogueaiのAuth／Firestoreエミュレーターを両方使う。実Firebase設定がないときに実クラウドへフォールバックしない。必要ランタイムがなければ不足と未実施の検証を報告する。

### 必須検証と提出物

AUTHENTICATION_DESIGN.mdのA-01〜A-13を検証対象とし、実行済み／失敗／未実施を区別してください。特に以下は省略不可です。

- 正常な初回作成・再呼び出し、同UIDの並行初期化と正規IDへの収束。
- 応答消失・書き込み拒否・オフライン・再起動からの再開。Firestoreの片側だけが残らず、Authを削除しないこと。
- Rules：未認証・他UID・別プロバイダ、片側create、相互参照不一致、時刻／型／schema不正、余分なフィールド、2個目マスタ、ID差し替え・上書き・全update/delete/list・その他パスを拒否。
- 状態：旧Jobの遅延完了、ログアウト失敗、A→B切替、Post／cleanup例外。認証済みでもマスタ未確認ならreadyにしないこと。
- 型検査、ビルド、Core依存、秘密混入確認。Rulesの実操作は認証主体付きrules-unit-testingで検証し、Admin経由だけで合格としない。

提出内容：読めた資料と版、実際のモデル・設定、変更一覧・差分、要求ID／試験IDの対応、実行コマンドと結果、未解決の重大問題、後続改善、実Firebase設定の不足、次に管理者が行う操作。実OAuth・実ドメインの試験は今回のローカル試験と区別し、未実施としてください。

自動公開・Firebase設定を行わず、結果をCodexレビューへ返してください。重大問題が残る場合、動作しているように見せるための保護緩和はしないでください。

## 受け渡し記録（送信時に記入）

- 実装開始のユーザー指示：未実施。
- 実際の送信日時・送信者：未確認／未送信。
- 設計更新後の添付コミット：送信時に本書を含むコミットを記録する。
- Google側で実際に使うモデル・設定：未確認。
- 回答・変更・試験結果：未受領。
