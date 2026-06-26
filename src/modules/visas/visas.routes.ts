import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { applyListScope } from '../../middleware/auth.js'
import { parseListQuery, paginated, skipTake } from '../../shared/pagination.js'
import { getTenantId } from '../../shared/scope.js'
import { mapVisa } from '../../shared/mappers.js'
import { notFound } from '../../shared/errors.js'

export const visasRouter = Router()

const include = { student: true, partner: true, branch: true }

visasRouter.get('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const query = parseListQuery(req)
  const scope = applyListScope(req, query)

  const where = {
    tenantId,
    deletedAt: null,
    ...scope,
    ...(query.status ? { visaStatus: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { student: { firstName: { contains: query.search, mode: 'insensitive' as const } } },
            { student: { lastName: { contains: query.search, mode: 'insensitive' as const } } },
            { student: { studentRef: { contains: query.search, mode: 'insensitive' as const } } },
            { university: { contains: query.search, mode: 'insensitive' as const } },
            { appliedCountry: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [total, rows] = await Promise.all([
    prisma.visaRecord.count({ where }),
    prisma.visaRecord.findMany({ where, include, ...skipTake(query.page, query.pageSize), orderBy: { createdAt: 'desc' } }),
  ])

  res.json(paginated(rows.map(mapVisa), total, query.page, query.pageSize))
})

visasRouter.get('/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  const row = await prisma.visaRecord.findFirst({
    where: { id: req.params.id, tenantId, deletedAt: null },
    include,
  })
  if (!row) throw notFound('Visa record not found')
  res.json(mapVisa(row))
})

visasRouter.patch('/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  const existing = await prisma.visaRecord.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) throw notFound('Visa record not found')

  const updated = await prisma.visaRecord.update({
    where: { id: req.params.id },
    data: {
      visaStatus: req.body.visaStatus ?? req.body.status,
      docStatus: req.body.docStatus,
      university: req.body.university,
      appliedCountry: req.body.appliedCountry,
      course: req.body.course,
      intake: req.body.intake,
      passportNo: req.body.passportNo,
    },
    include,
  })
  res.json(mapVisa(updated))
})

visasRouter.delete('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const ids: string[] = req.body.ids ?? []
  const result = await prisma.visaRecord.updateMany({
    where: { id: { in: ids }, tenantId },
    data: { deletedAt: new Date() },
  })
  res.json({ deleted: result.count })
})
