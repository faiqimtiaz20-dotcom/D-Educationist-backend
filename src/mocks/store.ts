import enquiriesData from './enquiries.json'
import studentsData from './students.json'
import applicationsData from './applications.json'
import visasData from './visas.json'
import defersData from './defers.json'
import enrolledData from './enrolled.json'
import invoicesData from './invoices.json'
import partnerInvoicesData from './partner-invoices.json'
import universityCommissionData from './university-commission.json'
import calendarEventsData from './calendar-events.json'
import universitiesData from './universities.json'
import universityMastersData from './university-masters.json'
import type { DashboardStats } from '@/lib/dashboard-stats'
import type {
  Application,
  CalendarEvent,
  DeferRecord,
  Enquiry,
  EnrolledRecord,
  Invoice,
  PaginatedResponse,
  PartnerInvoice,
  Student,
  Timestamps,
  UniversityCommission,
  UniversityMaster,
  VisaRecord,
} from '@/types'

export interface UniversityEntry {
  country: string
  count: number
}

export interface ListParams {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  partnerId?: string
  isPartner?: boolean
}

function createInitialStore() {
  return {
    enquiries: structuredClone(enquiriesData) as Enquiry[],
    students: structuredClone(studentsData) as Student[],
    applications: structuredClone(applicationsData) as Application[],
    visas: structuredClone(visasData) as VisaRecord[],
    defers: structuredClone(defersData) as DeferRecord[],
    enrolled: structuredClone(enrolledData) as EnrolledRecord[],
    invoices: structuredClone(invoicesData) as Invoice[],
    partnerInvoices: structuredClone(partnerInvoicesData) as PartnerInvoice[],
    universityCommission: structuredClone(universityCommissionData) as UniversityCommission[],
    calendarEvents: structuredClone(calendarEventsData) as CalendarEvent[],
    universities: structuredClone(universitiesData) as UniversityEntry[],
    universityMasters: structuredClone(universityMastersData) as UniversityMaster[],
  }
}

type MockStore = ReturnType<typeof createInitialStore>

const STORE_KEY = '__deCrmMockStore__'

function getMockStore(): MockStore {
  const globalStore = globalThis as typeof globalThis & { [STORE_KEY]?: MockStore }
  if (!globalStore[STORE_KEY]) {
    globalStore[STORE_KEY] = createInitialStore()
  }
  return globalStore[STORE_KEY]
}

/** HMR-safe singleton so mock data survives Vite hot reloads */
export const store = getMockStore()

export function paginate<T>(
  items: T[],
  page = 1,
  pageSize = 10,
): PaginatedResponse<T> {
  const safePage = Math.max(1, page)
  const safePageSize = Math.max(1, pageSize)
  const start = (safePage - 1) * safePageSize
  return {
    data: items.slice(start, start + safePageSize),
    total: items.length,
    page: safePage,
    pageSize: safePageSize,
  }
}

export function filterSearch<T extends Record<string, unknown>>(
  items: T[],
  search: string,
  fields: (keyof T)[],
): T[] {
  const query = search.trim().toLowerCase()
  if (!query) return items

  return items.filter((item) =>
    fields.some((field) => {
      const value = item[field]
      return value != null && String(value).toLowerCase().includes(query)
    }),
  )
}

interface FilterOptions<T> {
  searchFields: (keyof T)[]
  statusField?: keyof T
  partnerIdField?: keyof T
  isPartnerField?: keyof T
}

export function applyListFilters<T extends Record<string, unknown>>(
  items: T[],
  params: ListParams,
  options: FilterOptions<T>,
): T[] {
  let result = [...items]

  if (params.search) {
    result = filterSearch(result, params.search, options.searchFields)
  }
  if (params.status && options.statusField) {
    result = result.filter((item) => item[options.statusField!] === params.status)
  }
  if (params.partnerId && options.partnerIdField) {
    result = result.filter((item) => item[options.partnerIdField!] === params.partnerId)
  }
  if (params.isPartner !== undefined && options.isPartnerField) {
    result = result.filter((item) => item[options.isPartnerField!] === params.isPartner)
  }

  return result
}

export function listItems<T extends Record<string, unknown>>(
  items: T[],
  params: ListParams,
  options: FilterOptions<T>,
): PaginatedResponse<T> {
  const filtered = applyListFilters(items, params, options)
  return paginate(filtered, params.page ?? 1, params.pageSize ?? 10)
}

function nowIso() {
  return new Date().toISOString()
}

function nextId(prefix: string, items: { id: string }[]): string {
  const numbers = items
    .map((item) => {
      const match = item.id.match(new RegExp(`^${prefix}(\\d+)$`))
      return match ? Number(match[1]) : 0
    })
    .filter((n) => n > 0)

  const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1
  return `${prefix}${next}`
}

export function getById<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id)
}

export function createRecord<T extends { id: string } & Timestamps>(
  items: T[],
  data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
  idPrefix: string,
): T {
  const timestamp = nowIso()
  const record = {
    ...data,
    id: nextId(idPrefix, items),
    createdAt: timestamp,
    updatedAt: timestamp,
  } as T

  items.unshift(record)
  return record
}

export function updateRecord<T extends { id: string } & Timestamps>(
  items: T[],
  id: string,
  data: Partial<T>,
): T | null {
  const index = items.findIndex((item) => item.id === id)
  if (index === -1) return null

  const updated = {
    ...items[index],
    ...data,
    id: items[index].id,
    createdAt: items[index].createdAt,
    updatedAt: nowIso(),
  } as T

  items[index] = updated
  return updated
}

export function deleteRecords<T extends { id: string }>(items: T[], ids: string[]): number {
  const idSet = new Set(ids)
  const before = items.length
  const remaining = items.filter((item) => !idSet.has(item.id))
  items.splice(0, items.length, ...remaining)
  return before - remaining.length
}

function adjustUniversityCountryCount(country: string, delta: number) {
  const entry = getUniversityByCountry(country)
  if (entry) {
    entry.count = Math.max(0, entry.count + delta)
    return
  }
  if (delta > 0) {
    store.universities.push({ country, count: delta })
  }
}

export function listUniversityMasters(
  params: ListParams & { country?: string },
): PaginatedResponse<UniversityMaster> {
  let result = [...store.universityMasters]
  if (params.country) {
    result = result.filter((item) => item.country === params.country)
  }
  if (params.search) {
    result = filterSearch(result, params.search, ['name', 'country', 'commissionContract'])
  }
  return paginate(result, params.page ?? 1, params.pageSize ?? 10)
}

export function getUniversityMasterById(id: string): UniversityMaster | undefined {
  return store.universityMasters.find((item) => item.id === id)
}

export function createUniversityMaster(
  data: Omit<UniversityMaster, 'id' | 'createdAt' | 'updatedAt'>,
): UniversityMaster {
  const record = createRecord(store.universityMasters, data, 'um')
  adjustUniversityCountryCount(record.country, 1)
  return record
}

export function updateUniversityMaster(
  id: string,
  data: Partial<Omit<UniversityMaster, 'id' | 'createdAt' | 'updatedAt'>>,
): UniversityMaster | null {
  const existing = getUniversityMasterById(id)
  const updated = updateRecord(store.universityMasters, id, data)
  if (updated && existing && data.country && data.country !== existing.country) {
    adjustUniversityCountryCount(existing.country, -1)
    adjustUniversityCountryCount(data.country, 1)
  }
  return updated
}

export function deleteUniversityMasters(ids: string[]): number {
  const toDelete = store.universityMasters.filter((item) => ids.includes(item.id))
  const deleted = deleteRecords(store.universityMasters, ids)
  if (deleted) {
    for (const item of toDelete) {
      adjustUniversityCountryCount(item.country, -1)
    }
  }
  return deleted
}

export function addUniversityCampus(
  universityId: string,
  campus: Omit<UniversityMaster['campuses'][number], 'id'>,
): UniversityMaster | null {
  const university = getUniversityMasterById(universityId)
  if (!university) return null
  const campusRecord = { ...campus, id: nextId('cp', university.campuses) }
  return updateUniversityMaster(universityId, {
    campuses: [...university.campuses, campusRecord],
  })
}

export function getUniversityByCountry(country: string): UniversityEntry | undefined {
  return store.universities.find((item) => item.country === country)
}

export function createUniversity(data: UniversityEntry): UniversityEntry {
  const existing = getUniversityByCountry(data.country)
  if (existing) {
    existing.count = data.count
    return existing
  }
  store.universities.push({ ...data })
  return data
}

export function updateUniversity(country: string, data: Partial<UniversityEntry>): UniversityEntry | null {
  const index = store.universities.findIndex((item) => item.country === country)
  if (index === -1) return null

  const updated = { ...store.universities[index], ...data, country }
  store.universities[index] = updated
  return updated
}

export function deleteUniversities(countries: string[]): number {
  const countrySet = new Set(countries)
  const before = store.universities.length
  const remaining = store.universities.filter((item) => !countrySet.has(item.country))
  store.universities.splice(0, store.universities.length, ...remaining)
  return before - remaining.length
}

export function listUniversities(params: ListParams): PaginatedResponse<UniversityEntry> {
  let result = [...store.universities]
  if (params.search) {
    result = filterSearch(result, params.search, ['country'])
  }
  return paginate(result, params.page ?? 1, params.pageSize ?? 10)
}

export function createCalendarEvent(
  data: Omit<CalendarEvent, 'id'>,
): CalendarEvent {
  const event: CalendarEvent = { ...data, id: nextId('ev', store.calendarEvents) }
  store.calendarEvents.unshift(event)
  return event
}

export function updateCalendarEvent(id: string, data: Partial<CalendarEvent>): CalendarEvent | null {
  const index = store.calendarEvents.findIndex((item) => item.id === id)
  if (index === -1) return null

  const updated = { ...store.calendarEvents[index], ...data, id }
  store.calendarEvents[index] = updated
  return updated
}

export function deleteCalendarEvents(ids: string[]): number {
  return deleteRecords(store.calendarEvents, ids)
}

export type { DashboardStats } from '@/lib/dashboard-stats'

function matchesPartnerFilter<T extends { partnerId?: string | null }>(
  item: T,
  partnerId?: string,
): boolean {
  if (!partnerId) return true
  return item.partnerId === partnerId
}

export function computeDashboardStats(filters?: {
  partnerId?: string
  branch?: string
}): DashboardStats {
  const { partnerId, branch } = filters ?? {}

  const enquiries = store.enquiries.filter(
    (item) => matchesPartnerFilter(item, partnerId) && (!branch || item.branch === branch),
  )
  const students = store.students.filter(
    (item) => matchesPartnerFilter(item, partnerId) && (!branch || item.branch === branch),
  )
  const applications = store.applications.filter(
    (item) =>
      matchesPartnerFilter(item, partnerId) &&
      (!branch || item.branch === branch) &&
      (partnerId ? true : item.isPartner !== false),
  )
  const visas = store.visas.filter(
    (item) => matchesPartnerFilter(item, partnerId) && (!branch || item.branch === branch),
  )
  const defers = store.defers.filter(
    (item) => matchesPartnerFilter(item, partnerId) && (!branch || item.branch === branch),
  )
  const enrolled = store.enrolled.filter(
    (item) => matchesPartnerFilter(item, partnerId) && (!branch || item.branch === branch),
  )
  const invoices = store.invoices.filter((item) => matchesPartnerFilter(item, partnerId))
  const partnerInvoices = partnerId
    ? store.partnerInvoices.filter((item) => item.partnerId === partnerId)
    : store.partnerInvoices

  const partnerIds = new Set(
    [...store.enquiries, ...store.students, ...store.applications]
      .map((item) => item.partnerId)
      .filter((id): id is string => Boolean(id)),
  )

  return {
    enquiries: {
      total: enquiries.length,
      new: enquiries.filter((item) => item.status === 'New Enquiry').length,
      followUp: enquiries.filter((item) => item.status === 'Follow-up Required').length,
      interested: enquiries.filter((item) => item.status === 'Interested').length,
    },
    students: {
      total: students.length,
      documentsPending: students.filter((item) => item.docStatus === 'Pending').length,
      onHold: students.filter((item) => item.status === 'On Hold').length,
    },
    applications: {
      total: applications.length,
      underReview: applications.filter((item) => item.status === 'Application Under Review').length,
      offerReceived: applications.filter((item) => item.status === 'Offer Received').length,
      finalized: applications.filter((item) => item.status === 'Finalized').length,
    },
    visas: {
      total: visas.length,
      inProgress: visas.filter((item) => item.visaStatus === 'Visa Application In Progress').length,
      granted: visas.filter((item) =>
        ['Visa Granted', 'Visa Approved'].includes(item.visaStatus),
      ).length,
      rejected: visas.filter((item) => item.visaStatus === 'Visa Rejected').length,
    },
    defers: { total: defers.length },
    enrolled: { total: enrolled.length },
    invoices: {
      total: invoices.length,
      pending: invoices.filter((item) => item.status === 'Pending').length,
      partialPaid: invoices.filter((item) => item.status === 'Partial Paid').length,
      fullyPaid: invoices.filter((item) => item.status === 'Fully Paid').length,
      totalPendingAmount: invoices.reduce((sum, item) => sum + item.pendingAmount, 0),
    },
    partnerInvoices: {
      total: partnerInvoices.length,
      pendingCommission: partnerInvoices.reduce((sum, item) => sum + item.pendingCommission, 0),
    },
    universityCommission: {
      total: store.universityCommission.length,
      pendingCommission: store.universityCommission.reduce(
        (sum, item) => sum + item.pendingCommission,
        0,
      ),
    },
    partners: { total: partnerIds.size },
  }
}
