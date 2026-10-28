/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { Job, ConfirmationStatus } from '../core/base/Job';

class TestJob extends Job<string, string, string, string, string, string> {
  public executionSteps: string[] = [];
  public shouldFailAtRecord = false;
  public shouldFailAtPost = false;
  public shouldFailAtCleanup = false;

  protected override async prepare(input: string): Promise<string> {
    this.executionSteps.push('prepare');
    return input.trim();
  }

  protected override async collect(prepared: string): Promise<string> {
    this.executionSteps.push('collect');
    return `collected_${prepared}`;
  }

  protected override async make(prepared: string, collected: string): Promise<string> {
    this.executionSteps.push('make');
    return `made_${prepared}_${collected}`;
  }

  protected override async record(made: string): Promise<string> {
    this.executionSteps.push('record');
    if (this.shouldFailAtRecord) {
      throw new Error('Record database timeout');
    }
    return `recorded_${made}`;
  }

  protected override async post(recordResult: string, _made: string): Promise<string> {
    this.executionSteps.push('post');
    if (this.shouldFailAtPost) {
      throw new Error('Post processing exception');
    }
    return `output_${recordResult}`;
  }

  protected override async cleanup(): Promise<void> {
    this.executionSteps.push('cleanup');
    if (this.shouldFailAtCleanup) {
      throw new Error('Cleanup warning error');
    }
  }
}

describe('Job CMRP Lifecycle', () => {
  it('A-10準拠: 正常系ですべての工程（prepare -> collect -> make -> record -> post -> cleanup）が順序通り実行されること', async () => {
    const job = new TestJob();
    const result = await job.execute('hello');

    expect(result.isSuccess).toBe(true);
    expect(result.confirmationStatus).toBe('confirmed');
    expect(result.data).toContain('output_recorded_made_hello_collected_hello');
    expect(job.executionSteps).toEqual(['prepare', 'collect', 'make', 'record', 'post', 'cleanup']);
  });

  it('A-10準拠: recordで失敗した場合、cleanupが必ず実行され、not-confirmed/unknownが返ること', async () => {
    const job = new TestJob();
    job.shouldFailAtRecord = true;
    const result = await job.execute('hello');

    expect(result.isSuccess).toBe(false);
    expect(result.error?.message).toBe('Record database timeout');
    // timeoutキーワードを含むため unknown 判定
    expect(result.confirmationStatus).toBe('unknown');
    expect(job.executionSteps).toEqual(['prepare', 'collect', 'make', 'record', 'cleanup']);
  });

  it('A-10準拠: cleanup失敗時でも主結果が失われないこと（cleanupWarningとして保持）', async () => {
    const job = new TestJob();
    job.shouldFailAtCleanup = true;
    const result = await job.execute('hello');

    expect(result.isSuccess).toBe(true);
    expect(result.confirmationStatus).toBe('confirmed');
    expect(result.cleanupWarning?.message).toBe('Cleanup warning error');
    expect(job.executionSteps).toContain('cleanup');
  });
});
