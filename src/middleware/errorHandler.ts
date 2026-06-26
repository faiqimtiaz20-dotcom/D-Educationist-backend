import type { NextFunction, Request, Response } from 'express'
import { ZodError, type ZodSchema } from 'zod'
import { AppError, badRequest } from '../shared/errors.js'

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        next(badRequest('Validation failed', err.flatten()))
      } else {
        next(err)
      }
    }
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details,
    })
  }

  console.error(err)
  return res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  })
}
