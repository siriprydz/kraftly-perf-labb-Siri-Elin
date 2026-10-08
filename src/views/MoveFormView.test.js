import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import MoveFormView from './MoveFormView.vue'
import { submitMove } from '../services/api'

// Vi vill inte prata med mock-API:et i ett komponenttest – vi mockar modulen.
vi.mock('../services/api', () => ({
  submitMove: vi.fn().mockResolvedValue({ ok: true, ref: 'FLYTT-12345' })
}))

const fillForm = async (user, overrides = {}) => {
  const values = {
    'Ny adress': 'Solvägen 12',
    Postnummer: '80267',
    Ort: 'Gävle',
    'Inflyttningsdatum (ÅÅÅÅ-MM-DD)': '2999-01-01',
    ...overrides
  }
  for (const [label, value] of Object.entries(values)) {
    if (value !== '') await user.type(screen.getByLabelText(label), value)
  }
  await user.selectOptions(screen.getByLabelText('Avtal'), 'Rörligt pris')
}

describe('MoveFormView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('har ett fält för ny adress som en skärmläsare hittar', () => {
    render(MoveFormView)
    expect(screen.getByLabelText('Ny adress')).toBeInTheDocument()
  })

  it('skickar anmälan och visar referensnumret', async () => {
    const user = userEvent.setup()
    render(MoveFormView)

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Skicka flyttanmälan' }))

    expect(submitMove).toHaveBeenCalledWith(expect.objectContaining({ zip: '80267', city: 'Gävle' }))
    expect(await screen.findByText(/Referensnummer: FLYTT-12345/)).toBeInTheDocument()
  })

  it('stoppar anmälan med ogiltigt postnummer och visar felet', async () => {
    const user = userEvent.setup()
    render(MoveFormView)

    await fillForm(user, { Postnummer: '802' })
    await user.click(screen.getByRole('button', { name: 'Skicka flyttanmälan' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Postnummer ska vara fem siffror')
    expect(submitMove).not.toHaveBeenCalled()
  })
})
