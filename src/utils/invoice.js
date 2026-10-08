import { parseLocalDate, startOfDay } from './date'

/**
 * Effektiv status för en faktura.
 * 'Betald' -> 'Betald'
 * 'Obetald' med förfallodag före idag -> 'Förfallen'
 * 'Obetald' annars (inkl. förfaller idag) -> 'Obetald'
 */
export const invoiceStatus = (invoice, today = new Date()) => {
  if (invoice.status === 'Betald') return 'Betald'
  return parseLocalDate(invoice.due) < startOfDay(today) ? 'Förfallen' : 'Obetald'
}

/** Summa av obetalda (inkl. förfallna) fakturor */
export const unpaidTotal = (invoices) =>
  invoices.filter((i) => i.status !== 'Betald').reduce((sum, i) => sum + i.amount, 0)
