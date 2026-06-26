import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { getTenantId } from '../../shared/scope.js'

export const universitiesRouter = Router()

universitiesRouter.get('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const grouped = await prisma.universityMaster.groupBy({
    by: ['country'],
    where: { tenantId },
    _count: { id: true },
  })

  res.json({
    data: grouped.map((g) => ({ country: g.country, count: g._count.id })),
    total: grouped.length,
    page: 1,
    pageSize: grouped.length,
  })
})

universitiesRouter.post('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const { country, name, commissionContract } = req.body
  await prisma.universityMaster.create({
    data: {
      tenantId,
      country,
      name: name ?? `${country} University`,
      commissionContract: commissionContract ?? 'Standard Commission',
    },
  })
  res.status(201).json({ success: true })
})
