import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { asc, count, eq } from 'drizzle-orm'
import { auth } from './auth'
import { db } from './db'
import { user } from './schema'
import { auditEvent } from './audit'

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: getRequestHeaders() })
  if (!session) throw new Error('Unauthorized')
  if (session.user.role !== 'admin') throw new Error('Admin access required')
  if (session.user.mustChangePassword) throw new Error('Change your temporary password first')
  if (!session.user.twoFactorEnabled) throw new Error('Enable two-factor authentication first')
  return session.user
}

/** id/name/email of every account — used to label link owners. Any signed-in user may call it. */
export const listUserDirectory = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await auth.api.getSession({ headers: getRequestHeaders() })
  if (!session) throw new Error('Unauthorized')
  const query = db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .$dynamic()
  return (session.user.role === 'admin' ? query : query.where(eq(user.id, session.user.id))).orderBy(asc(user.createdAt))
})

async function adminCount() {
  const [{ value }] = await db
    .select({ value: count() })
    .from(user)
    .where(eq(user.role, 'admin'))
  return value
}

export const listUsers = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(asc(user.createdAt))
})

export const createUser = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid input')
    const value = input as Record<string, unknown>
    if (typeof value.name !== 'string' || !value.name.trim() || value.name.length > 100) throw new Error('Name is required')
    if (typeof value.email !== 'string' || value.email.length > 320 || !value.email.includes('@')) throw new Error('Valid email is required')
    if (typeof value.password !== 'string' || value.password.length < 12 || value.password.length > 128) {
      throw new Error('Temporary password must be between 12 and 128 characters')
    }
    return { name: value.name, email: value.email, password: value.password }
  })
  .handler(async ({ data }) => {
    const me = await requireAdmin()
    // Forward the caller's session headers so the creation hook in auth.ts
    // recognizes this as an authorized admin action.
    const result = await auth.api.signUpEmail({
      body: {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
      },
      headers: getRequestHeaders(),
    })
    await auditEvent({
      action: 'admin.user.created',
      actorUserId: me.id,
      targetType: 'user',
      targetId: result.user.id,
      headers: getRequestHeaders(),
    })
    return { id: result.user.id, email: result.user.email }
  })

export const setUserRole = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid input')
    const value = input as Record<string, unknown>
    if (typeof value.id !== 'string' || !value.id || value.id.length > 128) throw new Error('Invalid user')
    if (value.role !== 'admin' && value.role !== 'user') throw new Error('Invalid role')
    return { id: value.id, role: value.role }
  })
  .handler(async ({ data }) => {
    const me = await requireAdmin()
    if (data.id === me.id) throw new Error("You can't change your own role")
    if (data.role !== 'admin') {
      const [target] = await db
        .select({ role: user.role })
        .from(user)
        .where(eq(user.id, data.id))
      if (target?.role === 'admin' && (await adminCount()) <= 1) {
        throw new Error("You can't demote the last admin")
      }
    }
    await db
      .update(user)
      .set({ role: data.role, updatedAt: new Date() })
      .where(eq(user.id, data.id))
    await auditEvent({
      action: 'admin.user.role_changed',
      actorUserId: me.id,
      targetType: 'user',
      targetId: data.id,
      headers: getRequestHeaders(),
      metadata: { role: data.role },
    })
    return { ok: true }
  })

export const deleteUser = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid input')
    const id = (input as Record<string, unknown>).id
    if (typeof id !== 'string' || !id || id.length > 128) throw new Error('Invalid user')
    return { id }
  })
  .handler(async ({ data }) => {
    const me = await requireAdmin()
    if (data.id === me.id) throw new Error("You can't delete your own account")
    const [{ value }] = await db.select({ value: count() }).from(user)
    if (value <= 1) throw new Error("You can't delete the last account")
    const [target] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, data.id))
    if (target?.role === 'admin' && (await adminCount()) <= 1) {
      throw new Error("You can't delete the last admin")
    }
    // Cascades to sessions, accounts, passkeys and 2FA rows.
    await db.delete(user).where(eq(user.id, data.id))
    await auditEvent({
      action: 'admin.user.deleted',
      actorUserId: me.id,
      targetType: 'user',
      targetId: data.id,
      headers: getRequestHeaders(),
    })
    return { ok: true }
  })
