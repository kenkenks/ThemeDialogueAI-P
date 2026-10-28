/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Job } from '../base/Job';
import { AuthPort } from '../ports/AuthPort';

export class SignOutJob extends Job<void, void, void, void, void, void> {
  constructor(private readonly authPort: AuthPort) {
    super();
  }

  protected override async prepare(_input: void): Promise<void> {
    return;
  }

  protected override async collect(_prepared: void): Promise<void> {
    return;
  }

  protected override async make(_prepared: void, _collected: void): Promise<void> {
    return;
  }

  protected override async record(_made: void): Promise<void> {
    await this.authPort.signOut();
  }

  protected override async post(_recordResult: void, _made: void): Promise<void> {
    return;
  }

  protected override async cleanup(): Promise<void> {
    return;
  }
}
