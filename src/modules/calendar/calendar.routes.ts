import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { parseListQuery, paginated, skipTake } from '../../shared/pagination.js'
import { getTenantId } from '../../shared/scope.js'
import { mapCalendarEvent } from '../../shared/mappers.js'
import { notFound } from '../../shared/errors.js'

export const calendarRouter = Router()

calendarRouter.get('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const query = parseListQuery(req)

  const where = {
    tenantId,
    ...(query.branch ? { branch: { name: query.branch } } : {}),
  }

  const [total, rows] = await Promise.all([
    prisma.calendarEvent.count({ where }),
    prisma.calendarEvent.findMany({
      where,
      include: { branch: true },
      ...skipTake(query.page, query.pageSize),
      orderBy: { start: 'asc' },
    }),
  ])

  res.json(paginated(rows.map(mapCalendarEvent), total, query.page, query.pageSize))
})

calendarRouter.post('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const body = req.body
  let branchId: string | null = null
  if (body.branch) {
    const branch = await prisma.branch.findFirst({ where: { tenantId, name: body.branch } })
    branchId = branch?.id ?? null
  }

  const created = await prisma.calendarEvent.create({
    data: {
      tenantId,
      branchId,
      staffId: body.staffId,
      title: body.title,
      start: new Date(body.start),
      end: body.end ? new Date(body.end) : null,
      category: body.category,
      eventType: body.eventType,
    },
    include: { branch: true },
  })
  res.status(201).json(mapCalendarEvent(created))
})

calendarRouter.patch('/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  const existing = await prisma.calendarEvent.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) throw notFound('Event not found')

  const body = req.body
  const updated = await prisma.calendarEvent.update({
    where: { id: req.params.id },
    data: {
      title: body.title,
      start: body.start ? new Date(body.start) : undefined,
      end: body.end ? new Date(body.end) : undefined,
      category: body.category,
      eventType: body.eventType,
    },
    include: { branch: true },
  })
  res.json(mapCalendarEvent(updated))
})

calendarRouter.get('/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  const row = await prisma.calendarEvent.findFirst({
    where: { id: req.params.id, tenantId },
    include: { branch: true },
  })
  if (!row) throw notFound('Event not found')
  res.json(mapCalendarEvent(row))
})

calendarRouter.delete('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const ids: string[] = req.body.ids ?? []
  const result = await prisma.calendarEvent.deleteMany({ where: { id: { in: ids }, tenantId } })
  res.json({ deleted: result.count })
})

calendarRouter.delete('/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  await prisma.calendarEvent.deleteMany({ where: { id: req.params.id, tenantId } })
  res.json({ deleted: 1 })
})
