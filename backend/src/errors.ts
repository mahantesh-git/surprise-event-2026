import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';

export class HttpError extends Error {
  statusCode: number;
  expose: boolean;

  constructor(statusCode: number, message: string, options?: { expose?: boolean }) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.expose = options?.expose ?? statusCode < 500;
  }
}

type AsyncHandler<TRequest extends Request = Request> = (
  request: TRequest,
  response: Response,
  next: NextFunction,
) => Promise<unknown>;

export function asyncHandler<TRequest extends Request = Request>(
  handler: AsyncHandler<TRequest>,
): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request as TRequest, response, next)).catch(next);
  };
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}

type ErrorLogger = (message?: any, ...optionalParams: any[]) => void;

export function createApiErrorHandler(logError: ErrorLogger = console.error): ErrorRequestHandler {
  return (error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (response.headersSent) {
      return;
    }

    if (isHttpError(error)) {
      if (error.statusCode >= 500) {
        logError('API error:', error);
      }

      response.status(error.statusCode).json({ error: error.expose ? error.message : 'Internal server error' });
      return;
    }

    logError('API error:', error);
    response.status(500).json({ error: 'Internal server error' });
  };
}
