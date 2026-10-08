/** 1.42 -> "1,42 kr/kWh". Saknat eller ogiltigt pris -> "–" */
export const formatPrice = (price) => {
  if (typeof price !== 'number' || Number.isNaN(price)) return '–'
  return `${price.toFixed(2).replace('.', ',')} kr/kWh`
}
