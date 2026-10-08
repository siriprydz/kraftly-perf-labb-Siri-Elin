import { describe, it, expect } from 'vitest'
import { formatAmount, formatKwh } from './format'

describe('formatAmount', () => {
  it('lägger till kr', () => {
    expect(formatAmount(412)).toBe('412 kr')
  })
  it('grupperar tusental med mellanslag', () => {
    expect(formatAmount(1204)).toBe('1 204 kr')
    expect(formatAmount(1234567)).toBe('1 234 567 kr')
  })
  it('visar ören bara när de finns', () => {
    expect(formatAmount(99.5)).toBe('99,50 kr')
  })
  it('visar platshållare för ogiltigt värde', () => {
    expect(formatAmount(undefined)).toBe('–')
    expect(formatAmount(NaN)).toBe('–')
  })
})

describe('formatKwh', () => {
  it('lägger till enhet', () => {
    expect(formatKwh(730)).toBe('730 kWh')
  })
  it('avrundar decimaler', () => {
    expect(formatKwh(729.6)).toBe('730 kWh')
  })
})
