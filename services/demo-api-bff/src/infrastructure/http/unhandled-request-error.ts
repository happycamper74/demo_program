import type { RequestContext } from './http-utils.js';

function serializeCause(cause: unknown): unknown {
  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message,
      stack: cause.stack,
    };
  }

  return cause;
}

export function logUnhandledRequestError(context: RequestContext, error: unknown): void {
  const details =
    error instanceof Error
      ? {
          request_id: context.requestId,
          method: context.method,
          pathname: context.pathname,
          error_name: error.name,
          error_message: error.message,
          stack: error.stack,
          cause: serializeCause(error.cause),
        }
      : {
          request_id: context.requestId,
          method: context.method,
          pathname: context.pathname,
          error_name: 'NonErrorThrown',
          error_message: String(error),
          stack: undefined,
          cause: undefined,
        };

  console.error('demo-api-bff.unhandled_request_error', JSON.stringify(details));
}
