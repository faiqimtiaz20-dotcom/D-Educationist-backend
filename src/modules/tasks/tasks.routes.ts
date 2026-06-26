import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { parseListQuery, paginated, skipTake } from '../../shared/pagination.js'
import { getTenantId } from '../../shared/scope.js'
import { notFound } from '../../shared/errors.js'

export const tasksRouter = Router()

function mapTask(t: {
  id: string
  title: string
  description: string | null
  dueDate: Date
  assignedTo: string
  status: string
  priority: string
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? undefined,
    dueDate: t.dueDate.toISOString().slice(0, 10),
    assignedTo: t.assignedTo,
    status: t.status,
    priority: t.priority,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }
}

tasksRouter.get('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const query = parseListQuery(req)

  const where = {
    tenantId,
    ...(query.status ? { status: query.status as 'pending' | 'completed' } : {}),
    ...(query.search
      ? { title: { contains: query.search, mode: 'insensitive' as const } }
      : {}),
  }

  const [total, rows] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({ where, ...skipTake(query.page, query.pageSize), orderBy: { dueDate: 'asc' } }),
  ])

  res.json(paginated(rows.map(mapTask), total, query.page, query.pageSize))
})

tasksRouter.post('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const body = req.body
  const created = await prisma.task.create({
    data: {
      tenantId,
      title: body.title,
      description: body.description,
      dueDate: new Date(body.dueDate),
      assignedTo: body.assignedTo,
      priority: body.priority ?? 'medium',
      status: 'pending',
    },
  })
  res.status(201).json(mapTask(created))
})

tasksRouter.patch('/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  const existing = await prisma.task.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) throw notFound('Task not found')

  const body = req.body
  const updated = await prisma.task.update({
    where: { id: req.params.id },
    data: {
      title: body.title,
      description: body.description,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      assignedTo: body.assignedTo,
      status: body.status,
      priority: body.priority,
    },
  })
  res.json(mapTask(updated))
})

tasksRouter.delete('/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  await prisma.task.deleteMany({ where: { id: req.params.id, tenantId } })
  res.json({ deleted: 1 })
})
