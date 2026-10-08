import { it, expect } from 'vitest'
import { formatPrice } from './price'

it('använder svenskt decimalkomma', () => {
  const result = formatPrice(1.42) // act
  expect(result).toBe('1,42 kr/kWh') // assert
})

it('visar platshållare när priset saknas', () => {
  expect(formatPrice(undefined)).toBe('–')
})
