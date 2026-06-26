import type { Portal } from '@prisma/client'

export interface AuthUser {
  sub: string
  tenantId: string | null
  role: string
  portal: Portal
  branchId?: string | null
  branchName?: string | null
  partnerId?: string | null
  studentId?: string | null
  email: string
  name: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export {}
