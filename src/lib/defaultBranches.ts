import { prisma } from './prisma.js'

export const DEFAULT_BRANCHES = [
  { name: 'Head Office', code: 'HO' },
  { name: 'Lahore', code: 'LHR' },
  { name: 'Karachi', code: 'KHI' },
  { name: 'Islamabad', code: 'ISB' },
] as const

export async function ensureDefaultBranches() {
  const tenants = await prisma.tenant.findMany({ select: { id: true } })
  if (tenants.length === 0) return

  for (const tenant of tenants) {
    for (const { name, code } of DEFAULT_BRANCHES) {
      await prisma.branch.upsert({
        where: { tenantId_code: { tenantId: tenant.id, code } },
        create: { tenantId: tenant.id, name, code },
        update: { name },
      })
    }
  }
}
