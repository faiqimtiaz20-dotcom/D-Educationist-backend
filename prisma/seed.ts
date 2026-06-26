import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import bcrypt from 'bcryptjs'
import { DocStatus, InvoiceStatus, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const __dirname = dirname(fileURLToPath(import.meta.url))
const mockDir = join(__dirname, '../../../Frontend/krs-crm-ui/src/mocks/data')

function loadJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(mockDir, name), 'utf-8')) as T
}

function parseDate(value?: string | null) {
  if (!value) return null
  return new Date(value)
}

function invoiceStatus(status: string): InvoiceStatus {
  if (status === 'Partial Paid') return InvoiceStatus.Partial_Paid
  if (status === 'Fully Paid') return InvoiceStatus.Fully_Paid
  return InvoiceStatus.Pending
}

function docStatus(status?: string): DocStatus {
  return status === 'Completed' ? DocStatus.Completed : DocStatus.Pending
}

export async function seedDatabase() {
  console.log('Seeding database...')

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany(),
    prisma.chatMessage.deleteMany(),
    prisma.entityNote.deleteMany(),
    prisma.applicationComment.deleteMany(),
    prisma.entityInteraction.deleteMany(),
    prisma.studentDocument.deleteMany(),
    prisma.standardDocument.deleteMany(),
    prisma.qrForm.deleteMany(),
    prisma.tenantIntegration.deleteMany(),
    prisma.marketingCampaign.deleteMany(),
    prisma.announcement.deleteMany(),
    prisma.learningResource.deleteMany(),
    prisma.task.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.calendarEvent.deleteMany(),
    prisma.universityCommission.deleteMany(),
    prisma.partnerInvoice.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.enrolledRecord.deleteMany(),
    prisma.deferRecord.deleteMany(),
    prisma.visaRecord.deleteMany(),
    prisma.application.deleteMany(),
    prisma.studentWorkExperience.deleteMany(),
    prisma.studentProficiencyTest.deleteMany(),
    prisma.studentAcademic.deleteMany(),
    prisma.user.deleteMany(),
    prisma.student.deleteMany(),
    prisma.enquiry.deleteMany(),
    prisma.universityCampus.deleteMany(),
    prisma.universityMaster.deleteMany(),
    prisma.course.deleteMany(),
    prisma.masterItem.deleteMany(),
    prisma.partner.deleteMany(),
    prisma.branch.deleteMany(),
    prisma.rolePermission.deleteMany(),
    prisma.role.deleteMany(),
    prisma.country.deleteMany(),
    prisma.intake.deleteMany(),
    prisma.applyLevel.deleteMany(),
    prisma.source.deleteMany(),
    prisma.tenant.deleteMany(),
  ])

  const tenant = await prisma.tenant.create({
    data: {
      name: "D' Educationist",
      slug: 'deducationist',
      status: 'ACTIVE',
    },
  })

  const branch = await prisma.branch.create({
    data: { tenantId: tenant.id, name: 'Head Office', code: 'HO' },
  })

  const partner = await prisma.partner.create({
    data: {
      tenantId: tenant.id,
      name: 'Ahmed Raza',
      code: 'p1',
      contactEmail: 'partner@deducationist.com',
      status: 'active',
    },
  })

  const partnerMap: Record<string, string> = { p1: partner.id }

  const [adminRole, staffRole, partnerRole, studentRole] = await Promise.all([
    prisma.role.create({ data: { tenantId: tenant.id, name: 'TENANT_ADMIN', portal: 'admin', isSystem: true } }),
    prisma.role.create({ data: { tenantId: tenant.id, name: 'STAFF', portal: 'admin', isSystem: true } }),
    prisma.role.create({ data: { tenantId: tenant.id, name: 'PARTNER', portal: 'partner', isSystem: true } }),
    prisma.role.create({ data: { tenantId: tenant.id, name: 'STUDENT', portal: 'student', isSystem: true } }),
  ])

  const passwordHash = await bcrypt.hash('admin123', 10)
  const partnerPassword = await bcrypt.hash('partner123', 10)
  const studentPassword = await bcrypt.hash('student123', 10)

  const studentMap: Record<string, string> = {}
  const studentsRaw = loadJson<Array<Record<string, unknown>>>('students.json')

  for (const s of studentsRaw) {
    const mockId = String(s.id)
    const partnerId = s.partnerId ? partnerMap[String(s.partnerId)] ?? null : null
    const created = await prisma.student.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        partnerId,
        studentRef: String(s.studentId),
        firstName: String(s.firstName),
        lastName: String(s.lastName),
        email: String(s.email),
        mobile: String(s.mobile),
        alternateNo: s.alternateNo ? String(s.alternateNo) : null,
        dateOfBirth: parseDate(s.dateOfBirth as string),
        gender: s.gender ? String(s.gender) : null,
        nationality: s.nationality ? String(s.nationality) : null,
        maritalStatus: s.maritalStatus ? String(s.maritalStatus) : null,
        address: s.address ? String(s.address) : null,
        highestQualification: s.highestQualification ? String(s.highestQualification) : null,
        interestedCourse: s.interestedCourse ? String(s.interestedCourse) : null,
        interestedCountry: s.interestedCountry ? String(s.interestedCountry) : null,
        intake: s.intake ? String(s.intake) : null,
        applyLevel: s.applyLevel ? String(s.applyLevel) : null,
        source: s.source ? String(s.source) : null,
        status: String(s.status),
        docStatus: docStatus(s.docStatus as string),
        remark: s.remark ? String(s.remark) : null,
        passportNo: s.passportNo ? String(s.passportNo) : null,
        passportIssue: parseDate(s.passportIssue as string),
        passportExpiry: parseDate(s.passportExpiry as string),
        assignedBy: String(s.assignedBy),
        assignedTo: String(s.assignedTo),
        followUpDate: parseDate((s.followUp as { date?: string })?.date),
        followUpTime: (s.followUp as { time?: string })?.time ?? null,
        followUpRemarks: (s.followUp as { remarks?: string })?.remarks ?? null,
        appointmentDate: parseDate((s.appointment as { date?: string })?.date),
        appointmentTime: (s.appointment as { time?: string })?.time ?? null,
        appointmentRemarks: (s.appointment as { remarks?: string })?.remarks ?? null,
        createdAt: parseDate(s.createdAt as string) ?? new Date(),
        updatedAt: parseDate(s.updatedAt as string) ?? new Date(),
        academics: {
          create: ((s.academics as Array<Record<string, string>>) ?? []).map((a) => ({
            qualification: a.qualification,
            subjects: a.subjects,
            college: a.college,
            percentage: a.percentage,
            backlogs: a.backlogs,
            yearOfPassing: a.yearOfPassing,
          })),
        },
        proficiencyTests: {
          create: ((s.proficiencyTests as Array<Record<string, string>>) ?? []).map((t) => ({
            type: t.type,
            overall: t.overall,
            listening: t.listening,
            reading: t.reading,
            writing: t.writing,
            speaking: t.speaking,
            testDate: parseDate(t.testDate),
          })),
        },
        workExperience: {
          create: ((s.workExperience as Array<Record<string, string>>) ?? []).map((w) => ({
            companyName: w.companyName,
            position: w.position,
            startDate: parseDate(w.startDate),
            endDate: parseDate(w.endDate),
            totalExperience: w.totalExperience,
          })),
        },
      },
    })
    studentMap[mockId] = created.id
  }

  const hassanStudent = await prisma.student.findFirst({
    where: { tenantId: tenant.id, studentRef: 'DE/S/26/00500' },
  })

  await prisma.user.createMany({
    data: [
      {
        tenantId: tenant.id,
        email: 'admin@deducationist.com',
        passwordHash,
        name: 'Admin',
        roleId: adminRole.id,
        branchId: branch.id,
      },
      {
        tenantId: tenant.id,
        email: 'partner@deducationist.com',
        passwordHash: partnerPassword,
        name: 'Ahmed Raza',
        roleId: partnerRole.id,
        partnerId: partner.id,
      },
      {
        tenantId: tenant.id,
        email: 'student@deducationist.com',
        passwordHash: studentPassword,
        name: 'Hassan Ali',
        roleId: studentRole.id,
        studentId: hassanStudent?.id,
      },
    ],
  })

  const enquiries = loadJson<Array<Record<string, unknown>>>('enquiries.json')
  const enquiryMap: Record<string, string> = {}
  for (const e of enquiries) {
    const mockId = String(e.id)
    const created = await prisma.enquiry.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        partnerId: e.partnerId ? partnerMap[String(e.partnerId)] ?? null : null,
        firstName: String(e.firstName),
        lastName: String(e.lastName),
        email: String(e.email),
        mobile: String(e.mobile),
        interestedCourse: e.interestedCourse ? String(e.interestedCourse) : null,
        interestedCountry: e.interestedCountry ? String(e.interestedCountry) : null,
        intake: e.intake ? String(e.intake) : null,
        applyLevel: e.applyLevel ? String(e.applyLevel) : null,
        source: e.source ? String(e.source) : null,
        status: String(e.status),
        assignedBy: String(e.assignedBy),
        assignedTo: String(e.assignedTo),
        createdAt: parseDate(e.createdAt as string) ?? new Date(),
        updatedAt: parseDate(e.updatedAt as string) ?? new Date(),
      },
    })
    enquiryMap[mockId] = created.id
  }

  const applications = loadJson<Array<Record<string, unknown>>>('applications.json')
  const applicationMap: Record<string, string> = {}
  for (const a of applications) {
    const studentId = studentMap[String(a.studentId)]
    if (!studentId) continue
    const created = await prisma.application.create({
      data: {
        tenantId: tenant.id,
        studentId,
        branchId: branch.id,
        partnerId: a.partnerId ? partnerMap[String(a.partnerId)] ?? null : null,
        applicationCount: Number(a.applicationCount ?? 1),
        docStatus: docStatus(a.docStatus as string),
        intCountry: String(a.intCountry),
        intake: String(a.intake),
        intCourse: String(a.intCourse),
        applyLevel: String(a.applyLevel),
        passportNo: a.passportNo ? String(a.passportNo) : null,
        dateOfBirth: parseDate(a.dateOfBirth as string),
        status: String(a.status),
        university: a.university ? String(a.university) : null,
        isPartner: Boolean(a.isPartner),
        assignedBy: String(a.assignedBy),
        assignedTo: String(a.assignedTo),
        createdAt: parseDate(a.createdAt as string) ?? new Date(),
        updatedAt: parseDate(a.updatedAt as string) ?? new Date(),
      },
    })
    applicationMap[String(a.id)] = created.id
  }

  const visas = loadJson<Array<Record<string, unknown>>>('visas.json')
  for (const v of visas) {
    const studentId = studentMap[String(v.studentId)]
    if (!studentId) continue
    await prisma.visaRecord.create({
      data: {
        tenantId: tenant.id,
        studentId,
        branchId: branch.id,
        partnerId: v.partnerId ? partnerMap[String(v.partnerId)] ?? null : null,
        docStatus: docStatus(v.docStatus as string),
        appliedCountry: String(v.appliedCountry),
        university: String(v.university),
        visaStatus: String(v.visaStatus),
        course: String(v.course),
        intake: String(v.intake),
        passportNo: v.passportNo ? String(v.passportNo) : null,
        isPartner: Boolean(v.isPartner),
        assignedBy: String(v.assignedBy),
        assignedTo: String(v.assignedTo),
        createdAt: parseDate(v.createdAt as string) ?? new Date(),
        updatedAt: parseDate(v.updatedAt as string) ?? new Date(),
      },
    })
  }

  const defers = loadJson<Array<Record<string, unknown>>>('defers.json')
  for (const d of defers) {
    const studentId = studentMap[String(d.studentId)]
    if (!studentId) continue
    await prisma.deferRecord.create({
      data: {
        tenantId: tenant.id,
        studentId,
        branchId: branch.id,
        partnerId: d.partnerId ? partnerMap[String(d.partnerId)] ?? null : null,
        deferIntake: String(d.deferIntake ?? d.intake ?? ''),
        deferReason: String(d.deferReason ?? ''),
        interestedCourse: d.interestedCourse ? String(d.interestedCourse) : null,
        interestedCountries: d.interestedCountries ? String(d.interestedCountries) : null,
        applyLevel: d.applyLevel ? String(d.applyLevel) : null,
        source: d.source ? String(d.source) : null,
        intake: d.intake ? String(d.intake) : null,
        isPartner: Boolean(d.isPartner),
        assignedBy: String(d.assignedBy),
        assignedTo: String(d.assignedTo),
        createdAt: parseDate(d.createdAt as string) ?? new Date(),
        updatedAt: parseDate(d.updatedAt as string) ?? new Date(),
      },
    })
  }

  const enrolled = loadJson<Array<Record<string, unknown>>>('enrolled.json')
  for (const e of enrolled) {
    const studentId = studentMap[String(e.studentId)]
    if (!studentId) continue
    await prisma.enrolledRecord.create({
      data: {
        tenantId: tenant.id,
        studentId,
        branchId: branch.id,
        partnerId: e.partnerId ? partnerMap[String(e.partnerId)] ?? null : null,
        appliedCountry: String(e.appliedCountry),
        appliedUniversity: String(e.appliedUniversity),
        course: String(e.course),
        intake: String(e.intake),
        status: String(e.status),
        source: e.source ? String(e.source) : null,
        isPartner: Boolean(e.isPartner),
        assignedBy: String(e.assignedBy),
        assignedTo: String(e.assignedTo),
        createdAt: parseDate(e.createdAt as string) ?? new Date(),
        updatedAt: parseDate(e.updatedAt as string) ?? new Date(),
      },
    })
  }

  const invoices = loadJson<Array<Record<string, unknown>>>('invoices.json')
  for (const inv of invoices) {
    const studentId = studentMap[String(inv.studentId)]
    if (!studentId) continue
    await prisma.invoice.create({
      data: {
        tenantId: tenant.id,
        studentId,
        partnerId: inv.partnerId ? partnerMap[String(inv.partnerId)] ?? null : null,
        invoiceNo: String(inv.invoiceId),
        totalAmount: Number(inv.totalAmount),
        discount: Number(inv.discount ?? 0),
        afterDiscount: Number(inv.afterDiscount),
        taxPercent: Number(inv.taxPercent ?? 0),
        taxType: String(inv.taxType ?? 'GST'),
        taxAmount: Number(inv.taxAmount ?? 0),
        grandTotal: Number(inv.grandTotal),
        paidAmount: Number(inv.paidAmount ?? 0),
        pendingAmount: Number(inv.pendingAmount),
        dueDate: parseDate(inv.dueDate as string) ?? new Date(),
        status: invoiceStatus(String(inv.status)),
        serviceType: String(inv.serviceType),
        currency: String(inv.currency ?? 'PKR'),
        createdBy: String(inv.createdBy),
        createdAt: parseDate(inv.createdAt as string) ?? new Date(),
        updatedAt: parseDate(inv.updatedAt as string) ?? new Date(),
      },
    })
  }

  const partnerInvoices = loadJson<Array<Record<string, unknown>>>('partner-invoices.json')
  for (const pi of partnerInvoices) {
    const partnerId = partnerMap[String(pi.partnerId)]
    if (!partnerId) continue
    await prisma.partnerInvoice.create({
      data: {
        tenantId: tenant.id,
        partnerId,
        invoiceNo: String(pi.invoiceNo),
        studentCount: Number(pi.studentCount ?? 0),
        netCommission: Number(pi.netCommission),
        currency: String(pi.currency ?? 'PKR'),
        taxPercent: Number(pi.taxPercent ?? 0),
        taxAmount: Number(pi.taxAmount ?? 0),
        totalCommission: Number(pi.totalCommission),
        receivedCommission: Number(pi.receivedCommission ?? 0),
        pendingCommission: Number(pi.pendingCommission),
        status: invoiceStatus(String(pi.status)),
        createdBy: String(pi.createdBy),
        createdAt: parseDate(pi.createdAt as string) ?? new Date(),
        updatedAt: parseDate(pi.updatedAt as string) ?? new Date(),
      },
    })
  }

  const uniCommissions = loadJson<Array<Record<string, unknown>>>('university-commission.json')
  for (const uc of uniCommissions) {
    await prisma.universityCommission.create({
      data: {
        tenantId: tenant.id,
        invoiceNo: String(uc.invoiceNo),
        country: String(uc.country),
        university: String(uc.university),
        studentCount: Number(uc.studentCount ?? 0),
        totalCommission: Number(uc.totalCommission),
        receivedCommission: Number(uc.receivedCommission ?? 0),
        pendingCommission: Number(uc.pendingCommission),
        status: invoiceStatus(String(uc.status)),
        createdBy: String(uc.createdBy),
        commissionType: String(uc.commissionType ?? 'Standard'),
        commissionSubType: String(uc.commissionSubType ?? 'General'),
        createdAt: parseDate(uc.createdAt as string) ?? new Date(),
        updatedAt: parseDate(uc.updatedAt as string) ?? new Date(),
      },
    })
  }

  const uniMasters = loadJson<Array<Record<string, unknown>>>('university-masters.json')
  for (const um of uniMasters) {
    await prisma.universityMaster.create({
      data: {
        tenantId: tenant.id,
        country: String(um.country),
        name: String(um.name),
        commissionContract: String(um.commissionContract),
        agreementExpiry: parseDate(um.agreementExpiry as string),
        agreementFileName: um.agreementFileName ? String(um.agreementFileName) : null,
        logoFileName: um.logoFileName ? String(um.logoFileName) : null,
        campuses: {
          create: ((um.campuses as Array<Record<string, string>>) ?? []).map((c) => ({
            name: c.name,
            city: c.city ?? null,
          })),
        },
        createdAt: parseDate(um.createdAt as string) ?? new Date(),
        updatedAt: parseDate(um.updatedAt as string) ?? new Date(),
      },
    })
  }

  const courses = loadJson<Array<Record<string, unknown>>>('courses.json')
  for (const c of courses) {
    await prisma.course.create({
      data: {
        tenantId: tenant.id,
        country: String(c.country),
        university: String(c.university),
        course: String(c.course),
        level: String(c.level),
        intake: String(c.intake),
        duration: c.duration ? String(c.duration) : null,
        tuition: c.tuition ? String(c.tuition) : null,
      },
    })
  }

  const calendarEvents = loadJson<Array<Record<string, unknown>>>('calendar-events.json')
  for (const ev of calendarEvents) {
    await prisma.calendarEvent.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        staffId: ev.staffId ? String(ev.staffId) : null,
        title: String(ev.title),
        start: new Date(String(ev.start)),
        end: ev.end ? new Date(String(ev.end)) : null,
        category: String(ev.category) as 'enquiry' | 'student' | 'application' | 'visa' | 'invoice',
        eventType: String(ev.eventType) as 'followup' | 'appointment' | 'due',
      },
    })
  }

  const masterSeeds: Record<string, string[]> = {
    branch: ['Head Office', 'Lahore', 'Karachi'],
    source: ['Facebook', 'SMS', 'Walking', 'Registration Form', 'Partner Referral'],
    'enquiry-status': ['New Enquiry', 'Follow-up Required', 'Interested', 'Not Interested'],
    'student-status': ['New Student', 'On Hold', 'Active', 'Completed'],
    partners: ['Ahmed Raza', 'Global Edu Partners'],
    staff: ['Counsellor A', 'Counsellor B', 'Calling Team', 'Visa Team', 'Operational Head'],
    country: ['Australia', 'Canada', 'UK', 'USA', 'Singapore'],
    'apply-level': ['Post Graduation', 'PHD', 'Undergraduate'],
    level: ['Certificate', 'Foundation', 'Undergraduate', 'Post Graduation'],
    currency: ['PKR', 'GBP', 'USD', 'AUD'],
    'invoice-service-type': ['Admission', 'Application Process Fee', 'Visa Processing'],
    associates: ['Associate North', 'Associate South'],
    roles: ['Admin', 'Counsellor', 'Calling Team', 'Partner'],
    academic: ['10th', '12th', 'Graduation', 'Post Graduation', 'PHD'],
    'application-status': ['Application Started', 'Application Under Review', 'Offer Received', 'Finalized'],
    'visa-status': ['Pending', 'Visa Application In Progress', 'Visa Granted', 'Visa Rejected'],
    courses: ['MBA', 'MCOM', 'Computer Science'],
  }

  for (const [category, names] of Object.entries(masterSeeds)) {
    for (const name of names) {
      await prisma.masterItem.create({
        data: { tenantId: tenant.id, category, name },
      })
    }
  }

  await prisma.masterItem.create({
    data: {
      tenantId: tenant.id,
      category: 'email-template',
      name: 'Welcome Email',
      meta: {
        subject: "Welcome to D' Educationist — {{firstName}}",
        body: 'Dear {{firstName}}, thank you for your interest.',
      },
    },
  })

  await prisma.masterItem.create({
    data: {
      tenantId: tenant.id,
      category: 'sms-template',
      name: 'Appointment Reminder',
      meta: { body: 'Hi {{firstName}}, your appointment is on {{appointmentDate}}.' },
    },
  })

  if (studentMap.s1) {
    await prisma.entityInteraction.createMany({
      data: [
        {
          tenantId: tenant.id,
          entityType: 'student',
          entityId: studentMap.s1,
          kind: 'followup',
          action: 'Call',
          remarks: 'Discussed IELTS preparation timeline',
          stage: 'Counselling',
          attempt: 1,
          nextDate: '2026-06-20',
          nextTime: '14:00',
          authorName: 'Counsellor A',
          createdAt: new Date('2026-06-01T09:00:00Z'),
        },
        {
          tenantId: tenant.id,
          entityType: 'student',
          entityId: studentMap.s1,
          kind: 'appointment',
          action: 'In-person',
          remarks: 'Visa document review with counsellor',
          stage: 'Documentation',
          attempt: 1,
          nextDate: '2026-06-25',
          nextTime: '10:30',
          authorName: 'Counsellor A',
          createdAt: new Date('2026-06-05T11:00:00Z'),
        },
      ],
    })
  }

  if (applicationMap.a1) {
    await prisma.applicationComment.createMany({
      data: [
        {
          tenantId: tenant.id,
          applicationId: applicationMap.a1,
          comment: 'Application documents submitted to university portal.',
          attachmentName: 'submission-receipt.pdf',
          authorName: 'Counsellor A',
          createdAt: new Date('2026-04-28T10:30:00Z'),
        },
        {
          tenantId: tenant.id,
          applicationId: applicationMap.a1,
          comment: 'University acknowledged receipt. Awaiting initial review.',
          authorName: 'Operational Head',
          createdAt: new Date('2026-04-29T14:15:00Z'),
        },
      ],
    })
  }

  await prisma.task.createMany({
    data: [
      {
        tenantId: tenant.id,
        title: 'Follow up with Hassan Ali',
        description: 'Visa documents pending',
        dueDate: new Date('2026-06-20'),
        assignedTo: 'Counsellor A',
        status: 'pending',
        priority: 'high',
      },
      {
        tenantId: tenant.id,
        title: 'Review Bilal application',
        dueDate: new Date('2026-06-22'),
        assignedTo: 'Counselling',
        status: 'pending',
        priority: 'medium',
      },
      {
        tenantId: tenant.id,
        title: 'Send invoice reminder',
        dueDate: new Date('2026-06-18'),
        assignedTo: 'Accounts',
        status: 'completed',
        priority: 'low',
      },
    ],
  })

  await prisma.marketingCampaign.createMany({
    data: [
      {
        tenantId: tenant.id,
        name: 'Summer Intake 2026',
        channel: 'Facebook',
        status: 'Active',
        startDate: new Date('2026-05-01'),
        endDate: new Date('2026-08-31'),
        description: 'Promote summer intake across Australia and Canada.',
        audienceCountry: 'Australia',
        audienceStatus: 'Interested',
      },
      {
        tenantId: tenant.id,
        name: 'Education Fair Lahore',
        channel: 'Education fair',
        status: 'Scheduled',
        startDate: new Date('2026-07-15'),
        endDate: new Date('2026-07-17'),
        description: 'Booth at Lahore education fair.',
        audienceCountry: 'Canada',
        audienceStatus: 'New Enquiry',
      },
    ],
  })

  await prisma.announcement.createMany({
    data: [
      {
        tenantId: tenant.id,
        title: 'Document submission deadline',
        body: 'Please upload all pending documents before your counselling session.',
        publishedAt: new Date('2026-06-10'),
        priority: 'high',
      },
      {
        tenantId: tenant.id,
        title: 'New intake applications open',
        body: 'Nov-2026 intake applications are now being accepted.',
        publishedAt: new Date('2026-06-05'),
        priority: 'normal',
      },
      {
        tenantId: tenant.id,
        title: 'Visa interview workshop',
        body: 'Join our free online workshop on visa interview preparation this Friday.',
        publishedAt: new Date('2026-06-01'),
        priority: 'normal',
      },
    ],
  })

  await prisma.learningResource.createMany({
    data: [
      {
        tenantId: tenant.id,
        title: 'IELTS Preparation Guide',
        description: 'Complete guide to scoring band 7+ in IELTS Academic.',
        type: 'PDF',
        category: 'Test Prep',
      },
      {
        tenantId: tenant.id,
        title: 'Statement of Purpose Writing',
        description: 'Tips and templates for writing a compelling SOP.',
        type: 'Guide',
        category: 'Applications',
      },
      {
        tenantId: tenant.id,
        title: 'Visa Interview Preparation',
        description: 'Common questions and best practices for visa interviews.',
        type: 'Video',
        category: 'Visa',
      },
    ],
  })

  await prisma.qrForm.create({
    data: {
      tenantId: tenant.id,
      name: 'Study Abroad Enquiry',
      assignTo: 'Counsellor A',
      fields: [
        { id: 'f1', label: 'Full Name', type: 'text', required: true },
        { id: 'f2', label: 'Email', type: 'email', required: true },
        { id: 'f3', label: 'Mobile', type: 'tel', required: true },
      ],
    },
  })

  if (hassanStudent) {
    await prisma.chatMessage.createMany({
      data: [
        {
          tenantId: tenant.id,
          studentId: hassanStudent.id,
          sender: 'counsellor',
          text: 'Hi Hassan, please upload your IELTS scorecard.',
        },
        {
          tenantId: tenant.id,
          studentId: hassanStudent.id,
          sender: 'student',
          text: 'Sure, I will upload it today.',
        },
      ],
    })

    await prisma.studentDocument.createMany({
      data: [
        { tenantId: tenant.id, studentId: hassanStudent.id, name: 'Passport', docType: 'passport', status: 'Verified', fileName: 'passport.pdf', uploadedAt: new Date('2026-01-15') },
        { tenantId: tenant.id, studentId: hassanStudent.id, name: 'IELTS Scorecard', docType: 'ielts', status: 'Uploaded', fileName: 'ielts.pdf', uploadedAt: new Date('2026-02-01') },
        { tenantId: tenant.id, studentId: hassanStudent.id, name: 'SOP', docType: 'sop', status: 'Pending' },
      ],
    })

    await prisma.entityNote.create({
      data: {
        tenantId: tenant.id,
        entityType: 'student',
        entityId: hassanStudent.id,
        text: 'Strong candidate for Canada intake. Partner referral from Ahmed Raza.',
        authorName: 'Operational Head',
      },
    })

    await prisma.auditLog.createMany({
      data: [
        {
          tenantId: tenant.id,
          entity: 'student',
          entityId: hassanStudent.id,
          action: 'Student registered',
          meta: { detail: 'Converted from enquiry', userName: 'Counsellor A' },
        },
        {
          tenantId: tenant.id,
          entity: 'student',
          entityId: hassanStudent.id,
          action: 'Application submitted',
          meta: { detail: 'UNSW Global — PHD', userName: 'Counselling' },
        },
      ],
    })
  }

  await prisma.standardDocument.createMany({
    data: [
      {
        tenantId: tenant.id,
        name: 'Passport Copy Template',
        fileName: 'passport-template.pdf',
        filePath: 'uploads/standard/seed-passport-template.pdf',
      },
      {
        tenantId: tenant.id,
        name: 'Visa Checklist',
        fileName: 'visa-checklist.pdf',
        filePath: 'uploads/standard/seed-visa-checklist.pdf',
      },
    ],
  })

  console.log('Seed complete.')
  console.log('  Admin:   admin@deducationist.com / admin123')
  console.log('  Partner: partner@deducationist.com / partner123')
  console.log('  Student: student@deducationist.com / student123')
}

const isDirectRun =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(process.argv[1]).href

if (isDirectRun) {
  seedDatabase()
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(() => prisma.$disconnect())
}
