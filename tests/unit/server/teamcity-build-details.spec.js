import { describe, it, expect } from 'vitest'
import { parsePropertiesEntity, parseResultingPropertiesMap } from '~/server/utils/teamcity/build-details.js'

describe('parsePropertiesEntity', () => {
  it('разбирает одиночный property', () => {
    const m = parsePropertiesEntity({
      property: { name: 'deployment_result.caseone_url', value: 'https://co.example/' },
    })
    expect(m['deployment_result.caseone_url']).toBe('https://co.example/')
  })

  it('разбирает массив property', () => {
    const m = parsePropertiesEntity({
      property: [
        { name: 'a', value: '1' },
        { name: 'b', value: '2' },
      ],
    })
    expect(m).toEqual({ a: '1', b: '2' })
  })
})

describe('parseResultingPropertiesMap', () => {
  it('берёт resultingProperties из корня сборки', () => {
    const m = parseResultingPropertiesMap({
      resultingProperties: {
        property: [{ name: 'metadata.tag', value: 't1' }],
      },
    })
    expect(m['metadata.tag']).toBe('t1')
  })
})
