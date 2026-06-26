import type {
  Application,
  Branch,
  CalendarEvent,
  Course,
  DeferRecord,
  Enquiry,
  EnrolledRecord,
  Invoice,
  Partner,
  PartnerInvoice,
  Student,
  StudentAcademic,
  StudentProficiencyTest,
  StudentWorkExperience,
  UniversityCampus,
  UniversityCommission,
  UniversityMaster,
  VisaRecord,
} from '@prisma/client'

type StudentWithRelations = Student & {
  branch?: Branch
  partner?: Partner | null
  academics?: StudentAcademic[]
  proficiencyTests?: StudentProficiencyTest[]
  workExperience?: StudentWorkExperience[]
}

function iso(d: Date | string | null | undefined) {
  if (!d) return undefined
  return d instanceof Date ? d.toISOString() : d
}

function dateOnly(d: Date | string | null | undefined) {
  if (!d) return undefined
  const date = d instanceof Date ? d : new Date(d)
  return date.toISOString().slice(0, 10)
}

function followUp(entity: {
  followUpDate?: Date | null
  followUpTime?: string | null
  followUpRemarks?: string | null
}) {
  if (!entity.followUpDate && !entity.followUpTime && !entity.followUpRemarks) return undefined
  return {
    date: entity.followUpDate ? dateOnly(entity.followUpDate) : undefined,
    time: entity.followUpTime ?? undefined,
    remarks: entity.followUpRemarks ?? undefined,
  }
}

function appointment(entity: {
  appointmentDate?: Date | null
  appointmentTime?: string | null
  appointmentRemarks?: string | null
}) {
  if (!entity.appointmentDate && !entity.appointmentTime && !entity.appointmentRemarks) return undefined
  return {
    date: entity.appointmentDate ? dateOnly(entity.appointmentDate) : undefined,
    time: entity.appointmentTime ?? undefined,
    remarks: entity.appointmentRemarks ?? undefined,
  }
}

function studentName(s: { firstName: string; lastName: string }) {
  return `${s.firstName} ${s.lastName}`.trim()
}

export function mapEnquiry(e: Enquiry & { partner?: Partner | null; branch?: Branch }) {
  return {
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
    email: e.email,
    mobile: e.mobile,
    alternateNo: e.alternateNo ?? undefined,
    dateOfBirth: dateOnly(e.dateOfBirth),
    gender: e.gender ?? undefined,
    nationality: e.nationality ?? undefined,
    maritalStatus: e.maritalStatus ?? undefined,
    address: e.address ?? undefined,
    highestQualification: e.highestQualification ?? undefined,
    interestedCourse: e.interestedCourse ?? undefined,
    testGiven: e.testGiven ?? undefined,
    interestedCountry: e.interestedCountry ?? undefined,
    intake: e.intake ?? undefined,
    applyLevel: e.applyLevel ?? undefined,
    source: e.source ?? undefined,
    status: e.status,
    remark: e.remark ?? undefined,
    branch: e.branch?.name ?? '',
    partnerId: e.partnerId ?? undefined,
    partnerName: e.partner?.name ?? undefined,
    assignedBy: e.assignedBy,
    assignedTo: e.assignedTo,
    followUp: followUp(e),
    appointment: appointment(e),
    createdAt: iso(e.createdAt)!,
    updatedAt: iso(e.updatedAt)!,
  }
}

export function mapStudent(s: StudentWithRelations) {
  return {
    id: s.id,
    studentId: s.studentRef,
    firstName: s.firstName,
    lastName: s.lastName,
    email: s.email,
    mobile: s.mobile,
    alternateNo: s.alternateNo ?? undefined,
    dateOfBirth: dateOnly(s.dateOfBirth),
    gender: s.gender ?? undefined,
    nationality: s.nationality ?? undefined,
    maritalStatus: s.maritalStatus ?? undefined,
    address: s.address ?? undefined,
    highestQualification: s.highestQualification ?? undefined,
    interestedCourse: s.interestedCourse ?? undefined,
    interestedCountry: s.interestedCountry ?? undefined,
    intake: s.intake ?? undefined,
    applyLevel: s.applyLevel ?? undefined,
    source: s.source ?? undefined,
    status: s.status,
    docStatus: s.docStatus,
    remark: s.remark ?? undefined,
    passportNo: s.passportNo ?? undefined,
    passportIssue: dateOnly(s.passportIssue),
    passportExpiry: dateOnly(s.passportExpiry),
    branch: s.branch?.name ?? '',
    partnerId: s.partnerId ?? undefined,
    partnerName: s.partner?.name ?? undefined,
    assignedBy: s.assignedBy,
    assignedTo: s.assignedTo,
    followUp: followUp(s),
    appointment: appointment(s),
    academics: s.academics?.map((a) => ({
      qualification: a.qualification,
      subjects: a.subjects,
      college: a.college,
      percentage: a.percentage,
      backlogs: a.backlogs,
      yearOfPassing: a.yearOfPassing,
    })),
    proficiencyTests: s.proficiencyTests?.map((t) => ({
      type: t.type,
      overall: t.overall ?? undefined,
      listening: t.listening ?? undefined,
      reading: t.reading ?? undefined,
      writing: t.writing ?? undefined,
      speaking: t.speaking ?? undefined,
      testDate: dateOnly(t.testDate),
    })),
    workExperience: s.workExperience?.map((w) => ({
      companyName: w.companyName,
      position: w.position,
      startDate: dateOnly(w.startDate) ?? '',
      endDate: dateOnly(w.endDate) ?? '',
      totalExperience: w.totalExperience,
    })),
    createdAt: iso(s.createdAt)!,
    updatedAt: iso(s.updatedAt)!,
  }
}

export function mapApplication(
  a: Application & { student: Student; partner?: Partner | null; branch?: Branch },
) {
  return {
    id: a.id,
    studentId: a.studentId,
    studentRef: a.student.studentRef,
    studentName: studentName(a.student),
    email: a.student.email,
    mobile: a.student.mobile,
    applicationCount: a.applicationCount,
    docStatus: a.docStatus,
    intCountry: a.intCountry,
    intake: a.intake,
    intCourse: a.intCourse,
    applyLevel: a.applyLevel,
    passportNo: a.passportNo ?? a.student.passportNo ?? undefined,
    dateOfBirth: dateOnly(a.dateOfBirth ?? a.student.dateOfBirth),
    branch: a.branch?.name ?? '',
    partnerId: a.partnerId ?? undefined,
    partnerName: a.partner?.name ?? undefined,
    status: a.status,
    university: a.university ?? undefined,
    associate: a.associate ?? undefined,
    deadlineDate: dateOnly(a.deadlineDate),
    isPartner: a.isPartner,
    assignedBy: a.assignedBy,
    assignedTo: a.assignedTo,
    createdAt: iso(a.createdAt)!,
    updatedAt: iso(a.updatedAt)!,
  }
}

export function mapVisa(
  v: VisaRecord & { student: Student; partner?: Partner | null; branch?: Branch },
) {
  return {
    id: v.id,
    studentId: v.studentId,
    studentRef: v.student.studentRef,
    studentName: studentName(v.student),
    email: v.student.email,
    mobile: v.student.mobile,
    docStatus: v.docStatus,
    appliedCountry: v.appliedCountry,
    university: v.university,
    visaStatus: v.visaStatus,
    course: v.course,
    intake: v.intake,
    passportNo: v.passportNo ?? v.student.passportNo ?? undefined,
    branch: v.branch?.name ?? '',
    partnerId: v.partnerId ?? undefined,
    partnerName: v.partner?.name ?? undefined,
    isPartner: v.isPartner,
    assignedBy: v.assignedBy,
    assignedTo: v.assignedTo,
    createdAt: iso(v.createdAt)!,
    updatedAt: iso(v.updatedAt)!,
  }
}

export function mapDefer(
  d: DeferRecord & { student: Student; partner?: Partner | null; branch?: Branch },
) {
  return {
    id: d.id,
    studentId: d.studentId,
    studentRef: d.student.studentRef,
    studentName: studentName(d.student),
    email: d.student.email,
    mobile: d.student.mobile,
    deferIntake: d.deferIntake,
    deferReason: d.deferReason,
    interestedCourse: d.interestedCourse ?? undefined,
    interestedCountries: d.interestedCountries ?? undefined,
    applyLevel: d.applyLevel ?? undefined,
    source: d.source ?? undefined,
    intake: d.intake ?? undefined,
    branch: d.branch?.name ?? '',
    partnerId: d.partnerId ?? undefined,
    partnerName: d.partner?.name ?? undefined,
    isPartner: d.isPartner,
    assignedBy: d.assignedBy,
    assignedTo: d.assignedTo,
    createdAt: iso(d.createdAt)!,
    updatedAt: iso(d.updatedAt)!,
  }
}

export function mapEnrolled(
  e: EnrolledRecord & { student: Student; partner?: Partner | null; branch?: Branch },
) {
  return {
    id: e.id,
    studentId: e.studentId,
    studentRef: e.student.studentRef,
    studentName: studentName(e.student),
    email: e.student.email,
    mobile: e.student.mobile,
    appliedCountry: e.appliedCountry,
    appliedUniversity: e.appliedUniversity,
    course: e.course,
    intake: e.intake,
    status: e.status,
    source: e.source ?? undefined,
    branch: e.branch?.name ?? '',
    partnerId: e.partnerId ?? undefined,
    partnerName: e.partner?.name ?? undefined,
    isPartner: e.isPartner,
    assignedBy: e.assignedBy,
    assignedTo: e.assignedTo,
    createdAt: iso(e.createdAt)!,
    updatedAt: iso(e.updatedAt)!,
  }
}

function invoiceStatusLabel(status: string) {
  if (status === 'Partial_Paid') return 'Partial Paid'
  if (status === 'Fully_Paid') return 'Fully Paid'
  return status
}

export function mapInvoice(
  inv: Invoice & { student: Student },
) {
  return {
    id: inv.id,
    invoiceId: inv.invoiceNo,
    studentId: inv.studentId,
    name: studentName(inv.student),
    email: inv.student.email,
    mobile: inv.student.mobile,
    totalAmount: Number(inv.totalAmount),
    discount: Number(inv.discount),
    afterDiscount: Number(inv.afterDiscount),
    taxPercent: Number(inv.taxPercent),
    taxType: inv.taxType,
    taxAmount: Number(inv.taxAmount),
    grandTotal: Number(inv.grandTotal),
    paidAmount: Number(inv.paidAmount),
    pendingAmount: Number(inv.pendingAmount),
    dueDate: dateOnly(inv.dueDate)!,
    status: invoiceStatusLabel(inv.status) as 'Pending' | 'Partial Paid' | 'Fully Paid',
    serviceType: inv.serviceType,
    currency: inv.currency,
    createdBy: inv.createdBy,
    partnerId: inv.partnerId ?? undefined,
    createdAt: iso(inv.createdAt)!,
    updatedAt: iso(inv.updatedAt)!,
  }
}

export function mapPartnerInvoice(pi: PartnerInvoice) {
  return {
    id: pi.id,
    invoiceNo: pi.invoiceNo,
    studentCount: pi.studentCount,
    netCommission: Number(pi.netCommission),
    currency: pi.currency,
    taxPercent: Number(pi.taxPercent),
    taxAmount: Number(pi.taxAmount),
    totalCommission: Number(pi.totalCommission),
    receivedCommission: Number(pi.receivedCommission),
    pendingCommission: Number(pi.pendingCommission),
    status: invoiceStatusLabel(pi.status) as 'Pending' | 'Partial Paid' | 'Fully Paid',
    createdBy: pi.createdBy,
    partnerId: pi.partnerId,
    createdAt: iso(pi.createdAt)!,
    updatedAt: iso(pi.updatedAt)!,
  }
}

export function mapUniversityCommission(uc: UniversityCommission) {
  return {
    id: uc.id,
    invoiceNo: uc.invoiceNo,
    country: uc.country,
    university: uc.university,
    studentCount: uc.studentCount,
    totalCommission: Number(uc.totalCommission),
    receivedCommission: Number(uc.receivedCommission),
    pendingCommission: Number(uc.pendingCommission),
    status: invoiceStatusLabel(uc.status) as 'Pending' | 'Partial Paid' | 'Fully Paid',
    createdBy: uc.createdBy,
    commissionType: uc.commissionType,
    commissionSubType: uc.commissionSubType,
    createdAt: iso(uc.createdAt)!,
    updatedAt: iso(uc.updatedAt)!,
  }
}

export function mapCalendarEvent(e: CalendarEvent & { branch?: Branch | null }) {
  return {
    id: e.id,
    title: e.title,
    start: iso(e.start)!,
    end: e.end ? iso(e.end) : undefined,
    category: e.category,
    eventType: e.eventType,
    staffId: e.staffId ?? undefined,
    branch: e.branch?.name ?? undefined,
  }
}

export function mapUniversityMaster(
  u: UniversityMaster & { campuses: UniversityCampus[] },
) {
  return {
    id: u.id,
    country: u.country,
    name: u.name,
    commissionContract: u.commissionContract,
    agreementExpiry: u.agreementExpiry ? dateOnly(u.agreementExpiry) : null,
    agreementFileName: u.agreementFileName,
    logoFileName: u.logoFileName,
    campuses: u.campuses.map((c) => ({ id: c.id, name: c.name, city: c.city ?? undefined })),
    createdAt: iso(u.createdAt)!,
    updatedAt: iso(u.updatedAt)!,
  }
}

export function mapCourse(c: Course) {
  return {
    id: c.id,
    country: c.country,
    university: c.university,
    course: c.course,
    level: c.level,
    intake: c.intake,
    duration: c.duration ?? undefined,
    tuition: c.tuition ?? undefined,
  }
}

export function mapAuthUser(user: {
  id: string
  name: string
  email: string
  role: { portal: string; name: string }
  branch?: { name: string } | null
  partnerId?: string | null
  student?: { studentRef: string } | null
}) {
  return {
    id: user.id,
    name: user.name,
    role: user.role.portal as 'admin' | 'partner' | 'student',
    email: user.email,
    branch: user.branch?.name,
    partnerId: user.partnerId ?? undefined,
    studentId: user.student?.studentRef ?? undefined,
  }
}
