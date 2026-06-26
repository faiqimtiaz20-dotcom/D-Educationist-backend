import 'express-async-errors'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { pinoHttp } from 'pino-http'
import { env } from './config/env.js'
import { prisma } from './lib/prisma.js'
import { authenticate } from './middleware/auth.js'
import { errorHandler } from './middleware/errorHandler.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { enquiriesRouter } from './modules/enquiries/enquiries.routes.js'
import { studentsRouter } from './modules/students/students.routes.js'
import { applicationsRouter } from './modules/applications/applications.routes.js'
import { visasRouter } from './modules/visas/visas.routes.js'
import { defersRouter } from './modules/defers/defers.routes.js'
import { enrolledRouter } from './modules/enrolled/enrolled.routes.js'
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js'
import {
  invoicesRouter,
  partnerInvoicesRouter,
  universityCommissionRouter,
} from './modules/invoices/invoices.routes.js'
import { calendarRouter } from './modules/calendar/calendar.routes.js'
import { universitiesRouter } from './modules/universities/universities.routes.js'
import { universityMastersRouter } from './modules/university-masters/university-masters.routes.js'
import { coursesRouter } from './modules/courses/courses.routes.js'
import { mastersRouter, tenantsRouter } from './modules/masters/masters.routes.js'
import { activitiesRouter, notesRouter } from './modules/activities/activities.routes.js'
import { tasksRouter } from './modules/tasks/tasks.routes.js'
import { documentsRouter } from './modules/documents/documents.routes.js'
import { messagesRouter } from './modules/messages/messages.routes.js'
import { marketingRouter } from './modules/marketing/marketing.routes.js'
import { integrationsRouter } from './modules/integrations/integrations.routes.js'
import { qrFormsRouter } from './modules/qr-forms/qr-forms.routes.js'
import { announcementsRouter } from './modules/announcements/announcements.routes.js'
import { resourcesRouter } from './modules/resources/resources.routes.js'
import { interactionsRouter } from './modules/interactions/interactions.routes.js'

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || origin.replace(/\/+$/, '') === env.CORS_ORIGIN) {
          callback(null, origin ?? env.CORS_ORIGIN)
          return
        }
        callback(new Error('Not allowed by CORS'))
      },
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '2mb' }))
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: env.NODE_ENV === 'test' ? 10_000 : 500,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  )
  app.use(pinoHttp({ autoLogging: env.NODE_ENV !== 'test' }))

  app.get('/health', async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  const api = express.Router()
  api.use('/auth', authRouter)

  const protectedRoutes = express.Router()
  protectedRoutes.use(authenticate())
  protectedRoutes.use('/enquiries', enquiriesRouter)
  protectedRoutes.use('/students', studentsRouter)
  protectedRoutes.use('/applications', applicationsRouter)
  protectedRoutes.use('/visas', visasRouter)
  protectedRoutes.use('/defers', defersRouter)
  protectedRoutes.use('/enrolled', enrolledRouter)
  protectedRoutes.use('/dashboard', dashboardRouter)
  protectedRoutes.use('/invoices', invoicesRouter)
  protectedRoutes.use('/partner-invoices', partnerInvoicesRouter)
  protectedRoutes.use('/university-commission', universityCommissionRouter)
  protectedRoutes.use('/calendar-events', calendarRouter)
  protectedRoutes.use('/universities', universitiesRouter)
  protectedRoutes.use('/university-masters', universityMastersRouter)
  protectedRoutes.use('/courses', coursesRouter)
  protectedRoutes.use('/masters', mastersRouter)
  protectedRoutes.use('/tenants', tenantsRouter)
  protectedRoutes.use('/activities', activitiesRouter)
  protectedRoutes.use('/notes', notesRouter)
  protectedRoutes.use('/tasks', tasksRouter)
  protectedRoutes.use('/documents', documentsRouter)
  protectedRoutes.use('/messages', messagesRouter)
  protectedRoutes.use('/marketing', marketingRouter)
  protectedRoutes.use('/integrations', integrationsRouter)
  protectedRoutes.use('/qr-forms', qrFormsRouter)
  protectedRoutes.use('/announcements', announcementsRouter)
  protectedRoutes.use('/learning-resources', resourcesRouter)
  protectedRoutes.use('/interactions', interactionsRouter)

  api.use(protectedRoutes)
  app.use('/api', api)

  app.use(errorHandler)
  return app
}
