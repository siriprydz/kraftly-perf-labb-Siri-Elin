import { describe, it, expect } from 'vitest'
import { invoiceStatus, unpaidTotal } from './invoice'

const today = new Date('2026-08-27T15:30:00') // mitt på dagen – inte midnatt

describe('invoiceStatus', () => {
  it('betald faktura är betald oavsett datum', () => {
    expect(invoiceStatus({ status: 'Betald', due: '2020-01-01' }, today)).toBe('Betald')
  })
  it('obetald faktura med passerat förfallodatum är förfallen', () => {
    expect(invoiceStatus({ status: 'Obetald', due: '2026-07-31' }, today)).toBe('Förfallen')
  })
  it('obetald faktura som förfaller idag är fortfarande obetald', () => {
    expect(invoiceStatus({ status: 'Obetald', due: '2026-08-27' }, today)).toBe('Obetald')
  })
  it('obetald faktura med framtida förfallodatum är obetald', () => {
    expect(invoiceStatus({ status: 'Obetald', due: '2026-09-30' }, today)).toBe('Obetald')
  })
})

describe('unpaidTotal', () => {
  it('summerar bara obetalda fakturor', () => {
    const invoices = [
      { amount: 412, status: 'Obetald' },
      { amount: 486, status: 'Betald' },
      { amount: 100, status: 'Obetald' },
    ]
    expect(unpaidTotal(invoices)).toBe(512)
  })
  it('ger 0 för tom lista', () => {
    expect(unpaidTotal([])).toBe(0)
  })
})
