import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { getTenantId } from '../../shared/scope.js'

export const dashboardRouter = Router()

dashboardRouter.get('/stats', async (req, res) => {
  const tenantId = await getTenantId(req)
  const partnerId = typeof req.query.partnerId === 'string' ? req.query.partnerId : req.user?.partnerId ?? undefined
  const branchName = typeof req.query.branch === 'string' ? req.query.branch : undefined

  const branchFilter = branchName ? { branch: { name: branchName } } : {}
  const partnerFilter = partnerId ? { partnerId } : {}

  const baseStudent = { tenantId, deletedAt: null, ...branchFilter, ...partnerFilter }
  const baseEnquiry = { tenantId, deletedAt: null, ...branchFilter, ...partnerFilter }
  const baseApp = { tenantId, deletedAt: null, ...branchFilter, ...partnerFilter }
  const baseVisa = { tenantId, deletedAt: null, ...branchFilter, ...partnerFilter }

  const [
    enquiries,
    students,
    applications,
    visas,
    defers,
    enrolled,
    invoices,
    partnerInvoices,
    uniCommissions,
    partners,
  ] = await Promise.all([
    prisma.enquiry.findMany({ where: baseEnquiry, select: { status: true } }),
    prisma.student.findMany({ where: baseStudent, select: { status: true, docStatus: true } }),
    prisma.application.findMany({ where: baseApp, select: { status: true } }),
    prisma.visaRecord.findMany({ where: baseVisa, select: { visaStatus: true } }),
    prisma.deferRecord.count({ where: { tenantId, ...partnerFilter } }),
    prisma.enrolledRecord.count({ where: { tenantId, ...partnerFilter } }),
    prisma.invoice.findMany({ where: { tenantId, ...partnerFilter }, select: { status: true, pendingAmount: true } }),
    prisma.partnerInvoice.findMany({ where: { tenantId, ...(partnerId ? { partnerId } : {}) }, select: { pendingCommission: true } }),
    prisma.universityCommission.findMany({ where: { tenantId }, select: { pendingCommission: true } }),
    prisma.partner.count({ where: { tenantId, status: 'active' } }),
  ])

  const pendingInvoiceAmount = invoices.reduce((s, i) => s + Number(i.pendingAmount), 0)
  const partnerPending = partnerInvoices.reduce((s, i) => s + Number(i.pendingCommission), 0)
  const uniPending = uniCommissions.reduce((s, i) => s + Number(i.pendingCommission), 0)

  res.json({
    enquiries: {
      total: enquiries.length,
      new: enquiries.filter((e) => e.status === 'New Enquiry').length,
      followUp: enquiries.filter((e) => e.status === 'Follow-up Required').length,
      interested: enquiries.filter((e) => e.status === 'Interested').length,
    },
    students: {
      total: students.length,
      documentsPending: students.filter((s) => s.docStatus === 'Pending').length,
      onHold: students.filter((s) => s.status === 'On Hold').length,
    },
    applications: {
      total: applications.length,
      underReview: applications.filter((a) => a.status === 'Application Under Review').length,
      offerReceived: applications.filter((a) => a.status === 'Offer Received').length,
      finalized: applications.filter((a) => a.status === 'Finalized').length,
    },
    visas: {
      total: visas.length,
      inProgress: visas.filter((v) => v.visaStatus === 'Visa Application In Progress' || v.visaStatus === 'Pending').length,
      granted: visas.filter((v) => v.visaStatus === 'Visa Granted' || v.visaStatus === 'Visa Approved').length,
      rejected: visas.filter((v) => v.visaStatus === 'Visa Rejected').length,
    },
    defers: { total: defers },
    enrolled: { total: enrolled },
    invoices: {
      total: invoices.length,
      pending: invoices.filter((i) => i.status === 'Pending').length,
      partialPaid: invoices.filter((i) => i.status === 'Partial_Paid').length,
      fullyPaid: invoices.filter((i) => i.status === 'Fully_Paid').length,
      totalPendingAmount: pendingInvoiceAmount,
    },
    partnerInvoices: { total: partnerInvoices.length, pendingCommission: partnerPending },
    universityCommission: { total: uniCommissions.length, pendingCommission: uniPending },
    partners: { total: partners },
  })
})
