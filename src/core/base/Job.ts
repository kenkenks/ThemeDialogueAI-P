/** @license SPDX-License-Identifier: Apache-2.0 */
export type ConfirmationStatus = 'confirmed' | 'not-confirmed' | 'unknown';
export interface JobResult<T> {
  readonly isSuccess: boolean;
  readonly data?: T;
  readonly error?: Error;
  readonly confirmationStatus: ConfirmationStatus;
  readonly cleanupWarning?: Error;
}
export class OperationError extends Error {
  constructor(message: string, readonly confirmationStatus: ConfirmationStatus = 'not-confirmed') {
    super(message);
    this.name = 'OperationError';
  }
}
type MaybePromise<T> = T | Promise<T>;
function next<A, B>(value: MaybePromise<A>, fn: (value: A) => MaybePromise<B>): MaybePromise<B> {
  return value instanceof Promise ? value.then(fn) : fn(value);
}
export abstract class Job<I, O, P = void, C = void, M = void, R = void> {
  execute(input: I): Promise<JobResult<O>> {
    let confirmed = false;
    let recording = false;
    let work: MaybePromise<O>;
    try {
      // Preserve synchronous user activation until an actually asynchronous stage.
      work = next(this.prepare(input), prepared => next(this.collect(prepared), collected =>
        next(this.make(prepared, collected), made => {
          recording = true;
          return next(this.record(made), recorded => {
            confirmed = true;
            return this.post(recorded, made);
          });
        })));
    } catch (error) { work = Promise.reject(error); }
    return Promise.resolve(work).then<JobResult<O>, JobResult<O>>(
      data => ({ isSuccess: true, data, confirmationStatus: 'confirmed' }),
      error => ({
        isSuccess: false,
        error: error instanceof OperationError ? error : new Error(error instanceof Error && error.constructor === Error ? error.message : '処理に失敗しました。'),
        confirmationStatus: confirmed ? 'confirmed' : error instanceof OperationError
          ? error.confirmationStatus : recording ? 'unknown' : 'not-confirmed',
      }),
    ).then(async result => {
      try { await this.cleanup(); }
      catch (error) { return { ...result, cleanupWarning: new Error(error instanceof Error && error.constructor === Error ? error.message : '後処理に失敗しました。') }; }
      return result;
    });
  }
  protected prepare(_input: I): MaybePromise<P> { return undefined as P; }
  protected collect(_prepared: P): MaybePromise<C> { return undefined as C; }
  protected make(_prepared: P, _collected: C): MaybePromise<M> { return undefined as M; }
  protected abstract record(made: M): MaybePromise<R>;
  protected post(recorded: R, _made: M): MaybePromise<O> { return recorded as unknown as O; }
  protected cleanup(): MaybePromise<void> {}
}
