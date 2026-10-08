import { test, expect } from '@playwright/test'

// Mockat nätverk: vi bestämmer vad API:et svarar – ingen server behövs för det vi testar.
// Inloggningen mockas också: klienten får en påhittad token och skickar den vidare.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/v2/auth/login', (route) => route.fulfill({ json: { accessToken: 'test-token', expiresIn: 600, name: 'Test Testsson' } }))
  await page.route('**/api/v2/user', (route) =>
    route.fulfill({ json: { name: 'Test Testsson', contract: 'Rörligt pris', email: 't@example.com', address: '', customerNo: 'K-1' } })
  )
  await page.route('**/api/v2/consumption', (route) =>
    route.fulfill({ json: { unit: 'kWh', months: ['Jan'], values: [100], pricePerKwh: 2 } })
  )
})

const login = async (page) => {
  await page.goto('/login')
  await page.getByPlaceholder('E-postadress').fill('t@example.com')
  await page.getByPlaceholder('Lösenord').fill('x')
  await page.getByRole('button', { name: 'Logga in' }).click()
}

test('fakturasidan visar det API:et svarar – även en faktura servern aldrig haft', async ({ page }) => {
  await page.route('**/api/v2/invoices', (route) => {
    // Klienten ska skicka token som Bearer – annars hade ett riktigt API svarat 401
    expect(route.request().headers()['authorization']).toBe('Bearer test-token')
    return route.fulfill({
      json: [{ id: 'F-999', period: 'December 2019', amount: 999, status: 'Obetald', due: '2020-01-01' }]
    })
  })

  await login(page)
  await page.getByRole('link', { name: 'Fakturor' }).click()

  // Servern har inga fakturor från 2019 – ändå står den där. Svaret kom från mocken.
  await expect(page.getByText('F-999')).toBeVisible()
  await expect(page.getByText('December 2019')).toBeVisible()
})

test('kunden ser ett tydligt fel när API:et ligger nere', async ({ page }) => {
  await page.route('**/api/v2/invoices', (route) => route.fulfill({ status: 500, json: { error: 'boom' } }))

  await login(page)
  await page.getByRole('link', { name: 'Fakturor' }).click()

  await expect(page.getByRole('alert')).toBeVisible()
})
