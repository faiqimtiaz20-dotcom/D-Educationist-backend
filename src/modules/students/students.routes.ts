import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { applyListScope } from '../../middleware/auth.js'
import { parseListQuery, paginated, skipTake } from '../../shared/pagination.js'
import { getTenantId, resolveBranchId, studentSearchFilter } from '../../shared/scope.js'
import { mapStudent } from '../../shared/mappers.js'
import { notFound } from '../../shared/errors.js'

export const studentsRouter = Router()

const include = {
  partner: true,
  branch: true,
  academics: true,
  proficiencyTests: true,
  workExperience: true,
}

type SchedulePayload = { date?: string; time?: string; remarks?: string }

studentsRouter.get('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const query = parseListQuery(req)
  const scope = applyListScope(req, query)

  const where = {
    tenantId,
    deletedAt: null,
    ...scope,
    ...(query.status ? { status: query.status } : {}),
    ...studentSearchFilter(query.search),
  }

  const [total, rows] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({ where, include, ...skipTake(query.page, query.pageSize), orderBy: { createdAt: 'desc' } }),
  ])

  res.json(paginated(rows.map(mapStudent), total, query.page, query.pageSize))
})

studentsRouter.get('/me/appointments', async (req, res) => {
  const tenantId = await getTenantId(req)
  if (req.user?.portal !== 'student' || !req.user.studentId) {
    res.json({ data: [] })
    return
  }

  const student = await prisma.student.findFirst({
    where: { tenantId, studentRef: req.user.studentId },
  })
  if (!student) {
    res.json({ data: [] })
    return
  }

  const fullName = `${student.firstName} ${student.lastName}`.trim()
  const appointments: Array<{
    id: string
    title: string
    date: string
    time: string
    remarks: string
    type: 'upcoming' | 'scheduled' | 'past'
  }> = []

  if (student.appointmentDate) {
    appointments.push({
      id: 'appt',
      title: 'Counselling Session',
      date: student.appointmentDate.toISOString().slice(0, 10),
      time: student.appointmentTime ?? '10:00',
      remarks: student.appointmentRemarks ?? 'Discuss application progress',
      type: 'upcoming',
    })
  }
  if (student.followUpDate) {
    appointments.push({
      id: 'followup',
      title: 'Follow-up Call',
      date: student.followUpDate.toISOString().slice(0, 10),
      time: student.followUpTime ?? '14:00',
      remarks: student.followUpRemarks ?? 'Document review follow-up',
      type: 'scheduled',
    })
  }

  const events = await prisma.calendarEvent.findMany({
    where: {
      tenantId,
      title: { contains: student.firstName, mode: 'insensitive' },
    },
    orderBy: { start: 'asc' },
    take: 10,
  })

  for (const ev of events) {
    const isPast = ev.start < new Date()
    appointments.push({
      id: ev.id,
      title: ev.title,
      date: ev.start.toISOString().slice(0, 10),
      time: ev.start.toISOString().slice(11, 16),
      remarks: ev.eventType,
      type: isPast ? 'past' : 'upcoming',
    })
  }

  res.json({ data: appointments })
})

studentsRouter.get('/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  const row = await prisma.student.findFirst({
    where: { id: req.params.id, tenantId, deletedAt: null },
    include,
  })
  if (!row) throw notFound('Student not found')
  res.json(mapStudent(row))
})

studentsRouter.post('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const body = req.body
  const branchId = body.branchId ?? await resolveBranchId(tenantId, body.branch ?? 'Head Office')
  const followUp = body.followUp as SchedulePayload | undefined
  const appointment = body.appointment as SchedulePayload | undefined

  const created = await prisma.student.create({
    data: {
      tenantId,
      branchId,
      partnerId: body.partnerId ?? null,
      studentRef: body.studentId ?? body.studentRef,
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
      interestedCountry: body.interestedCountry,
      intake: body.intake,
      applyLevel: body.applyLevel,
      source: body.source,
      status: body.status ?? 'New Student',
      docStatus: body.docStatus ?? 'Pending',
      remark: body.remark,
      passportNo: body.passportNo,
      passportIssue: body.passportIssue ? new Date(body.passportIssue) : null,
      passportExpiry: body.passportExpiry ? new Date(body.passportExpiry) : null,
      assignedBy: body.assignedBy ?? "D' Educationist (Operational Head)",
      assignedTo: body.assignedTo ?? 'Counsellor A',
      followUpDate: followUp?.date ? new Date(followUp.date) : null,
      followUpTime: followUp?.time ?? null,
      followUpRemarks: followUp?.remarks ?? null,
      appointmentDate: appointment?.date ? new Date(appointment.date) : null,
      appointmentTime: appointment?.time ?? null,
      appointmentRemarks: appointment?.remarks ?? null,
      academics: body.academics?.length
        ? {
            create: body.academics.map((a: Record<string, string>) => ({
              qualification: a.qualification,
              subjects: a.subjects,
              college: a.college,
              percentage: a.percentage,
              backlogs: a.backlogs,
              yearOfPassing: a.yearOfPassing,
            })),
          }
        : undefined,
      proficiencyTests: body.proficiencyTests?.length
        ? { create: body.proficiencyTests.map((t: { testDate?: string }) => ({ ...t, testDate: t.testDate ? new Date(t.testDate) : null })) }
        : undefined,
      workExperience: body.workExperience?.length
        ? {
            create: body.workExperience.map((w: Record<string, string>) => ({
              companyName: w.companyName,
              position: w.position,
              startDate: w.startDate ? new Date(w.startDate) : null,
              endDate: w.endDate ? new Date(w.endDate) : null,
              totalExperience: w.totalExperience,
            })),
          }
        : undefined,
    },
    include,
  })
  res.status(201).json(mapStudent(created))
})

studentsRouter.patch('/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  const body = req.body
  const existing = await prisma.student.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) throw notFound('Student not found')

  if (body.academics) {
    await prisma.studentAcademic.deleteMany({ where: { studentId: req.params.id } })
    await prisma.studentAcademic.createMany({ data: body.academics.map((a: Record<string, string>) => ({ ...a, studentId: req.params.id })) })
  }
  if (body.proficiencyTests) {
    await prisma.studentProficiencyTest.deleteMany({ where: { studentId: req.params.id } })
    await prisma.studentProficiencyTest.createMany({
      data: body.proficiencyTests.map((t: Record<string, string>) => ({
        ...t,
        studentId: req.params.id,
        testDate: t.testDate ? new Date(t.testDate) : null,
      })),
    })
  }
  if (body.workExperience) {
    await prisma.studentWorkExperience.deleteMany({ where: { studentId: req.params.id } })
    await prisma.studentWorkExperience.createMany({
      data: body.workExperience.map((w: Record<string, string>) => ({
        ...w,
        studentId: req.params.id,
        startDate: w.startDate ? new Date(w.startDate) : null,
        endDate: w.endDate ? new Date(w.endDate) : null,
      })),
    })
  }

  const updated = await prisma.student.update({
    where: { id: req.params.id },
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      mobile: body.mobile,
      status: body.status,
      docStatus: body.docStatus,
      remark: body.remark,
      assignedTo: body.assignedTo,
      passportNo: body.passportNo,
    },
    include,
  })
  res.json(mapStudent(updated))
})

studentsRouter.delete('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const ids: string[] = req.body.ids ?? []
  const result = await prisma.student.updateMany({
    where: { id: { in: ids }, tenantId },
    data: { deletedAt: new Date() },
  })
  res.json({ deleted: result.count })
})
