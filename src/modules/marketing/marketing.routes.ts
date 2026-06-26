import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { getTenantId } from '../../shared/scope.js'
import { notFound } from '../../shared/errors.js'

export const marketingRouter = Router()

function mapCampaign(c: {
  id: string
  name: string
  channel: string
  status: string
  startDate: Date
  endDate: Date
  description: string | null
  audienceCountry: string | null
  audienceStatus: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: c.id,
    name: c.name,
    channel: c.channel,
    status: c.status,
    startDate: c.startDate.toISOString().slice(0, 10),
    endDate: c.endDate.toISOString().slice(0, 10),
    description: c.description ?? '',
    audienceCountry: c.audienceCountry ?? undefined,
    audienceStatus: c.audienceStatus ?? undefined,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}

marketingRouter.get('/campaigns', async (req, res) => {
  const tenantId = await getTenantId(req)
  const rows = await prisma.marketingCampaign.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ data: rows.map(mapCampaign), total: rows.length, page: 1, pageSize: rows.length })
})

marketingRouter.post('/campaigns', async (req, res) => {
  const tenantId = await getTenantId(req)
  const body = req.body
  const created = await prisma.marketingCampaign.create({
    data: {
      tenantId,
      name: body.name,
      channel: body.channel,
      status: body.status ?? 'Draft',
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      description: body.description,
      audienceCountry: body.audienceCountry,
      audienceStatus: body.audienceStatus,
    },
  })
  res.status(201).json(mapCampaign(created))
})

marketingRouter.patch('/campaigns/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  const existing = await prisma.marketingCampaign.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) throw notFound('Campaign not found')

  const body = req.body
  const updated = await prisma.marketingCampaign.update({
    where: { id: req.params.id },
    data: {
      name: body.name,
      channel: body.channel,
      status: body.status,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      description: body.description,
      audienceCountry: body.audienceCountry,
      audienceStatus: body.audienceStatus,
    },
  })
  res.json(mapCampaign(updated))
})

marketingRouter.delete('/campaigns/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  await prisma.marketingCampaign.deleteMany({ where: { id: req.params.id, tenantId } })
  res.json({ deleted: 1 })
})
