import { describe, it, expect } from 'vitest'
import { validateMove, isValidMove } from './validateMove'

const today = new Date('2026-08-27T15:30:00') // mitt på dagen – inte midnatt
const valid = {
  address: 'Solvägen 12',
  zip: '80267',
  city: 'Gävle',
  date: '2026-10-01',
  contract: 'Rörligt pris',
}

describe('validateMove', () => {
  it('godkänner en komplett anmälan', () => {
    expect(validateMove(valid, today)).toEqual({})
    expect(isValidMove(valid, today)).toBe(true)
  })
  it('kräver fem siffror i postnumret', () => {
    expect(validateMove({ ...valid, zip: '802 67' }, today).zip).toBeDefined()
    expect(validateMove({ ...valid, zip: '8026' }, today).zip).toBeDefined()
  })
  it('kräver datum i formatet ÅÅÅÅ-MM-DD', () => {
    expect(validateMove({ ...valid, date: '1/10 2026' }, today).date).toMatch(/ÅÅÅÅ-MM-DD/)
  })
  it('kräver minst 14 dagars framförhållning', () => {
    expect(validateMove({ ...valid, date: '2026-09-05' }, today).date).toMatch(/14 dagar/)
  })
  it('accepterar exakt 14 dagar fram', () => {
    expect(validateMove({ ...valid, date: '2026-09-10' }, today).date).toBeUndefined()
  })
  it('rapporterar alla tomma fält på en gång', () => {
    const errors = validateMove({}, today)
    expect(Object.keys(errors).sort()).toEqual(['address', 'city', 'contract', 'date', 'zip'])
  })
})
