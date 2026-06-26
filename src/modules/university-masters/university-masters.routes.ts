import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { parseListQuery, paginated, skipTake } from '../../shared/pagination.js'
import { getTenantId } from '../../shared/scope.js'
import { mapUniversityMaster } from '../../shared/mappers.js'
import { notFound } from '../../shared/errors.js'

export const universityMastersRouter = Router()

const include = { campuses: true }

universityMastersRouter.get('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const query = parseListQuery(req)
  const country = typeof req.query.country === 'string' ? req.query.country : undefined

  const where = {
    tenantId,
    ...(country ? { country } : {}),
    ...(query.search
      ? { name: { contains: query.search, mode: 'insensitive' as const } }
      : {}),
  }

  const [total, rows] = await Promise.all([
    prisma.universityMaster.count({ where }),
    prisma.universityMaster.findMany({ where, include, ...skipTake(query.page, query.pageSize), orderBy: { name: 'asc' } }),
  ])

  res.json(paginated(rows.map(mapUniversityMaster), total, query.page, query.pageSize))
})

universityMastersRouter.get('/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  const row = await prisma.universityMaster.findFirst({
    where: { id: req.params.id, tenantId },
    include,
  })
  if (!row) throw notFound('University not found')
  res.json(mapUniversityMaster(row))
})

universityMastersRouter.post('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const body = req.body
  const created = await prisma.universityMaster.create({
    data: {
      tenantId,
      country: body.country,
      name: body.name,
      commissionContract: body.commissionContract,
      agreementExpiry: body.agreementExpiry ? new Date(body.agreementExpiry) : null,
      agreementFileName: body.agreementFileName,
      logoFileName: body.logoFileName,
      campuses: body.campuses?.length ? { create: body.campuses } : undefined,
    },
    include,
  })
  res.status(201).json(mapUniversityMaster(created))
})

universityMastersRouter.patch('/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  const body = req.body
  const existing = await prisma.universityMaster.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) throw notFound('University not found')

  const updated = await prisma.universityMaster.update({
    where: { id: req.params.id },
    data: {
      country: body.country,
      name: body.name,
      commissionContract: body.commissionContract,
      agreementExpiry: body.agreementExpiry ? new Date(body.agreementExpiry) : undefined,
      agreementFileName: body.agreementFileName,
      logoFileName: body.logoFileName,
    },
    include,
  })
  res.json(mapUniversityMaster(updated))
})

universityMastersRouter.delete('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const ids: string[] = req.body.ids ?? []
  const result = await prisma.universityMaster.deleteMany({ where: { id: { in: ids }, tenantId } })
  res.json({ deleted: result.count })
})

universityMastersRouter.delete('/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  const result = await prisma.universityMaster.deleteMany({ where: { id: req.params.id, tenantId } })
  res.json({ deleted: result.count })
})

universityMastersRouter.post('/:id/campuses', async (req, res) => {
  const tenantId = await getTenantId(req)
  const master = await prisma.universityMaster.findFirst({ where: { id: req.params.id, tenantId } })
  if (!master) throw notFound('University not found')

  const campus = await prisma.universityCampus.create({
    data: {
      universityMasterId: master.id,
      name: req.body.name,
      city: req.body.city,
    },
  })
  res.status(201).json(campus)
})
