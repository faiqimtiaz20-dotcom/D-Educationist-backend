import type { NextFunction, Request, Response } from 'express'
import crypto from 'node:crypto'
import type { SignOptions } from 'jsonwebtoken'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { unauthorized } from '../shared/errors.js'
import type { AuthUser } from '../shared/types.js'

export interface TokenPayload {
  sub: string
  tenantId: string | null
  role: string
  portal: 'admin' | 'partner' | 'student'
  branchId?: string | null
  branchName?: string | null
  partnerId?: string | null
  studentId?: string | null
  email: string
  name: string
}

export function signAccessToken(payload: TokenPayload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
  })
}

export function signRefreshToken(userId: string) {
  return jwt.sign({ sub: userId, type: 'refresh', jti: crypto.randomUUID() }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
  })
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload
}

export function verifyRefreshToken(token: string): { sub: string } {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string; type?: string }
  return { sub: payload.sub }
}

export function authenticate(required = true) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      if (required) return next(unauthorized())
      return next()
    }
    try {
      const token = header.slice(7)
      req.user = verifyAccessToken(token) as AuthUser
      next()
    } catch {
      next(unauthorized('Invalid or expired token'))
    }
  }
}

export function requirePortal(...portals: Array<'admin' | 'partner' | 'student'>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized())
    if (!portals.includes(req.user.portal)) {
      return next(unauthorized('Invalid portal for this user'))
    }
    next()
  }
}

export function buildTenantWhere(req: Request, extra: Record<string, unknown> = {}) {
  const user = req.user
  if (!user?.tenantId) {
    return { ...extra, id: '__none__' }
  }

  const where: Record<string, unknown> = { tenantId: user.tenantId, deletedAt: null, ...extra }

  if (user.portal === 'partner' && user.partnerId) {
    where.partnerId = user.partnerId
    where.isPartner = true
  }

  if (user.portal === 'student' && user.studentId) {
    where.student = { studentRef: user.studentId }
  }

  return where
}

export function applyListScope(
  req: Request,
  query: { partnerId?: string; isPartner?: boolean; branch?: string },
) {
  const user = req.user
  const where: Record<string, unknown> = {}

  if (user?.portal === 'partner' && user.partnerId) {
    where.partnerId = user.partnerId
    where.isPartner = true
  } else {
    if (query.partnerId) where.partnerId = query.partnerId
    if (query.isPartner !== undefined) where.isPartner = query.isPartner
  }

  if (user?.portal === 'student' && user.studentId) {
    where.student = { studentRef: user.studentId }
  }

  if (query.branch) {
    where.branch = { name: query.branch }
  }

  return where
}
