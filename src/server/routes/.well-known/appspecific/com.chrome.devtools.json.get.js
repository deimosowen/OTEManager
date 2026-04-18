/**
 * Chrome DevTools иногда запрашивает этот URL — без маршрута Vue Router ругается в консоли.
 * @see https://developer.chrome.com/docs/devtools/linked-less-stylesheets
 */
export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'application/json; charset=utf-8')
  return {}
})
