import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { applyListScope } from '../../middleware/auth.js'
import { parseListQuery, paginated, skipTake } from '../../shared/pagination.js'
import { getTenantId, buildSearchFilter, resolveBranchId } from '../../shared/scope.js'
import { mapEnquiry } from '../../shared/mappers.js'
import { notFound } from '../../shared/errors.js'

export const enquiriesRouter = Router()

const include = { partner: true, branch: true }

type FollowUpPayload = { date?: string; time?: string; remarks?: string }

async function buildEnquiryUpdateData(tenantId: string, body: Record<string, unknown>) {
  const data: Record<string, unknown> = {}

  const scalarFields = [
    'firstName',
    'lastName',
    'email',
    'mobile',
    'alternateNo',
    'gender',
    'nationality',
    'maritalStatus',
    'address',
    'highestQualification',
    'interestedCourse',
    'testGiven',
    'interestedCountry',
    'intake',
    'applyLevel',
    'source',
    'status',
    'remark',
    'assignedBy',
    'assignedTo',
    'partnerId',
  ] as const

  for (const field of scalarFields) {
    if (body[field] !== undefined) data[field] = body[field]
  }

  if (body.dateOfBirth !== undefined) {
    data.dateOfBirth = body.dateOfBirth ? new Date(String(body.dateOfBirth)) : null
  }

  if (body.branchId !== undefined) {
    data.branchId = body.branchId
  } else if (body.branch !== undefined) {
    data.branchId = await resolveBranchId(tenantId, String(body.branch))
  }

  const followUp = body.followUp as FollowUpPayload | undefined
  if (followUp) {
    data.followUpDate = followUp.date ? new Date(followUp.date) : null
    data.followUpTime = followUp.time ?? null
    data.followUpRemarks = followUp.remarks ?? null
  }

  const appointment = body.appointment as FollowUpPayload | undefined
  if (appointment) {
    data.appointmentDate = appointment.date ? new Date(appointment.date) : null
    data.appointmentTime = appointment.time ?? null
    data.appointmentRemarks = appointment.remarks ?? null
  }

  return data
}

enquiriesRouter.get('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const query = parseListQuery(req)
  const scope = applyListScope(req, query)

  const where = {
    tenantId,
    deletedAt: null,
    ...scope,
    ...(query.status ? { status: query.status } : {}),
    ...buildSearchFilter(query.search, ['firstName', 'lastName', 'email', 'mobile']),
  }

  const [total, rows] = await Promise.all([
    prisma.enquiry.count({ where }),
    prisma.enquiry.findMany({ where, include, ...skipTake(query.page, query.pageSize), orderBy: { createdAt: 'desc' } }),
  ])

  res.json(paginated(rows.map(mapEnquiry), total, query.page, query.pageSize))
})

enquiriesRouter.get('/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  const row = await prisma.enquiry.findFirst({
    where: { id: req.params.id, tenantId, deletedAt: null },
    include,
  })
  if (!row) throw notFound('Enquiry not found')
  res.json(mapEnquiry(row))
})

enquiriesRouter.post('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const body = req.body
  const branchId = body.branchId ?? (body.branch ? await resolveBranchId(tenantId, body.branch) : null)
  if (!branchId) throw notFound('Branch is required')

  const created = await prisma.enquiry.create({
    data: {
      tenantId,
      branchId,
      partnerId: body.partnerId ?? null,
      firstName: body.firstName,
      lastName: body.lastName ?? '',
      email: body.email,
      mobile: body.mobile,
      alternateNo: body.alternateNo,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
      gender: body.gender,
      nationality: body.nationality,
      maritalStatus: body.maritalStatus,
      address: body.address,
      highestQualification: body.highestQualification,
      interestedCourse: body.interestedCourse,
      testGiven: body.testGiven,
      interestedCountry: body.interestedCountry,
      intake: body.intake,
      applyLevel: body.applyLevel,
      source: body.source,
      status: body.status ?? 'New Enquiry',
      remark: body.remark,
      assignedBy: body.assignedBy ?? "D' Educationist (Operational Head)",
      assignedTo: body.assignedTo ?? 'Counsellor A',
      followUpDate: body.followUp?.date ? new Date(body.followUp.date) : null,
      followUpTime: body.followUp?.time,
      followUpRemarks: body.followUp?.remarks,
      appointmentDate: body.appointment?.date ? new Date(body.appointment.date) : null,
      appointmentTime: body.appointment?.time,
      appointmentRemarks: body.appointment?.remarks,
    },
    include,
  })
  res.status(201).json(mapEnquiry(created))
})

enquiriesRouter.patch('/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  const body = req.body
  const existing = await prisma.enquiry.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) throw notFound('Enquiry not found')

  const updated = await prisma.enquiry.update({
    where: { id: req.params.id },
    data: await buildEnquiryUpdateData(tenantId, body),
    include,
  })
  res.json(mapEnquiry(updated))
})

enquiriesRouter.delete('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const ids: string[] = req.body.ids ?? []
  const result = await prisma.enquiry.updateMany({
    where: { id: { in: ids }, tenantId },
    data: { deletedAt: new Date() },
  })
  res.json({ deleted: result.count })
})

enquiriesRouter.delete('/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  await prisma.enquiry.updateMany({
    where: { id: req.params.id, tenantId },
    data: { deletedAt: new Date() },
  })
  res.json({ deleted: 1 })
})
