export type FollowupEntityType = 'student' | 'enquiry'

export interface FollowupRecord {
  id: string
  entityType: FollowupEntityType
  entityId: string
  action: string
  createdBy: string
  remarks: string
  stage: string
  attempt: number
  nextDate?: string
  nextTime?: string
  createdAt: string
}

export interface AppointmentRecord {
  id: string
  entityType: FollowupEntityType
  entityId: string
  action: string
  createdBy: string
  remarks: string
  stage: string
  attempt: number
  nextDate?: string
  nextTime?: string
  createdAt: string
}

export interface CommentRecord {
  id: string
  entityType: FollowupEntityType
  entityId: string
  text: string
  createdBy: string
  createdAt: string
}

export const followupStore = {
  followups: [
    {
      id: 'fu1',
      entityType: 'student',
      entityId: 's1',
      action: 'Call',
      createdBy: 'Counsellor A',
      remarks: 'Discussed IELTS preparation timeline',
      stage: 'Counselling',
      attempt: 1,
      nextDate: '2026-06-20',
      nextTime: '14:00',
      createdAt: '2026-06-01T09:00:00Z',
    },
  ] as FollowupRecord[],
  appointments: [
    {
      id: 'ap1',
      entityType: 'student',
      entityId: 's1',
      action: 'In-person',
      createdBy: 'Counsellor A',
      remarks: 'Visa document review with counsellor',
      stage: 'Documentation',
      attempt: 1,
      nextDate: '2026-06-25',
      nextTime: '10:30',
      createdAt: '2026-06-05T11:00:00Z',
    },
  ] as AppointmentRecord[],
  comments: [
    {
      id: 'cm1',
      entityType: 'student',
      entityId: 's1',
      text: 'Student is responsive and committed to Canada intake.',
      createdBy: 'Operational Head',
      createdAt: '2026-05-15T10:00:00Z',
    },
  ] as CommentRecord[],
}

export function getFollowups(entityType: FollowupEntityType, entityId: string) {
  return followupStore.followups.filter(
    (f) => f.entityType === entityType && f.entityId === entityId,
  )
}

export function getAppointments(entityType: FollowupEntityType, entityId: string) {
  return followupStore.appointments.filter(
    (a) => a.entityType === entityType && a.entityId === entityId,
  )
}

export function getComments(entityType: FollowupEntityType, entityId: string) {
  return followupStore.comments.filter(
    (c) => c.entityType === entityType && c.entityId === entityId,
  )
}

export function addFollowup(
  entityType: FollowupEntityType,
  entityId: string,
  data: Omit<FollowupRecord, 'id' | 'entityType' | 'entityId' | 'createdAt'>,
) {
  const record: FollowupRecord = {
    id: crypto.randomUUID(),
    entityType,
    entityId,
    createdAt: new Date().toISOString(),
    ...data,
  }
  followupStore.followups.unshift(record)
  return record
}

export function addAppointment(
  entityType: FollowupEntityType,
  entityId: string,
  data: Omit<AppointmentRecord, 'id' | 'entityType' | 'entityId' | 'createdAt'>,
) {
  const record: AppointmentRecord = {
    id: crypto.randomUUID(),
    entityType,
    entityId,
    createdAt: new Date().toISOString(),
    ...data,
  }
  followupStore.appointments.unshift(record)
  return record
}

export function addComment(
  entityType: FollowupEntityType,
  entityId: string,
  text: string,
  createdBy = "D' Educationist",
) {
  const record: CommentRecord = {
    id: crypto.randomUUID(),
    entityType,
    entityId,
    text,
    createdBy,
    createdAt: new Date().toISOString(),
  }
  followupStore.comments.unshift(record)
  return record
}
