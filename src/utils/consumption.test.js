import { describe, it, expect } from 'vitest'
import { peakMonth, yearlyTotal, vsAverage } from './consumption'

const months = ['Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun']
const values = [210, 195, 260, 340, 520, 680, 730, 640, 470, 320, 240, 205]

describe('peakMonth', () => {
  it('hittar månaden med högst förbrukning', () => {
    expect(peakMonth(months, values)).toEqual({ month: 'Jan', value: 730 })
  })
  it('returnerar null utan data', () => {
    expect(peakMonth([], [])).toBeNull()
  })
})

describe('yearlyTotal', () => {
  it('summerar tolv månader', () => {
    expect(yearlyTotal(values)).toBe(4810)
  })
})

describe('vsAverage', () => {
  it('jämför senaste månaden med snittet i procent', () => {
    // snitt ≈ 400,8 · senaste = 205 → ≈ -49 %
    expect(vsAverage(values)).toBe(-49)
  })
})
