/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 認証プロバイダ（Google）から取得したユーザー識別情報
 * トークンやクレデンシャルなどの機密情報は含まない。
 */
export interface AuthIdentity {
  readonly uid: string;
  readonly displayName: string | null;
  readonly email: string | null;
  readonly providerId: string;
}
