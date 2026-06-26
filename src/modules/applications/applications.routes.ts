import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { applyListScope } from '../../middleware/auth.js'
import { parseListQuery, paginated, skipTake } from '../../shared/pagination.js'
import { getTenantId, resolveBranchId } from '../../shared/scope.js'
import { mapApplication } from '../../shared/mappers.js'
import { notFound, badRequest } from '../../shared/errors.js'

export const applicationsRouter = Router()

const include = { student: true, partner: true, branch: true }

applicationsRouter.get('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const query = parseListQuery(req)
  const scope = applyListScope(req, query)

  const where = {
    tenantId,
    deletedAt: null,
    ...scope,
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { student: { firstName: { contains: query.search, mode: 'insensitive' as const } } },
            { student: { lastName: { contains: query.search, mode: 'insensitive' as const } } },
            { student: { studentRef: { contains: query.search, mode: 'insensitive' as const } } },
            { university: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [total, rows] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.findMany({ where, include, ...skipTake(query.page, query.pageSize), orderBy: { createdAt: 'desc' } }),
  ])

  res.json(paginated(rows.map(mapApplication), total, query.page, query.pageSize))
})

applicationsRouter.get('/:applicationId/comments', async (req, res) => {
  const tenantId = await getTenantId(req)
  const application = await prisma.application.findFirst({
    where: { id: req.params.applicationId, tenantId, deletedAt: null },
  })
  if (!application) throw notFound('Application not found')

  const rows = await prisma.applicationComment.findMany({
    where: { tenantId, applicationId: req.params.applicationId },
    orderBy: { createdAt: 'desc' },
  })

  res.json({
    data: rows.map((c) => ({
      id: c.id,
      applicationId: c.applicationId,
      comment: c.comment,
      attachmentName: c.attachmentName ?? undefined,
      createdBy: c.authorName,
      createdAt: c.createdAt.toISOString(),
    })),
  })
})

applicationsRouter.post('/:applicationId/comments', async (req, res) => {
  const tenantId = await getTenantId(req)
  const application = await prisma.application.findFirst({
    where: { id: req.params.applicationId, tenantId, deletedAt: null },
  })
  if (!application) throw notFound('Application not found')

  const comment = String(req.body.comment ?? '').trim()
  if (!comment) throw badRequest('comment is required')

  const authorName = req.user?.name ?? "D' Educationist"
  const created = await prisma.applicationComment.create({
    data: {
      tenantId,
      applicationId: req.params.applicationId,
      comment,
      attachmentName: req.body.attachmentName ?? null,
      authorName,
      userId: req.user?.sub ?? null,
    },
  })

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: req.user?.sub ?? null,
      entity: 'application',
      entityId: req.params.applicationId,
      action: 'Application comment added',
      meta: { detail: comment.slice(0, 80), userName: authorName },
    },
  })

  res.status(201).json({
    id: created.id,
    applicationId: created.applicationId,
    comment: created.comment,
    attachmentName: created.attachmentName ?? undefined,
    createdBy: created.authorName,
    createdAt: created.createdAt.toISOString(),
  })
})

applicationsRouter.get('/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  const row = await prisma.application.findFirst({
    where: { id: req.params.id, tenantId, deletedAt: null },
    include,
  })
  if (!row) throw notFound('Application not found')
  res.json(mapApplication(row))
})

applicationsRouter.post('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const body = req.body
  const student = await prisma.student.findFirst({ where: { id: body.studentId, tenantId } })
  if (!student) throw notFound('Student not found')
  const branchId = student.branchId

  const created = await prisma.application.create({
    data: {
      tenantId,
      studentId: body.studentId,
      branchId,
      partnerId: body.partnerId ?? student.partnerId,
      applicationCount: body.applicationCount ?? 1,
      docStatus: body.docStatus ?? 'Pending',
      intCountry: body.intCountry,
      intake: body.intake,
      intCourse: body.intCourse,
      applyLevel: body.applyLevel,
      passportNo: body.passportNo,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
      status: body.status ?? 'Application Started',
      university: body.university,
      associate: body.associate,
      deadlineDate: body.deadlineDate ? new Date(body.deadlineDate) : null,
      isPartner: body.isPartner ?? Boolean(student.partnerId),
      assignedBy: body.assignedBy ?? student.assignedBy,
      assignedTo: body.assignedTo ?? student.assignedTo,
    },
    include,
  })
  res.status(201).json(mapApplication(created))
})

applicationsRouter.patch('/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  const existing = await prisma.application.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) throw notFound('Application not found')

  const updated = await prisma.application.update({
    where: { id: req.params.id },
    data: {
      status: req.body.status,
      university: req.body.university,
      associate: req.body.associate,
      deadlineDate: req.body.deadlineDate ? new Date(req.body.deadlineDate) : undefined,
      docStatus: req.body.docStatus,
    },
    include,
  })
  res.json(mapApplication(updated))
})

applicationsRouter.delete('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const ids: string[] = req.body.ids ?? []
  const result = await prisma.application.updateMany({
    where: { id: { in: ids }, tenantId },
    data: { deletedAt: new Date() },
  })
  res.json({ deleted: result.count })
})
