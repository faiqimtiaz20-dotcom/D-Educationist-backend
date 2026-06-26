export interface ApplicationComment {
  id: string
  applicationId: string
  comment: string
  attachmentName?: string
  createdBy: string
  createdAt: string
}

export const applicationCommentStore = {
  comments: [
    {
      id: 'ac1',
      applicationId: 'a1',
      comment: 'Application documents submitted to university portal.',
      attachmentName: 'submission-receipt.pdf',
      createdBy: 'Counsellor A',
      createdAt: '2026-04-28T10:30:00Z',
    },
    {
      id: 'ac2',
      applicationId: 'a1',
      comment: 'University acknowledged receipt. Awaiting initial review.',
      createdBy: 'Operational Head',
      createdAt: '2026-04-29T14:15:00Z',
    },
  ] as ApplicationComment[],
}

export function getApplicationComments(applicationId: string) {
  return applicationCommentStore.comments
    .filter((comment) => comment.applicationId === applicationId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function addApplicationComment(
  applicationId: string,
  comment: string,
  attachmentName?: string,
  createdBy = "D' Educationist",
) {
  const record: ApplicationComment = {
    id: crypto.randomUUID(),
    applicationId,
    comment,
    attachmentName,
    createdBy,
    createdAt: new Date().toISOString(),
  }
  applicationCommentStore.comments.unshift(record)
  return record
}
