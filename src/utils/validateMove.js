import { parseLocalDate, startOfDay, addDays } from './date'

const ZIP = /^\d{5}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const MIN_DAYS_AHEAD = 14

/**
 * Validerar flyttanmälan. Returnerar ett objekt med fel per fält,
 * tomt objekt = giltigt.
 */
export const validateMove = (form, today = new Date()) => {
  const errors = {}
  if (!form.address?.trim()) errors.address = 'Ange en adress'
  if (!ZIP.test(form.zip ?? '')) errors.zip = 'Postnummer ska vara fem siffror'
  if (!form.city?.trim()) errors.city = 'Ange en ort'
  if (!form.contract) errors.contract = 'Välj ett avtal'

  if (!DATE.test(form.date ?? '') || Number.isNaN(parseLocalDate(form.date).getTime())) {
    errors.date = 'Datum ska anges som ÅÅÅÅ-MM-DD'
  } else {
    const earliest = addDays(startOfDay(today), MIN_DAYS_AHEAD)
    if (parseLocalDate(form.date) < earliest) {
      errors.date = `Anmälan måste göras senast ${MIN_DAYS_AHEAD} dagar före flytt`
    }
  }
  return errors
}

export const isValidMove = (form, today) => Object.keys(validateMove(form, today)).length === 0
