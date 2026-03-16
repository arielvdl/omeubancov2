import type { Context } from 'hono';
import { ZodError } from 'zod';
import { env } from '../config/index.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
    this.name = 'ConflictError';
  }
}

export class InsufficientFundsError extends AppError {
  constructor() {
    super(422, 'Insufficient funds');
    this.name = 'InsufficientFundsError';
  }
}

export function errorHandler(err: Error, c: Context): Response {
  if (err instanceof ZodError) {
    return c.json(
      {
        error: 'Validation error',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
      400
    );
  }

  if (err instanceof AppError) {
    return c.json({ error: err.message }, err.statusCode as 400);
  }

  console.error('Unhandled error:', {
    name: err.name,
    message: err.message,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  return c.json({ error: 'Internal server error' }, 500);
}
