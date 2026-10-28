/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppUser } from './AppUser';
import { AuthIdentity } from './AuthIdentity';

export type AuthReadinessStatus =
  | 'restoring'        // 初回セッション復元中
  | 'unauthenticated'  // 未ログイン
  | 'authenticating'   // Googleログインポップアップ実行中
  | 'signing-out'     // Authセッションの終了を確認中。旧userは非表示
  | 'preparing'        // Auth成功後、Firestoreのユーザーマスタ初期化中
  | 'ready'            // マスタ確認済み、利用準備完了
  | 'error';           // 初期化失敗・エラー

export interface AppState {
  readonly status: AuthReadinessStatus;
  readonly identity: AuthIdentity | null;
  readonly user: AppUser | null;
  readonly errorMessage: string | null;
  readonly generation: number; // 状態遷移の競合・遅延防止用世代番号
}
