import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { authenticate } from '../../middleware/auth.js'
import { getTenantId } from '../../shared/scope.js'
import { notFound } from '../../shared/errors.js'

export const mastersRouter = Router()

mastersRouter.get('/:category', async (req, res) => {
  const tenantId = await getTenantId(req)
  const category = req.params.category

  const items = await prisma.masterItem.findMany({
    where: { tenantId, category },
    orderBy: { name: 'asc' },
  })

  res.json({
    data: items.map((i) => ({ id: i.id, name: i.name, meta: i.meta ?? undefined })),
    total: items.length,
    page: 1,
    pageSize: items.length,
  })
})

mastersRouter.post('/:category', async (req, res) => {
  const tenantId = await getTenantId(req)
  const created = await prisma.masterItem.create({
    data: {
      tenantId,
      category: req.params.category,
      name: req.body.name,
      meta: req.body.meta ?? undefined,
    },
  })
  res.status(201).json({ id: created.id, name: created.name, meta: created.meta ?? undefined })
})

mastersRouter.patch('/:category/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  const updated = await prisma.masterItem.updateMany({
    where: { id: req.params.id, tenantId, category: req.params.category },
    data: { name: req.body.name, meta: req.body.meta ?? undefined },
  })
  if (!updated.count) throw notFound('Master item not found')
  res.json({ success: true })
})

mastersRouter.delete('/:category/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  await prisma.masterItem.deleteMany({
    where: { id: req.params.id, tenantId, category: req.params.category },
  })
  res.json({ deleted: 1 })
})

// Tenants (super-admin placeholder - requires platform user)
export const tenantsRouter = Router()

tenantsRouter.get('/', authenticate(), async (_req, res) => {
  const tenants = await prisma.tenant.findMany({ orderBy: { name: 'asc' } })
  res.json({ data: tenants, total: tenants.length, page: 1, pageSize: tenants.length })
})
