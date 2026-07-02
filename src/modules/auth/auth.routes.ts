import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { prisma } from '../../lib/prisma.js'
import { validateBody } from '../../middleware/errorHandler.js'
import { authenticate, signAccessToken, signRefreshToken, verifyRefreshToken } from '../../middleware/auth.js'
import { badRequest, unauthorized } from '../../shared/errors.js'
import { mapAuthUser } from '../../shared/mappers.js'
import { env, frontendUrl } from '../../config/env.js'

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  portal: z.enum(['admin', 'partner', 'student']),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

const forgotSchema = z.object({
  email: z.string().email(),
})

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
})

export const authRouter = Router()

authRouter.post('/login', validateBody(loginSchema), async (req, res) => {
  const { username, password, portal } = req.body
  const email = username.trim().toLowerCase()

  const user = await prisma.user.findFirst({
    where: {
      email,
      isActive: true,
      role: { portal },
    },
    include: {
      role: true,
      branch: true,
      student: true,
    },
  })

  if (!user) throw unauthorized('Invalid credentials')

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) throw unauthorized('Invalid credentials')

  const payload = {
    sub: user.id,
    tenantId: user.tenantId,
    role: user.role.name,
    portal: user.role.portal,
    branchId: user.branchId,
    branchName: user.branch?.name ?? null,
    partnerId: user.partnerId,
    studentId: user.student?.studentRef ?? null,
    email: user.email,
    name: user.name,
  }

  const accessToken = signAccessToken(payload)
  const refreshToken = signRefreshToken(user.id)
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  })

  res.json({
    user: mapAuthUser(user),
    accessToken,
    refreshToken,
  })
})

authRouter.post('/refresh', validateBody(refreshSchema), async (req, res) => {
  const { refreshToken } = req.body
  let userId: string
  try {
    userId = verifyRefreshToken(refreshToken).sub
  } catch {
    throw unauthorized('Invalid refresh token')
  }

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
  const stored = await prisma.refreshToken.findFirst({
    where: { userId, tokenHash, expiresAt: { gt: new Date() } },
  })
  if (!stored) throw unauthorized('Refresh token expired or revoked')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true, branch: true, student: true },
  })
  if (!user || !user.isActive) throw unauthorized('User not found')

  const payload = {
    sub: user.id,
    tenantId: user.tenantId,
    role: user.role.name,
    portal: user.role.portal,
    branchId: user.branchId,
    branchName: user.branch?.name ?? null,
    partnerId: user.partnerId,
    studentId: user.student?.studentRef ?? null,
    email: user.email,
    name: user.name,
  }

  res.json({
    user: mapAuthUser(user),
    accessToken: signAccessToken(payload),
  })
})

authRouter.post('/logout', authenticate(), async (req, res) => {
  if (req.user?.sub) {
    await prisma.refreshToken.deleteMany({ where: { userId: req.user.sub } })
  }
  res.json({ success: true })
})

authRouter.get('/me', authenticate(), async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    include: { role: true, branch: true, student: true },
  })
  if (!user) throw badRequest('User not found')
  res.json({ user: mapAuthUser(user) })
})

authRouter.post('/forgot-password', validateBody(forgotSchema), async (req, res) => {
  const email = req.body.email.trim().toLowerCase()
  const user = await prisma.user.findFirst({ where: { email, isActive: true } })

  if (user) {
    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })
    await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } })

    const resetUrl = `${frontendUrl}/reset-password?token=${token}`
    if (env.NODE_ENV === 'development') {
      console.log(`[password-reset] ${email}: ${resetUrl}`)
    }
  }

  res.json({ success: true, message: 'If the email exists, a reset link has been sent.' })
})

authRouter.post('/reset-password', validateBody(resetSchema), async (req, res) => {
  const { token, password } = req.body
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

  const stored = await prisma.passwordResetToken.findFirst({
    where: { tokenHash, expiresAt: { gt: new Date() } },
  })
  if (!stored) throw badRequest('Invalid or expired reset token')

  const passwordHash = await bcrypt.hash(password, 10)
  await prisma.user.update({ where: { id: stored.userId }, data: { passwordHash } })
  await prisma.passwordResetToken.deleteMany({ where: { userId: stored.userId } })

  res.json({ success: true })
})
