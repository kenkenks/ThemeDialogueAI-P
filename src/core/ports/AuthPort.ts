/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthIdentity } from '../models/AuthIdentity';

/**
 * 認証プロバイダへの操作ポート
 * CoreはFirebase Web SDK等の具体的ライブラリに直接依存せず、本ポートを介して対話する。
 */
export interface AuthPort {
  /**
   * Googleログインポップアップを開始し、認証完了後に識別情報を返す。
   * ポップアップ開始前に不要な非同期処理を挟まないこと。
   */
  signInWithGoogle(): Promise<AuthIdentity>;

  /**
   * ログアウトを実行し、セッションを破棄する。
   */
  signOut(): Promise<void>;

  /**
   * 現在キャッシュされている認証識別情報を同期取得する。
   */
  getCurrentIdentity(): AuthIdentity | null;

  /**
   * 認証状態の変化を監視する。
   * 監視解除用の関数（アンサブスクライブ）を返す。
   */
  onAuthStateChanged(listener: (identity: AuthIdentity | null) => void | Promise<void>): () => void;
}
