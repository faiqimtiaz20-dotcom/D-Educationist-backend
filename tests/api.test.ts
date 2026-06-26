import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'

const app = createApp()

async function login(email: string, password: string, portal: 'admin' | 'partner' | 'student') {
  const res = await request(app).post('/api/auth/login').send({ username: email, password, portal })
  return res
}

describe('Auth', () => {
  it('logs in admin with valid credentials', async () => {
    const res = await login('admin@deducationist.com', 'admin123', 'admin')
    expect(res.status).toBe(200)
    expect(res.body.accessToken).toBeTruthy()
    expect(res.body.user.role).toBe('admin')
  })

  it('rejects invalid credentials', async () => {
    const res = await login('admin@deducationist.com', 'wrong', 'admin')
    expect(res.status).toBe(401)
  })
})

describe('Tenant isolation & scoping', () => {
  let adminToken: string
  let partnerToken: string
  let studentToken: string

  beforeAll(async () => {
    const [admin, partner, student] = await Promise.all([
      login('admin@deducationist.com', 'admin123', 'admin'),
      login('partner@deducationist.com', 'partner123', 'partner'),
      login('student@deducationist.com', 'student123', 'student'),
    ])
    expect(admin.status).toBe(200)
    expect(partner.status).toBe(200)
    expect(student.status).toBe(200)
    adminToken = admin.body.accessToken
    partnerToken = partner.body.accessToken
    studentToken = student.body.accessToken
  })

  it('health check returns ok', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })

  it('admin can list all visas', async () => {
    const res = await request(app)
      .get('/api/visas')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.total).toBeGreaterThan(0)
  })

  it('partner only sees partner-scoped visas', async () => {
    const [adminRes, partnerRes] = await Promise.all([
      request(app).get('/api/visas?pageSize=100').set('Authorization', `Bearer ${adminToken}`),
      request(app).get('/api/visas?pageSize=100').set('Authorization', `Bearer ${partnerToken}`),
    ])
    expect(partnerRes.status).toBe(200)
    expect(partnerRes.body.total).toBeLessThanOrEqual(adminRes.body.total)
    for (const visa of partnerRes.body.data) {
      expect(visa.isPartner).toBe(true)
    }
  })

  it('student only sees own visa records', async () => {
    const res = await request(app)
      .get('/api/visas?pageSize=100')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    for (const visa of res.body.data) {
      expect(visa.studentRef).toBe('DE/S/26/00500')
    }
  })

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/visas')
    expect(res.status).toBe(401)
  })
})

describe('Extended API modules', () => {
  let adminToken: string
  let studentToken: string

  beforeAll(async () => {
    const [admin, student] = await Promise.all([
      login('admin@deducationist.com', 'admin123', 'admin'),
      login('student@deducationist.com', 'student123', 'student'),
    ])
    adminToken = admin.body.accessToken
    studentToken = student.body.accessToken
  })

  it('lists master items by category', async () => {
    const res = await request(app)
      .get('/api/masters/branch')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('lists tasks', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.total).toBeGreaterThan(0)
  })

  it('student can list announcements', async () => {
    const res = await request(app)
      .get('/api/announcements')
      .set('Authorization', `Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('forgot password accepts email', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'admin@deducationist.com' })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('creates and lists entity interactions for a student', async () => {
    const studentsRes = await request(app)
      .get('/api/students?pageSize=1')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(studentsRes.status).toBe(200)
    const studentId = studentsRes.body.data[0]?.id
    expect(studentId).toBeTruthy()

    const createRes = await request(app)
      .post('/api/interactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        entityType: 'student',
        entityId: studentId,
        kind: 'followup',
        remarks: 'Test follow-up remark',
        stage: 'Counselling',
        nextDate: '2026-07-01',
        nextTime: '10:00',
      })
    expect(createRes.status).toBe(201)
    expect(createRes.body.attempt).toBeGreaterThan(0)

    const listRes = await request(app)
      .get('/api/interactions')
      .query({ entityType: 'student', entityId: studentId, kind: 'followup' })
      .set('Authorization', `Bearer ${adminToken}`)
    expect(listRes.status).toBe(200)
    expect(listRes.body.data.some((row: { remarks: string }) => row.remarks === 'Test follow-up remark')).toBe(true)
  })

  it('creates and lists application comments', async () => {
    const appsRes = await request(app)
      .get('/api/applications?pageSize=1')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(appsRes.status).toBe(200)
    const applicationId = appsRes.body.data[0]?.id
    expect(applicationId).toBeTruthy()

    const createRes = await request(app)
      .post(`/api/applications/${applicationId}/comments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ comment: 'Integration test comment', attachmentName: 'test.pdf' })
    expect(createRes.status).toBe(201)
    expect(createRes.body.comment).toBe('Integration test comment')

    const listRes = await request(app)
      .get(`/api/applications/${applicationId}/comments`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(listRes.status).toBe(200)
    expect(listRes.body.data.some((row: { comment: string }) => row.comment === 'Integration test comment')).toBe(true)
  })
})
