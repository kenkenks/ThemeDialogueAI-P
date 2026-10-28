/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Job, OperationError } from '../base/Job';
import { AuthIdentity } from '../models/AuthIdentity';
import { AuthPort } from '../ports/AuthPort';

export interface GoogleSignInInput {
  readonly isRunning?: boolean;
}

/**
 * Googleログインジョブ（CMRP）
 * ポップアップ起動前に非同期境界（await）を作らない契約を遵守する。
 */
export class GoogleSignInJob extends Job<GoogleSignInInput, AuthIdentity, boolean, void, void, AuthIdentity> {
  private isProcessing = false;

  constructor(private readonly authPort: AuthPort) {
    super();
  }

  protected override prepare(input: GoogleSignInInput): boolean {
    if (this.isProcessing || input.isRunning) {
      throw new OperationError('ログイン処理が既に実行中です。');
    }
    this.isProcessing = true;
    return true;
  }

  // collect は no-op（ポップアップ前に非同期待機を挟まない）
  protected override collect(_prepared: boolean): void {
    return;
  }

  // make は純粋な要求確定
  protected override make(_prepared: boolean, _collected: void): void {
    return;
  }

  // record は外部副作用（AuthPortのGoogleログイン）を実行
  protected override async record(_made: void): Promise<AuthIdentity> {
    return await this.authPort.signInWithGoogle();
  }

  // post は返却用データの整形（機密情報は含まない）
  protected override async post(recordResult: AuthIdentity): Promise<AuthIdentity> {
    return {
      uid: recordResult.uid,
      displayName: recordResult.displayName,
      email: recordResult.email,
      providerId: recordResult.providerId,
    };
  }

  protected override async cleanup(): Promise<void> {
    this.isProcessing = false;
  }
}
