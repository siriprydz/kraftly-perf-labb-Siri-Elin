import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/vue'
import { createTestingPinia } from '@pinia/testing'
import DashboardView from './DashboardView.vue'

// Diagrammet ritar på en <canvas> som jsdom inte har – chart.js har egna tester, vi mockar bort det.
vi.mock('chart.js/auto', () => ({
  default: class ChartMock {
    destroy() {}
  }
}))

const renderDashboard = (initialState) =>
  render(DashboardView, {
    global: {
      plugins: [createTestingPinia({ initialState, createSpy: vi.fn })]
    }
  })

describe('DashboardView', () => {
  it('hälsar med förnamnet när användaren är laddad', () => {
    renderDashboard({ user: { user: { name: 'Anna Andersson' } } })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hej Anna!')
  })

  it('hälsar neutralt innan användaren laddats (ingen krasch)', () => {
    renderDashboard({ user: { user: null } })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hej!')
  })

  it('visar aktuellt pris med svenskt decimalkomma', () => {
    renderDashboard({ consumption: { data: { pricePerKwh: 1.42, months: [], values: [] } } })
    expect(screen.getByText('1,42 kr/kWh')).toBeInTheDocument()
  })
})
