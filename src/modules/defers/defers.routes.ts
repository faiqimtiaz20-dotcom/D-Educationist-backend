import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { applyListScope } from '../../middleware/auth.js'
import { parseListQuery, paginated, skipTake } from '../../shared/pagination.js'
import { getTenantId } from '../../shared/scope.js'
import { mapDefer } from '../../shared/mappers.js'

export const defersRouter = Router()

const include = { student: true, partner: true, branch: true }

defersRouter.get('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const query = parseListQuery(req)
  const scope = applyListScope(req, query)

  const where = { tenantId, ...scope }

  const [total, rows] = await Promise.all([
    prisma.deferRecord.count({ where }),
    prisma.deferRecord.findMany({ where, include, ...skipTake(query.page, query.pageSize), orderBy: { createdAt: 'desc' } }),
  ])

  res.json(paginated(rows.map(mapDefer), total, query.page, query.pageSize))
})
