/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Job, OperationError } from '../base/Job';
import { AppUser } from '../models/AppUser';
import { UserRepository } from '../ports/UserRepository';

export interface EnsureUserInput {
  readonly authUid: string;
  readonly generation: number;
}

export interface EnsureUserPrepared {
  readonly authUid: string;
  readonly generation: number;
}

export interface EnsureUserMade {
  readonly targetAuthUid: string;
}

/**
 * ユーザーマスタ初期化ジョブ（CMRP）
 * DBのread/modify/writeはRepository内部の1トランザクションにまとめ、CMRPの都合で分割しない。
 */
export class EnsureUserJob extends Job<
  EnsureUserInput,
  AppUser,
  EnsureUserPrepared,
  void,
  EnsureUserMade,
  AppUser
> {
  constructor(private readonly userRepository: UserRepository) {
    super();
  }

  protected override async prepare(input: EnsureUserInput): Promise<EnsureUserPrepared> {
    if (!input.authUid || typeof input.authUid !== 'string' || input.authUid.trim().length === 0) {
      throw new OperationError('無効な認証UIDです。');
    }
    return {
      authUid: input.authUid.trim(),
      generation: input.generation,
    };
  }

  // collect は no-op（トランザクションの一体性を崩さないためDB読み取りを事前に行わない）
  protected override async collect(_prepared: EnsureUserPrepared): Promise<void> {
    return;
  }

  // make は初期化要求の生成
  protected override async make(prepared: EnsureUserPrepared, _collected: void): Promise<EnsureUserMade> {
    return {
      targetAuthUid: prepared.authUid,
    };
  }

  // record はRepositoryを呼び出し、Firestoreトランザクションによる確定を実行
  protected override async record(made: EnsureUserMade): Promise<AppUser> {
    return await this.userRepository.ensureUser(made.targetAuthUid);
  }

  // post は確定したAppUserを返す
  protected override async post(recordResult: AppUser, _made: EnsureUserMade): Promise<AppUser> {
    return recordResult;
  }

  protected override async cleanup(): Promise<void> {
    // 一時メモリの解放
  }
}
