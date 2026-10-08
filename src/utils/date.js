/** 'ÅÅÅÅ-MM-DD' -> lokal midnatt. (new Date('2026-08-27') ger UTC-midnatt = fel dag väster om Greenwich.) */
export const parseLocalDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Samma dag, klockan 00:00 lokal tid – så att klockslaget aldrig påverkar en datumjämförelse */
export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

/** Nytt Date-objekt n dagar senare (lokal tid) */
export const addDays = (d, n) => {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}
