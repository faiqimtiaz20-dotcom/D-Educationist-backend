import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { getTenantId } from '../../shared/scope.js'
import { notFound } from '../../shared/errors.js'

export const qrFormsRouter = Router()

qrFormsRouter.get('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const rows = await prisma.qrForm.findMany({ where: { tenantId }, orderBy: { updatedAt: 'desc' } })
  res.json({
    data: rows.map((f) => ({
      id: f.id,
      name: f.name,
      assignTo: f.assignTo,
      fields: f.fields,
      isActive: f.isActive,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    })),
    total: rows.length,
    page: 1,
    pageSize: rows.length,
  })
})

qrFormsRouter.get('/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  const row = await prisma.qrForm.findFirst({ where: { id: req.params.id, tenantId } })
  if (!row) throw notFound('QR form not found')
  res.json({
    id: row.id,
    name: row.name,
    assignTo: row.assignTo,
    fields: row.fields,
    isActive: row.isActive,
  })
})

qrFormsRouter.post('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const body = req.body
  const created = await prisma.qrForm.create({
    data: {
      tenantId,
      name: body.name,
      assignTo: body.assignTo,
      fields: body.fields ?? [],
      isActive: body.isActive ?? true,
    },
  })
  res.status(201).json({ id: created.id, name: created.name, assignTo: created.assignTo, fields: created.fields })
})

qrFormsRouter.patch('/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  const existing = await prisma.qrForm.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) throw notFound('QR form not found')

  const body = req.body
  const updated = await prisma.qrForm.update({
    where: { id: req.params.id },
    data: {
      name: body.name,
      assignTo: body.assignTo,
      fields: body.fields,
      isActive: body.isActive,
    },
  })
  res.json({ id: updated.id, name: updated.name, assignTo: updated.assignTo, fields: updated.fields })
})

qrFormsRouter.delete('/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  await prisma.qrForm.deleteMany({ where: { id: req.params.id, tenantId } })
  res.json({ deleted: 1 })
})
