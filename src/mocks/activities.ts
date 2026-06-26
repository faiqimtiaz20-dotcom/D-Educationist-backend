export interface ActivityEntry {
  id: string
  entityType: 'enquiry' | 'student' | 'application' | 'visa'
  entityId: string
  action: string
  detail?: string
  user: string
  createdAt: string
}

export interface NoteEntry {
  id: string
  entityType: 'enquiry' | 'student' | 'application' | 'visa'
  entityId: string
  text: string
  user: string
  createdAt: string
}

export interface StudentDocument {
  id: string
  studentId: string
  name: string
  status: 'Pending' | 'Uploaded' | 'Verified' | 'Rejected'
  fileName?: string
  uploadedAt?: string
  remark?: string
}

export interface ChatMessage {
  id: string
  studentId: string
  sender: 'student' | 'counsellor'
  text: string
  createdAt: string
}

export const activityStore: {
  activities: ActivityEntry[]
  notes: NoteEntry[]
  documents: StudentDocument[]
  messages: ChatMessage[]
} = {
  documents: [
    { id: 'd1', studentId: 's1', name: 'Passport', status: 'Verified', fileName: 'passport.pdf', uploadedAt: '2026-01-15T10:00:00Z' },
    { id: 'd2', studentId: 's1', name: 'IELTS Scorecard', status: 'Uploaded', fileName: 'ielts.pdf', uploadedAt: '2026-02-01T10:00:00Z' },
    { id: 'd3', studentId: 's1', name: 'Academic Transcripts', status: 'Pending' },
    { id: 'd4', studentId: 's1', name: 'SOP', status: 'Pending' },
    { id: 'd5', studentId: 's1', name: 'Offer Letter', status: 'Pending' },
  ],
  messages: [
    { id: 'm1', studentId: 's1', sender: 'counsellor', text: 'Hi Hassan, please upload your IELTS scorecard.', createdAt: '2026-05-10T09:00:00Z' },
    { id: 'm2', studentId: 's1', sender: 'student', text: 'Sure, I will upload it today.', createdAt: '2026-05-10T10:30:00Z' },
    { id: 'm3', studentId: 's1', sender: 'counsellor', text: 'Thank you! Your application to UNSW is in progress.', createdAt: '2026-05-12T14:00:00Z' },
  ],
  activities: [
    { id: 'a1', entityType: 'student', entityId: 's1', action: 'Student registered', detail: 'Converted from enquiry', user: 'Counsellor A', createdAt: '2026-04-08T10:00:00Z' },
    { id: 'a2', entityType: 'student', entityId: 's1', action: 'Documents verified', detail: 'Passport and IELTS verified', user: 'Admin', createdAt: '2026-04-15T11:00:00Z' },
    { id: 'a3', entityType: 'student', entityId: 's1', action: 'Application submitted', detail: 'UNSW Global — PHD', user: 'Counselling', createdAt: '2026-04-27T14:00:00Z' },
    { id: 'a4', entityType: 'student', entityId: 's1', action: 'Follow-up scheduled', detail: 'IELTS score discussion', user: 'Counsellor A', createdAt: '2026-06-01T09:00:00Z' },
  ],
  notes: [
    { id: 'n1', entityType: 'student', entityId: 's1', text: 'Strong candidate for Canada intake. Partner referral from Ahmed Raza.', user: 'Operational Head', createdAt: '2026-04-08T12:00:00Z' },
    { id: 'n2', entityType: 'student', entityId: 's1', text: 'IELTS 7.5 — meets university requirement. Proceed with application.', user: 'Counsellor A', createdAt: '2026-05-01T15:30:00Z' },
  ],
}

export function logActivity(
  entityType: ActivityEntry['entityType'],
  entityId: string,
  action: string,
  detail?: string,
  user = "D' Educationist",
) {
  activityStore.activities.unshift({
    id: crypto.randomUUID(),
    entityType,
    entityId,
    action,
    detail,
    user,
    createdAt: new Date().toISOString(),
  })
}

export function addNote(
  entityType: NoteEntry['entityType'],
  entityId: string,
  text: string,
  user = "D' Educationist",
) {
  const note: NoteEntry = {
    id: crypto.randomUUID(),
    entityType,
    entityId,
    text,
    user,
    createdAt: new Date().toISOString(),
  }
  activityStore.notes.unshift(note)
  logActivity(entityType, entityId, 'Note added', text.slice(0, 80), user)
  return note
}
