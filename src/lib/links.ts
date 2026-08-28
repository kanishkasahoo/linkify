import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { nanoid } from 'nanoid'
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm'
import { db } from './db'
import { clicks, links, apiKeys } from './schema'
import { auth } from './auth'
import { generateApiKey, hashPassword } from './keys'
import { API_SCOPES, type ApiScope } from './api-scopes'
import { hitLimit } from './ratelimit'
import type { Link } from './schema'
import { auditEvent } from './audit'

async function requireUser() {
  const session = await auth.api.getSession({ headers: getRequestHeaders() })
  if (!session) throw new Error('Unauthorized')
  if (session.user.mustChangePassword) throw new Error('Change your temporary password first')
  if (session.user.role === 'admin' && !session.user.twoFactorEnabled) {
    throw new Error('Enable two-factor authentication first')
  }
  return session.user
}

/**
 * WHERE clause restricting links to those the actor may see. Admins see
 * everything; everyone else only sees their own links.
 */
export function ownedByClause(actor: { id: string; role: string }) {
  if (actor.role === 'admin') return undefined
  return eq(links.userId, actor.id)
}

const CODE_RE = /^[a-zA-Z0-9_-]{1,64}$/
const MAX_URL_LEN = 2_048
const MAX_TITLE_LEN = 200
export const MAX_LINK_PASSWORD_LEN = 128

const MAX_TAGS = 10
const MAX_TAG_LEN = 32

/** Normalize user-supplied tags: lowercase, trimmed, deduped, capped. */
export function normalizeTags(tags?: string[] | null): string[] {
  if (!tags) return []
  const out: string[] = []
  for (const raw of tags) {
    if (typeof raw !== 'string') throw new Error('Tags must be strings')
    const t = raw.trim().toLowerCase().replace(/\s+/g, '-')
    if (!t) continue
    if (t.length > MAX_TAG_LEN) throw new Error(`Tags must be ${MAX_TAG_LEN} characters or fewer`)
    if (!out.includes(t)) out.push(t)
  }
  if (out.length > MAX_TAGS) throw new Error(`At most ${MAX_TAGS} tags per link`)
  return out
}

const CREATE_LIMIT = 30
const CREATE_WINDOW_MS = 60 * 60 * 1000

async function enforceCreateLimit(userId: string) {
  const { allowed, retryAfterSec } = await hitLimit(`create:${userId}`, CREATE_LIMIT, CREATE_WINDOW_MS)
  if (!allowed) {
    const mins = Math.ceil(retryAfterSec / 60)
    throw new Error(`Rate limit reached — you can create more links in ~${mins} min`)
  }
}

export function validateUrl(url: unknown) {
  if (typeof url !== 'string' || !url.trim() || url.length > MAX_URL_LEN) {
    throw new Error(`URL is required and must be ${MAX_URL_LEN} characters or fewer`)
  }
  try {
    const u = new URL(url.trim())
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error()
    return u.toString()
  } catch {
    throw new Error('Invalid URL — must start with http:// or https://')
  }
}

export function validateCode(code: unknown) {
  if (typeof code !== 'string') throw new Error('Code is required')
  if (!CODE_RE.test(code)) {
    throw new Error('Code may only contain letters, numbers, dashes and underscores (max 64)')
  }
  const reserved = ['dashboard', 'login', 'setup', 'api']
  if (reserved.includes(code.toLowerCase())) throw new Error('That code is reserved')
  return code
}

function validateTitle(title: unknown): string | null {
  if (title === undefined || title === null || title === '') return null
  if (typeof title !== 'string' || title.length > MAX_TITLE_LEN) {
    throw new Error(`Title must be ${MAX_TITLE_LEN} characters or fewer`)
  }
  return title.trim() || null
}

function validatePassword(password: unknown): string | null | undefined {
  if (password === undefined) return undefined
  if (password === null || password === '') return null
  if (typeof password !== 'string' || password.length > MAX_LINK_PASSWORD_LEN) {
    throw new Error(`Password must be ${MAX_LINK_PASSWORD_LEN} characters or fewer`)
  }
  return password
}

function validateExpiry(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  if (typeof value !== 'string') throw new Error('Expiry must be an ISO date string')
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('Expiry must be a valid date')
  return date.toISOString()
}

function asObject(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid input')
  return input as Record<string, unknown>
}

export interface LinkInput {
  url: string
  code?: string
  title?: string | null
  tags?: string[]
  expiresAt?: string | null
  password?: string | null
}

export type SafeLink = Omit<Link, 'passwordHash'> & { passwordProtected: boolean }

export function safeLink(row: Link): SafeLink {
  const { passwordHash, ...rest } = row
  return { ...rest, passwordProtected: Boolean(passwordHash) }
}

export function parseLinkInput(input: unknown, partial = false): LinkInput {
  const value = asObject(input)
  const out: Partial<LinkInput> = {}
  if (!partial || value.url !== undefined) out.url = validateUrl(value.url)
  if (!partial || value.code !== undefined) {
    if (!partial && (value.code === undefined || value.code === '')) out.code = undefined
    else out.code = validateCode(value.code)
  }
  if (!partial || value.title !== undefined) out.title = validateTitle(value.title)
  if (!partial || value.tags !== undefined) {
    if (value.tags !== undefined && !Array.isArray(value.tags)) throw new Error('Tags must be an array')
    out.tags = normalizeTags(value.tags as string[] | null | undefined)
  }
  const expiresAt = validateExpiry(value.expiresAt)
  if (!partial || expiresAt !== undefined) out.expiresAt = expiresAt
  const password = validatePassword(value.password)
  if (!partial || password !== undefined) out.password = password
  return out as LinkInput
}

function parseId(input: unknown) {
  const value = asObject(input)
  if (typeof value.id !== 'string' || !value.id || value.id.length > 128) throw new Error('Invalid id')
  return value.id
}

function parseIds(input: unknown) {
  const value = asObject(input)
  if (!Array.isArray(value.ids) || value.ids.length > 100) throw new Error('Provide at most 100 ids')
  if (value.ids.some((id) => typeof id !== 'string' || !id || id.length > 128)) throw new Error('Invalid id')
  return value.ids as string[]
}

export const listLinks = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const owned = ownedByClause(user)
  const rows = await db
    .select()
    .from(links)
    .where(owned)
    .orderBy(desc(links.createdAt))
  return rows.map(safeLink)
})

export const createLink = createServerFn({ method: 'POST' })
  .validator((input: unknown) => parseLinkInput(input))
  .handler(async ({ data }) => {
    const user = await requireUser()
    await enforceCreateLimit(user.id)
    const url = data.url
    const code = data.code ?? nanoid(7)

    const [existing] = await db.select({ id: links.id }).from(links).where(eq(links.code, code))
    if (existing) throw new Error(`"${code}" is already taken`)

    const [row] = await db
      .insert(links)
      .values({
        id: nanoid(),
        code,
        url,
        title: data.title ?? null,
        tags: normalizeTags(data.tags),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        passwordHash: data.password ? hashPassword(data.password) : null,
        userId: user.id,
      })
      .returning()
    await auditEvent({
      action: 'link.created', actorUserId: user.id, targetType: 'link', targetId: row.id,
      headers: getRequestHeaders(),
    })
    return safeLink(row)
  })

export const updateLink = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const value = asObject(input)
    return {
      ...parseLinkInput(input),
      code: validateCode(value.code),
      id: parseId(input),
      removePassword: value.removePassword === true,
    }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const owned = ownedByClause(user)
    const url = data.url
    const code = data.code!

    const [conflict] = await db
      .select({ id: links.id })
      .from(links)
      .where(and(eq(links.code, code), sql`${links.id} != ${data.id}`))
    if (conflict) throw new Error(`"${code}" is already taken`)

    const [row] = await db
      .update(links)
      .set({
        url,
        code,
        title: data.title ?? null,
        tags: normalizeTags(data.tags),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        ...(data.removePassword
          ? { passwordHash: null }
          : data.password
            ? { passwordHash: hashPassword(data.password) }
            : {}),
        updatedAt: new Date(),
      })
      .where(owned ? and(eq(links.id, data.id), owned) : eq(links.id, data.id))
      .returning()
    if (!row) throw new Error('Link not found')
    await auditEvent({
      action: 'link.updated', actorUserId: user.id, targetType: 'link', targetId: row.id,
      headers: getRequestHeaders(),
    })
    return safeLink(row)
  })

export const deleteLink = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({ id: parseId(input) }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const owned = ownedByClause(user)
    const [row] = await db
      .delete(links)
      .where(owned ? and(eq(links.id, data.id), owned) : eq(links.id, data.id))
      .returning({ id: links.id })
    if (!row) throw new Error('Link not found')
    await auditEvent({
      action: 'link.deleted', actorUserId: user.id, targetType: 'link', targetId: row.id,
      headers: getRequestHeaders(),
    })
    return { ok: true }
  })

export const bulkDeleteLinks = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({ ids: parseIds(input) }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    if (data.ids.length === 0) return { ok: true, count: 0 }
    const owned = ownedByClause(user)
    const rows = await db
      .delete(links)
      .where(owned ? and(inArray(links.id, data.ids), owned) : inArray(links.id, data.ids))
      .returning({ id: links.id })
    await auditEvent({
      action: 'link.bulk_deleted', actorUserId: user.id, targetType: 'link',
      headers: getRequestHeaders(), metadata: { ids: rows.map((row) => row.id) },
    })
    return { ok: true, count: rows.length }
  })

export const bulkExpireLinks = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({ ids: parseIds(input) }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    if (data.ids.length === 0) return { ok: true, count: 0 }
    const owned = ownedByClause(user)
    const rows = await db
      .update(links)
      .set({ expiresAt: new Date(), updatedAt: new Date() })
      .where(owned ? and(inArray(links.id, data.ids), owned) : inArray(links.id, data.ids))
      .returning({ id: links.id })
    await auditEvent({
      action: 'link.bulk_expired', actorUserId: user.id, targetType: 'link',
      headers: getRequestHeaders(), metadata: { ids: rows.map((row) => row.id) },
    })
    return { ok: true, count: rows.length }
  })

// ---------- analytics ----------

export const getLinkStats = createServerFn({ method: 'GET' })
  .validator((input: unknown) => {
    const value = asObject(input)
    return {
      code: validateCode(value.code),
      days: typeof value.days === 'number' && Number.isFinite(value.days) ? value.days : undefined,
    }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const owned = ownedByClause(user)
    const [link] = await db
      .select()
      .from(links)
      .where(owned ? and(eq(links.code, data.code), owned) : eq(links.code, data.code))
    if (!link) throw new Error('Link not found')

    const days = Math.min(Math.max(data.days ?? 30, 1), 365)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const [series, byCountry, byReferrer, byBrowser, byOs, byDevice, botSplit, recent] =
      await Promise.all([
        db
          .select({
            day: sql<string>`to_char(date_trunc('day', ${clicks.timestamp}), 'YYYY-MM-DD')`,
            count: sql<number>`count(*)::int`,
          })
          .from(clicks)
          .where(and(eq(clicks.linkId, link.id), gte(clicks.timestamp, since)))
          .groupBy(sql`date_trunc('day', ${clicks.timestamp})`)
          .orderBy(sql`date_trunc('day', ${clicks.timestamp})`),
        db
          .select({ name: clicks.country, count: sql<number>`count(*)::int` })
          .from(clicks)
          .where(and(eq(clicks.linkId, link.id), gte(clicks.timestamp, since)))
          .groupBy(clicks.country)
          .orderBy(desc(sql`count(*)`))
          .limit(12),
        db
          .select({ name: clicks.referrer, count: sql<number>`count(*)::int` })
          .from(clicks)
          .where(and(eq(clicks.linkId, link.id), gte(clicks.timestamp, since)))
          .groupBy(clicks.referrer)
          .orderBy(desc(sql`count(*)`))
          .limit(12),
        db
          .select({ name: clicks.browser, count: sql<number>`count(*)::int` })
          .from(clicks)
          .where(and(eq(clicks.linkId, link.id), gte(clicks.timestamp, since)))
          .groupBy(clicks.browser)
          .orderBy(desc(sql`count(*)`))
          .limit(8),
        db
          .select({ name: clicks.os, count: sql<number>`count(*)::int` })
          .from(clicks)
          .where(and(eq(clicks.linkId, link.id), gte(clicks.timestamp, since)))
          .groupBy(clicks.os)
          .orderBy(desc(sql`count(*)`))
          .limit(8),
        db
          .select({ name: clicks.deviceType, count: sql<number>`count(*)::int` })
          .from(clicks)
          .where(and(eq(clicks.linkId, link.id), gte(clicks.timestamp, since)))
          .groupBy(clicks.deviceType)
          .orderBy(desc(sql`count(*)`))
          .limit(8),
        db
          .select({ isBot: clicks.isBot, count: sql<number>`count(*)::int` })
          .from(clicks)
          .where(and(eq(clicks.linkId, link.id), gte(clicks.timestamp, since)))
          .groupBy(clicks.isBot),
        db
          .select()
          .from(clicks)
          .where(eq(clicks.linkId, link.id))
          .orderBy(desc(clicks.timestamp))
          .limit(100),
      ])

    const human = botSplit.find((b) => !b.isBot)?.count ?? 0
    const bots = botSplit.find((b) => b.isBot)?.count ?? 0

    return { link: safeLink(link), series, byCountry, byReferrer, byBrowser, byOs, byDevice, human, bots, recent }
  })

export const getOverview = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const owned = ownedByClause(user)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const [linkCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(links)
    .where(owned)
  // Click totals join links so non-admins only count their own links' clicks.
  const clickQuery = db
    .select({
      total: sql<number>`count(*)::int`,
      bots: sql<number>`count(*) filter (where ${clicks.isBot})::int`,
    })
    .from(clicks)
    .$dynamic()
  const [clickTotals] = owned
    ? await clickQuery.innerJoin(links, eq(clicks.linkId, links.id)).where(and(gte(clicks.timestamp, since), owned))
    : await clickQuery.where(gte(clicks.timestamp, since))
  const topLinks = await db
    .select({ code: links.code, title: links.title, clicks: links.clickCount })
    .from(links)
    .where(owned)
    .orderBy(desc(links.clickCount))
    .limit(5)
  return { linkCount: linkCount.count, clicks30d: clickTotals.total, bots30d: clickTotals.bots, topLinks }
})

// ---------- api keys ----------

export const listApiKeys = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
      scopes: apiKeys.scopes,
      expiresAt: apiKeys.expiresAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, user.id))
    .orderBy(desc(apiKeys.createdAt))
})

export const createApiKey = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid input')
    const value = input as Record<string, unknown>
    if (typeof value.name !== 'string' || !value.name.trim() || value.name.length > 100) throw new Error('Name is required')
    const expiresInDays = value.expiresInDays === undefined ? 90 : Number(value.expiresInDays)
    if (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 365) {
      throw new Error('Expiry must be between 1 and 365 days')
    }
    const scopes = value.scopes === undefined ? [...API_SCOPES] : value.scopes
    if (!Array.isArray(scopes) || scopes.length === 0 || scopes.some((scope) => !API_SCOPES.includes(scope as ApiScope))) {
      throw new Error('Select at least one valid API scope')
    }
    return { name: value.name, expiresInDays, scopes: [...new Set(scopes)] as ApiScope[] }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const [{ value: keyCount }] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(apiKeys)
      .where(eq(apiKeys.userId, user.id))
    if (keyCount >= 20) throw new Error('Delete an existing API key before creating another')
    const { key, keyHash, keyPrefix } = generateApiKey()
    const expiresAt = new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000)
    const [row] = await db
      .insert(apiKeys)
      .values({
        id: nanoid(), name: data.name.trim(), keyHash, keyPrefix, userId: user.id,
        scopes: data.scopes, expiresAt,
      })
      .returning()
    await auditEvent({
      action: 'api_key.created', actorUserId: user.id, targetType: 'api_key', targetId: row.id,
      headers: getRequestHeaders(), metadata: { expiresInDays: data.expiresInDays },
    })
    // Plaintext key is returned once and never stored.
    return { id: row.id, name: row.name, key }
  })

export const deleteApiKey = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid input')
    const id = (input as Record<string, unknown>).id
    if (typeof id !== 'string' || !id || id.length > 128) throw new Error('Invalid API key')
    return { id }
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    await db.delete(apiKeys).where(and(eq(apiKeys.id, data.id), eq(apiKeys.userId, user.id)))
    await auditEvent({
      action: 'api_key.deleted', actorUserId: user.id, targetType: 'api_key', targetId: data.id,
      headers: getRequestHeaders(),
    })
    return { ok: true }
  })
