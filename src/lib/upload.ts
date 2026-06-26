import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import multer from 'multer'

export const uploadsRoot = join(dirname(fileURLToPath(import.meta.url)), '../../uploads')
mkdirSync(join(uploadsRoot, 'standard'), { recursive: true })
mkdirSync(join(uploadsRoot, 'students'), { recursive: true })

export function createUploader(subdir: string) {
  const dest = join(uploadsRoot, subdir)
  mkdirSync(dest, { recursive: true })
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
      cb(null, `${Date.now()}-${safe}`)
    },
  })
  return multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } })
}

export const standardUpload = createUploader('standard')

export function studentUpload(studentId: string) {
  return createUploader(`students/${studentId}`)
}
