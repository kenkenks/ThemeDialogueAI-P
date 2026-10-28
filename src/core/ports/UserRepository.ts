/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppUser } from '../models/AppUser';

/**
 * ユーザーマスタへの永続化ポート
 * ユーザーマスタ（users）と認証UID対応（auth_bindings）の読み書きを担当する。
 */
export interface UserRepository {
  /**
   * 認証UIDに対応するユーザーマスタを取得、または未作成であればアトミックに初期化する。
   * トランザクション内で読み取りと作成の一貫性を保つこと。
   */
  ensureUser(authUid: string): Promise<AppUser>;
}
