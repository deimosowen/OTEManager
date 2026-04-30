/**
 * Тело строки как в GET /api/me/notifications — для SSE и повторного использования выборок.
 * @param {{
 *   id: number,
 *   createdAt: unknown,
 *   readAt?: unknown | null,
 *   kind: string,
 *   title: string,
 *   body: string | null,
 *   href: string,
 *   tcCreationId: number,
 * }} r
 */
export function mapUserNotificationRow(r) {
  return {
    id: r.id,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : new Date(r.createdAt).toISOString(),
    readAt: r.readAt == null ? null : r.readAt instanceof Date ? r.readAt.toISOString() : new Date(r.readAt).toISOString(),
    kind: r.kind,
    title: r.title,
    body: r.body,
    href: r.href,
    tcCreationId: r.tcCreationId,
  }
}
