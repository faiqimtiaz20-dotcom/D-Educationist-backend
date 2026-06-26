import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { getTenantId } from '../../shared/scope.js'
import { notFound } from '../../shared/errors.js'

export const announcementsRouter = Router()

function mapAnnouncement(a: {
  id: string
  title: string
  body: string
  publishedAt: Date
  priority: string
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: a.id,
    title: a.title,
    body: a.body,
    date: a.publishedAt.toISOString().slice(0, 10),
    priority: a.priority,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }
}

announcementsRouter.get('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const rows = await prisma.announcement.findMany({
    where: { tenantId },
    orderBy: { publishedAt: 'desc' },
  })
  res.json({ data: rows.map(mapAnnouncement), total: rows.length, page: 1, pageSize: rows.length })
})

announcementsRouter.post('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const body = req.body
  const created = await prisma.announcement.create({
    data: {
      tenantId,
      title: body.title,
      body: body.body,
      publishedAt: body.date ? new Date(body.date) : new Date(),
      priority: body.priority === 'high' ? 'high' : 'normal',
    },
  })
  res.status(201).json(mapAnnouncement(created))
})

announcementsRouter.patch('/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  const existing = await prisma.announcement.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) throw notFound('Announcement not found')

  const body = req.body
  const updated = await prisma.announcement.update({
    where: { id: req.params.id },
    data: {
      title: body.title,
      body: body.body,
      publishedAt: body.date ? new Date(body.date) : undefined,
      priority: body.priority === 'high' ? 'high' : body.priority === 'normal' ? 'normal' : undefined,
    },
  })
  res.json(mapAnnouncement(updated))
})

announcementsRouter.delete('/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  await prisma.announcement.deleteMany({ where: { id: req.params.id, tenantId } })
  res.json({ deleted: 1 })
})
