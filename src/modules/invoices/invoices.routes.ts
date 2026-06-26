import { Router } from 'express'
import type { InvoiceStatus } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { parseListQuery, paginated, skipTake } from '../../shared/pagination.js'
import { getTenantId } from '../../shared/scope.js'
import { mapInvoice, mapPartnerInvoice, mapUniversityCommission } from '../../shared/mappers.js'
import { notFound } from '../../shared/errors.js'
import { applyListScope } from '../../middleware/auth.js'

export const invoicesRouter = Router()

function parseInvoiceStatus(status: string): InvoiceStatus {
  if (status === 'Partial Paid') return 'Partial_Paid'
  if (status === 'Fully Paid') return 'Fully_Paid'
  return status as InvoiceStatus
}

invoicesRouter.get('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const query = parseListQuery(req)
  const scope = applyListScope(req, query)

  const where = {
    tenantId,
    ...scope,
    ...(query.status ? { status: parseInvoiceStatus(query.status) } : {}),
  }

  const [total, rows] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      include: { student: true },
      ...skipTake(query.page, query.pageSize),
      orderBy: { createdAt: 'desc' },
    }),
  ])

  res.json(paginated(rows.map(mapInvoice), total, query.page, query.pageSize))
})

invoicesRouter.post('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const body = req.body
  const student = await prisma.student.findFirst({ where: { id: body.studentId, tenantId } })
  if (!student) throw notFound('Student not found')

  const totalAmount = Number(body.totalAmount ?? 0)
  const discount = Number(body.discount ?? 0)
  const afterDiscount = totalAmount - discount
  const taxPercent = Number(body.taxPercent ?? 0)
  const taxAmount = (afterDiscount * taxPercent) / 100
  const grandTotal = afterDiscount + taxAmount

  const created = await prisma.invoice.create({
    data: {
      tenantId,
      studentId: student.id,
      partnerId: student.partnerId,
      invoiceNo: body.invoiceId ?? `DE/INV/${Date.now()}`,
      totalAmount,
      discount,
      afterDiscount,
      taxPercent,
      taxType: body.taxType ?? 'GST',
      taxAmount,
      grandTotal,
      paidAmount: 0,
      pendingAmount: grandTotal,
      dueDate: new Date(body.dueDate),
      status: 'Pending',
      serviceType: body.serviceType ?? 'Admission',
      currency: body.currency ?? 'PKR',
      createdBy: req.user?.name ?? 'System',
    },
    include: { student: true },
  })
  res.status(201).json(mapInvoice(created))
})

invoicesRouter.patch('/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  const existing = await prisma.invoice.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) throw notFound('Invoice not found')

  const body = req.body
  let paidAmount = Number(existing.paidAmount)
  if (body.paymentAmount) {
    paidAmount += Number(body.paymentAmount)
  } else if (body.paidAmount !== undefined) {
    paidAmount = Number(body.paidAmount)
  }

  const grandTotal = Number(existing.grandTotal)
  const pendingAmount = Math.max(0, grandTotal - paidAmount)
  let status = existing.status
  if (pendingAmount <= 0) status = 'Fully_Paid'
  else if (paidAmount > 0) status = 'Partial_Paid'
  else status = 'Pending'

  const updated = await prisma.invoice.update({
    where: { id: req.params.id },
    data: { paidAmount, pendingAmount, status },
    include: { student: true },
  })
  res.json(mapInvoice(updated))
})

export const partnerInvoicesRouter = Router()

partnerInvoicesRouter.get('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const query = parseListQuery(req)
  const partnerId = req.user?.portal === 'partner' ? req.user.partnerId : query.partnerId

  const where = {
    tenantId,
    ...(partnerId ? { partnerId } : {}),
    ...(query.status ? { status: parseInvoiceStatus(query.status) } : {}),
  }

  const [total, rows] = await Promise.all([
    prisma.partnerInvoice.count({ where }),
    prisma.partnerInvoice.findMany({ where, ...skipTake(query.page, query.pageSize), orderBy: { createdAt: 'desc' } }),
  ])

  res.json(paginated(rows.map(mapPartnerInvoice), total, query.page, query.pageSize))
})

export const universityCommissionRouter = Router()

universityCommissionRouter.get('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const query = parseListQuery(req)

  const where = { tenantId }

  const [total, rows] = await Promise.all([
    prisma.universityCommission.count({ where }),
    prisma.universityCommission.findMany({ where, ...skipTake(query.page, query.pageSize), orderBy: { createdAt: 'desc' } }),
  ])

  res.json(paginated(rows.map(mapUniversityCommission), total, query.page, query.pageSize))
})

universityCommissionRouter.post('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const body = req.body
  const created = await prisma.universityCommission.create({
    data: {
      tenantId,
      invoiceNo: body.invoiceNo ?? `DE/UC/${Date.now()}`,
      country: body.country,
      university: body.university,
      studentCount: body.studentCount ?? 0,
      totalCommission: body.totalCommission ?? 0,
      receivedCommission: body.receivedCommission ?? 0,
      pendingCommission: body.pendingCommission ?? body.totalCommission ?? 0,
      status: 'Pending',
      createdBy: req.user?.name ?? 'System',
      commissionType: body.commissionType ?? 'Standard',
      commissionSubType: body.commissionSubType ?? 'General',
    },
  })
  res.status(201).json(mapUniversityCommission(created))
})
