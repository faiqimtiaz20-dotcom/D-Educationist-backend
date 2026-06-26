import type { Request } from 'express'

export interface ListQuery {
  page: number
  pageSize: number
  search?: string
  status?: string
  partnerId?: string
  isPartner?: boolean
  branch?: string
  country?: string
  intake?: string
}

export function parseListQuery(req: Request): ListQuery {
  const page = Math.max(1, Number(req.query.page) || 1)
  const pageSize = Math.min(500, Math.max(1, Number(req.query.pageSize) || 10))
  const search = typeof req.query.search === 'string' ? req.query.search : undefined
  const status = typeof req.query.status === 'string' ? req.query.status : undefined
  const partnerId = typeof req.query.partnerId === 'string' ? req.query.partnerId : undefined
  const branch = typeof req.query.branch === 'string' ? req.query.branch : undefined
  const country = typeof req.query.country === 'string' ? req.query.country : undefined
  const intake = typeof req.query.intake === 'string' ? req.query.intake : undefined
  const isPartner =
    req.query.isPartner === 'true' ? true : req.query.isPartner === 'false' ? false : undefined

  return { page, pageSize, search, status, partnerId, isPartner, branch, country, intake }
}

export function paginated<T>(data: T[], total: number, page: number, pageSize: number) {
  return { data, total, page, pageSize }
}

export function skipTake(page: number, pageSize: number) {
  return { skip: (page - 1) * pageSize, take: pageSize }
}
