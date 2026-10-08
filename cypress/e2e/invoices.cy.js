// Mockat nätverk med cy.intercept: vi bestämmer vad API:et svarar.
describe('fakturor', () => {
  beforeEach(() => {
    cy.intercept('POST', '**/api/v2/auth/login', { accessToken: 'test-token', expiresIn: 600, name: 'Test Testsson' })
    cy.intercept('GET', '**/api/v2/user', {
      name: 'Test Testsson', contract: 'Rörligt pris', email: 't@example.com', address: '', customerNo: 'K-1'
    })
    cy.intercept('GET', '**/api/v2/consumption', { unit: 'kWh', months: ['Jan'], values: [100], pricePerKwh: 2 })
  })

  it('fakturasidan visar det API:et svarar – även en faktura servern aldrig haft', () => {
    cy.intercept('GET', '**/api/v2/invoices', [
      { id: 'F-999', period: 'December 2019', amount: 999, status: 'Obetald', due: '2020-01-01' }
    ]).as('invoices')

    cy.visit('/login')
    cy.get('input[placeholder="E-postadress"]').type('t@example.com')
    cy.get('input[placeholder="Lösenord"]').type('x')
    cy.contains('button', 'Logga in').click()
    cy.contains('a', 'Fakturor').click()
    cy.wait('@invoices')

    // Servern har inga fakturor från 2019 – ändå står den där. Svaret kom från mocken.
    cy.contains('td', 'F-999').should('be.visible')
    cy.contains('December 2019').should('be.visible')
  })

  it('kunden ser ett tydligt fel när API:et ligger nere', () => {
    cy.intercept('GET', '**/api/v2/invoices', { statusCode: 500, body: { error: 'boom' } })

    cy.visit('/login')
    cy.get('input[placeholder="E-postadress"]').type('t@example.com')
    cy.get('input[placeholder="Lösenord"]').type('x')
    cy.contains('button', 'Logga in').click()
    cy.contains('a', 'Fakturor').click()

    cy.get('[role=alert]').should('be.visible')
  })
})
