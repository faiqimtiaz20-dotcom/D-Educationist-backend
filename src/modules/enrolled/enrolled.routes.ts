import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { applyListScope } from '../../middleware/auth.js'
import { parseListQuery, paginated, skipTake } from '../../shared/pagination.js'
import { getTenantId } from '../../shared/scope.js'
import { mapEnrolled } from '../../shared/mappers.js'

export const enrolledRouter = Router()

const include = { student: true, partner: true, branch: true }

enrolledRouter.get('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const query = parseListQuery(req)
  const scope = applyListScope(req, query)

  const where = {
    tenantId,
    ...scope,
    ...(query.status ? { status: query.status } : {}),
  }

  const [total, rows] = await Promise.all([
    prisma.enrolledRecord.count({ where }),
    prisma.enrolledRecord.findMany({ where, include, ...skipTake(query.page, query.pageSize), orderBy: { createdAt: 'desc' } }),
  ])

  res.json(paginated(rows.map(mapEnrolled), total, query.page, query.pageSize))
})
