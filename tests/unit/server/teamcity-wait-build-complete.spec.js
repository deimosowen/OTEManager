import { describe, expect, it } from 'vitest'
import { classifyTeamCityTerminalOutcome } from '~/server/utils/teamcity/wait-build-complete.js'

describe('classifyTeamCityTerminalOutcome', () => {
  it('SUCCESS → success', () => {
    expect(classifyTeamCityTerminalOutcome('SUCCESS', '')).toBe('success')
  })

  it('FAILURE → failure', () => {
    expect(classifyTeamCityTerminalOutcome('FAILURE', '')).toBe('failure')
  })

  it('finished без status → success', () => {
    expect(classifyTeamCityTerminalOutcome('', 'finished')).toBe('success')
  })
})
