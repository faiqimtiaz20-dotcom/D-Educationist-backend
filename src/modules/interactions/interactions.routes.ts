import { Router } from 'express'
import { InteractionKind } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { getTenantId } from '../../shared/scope.js'
import { badRequest } from '../../shared/errors.js'

export const interactionsRouter = Router()

function mapInteraction(row: {
  id: string
  entityType: string
  entityId: string
  kind: InteractionKind
  action: string
  remarks: string
  stage: string
  attempt: number
  nextDate: string | null
  nextTime: string | null
  authorName: string
  createdAt: Date
}) {
  return {
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    kind: row.kind,
    action: row.action,
    remarks: row.remarks,
    stage: row.stage,
    attempt: row.attempt,
    nextDate: row.nextDate ?? undefined,
    nextTime: row.nextTime ?? undefined,
    createdBy: row.authorName,
    createdAt: row.createdAt.toISOString(),
  }
}

interactionsRouter.get('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const entityType = String(req.query.entityType ?? '')
  const entityId = String(req.query.entityId ?? '')
  const kind = String(req.query.kind ?? '') as InteractionKind

  if (!entityType || !entityId || !kind) {
    throw badRequest('entityType, entityId, and kind are required')
  }
  if (kind !== 'followup' && kind !== 'appointment') {
    throw badRequest('kind must be followup or appointment')
  }

  const rows = await prisma.entityInteraction.findMany({
    where: { tenantId, entityType, entityId, kind },
    orderBy: { createdAt: 'desc' },
  })

  res.json({ data: rows.map(mapInteraction) })
})

interactionsRouter.post('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const body = req.body
  const entityType = String(body.entityType ?? '')
  const entityId = String(body.entityId ?? '')
  const kind = String(body.kind ?? '') as InteractionKind

  if (!entityType || !entityId || !kind) {
    throw badRequest('entityType, entityId, and kind are required')
  }
  if (kind !== 'followup' && kind !== 'appointment') {
    throw badRequest('kind must be followup or appointment')
  }

  const attempt =
    (await prisma.entityInteraction.count({
      where: { tenantId, entityType, entityId, kind },
    })) + 1

  const authorName = req.user?.name ?? "D' Educationist"
  const actionLabel = kind === 'followup' ? 'Follow-up' : 'Appointment'

  const created = await prisma.entityInteraction.create({
    data: {
      tenantId,
      entityType,
      entityId,
      kind,
      action: body.action ?? actionLabel,
      remarks: String(body.remarks ?? ''),
      stage: String(body.stage ?? ''),
      attempt,
      nextDate: body.nextDate ?? null,
      nextTime: body.nextTime ?? null,
      authorName,
      userId: req.user?.sub ?? null,
    },
  })

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: req.user?.sub ?? null,
      entity: entityType,
      entityId,
      action: `${actionLabel} scheduled`,
      meta: { detail: String(body.remarks ?? '').slice(0, 80), userName: authorName },
    },
  })

  res.status(201).json(mapInteraction(created))
})
