import { Router } from 'express'
import { existsSync } from 'node:fs'
import { prisma } from '../../lib/prisma.js'
import { standardUpload, studentUpload } from '../../lib/upload.js'
import { getTenantId } from '../../shared/scope.js'
import { notFound, badRequest } from '../../shared/errors.js'

export const documentsRouter = Router()

function mapStandard(d: {
  id: string
  name: string
  fileName: string
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: d.id,
    name: d.name,
    fileName: d.fileName,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }
}

function mapStudentDoc(d: {
  id: string
  studentId: string
  name: string
  docType: string | null
  status: string
  fileName: string | null
  uploadedAt: Date | null
  remark: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: d.id,
    studentId: d.studentId,
    name: d.name,
    docType: d.docType ?? undefined,
    status: d.status,
    fileName: d.fileName ?? undefined,
    uploadedAt: d.uploadedAt?.toISOString(),
    remark: d.remark ?? undefined,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }
}

documentsRouter.get('/standard', async (req, res) => {
  const tenantId = await getTenantId(req)
  const rows = await prisma.standardDocument.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ data: rows.map(mapStandard), total: rows.length, page: 1, pageSize: rows.length })
})

documentsRouter.post('/standard/upload', standardUpload.single('file'), async (req, res) => {
  const tenantId = await getTenantId(req)
  if (!req.file) throw badRequest('File required')
  const name = (req.body.name as string) || req.file.originalname

  const created = await prisma.standardDocument.create({
    data: {
      tenantId,
      name,
      fileName: req.file.originalname,
      filePath: req.file.path,
      mimeType: req.file.mimetype,
    },
  })
  res.status(201).json(mapStandard(created))
})

documentsRouter.delete('/standard/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  await prisma.standardDocument.deleteMany({ where: { id: req.params.id, tenantId } })
  res.json({ deleted: 1 })
})

documentsRouter.get('/students/:studentId', async (req, res) => {
  const tenantId = await getTenantId(req)
  const student = await prisma.student.findFirst({
    where: { id: req.params.studentId, tenantId },
  })
  if (!student) throw notFound('Student not found')

  if (req.user?.portal === 'student' && req.user.studentId !== student.studentRef) {
    throw notFound('Student not found')
  }

  const rows = await prisma.studentDocument.findMany({
    where: { tenantId, studentId: student.id },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ data: rows.map(mapStudentDoc), total: rows.length, page: 1, pageSize: rows.length })
})

documentsRouter.post('/students/:studentId/upload', async (req, res, next) => {
  const tenantId = await getTenantId(req)
  const student = await prisma.student.findFirst({
    where: { id: req.params.studentId, tenantId },
  })
  if (!student) throw notFound('Student not found')

  studentUpload(student.id).single('file')(req, res, async (err) => {
    if (err) return next(err)
    const name = (req.body.name as string) || req.body.docType || 'Document'
    const docType = (req.body.docType as string) || name

    const created = await prisma.studentDocument.create({
      data: {
        tenantId,
        studentId: student.id,
        name,
        docType,
        status: req.file ? 'Uploaded' : 'Pending',
        fileName: req.file?.originalname,
        filePath: req.file?.path,
        mimeType: req.file?.mimetype,
        uploadedAt: req.file ? new Date() : null,
      },
    })
    res.status(201).json(mapStudentDoc(created))
  })
})

documentsRouter.patch('/students/:docId', async (req, res) => {
  const tenantId = await getTenantId(req)
  const existing = await prisma.studentDocument.findFirst({
    where: { id: req.params.docId, tenantId },
  })
  if (!existing) throw notFound('Document not found')

  const updated = await prisma.studentDocument.update({
    where: { id: req.params.docId },
    data: {
      status: req.body.status,
      remark: req.body.remark,
      name: req.body.name,
    },
  })
  res.json(mapStudentDoc(updated))
})

documentsRouter.get('/download/:type/:id', async (req, res) => {
  const tenantId = await getTenantId(req)
  const { type, id } = req.params

  if (type === 'standard') {
    const doc = await prisma.standardDocument.findFirst({ where: { id, tenantId } })
    if (!doc || !existsSync(doc.filePath)) throw notFound('File not found')
    res.download(doc.filePath, doc.fileName)
    return
  }

  if (type === 'student') {
    const doc = await prisma.studentDocument.findFirst({ where: { id, tenantId } })
    if (!doc?.filePath || !existsSync(doc.filePath)) throw notFound('File not found')
    res.download(doc.filePath, doc.fileName ?? 'document')
    return
  }

  throw notFound('File not found')
})
