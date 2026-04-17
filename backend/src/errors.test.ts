import assert from 'node:assert/strict';
import test from 'node:test';
import type { NextFunction, Request, Response } from 'express';
import { asyncHandler, createApiErrorHandler, HttpError } from './errors';

function createMockResponse(options?: { headersSent?: boolean }) {
  const state: { statusCode?: number; body?: unknown } = {};
  const response: Partial<Response> = {
    headersSent: options?.headersSent ?? false,
    status(code: number) {
      state.statusCode = code;
      return this as Response;
    },
    json(payload: unknown) {
      state.body = payload;
      return this as Response;
    },
  };

  return { response: response as Response, state };
}

test('asyncHandler forwards rejected errors to next', async () => {
  const expectedError = new Error('boom');
  const wrapped = asyncHandler(async () => {
    throw expectedError;
  });

  let forwarded: unknown;
  await new Promise<void>((resolve) => {
    const next: NextFunction = (error?: unknown) => {
      forwarded = error;
      resolve();
    };

    wrapped({} as Request, {} as Response, next);
  });

  assert.equal(forwarded, expectedError);
});

test('createApiErrorHandler returns exposed HttpError payload for 4xx', () => {
  const logs: unknown[][] = [];
  const handler = createApiErrorHandler((...args: unknown[]) => {
    logs.push(args);
  });
  const { response, state } = createMockResponse();

  handler(new HttpError(400, 'Invalid team id'), {} as Request, response, (() => {}) as NextFunction);

  assert.equal(state.statusCode, 400);
  assert.deepEqual(state.body, { error: 'Invalid team id' });
  assert.equal(logs.length, 0);
});

test('createApiErrorHandler masks 5xx HttpError payload and logs it', () => {
  const logs: unknown[][] = [];
  const handler = createApiErrorHandler((...args: unknown[]) => {
    logs.push(args);
  });
  const { response, state } = createMockResponse();

  handler(new HttpError(500, 'DB exploded'), {} as Request, response, (() => {}) as NextFunction);

  assert.equal(state.statusCode, 500);
  assert.deepEqual(state.body, { error: 'Internal server error' });
  assert.equal(logs.length, 1);
});

test('createApiErrorHandler returns 500 for unknown errors', () => {
  const logs: unknown[][] = [];
  const handler = createApiErrorHandler((...args: unknown[]) => {
    logs.push(args);
  });
  const { response, state } = createMockResponse();

  handler(new Error('random failure'), {} as Request, response, (() => {}) as NextFunction);

  assert.equal(state.statusCode, 500);
  assert.deepEqual(state.body, { error: 'Internal server error' });
  assert.equal(logs.length, 1);
});

test('createApiErrorHandler does nothing when headers are already sent', () => {
  const logs: unknown[][] = [];
  const handler = createApiErrorHandler((...args: unknown[]) => {
    logs.push(args);
  });
  const { response, state } = createMockResponse({ headersSent: true });

  handler(new Error('ignored'), {} as Request, response, (() => {}) as NextFunction);

  assert.equal(state.statusCode, undefined);
  assert.equal(state.body, undefined);
  assert.equal(logs.length, 0);
});
