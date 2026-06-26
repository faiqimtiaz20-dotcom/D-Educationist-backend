import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { parseListQuery, paginated, skipTake } from '../../shared/pagination.js'
import { getTenantId } from '../../shared/scope.js'
import { mapCourse } from '../../shared/mappers.js'

export const coursesRouter = Router()

coursesRouter.get('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const query = parseListQuery(req)
  const country = typeof req.query.country === 'string' ? req.query.country : undefined
  const level = typeof req.query.level === 'string' ? req.query.level : undefined
  const course = typeof req.query.course === 'string' ? req.query.course : undefined
  const intake = typeof req.query.intake === 'string' ? req.query.intake : undefined

  const where = {
    tenantId,
    ...(country ? { country } : {}),
    ...(level ? { level } : {}),
    ...(course ? { course: { contains: course, mode: 'insensitive' as const } } : {}),
    ...(intake ? { intake } : {}),
    ...(query.search
      ? {
          OR: [
            { university: { contains: query.search, mode: 'insensitive' as const } },
            { course: { contains: query.search, mode: 'insensitive' as const } },
            { country: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [total, rows] = await Promise.all([
    prisma.course.count({ where }),
    prisma.course.findMany({ where, ...skipTake(query.page, query.pageSize), orderBy: { university: 'asc' } }),
  ])

  res.json(paginated(rows.map(mapCourse), total, query.page, query.pageSize))
})
