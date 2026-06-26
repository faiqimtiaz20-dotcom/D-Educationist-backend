import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { getTenantId } from '../../shared/scope.js'
import { notFound } from '../../shared/errors.js'

export const messagesRouter = Router()

messagesRouter.get('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  let studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined

  if (req.user?.portal === 'student') {
    const student = await prisma.student.findFirst({
      where: { tenantId, studentRef: req.user.studentId ?? '' },
    })
    if (!student) throw notFound('Student not found')
    studentId = student.id
  }

  if (!studentId) {
    res.json({ data: [], total: 0, page: 1, pageSize: 0 })
    return
  }

  const rows = await prisma.chatMessage.findMany({
    where: { tenantId, studentId },
    orderBy: { createdAt: 'asc' },
  })

  res.json({
    data: rows.map((m) => ({
      id: m.id,
      studentId: m.studentId,
      sender: m.sender,
      text: m.text,
      createdAt: m.createdAt.toISOString(),
    })),
    total: rows.length,
    page: 1,
    pageSize: rows.length,
  })
})

messagesRouter.post('/', async (req, res) => {
  const tenantId = await getTenantId(req)
  const { studentId, text } = req.body

  let resolvedStudentId = studentId
  if (req.user?.portal === 'student') {
    const student = await prisma.student.findFirst({
      where: { tenantId, studentRef: req.user.studentId ?? '' },
    })
    if (!student) throw notFound('Student not found')
    resolvedStudentId = student.id
  }

  const sender = req.user?.portal === 'student' ? 'student' : 'counsellor'

  const created = await prisma.chatMessage.create({
    data: { tenantId, studentId: resolvedStudentId, sender, text },
  })

  res.status(201).json({
    id: created.id,
    studentId: created.studentId,
    sender: created.sender,
    text: created.text,
    createdAt: created.createdAt.toISOString(),
  })
})
