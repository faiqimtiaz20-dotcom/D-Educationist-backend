import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { getTenantId } from '../../shared/scope.js'
import { notFound } from '../../shared/errors.js'

export const activitiesRouter = Router()

activitiesRouter.get('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const entityType = String(req.query.entityType ?? '')
  const entityId = String(req.query.entityId ?? '')

  const rows = await prisma.auditLog.findMany({
    where: { tenantId, entity: entityType, entityId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  res.json({
    data: rows.map((r) => ({
      id: r.id,
      entityType: r.entity,
      entityId: r.entityId,
      action: r.action,
      detail: (r.meta as { detail?: string })?.detail,
      user: (r.meta as { userName?: string })?.userName ?? 'System',
      createdAt: r.createdAt.toISOString(),
    })),
  })
})

activitiesRouter.post('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const { entityType, entityId, action, detail } = req.body

  const created = await prisma.auditLog.create({
    data: {
      tenantId,
      userId: req.user?.sub ?? null,
      entity: entityType,
      entityId,
      action,
      meta: { detail, userName: req.user?.name ?? "D' Educationist" },
    },
  })

  res.status(201).json({
    id: created.id,
    entityType: created.entity,
    entityId: created.entityId,
    action: created.action,
    detail,
    user: req.user?.name ?? "D' Educationist",
    createdAt: created.createdAt.toISOString(),
  })
})

export const notesRouter = Router()

notesRouter.get('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const entityType = String(req.query.entityType ?? '')
  const entityId = String(req.query.entityId ?? '')

  const rows = await prisma.entityNote.findMany({
    where: { tenantId, entityType, entityId },
    orderBy: { createdAt: 'desc' },
  })

  res.json({
    data: rows.map((n) => ({
      id: n.id,
      entityType: n.entityType,
      entityId: n.entityId,
      text: n.text,
      user: n.authorName,
      createdAt: n.createdAt.toISOString(),
    })),
  })
})

notesRouter.post('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const { entityType, entityId, text } = req.body

  const created = await prisma.entityNote.create({
    data: {
      tenantId,
      entityType,
      entityId,
      text,
      authorName: req.user?.name ?? "D' Educationist",
      userId: req.user?.sub ?? null,
    },
  })

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: req.user?.sub ?? null,
      entity: entityType,
      entityId,
      action: 'Note added',
      meta: { detail: text.slice(0, 80), userName: req.user?.name },
    },
  })

  res.status(201).json({
    id: created.id,
    entityType: created.entityType,
    entityId: created.entityId,
    text: created.text,
    user: created.authorName,
    createdAt: created.createdAt.toISOString(),
  })
})

notesRouter.delete('/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  const result = await prisma.entityNote.deleteMany({ where: { id: req.params.id, tenantId } })
  if (!result.count) throw notFound('Note not found')
  res.json({ deleted: 1 })
})
