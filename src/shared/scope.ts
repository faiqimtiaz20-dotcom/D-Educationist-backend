import type { Request } from 'express'
import { prisma } from '../lib/prisma.js'
import { notFound } from './errors.js'

export async function getTenantId(req: Request): Promise<string> {
  if (!req.user?.tenantId) throw notFound('Tenant context required')
  return req.user.tenantId
}

export async function resolveBranchId(tenantId: string, branchName: string) {
  const branch = await prisma.branch.findFirst({
    where: { tenantId, name: branchName },
  })
  if (!branch) throw notFound(`Branch not found: ${branchName}`)
  return branch.id
}

export function buildSearchFilter(search: string | undefined, fields: string[]) {
  if (!search?.trim()) return undefined
  const q = search.trim()
  return {
    OR: fields.map((field) => ({
      [field]: { contains: q, mode: 'insensitive' as const },
    })),
  }
}

export function studentSearchFilter(search: string | undefined) {
  if (!search?.trim()) return undefined
  const q = search.trim()
  return {
    OR: [
      { firstName: { contains: q, mode: 'insensitive' as const } },
      { lastName: { contains: q, mode: 'insensitive' as const } },
      { email: { contains: q, mode: 'insensitive' as const } },
      { mobile: { contains: q, mode: 'insensitive' as const } },
      { studentRef: { contains: q, mode: 'insensitive' as const } },
    ],
  }
}
