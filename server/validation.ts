/**
 * Comprehensive Input Validation and Error Handling System
 * 
 * Provides robust validation for all API inputs with:
 * - Type checking
 * - Range validation
 * - String sanitization
 * - Array validation
 * - Custom validators
 */

import { z, ZodSchema } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { aiDataForwarder } from './aiDataForwarder';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export class AppValidationError extends Error {
  public errors: ValidationError[];
  public statusCode: number;

  constructor(errors: ValidationError[], statusCode = 400) {
    super('Validation failed');
    this.name = 'AppValidationError';
    this.errors = errors;
    this.statusCode = statusCode;
  }
}

/**
 * Common validation schemas
 */
export const CommonValidators = {
  id: z.union([z.string().min(1), z.number().int().positive()]),
  
  email: z.string().email('Invalid email format').toLowerCase(),
  
  url: z.string().url('Invalid URL format'),
  
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  
  positiveNumber: z.number().positive('Must be a positive number'),
  
  nonNegativeNumber: z.number().nonnegative('Must be non-negative'),
  
  integerInRange: (min: number, max: number) => 
    z.number().int().min(min).max(max),
  
  stringLength: (min: number, max: number) => 
    z.string().min(min, `Must be at least ${min} characters`).max(max, `Must be at most ${max} characters`),
  
  nonEmptyString: z.string().min(1, 'Required field cannot be empty').trim(),
  
  alphanumeric: z.string().regex(/^[a-zA-Z0-9]+$/, 'Must contain only letters and numbers'),
  
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Must be a valid slug (lowercase letters, numbers, and hyphens only)'),
  
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
  
  date: z.union([z.string().datetime(), z.date()]).transform(val => new Date(val)),
  
  booleanString: z.union([z.boolean(), z.string()]).transform(val => {
    if (typeof val === 'boolean') return val;
    return val.toLowerCase() === 'true';
  }),
  
  currency: z.number().positive().multipleOf(0.01, 'Currency must have at most 2 decimal places'),
  
  percentage: z.number().min(0).max(100),
  
  arrayOf: <T extends ZodSchema>(schema: T, minLength = 0, maxLength?: number) => {
    let arr = z.array(schema).min(minLength, `Must have at least ${minLength} items`);
    if (maxLength) {
      arr = arr.max(maxLength, `Must have at most ${maxLength} items`);
    }
    return arr;
  },
  
  enum: <T extends string>(values: T[]) => 
    z.enum(values as [T, ...T[]], { errorMap: () => ({ message: `Must be one of: ${values.join(', ')}` }) }),
};

/**
 * Sanitize string inputs to prevent XSS and injection attacks
 */
export function sanitizeString(str: string): string {
  return str
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .trim();
}

/**
 * Validate request body using Zod schema
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: ValidationError[] = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        // Log validation failure for AI analysis
        await aiDataForwarder.recordError({
          error: new AppValidationError(errors),
          context: `Body validation failed for ${req.method} ${req.path}`,
          userId: (req as any).user?.id,
          additionalData: {
            errors,
            requestBody: req.body,
          },
        });

        res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate request query parameters using Zod schema
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.query);
      req.query = validated as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: ValidationError[] = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        res.status(400).json({
          error: 'Invalid query parameters',
          details: errors,
        });
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate request params using Zod schema
 */
export function validateParams<T extends ZodSchema>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.params);
      req.params = validated as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: ValidationError[] = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        res.status(400).json({
          error: 'Invalid URL parameters',
          details: errors,
        });
      } else {
        next(error);
      }
    }
  };
}

/**
 * Enhanced error handler middleware
 */
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  // Log error for AI analysis
  aiDataForwarder.recordError({
    error: err,
    context: `${req.method} ${req.path}`,
    userId: (req as any).user?.id,
    additionalData: {
      query: req.query,
      params: req.params,
      body: req.body ? 'present' : 'absent',
    },
  }).catch(console.error);

  // Handle different error types
  if (err instanceof AppValidationError) {
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.errors,
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired authentication token',
    });
  }

  if (err.code === '23505') { // PostgreSQL unique violation
    return res.status(409).json({
      error: 'Conflict',
      message: 'Resource already exists',
    });
  }

  if (err.code === '23503') { // PostgreSQL foreign key violation
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Referenced resource does not exist',
    });
  }

  // Default error response
  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode === 500 
    ? 'An unexpected error occurred' 
    : err.message || 'Request failed';

  console.error('[Error Handler]', {
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
  });

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal Server Error' : 'Request Failed',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * Async handler wrapper to catch errors
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Rate limit validation middleware
 */
export function validateRateLimit(maxRequests: number, windowMs: number, identifier = 'ip') {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = identifier === 'ip' 
      ? req.ip || 'unknown' 
      : (req as any).user?.id || req.ip || 'unknown';

    const now = Date.now();
    const record = requests.get(key);

    if (!record || now > record.resetTime) {
      requests.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil((record.resetTime - now) / 1000)} seconds`,
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
    }

    record.count++;
    next();
  };
}
