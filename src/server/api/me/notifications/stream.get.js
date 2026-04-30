import { integrationUserKey } from '../../../utils/integrations/user-credentials.js'
import { subscribeUserNotificationSse } from '../../../utils/notification-sse-bus.js'
import { requireOteUser } from '../../../utils/require-ote-auth.js'

export default defineEventHandler(async (event) => {
  const user = requireOteUser(event)
  const key = integrationUserKey(user)
  if (!key) {
    throw createError({ statusCode: 400, message: 'Не удалось сопоставить пользователя' })
  }

  setHeader(event, 'Content-Type', 'text/event-stream; charset=utf-8')
  setHeader(event, 'Cache-Control', 'no-cache, no-transform')
  setHeader(event, 'Connection', 'keep-alive')
  setHeader(event, 'X-Accel-Buffering', 'no')

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const sendLines = /** @param {string} raw */ (raw) => {
        controller.enqueue(encoder.encode(raw.endsWith('\n\n') ? raw : `${raw}\n\n`))
      }

      const sendData = /** @param {unknown} payload */ (payload) => {
        sendLines(`data: ${JSON.stringify(payload)}`)
      }

      sendData({ type: 'connected', at: Date.now() })

      const unsubscribe = subscribeUserNotificationSse(key, (jsonLine) => {
        sendLines(`data: ${jsonLine}`)
      })

      const heartbeat = setInterval(() => {
        try {
          sendLines(`: ping ${Date.now()}`)
        } catch {}
      }, 28000)

      let closed = false
      const closeAll = () => {
        if (closed) return
        closed = true
        clearInterval(heartbeat)
        unsubscribe()
        try {
          controller.close()
        } catch {}
      }

      event.node.req.once('close', closeAll)
      event.node.res.once('close', closeAll)
    },
  })

  return stream
})
