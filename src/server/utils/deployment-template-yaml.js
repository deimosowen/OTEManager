import { parse } from 'yaml'

/**
 * Проверка синтаксиса YAML. Бросает Error с сообщением для пользователя.
 * @param {string} body
 * @returns {string} исходная строка (trim не делаем — значимые пробелы в YAML)
 */
export function assertValidYamlString(body) {
  const s = body == null ? '' : String(body)
  if (!s.trim()) {
    throw new Error('YAML не может быть пустым')
  }
  try {
    parse(s)
  } catch (e) {
    const msg = e && typeof e.message === 'string' ? e.message : String(e)
    throw new Error(`Некорректный YAML: ${msg}`)
  }
  return s
}
