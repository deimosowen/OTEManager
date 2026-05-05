/**
 * Локальный HTTP-сервер с ответами в духе TeamCity REST — только для tests/integration.
 */
import http from 'node:http'

export const INTEGRATION_TC_BUILD_ID = '424242'

/**
 * @param {number} port
 * @returns {Promise<{ server: import('node:http').Server, close: () => Promise<void> }>}
 */
export function startTeamCityHttpMock(port) {
  const server = http.createServer((req, res) => {
    const host = `http://127.0.0.1:${port}`
    const url = new URL(req.url || '/', host)

    if (req.method === 'POST' && url.pathname === '/app/rest/buildQueue') {
      req.on('data', () => {})
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(
          JSON.stringify({
            id: Number(INTEGRATION_TC_BUILD_ID),
            state: 'queued',
            webUrl: `${host}/viewLog.html?buildId=${INTEGRATION_TC_BUILD_ID}`,
            href: `${host}/app/rest/buildQueue/id:${INTEGRATION_TC_BUILD_ID}`,
          }),
        )
      })
      return
    }

    if (req.method === 'GET' && url.pathname.startsWith('/app/rest/builds/')) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(
        JSON.stringify({
          id: Number(INTEGRATION_TC_BUILD_ID),
          state: 'queued',
          status: 'UNKNOWN',
        }),
      )
      return
    }

    if (req.method === 'GET' && url.pathname === '/app/rest/buildQueue') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(
        JSON.stringify({
          count: 1,
          build: [{ id: Number(INTEGRATION_TC_BUILD_ID), state: 'queued' }],
        }),
      )
      return
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('not found')
  })

  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => {
      resolve({
        server,
        close: () =>
          new Promise((res, rej) => {
            server.close((err) => (err ? rej(err) : res()))
          }),
      })
    })
  })
}
