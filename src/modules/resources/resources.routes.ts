import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { getTenantId } from '../../shared/scope.js'
import { notFound } from '../../shared/errors.js'

export const resourcesRouter = Router()

function mapResource(r: {
  id: string
  title: string
  description: string
  type: string
  category: string
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    type: r.type,
    category: r.category,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

resourcesRouter.get('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const rows = await prisma.learningResource.findMany({
    where: { tenantId },
    orderBy: { title: 'asc' },
  })
  res.json({ data: rows.map(mapResource), total: rows.length, page: 1, pageSize: rows.length })
})

resourcesRouter.post('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const body = req.body
  const created = await prisma.learningResource.create({
    data: {
      tenantId,
      title: body.title,
      description: body.description,
      type: body.type,
      category: body.category,
    },
  })
  res.status(201).json(mapResource(created))
})

resourcesRouter.patch('/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  const existing = await prisma.learningResource.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) throw notFound('Resource not found')

  const body = req.body
  const updated = await prisma.learningResource.update({
    where: { id: req.params.id },
    data: {
      title: body.title,
      description: body.description,
      type: body.type,
      category: body.category,
    },
  })
  res.json(mapResource(updated))
})

resourcesRouter.delete('/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  await prisma.learningResource.deleteMany({ where: { id: req.params.id, tenantId } })
  res.json({ deleted: 1 })
})
