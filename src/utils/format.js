/** 1204 -> '1 204 kr' (tusentalsavgränsare = mellanslag) */
export const formatAmount = (amount) => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '–'
  const [int, dec] = amount.toFixed(2).split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return dec === '00' ? `${grouped} kr` : `${grouped},${dec} kr`
}

/** 730 -> '730 kWh' */
export const formatKwh = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '–'
  return `${Math.round(value)} kWh`
}
