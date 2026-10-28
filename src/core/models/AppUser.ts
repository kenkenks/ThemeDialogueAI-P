/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * アプリケーションの最小ユーザーマスタ（Coreドメインモデル）
 * Firebaseの内部型（TimestampやUserなど）に依存しない。
 */
export interface AppUser {
  readonly userId: string;        // 独自発行のアプリuser_id（20桁英数字）
  readonly authUid: string;       // 対応するGoogle認証UID
  readonly createdAt: string;     // ISO8601文字列またはエポックミリ秒
  readonly schemaVersion: number; // スキーマバージョン（固定値 1）
}
