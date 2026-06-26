import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { getTenantId } from '../../shared/scope.js'

export const integrationsRouter = Router()

integrationsRouter.get('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const rows = await prisma.tenantIntegration.findMany({ where: { tenantId } })
  const map: Record<string, { connected: boolean; fields: Record<string, string> }> = {}
  for (const row of rows) {
    map[row.integrationKey] = {
      connected: row.connected,
      fields: (row.config as Record<string, string>) ?? {},
    }
  }
  res.json(map)
})

integrationsRouter.get('/:key', async (req, res) => {
  const tenantId = await getTenantId(req)
  const row = await prisma.tenantIntegration.findUnique({
    where: { tenantId_integrationKey: { tenantId, integrationKey: req.params.key } },
  })
  res.json({
    connected: row?.connected ?? false,
    fields: (row?.config as Record<string, string>) ?? {},
  })
})

integrationsRouter.patch('/:key', async (req, res) => {
  const tenantId = await getTenantId(req)
  const { connected, fields } = req.body

  const row = await prisma.tenantIntegration.upsert({
    where: { tenantId_integrationKey: { tenantId, integrationKey: req.params.key } },
    create: {
      tenantId,
      integrationKey: req.params.key,
      connected: connected ?? false,
      config: fields ?? {},
    },
    update: {
      connected: connected ?? false,
      config: fields ?? {},
    },
  })

  res.json({
    connected: row.connected,
    fields: (row.config as Record<string, string>) ?? {},
  })
})
