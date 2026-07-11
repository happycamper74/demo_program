import { describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '../src/infrastructure/http/http-utils.js';
import { logUnhandledRequestError } from '../src/infrastructure/http/unhandled-request-error.js';

describe('logUnhandledRequestError', () => {
  const context: RequestContext = {
    requestId: 'req_test_123',
    method: 'POST',
    pathname: '/api/demo/v1/start',
    url: 'http://localhost:3002/api/demo/v1/start',
  };

  it('logs structured details for Error instances without changing the response path', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = new Error('LeadBoard rejected mirror request');
    error.cause = new Error('upstream validation failed');

    logUnhandledRequestError(context, error);

    expect(errorSpy).toHaveBeenCalledOnce();
    const [label, payload] = errorSpy.mock.calls[0]!;
    expect(label).toBe('demo-api-bff.unhandled_request_error');
    const details = JSON.parse(String(payload));
    expect(details).toMatchObject({
      request_id: 'req_test_123',
      method: 'POST',
      pathname: '/api/demo/v1/start',
      error_name: 'Error',
      error_message: 'LeadBoard rejected mirror request',
      stack: expect.stringContaining('LeadBoard rejected mirror request'),
      cause: {
        name: 'Error',
        message: 'upstream validation failed',
        stack: expect.any(String),
      },
    });

    errorSpy.mockRestore();
  });

  it('logs non-Error thrown values', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    logUnhandledRequestError(context, 'boom');

    const [, payload] = errorSpy.mock.calls[0]!;
    const details = JSON.parse(String(payload));
    expect(details).toMatchObject({
      request_id: 'req_test_123',
      method: 'POST',
      pathname: '/api/demo/v1/start',
      error_name: 'NonErrorThrown',
      error_message: 'boom',
    });

    errorSpy.mockRestore();
  });
});
