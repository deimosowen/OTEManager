import { describe, expect, it } from 'vitest'
import {
  FEATURE_ANNOUNCEMENTS,
  announcementToPublicPayload,
  pickNextFeatureAnnouncement,
} from '../../../src/constants/feature-announcements.js'
import { parseFeatureAnnouncementsDismissedJson } from '../../../src/server/utils/feature-announcements.js'

describe('feature-announcements', () => {
  it('pickNextFeatureAnnouncement — очередь по реестру', () => {
    expect(FEATURE_ANNOUNCEMENTS.length).toBeGreaterThan(0)
    const firstId = FEATURE_ANNOUNCEMENTS[0].id
    expect(pickNextFeatureAnnouncement([])?.id).toBe(firstId)
    expect(pickNextFeatureAnnouncement([firstId])).toBe(null)
  })

  it('pickNextFeatureAnnouncement — пропускает закрытые', () => {
    if (FEATURE_ANNOUNCEMENTS.length < 2) return
    const a = FEATURE_ANNOUNCEMENTS[0].id
    const b = FEATURE_ANNOUNCEMENTS[1].id
    expect(pickNextFeatureAnnouncement([a])?.id).toBe(b)
  })

  it('parseFeatureAnnouncementsDismissedJson', () => {
    expect(parseFeatureAnnouncementsDismissedJson(null)).toEqual([])
    expect(parseFeatureAnnouncementsDismissedJson('')).toEqual([])
    expect(parseFeatureAnnouncementsDismissedJson('not-json')).toEqual([])
    expect(parseFeatureAnnouncementsDismissedJson('{}')).toEqual([])
    expect(parseFeatureAnnouncementsDismissedJson('["x","x"]')).toEqual(['x'])
  })

  it('announcementToPublicPayload', () => {
    const a = FEATURE_ANNOUNCEMENTS[0]
    const p = announcementToPublicPayload(a)
    expect(p?.id).toBe(a.id)
    expect(Array.isArray(p?.bullets)).toBe(true)
    expect(p?.tour).toBe(a.tour)
    expect(p?.primaryLink?.to).toBe(a.primaryLink?.to)
    expect(announcementToPublicPayload(null)).toBe(null)
  })
})
