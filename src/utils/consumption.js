/** Månaden med högst förbrukning: { month: 'Jan', value: 730 } */
export const peakMonth = (months, values) => {
  if (!values?.length) return null
  let idx = 0
  values.forEach((v, i) => { if (v > values[idx]) idx = i })
  return { month: months[idx], value: values[idx] }
}

/** Årsförbrukning i kWh */
export const yearlyTotal = (values = []) => values.reduce((a, b) => a + b, 0)

/** Förändring senaste månaden mot samma månad året innan? Vi har bara 12 mån – jämför mot snittet. */
export const vsAverage = (values = []) => {
  if (!values.length) return 0
  const avg = yearlyTotal(values) / values.length
  const latest = values[values.length - 1]
  return Math.round(((latest - avg) / avg) * 100)
}
