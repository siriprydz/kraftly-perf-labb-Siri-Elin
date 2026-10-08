import { describe, it, expect } from 'vitest'
import { firstName } from './user'

describe('firstName', () => {
  it('plockar förnamnet ur ett fullständigt namn', () => {
    expect(firstName('Anna Andersson')).toBe('Anna')
  })
  it('klarar namn med bara ett ord', () => {
    expect(firstName('Anna')).toBe('Anna')
  })
  it('kraschar inte när namnet saknas', () => {
    expect(firstName(undefined)).toBe('')
    expect(firstName(null)).toBe('')
  })
  it('ignorerar inledande mellanslag', () => {
    expect(firstName('  Anna Andersson')).toBe('Anna')
  })
})
