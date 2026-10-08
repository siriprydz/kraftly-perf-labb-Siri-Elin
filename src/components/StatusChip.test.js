import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/vue'
import StatusChip from './StatusChip.vue'

describe('StatusChip', () => {
  it('visar Betald för en betald faktura', () => {
    render(StatusChip, { props: { invoice: { status: 'Betald', due: '2026-06-30' } } })
    expect(screen.getByRole('status')).toHaveTextContent('Betald')
  })

  it('visar Förfallen för en obetald faktura vars förfallodag passerat', () => {
    render(StatusChip, { props: { invoice: { status: 'Obetald', due: '2020-01-01' } } })
    expect(screen.getByRole('status')).toHaveTextContent('Förfallen')
  })

  it('visar Obetald för en obetald faktura som inte förfallit', () => {
    render(StatusChip, { props: { invoice: { status: 'Obetald', due: '2999-12-31' } } })
    expect(screen.getByText('Obetald')).toBeInTheDocument()
  })
})
