import { getQuery, sendRedirect, setCookie } from 'h3'
import { getDb } from '../db/client.js'
import { findActiveGroupInvite } from '../utils/group-invite.js'
import { mapOteSessionToPublicUser, readOteSession, OTE_GROUP_INVITE_COOKIE } from '../utils/ote-session.js'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 14

/**
 * /invite?token=… — сохраняет токен в cookie и ведёт на страницу подтверждения (или на вход с return).
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const siteUrl = String(config.public.siteUrl || '').replace(/\/$/, '')
  const secure = siteUrl.startsWith('https://')

  const q = getQuery(event)
  const tokenRaw = typeof q.token === 'string' ? q.token.trim() : ''
  const tokenHex = tokenRaw.toLowerCase()

  if (!/^[a-f0-9]{64}$/.test(tokenHex)) {
    return sendRedirect(event, `/login?error=${encodeURIComponent('Некорректная ссылка приглашения')}`, 302)
  }

  const db = getDb()
  const invite = await findActiveGroupInvite(db, tokenHex)
  if (!invite) {
    return sendRedirect(event, `/login?error=${encodeURIComponent('Приглашение недействительно или срок действия истёк')}`, 302)
  }

  setCookie(event, OTE_GROUP_INVITE_COOKIE, tokenHex, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })

  const session = readOteSession(event)
  const user = mapOteSessionToPublicUser(session)
  if (user) {
    return sendRedirect(event, '/invite/confirm', 302)
  }

  return sendRedirect(
    event,
    `/login?return=${encodeURIComponent('/invite/confirm')}`,
    302,
  )
})
