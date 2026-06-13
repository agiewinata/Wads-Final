import { test, expect } from '@playwright/test'

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Mock the sign-in endpoint to return a Better-Auth-style error */
async function mockSignInError(page: Parameters<typeof test>[1], message: string) {
  await page.route('**/api/auth/sign-in/email', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: { message } }),
    })
  })
}

/** Mock the sign-in endpoint to return a successful session */
async function mockSignInSuccess(page: Parameters<typeof test>[1]) {
  await page.route('**/api/auth/sign-in/email', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: { id: 'u1', name: 'Test User', email: 'test@example.com' } }),
    })
  })
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: { id: 'u1', name: 'Test User', email: 'test@example.com' } }),
    })
  })
}

/** Mock the sign-up endpoint to return a Better-Auth-style error */
async function mockSignUpError(page: Parameters<typeof test>[1], message: string) {
  await page.route('**/api/auth/sign-up/email', async (route) => {
    await route.fulfill({
      status: 422,
      contentType: 'application/json',
      body: JSON.stringify({ error: { message } }),
    })
  })
}

// ── FE-01 to FE-09: Login page ─────────────────────────────────────────────────

test.describe('Login page — UI and form validation', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  // FE-01
  test('FE-01: renders email, password fields and login button', async ({ page }) => {
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toHaveText('Login')
  })

  // FE-02
  test('FE-02: shows Google OAuth button', async ({ page }) => {
    await expect(page.getByText('Continue with Google')).toBeVisible()
  })

  // FE-03
  test('FE-03: empty form does not submit — native required validation blocks', async ({ page }) => {
    await page.click('button[type="submit"]')
    // URL must remain /login — the form was blocked by native browser validation
    await expect(page).toHaveURL(/\/login/)
  })

  // FE-04
  test('FE-04: invalid email format is rejected by the browser', async ({ page }) => {
    await page.fill('input[name="email"]', 'not-an-email')
    await page.fill('input[name="password"]', 'somepassword')
    await page.click('button[type="submit"]')
    // Native type="email" validation blocks submission
    const emailValid = await page.locator('input[name="email"]').evaluate(
      (el: HTMLInputElement) => el.validity.valid
    )
    expect(emailValid).toBe(false)
    await expect(page).toHaveURL(/\/login/)
  })

  // FE-05
  test('FE-05: missing password field blocks form submission', async ({ page }) => {
    await page.fill('input[name="email"]', 'user@example.com')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/login/)
  })

  // FE-06
  test('FE-06: wrong credentials shows error message on screen', async ({ page }) => {
    await mockSignInError(page, 'Invalid email or password.')
    await page.fill('input[name="email"]', 'user@example.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    await expect(page.locator('p.text-red-600')).toBeVisible()
    await expect(page.locator('p.text-red-600')).toContainText('Invalid email or password')
  })

  // FE-07
  test('FE-07: submit button shows loading state while request is pending', async ({ page }) => {
    // Delay the mock response so the pending state is observable
    await page.route('**/api/auth/sign-in/email', async (route) => {
      await new Promise(r => setTimeout(r, 800))
      await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' })
    })
    await page.fill('input[name="email"]', 'user@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page.locator('button[type="submit"]')).toHaveText('Logging in...')
  })

  // FE-08
  test('FE-08: password visibility toggle works', async ({ page }) => {
    const pwInput = page.locator('input[name="password"]')
    await expect(pwInput).toHaveAttribute('type', 'password')
    await page.click('button[aria-label="Show password"]')
    await expect(pwInput).toHaveAttribute('type', 'text')
    await page.click('button[aria-label="Hide password"]')
    await expect(pwInput).toHaveAttribute('type', 'password')
  })

  // FE-09
  test('FE-09: "Sign up" link navigates to /signup', async ({ page }) => {
    await page.getByRole('link', { name: 'Sign up' }).click()
    await expect(page).toHaveURL(/\/signup/)
  })

  // FE-10
  test('FE-10: "Forgot?" link navigates to /forgot-password', async ({ page }) => {
    await page.getByRole('link', { name: 'Forgot?' }).click()
    await expect(page).toHaveURL(/\/forgot-password/)
  })
})

// ── FE-11 to FE-17: Signup page ────────────────────────────────────────────────

test.describe('Signup page — UI and form validation', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/signup')
  })

  // FE-11
  test('FE-11: renders name, email, password fields and sign-up button', async ({ page }) => {
    await expect(page.locator('input[name="name"]')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toHaveText('Sign up')
  })

  // FE-12
  test('FE-12: empty form does not submit — all fields are required', async ({ page }) => {
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/signup/)
  })

  // FE-13
  test('FE-13: missing email blocks submission', async ({ page }) => {
    await page.fill('input[name="name"]', 'Alice')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/signup/)
  })

  // FE-14
  test('FE-14: password shorter than 8 characters is rejected by the browser', async ({ page }) => {
    await page.fill('input[name="name"]', 'Alice')
    await page.fill('input[name="email"]', 'alice@example.com')
    await page.fill('input[name="password"]', 'short')
    await page.click('button[type="submit"]')
    const pwValid = await page.locator('input[name="password"]').evaluate(
      (el: HTMLInputElement) => el.validity.valid
    )
    expect(pwValid).toBe(false)
    await expect(page).toHaveURL(/\/signup/)
  })

  // FE-15
  test('FE-15: invalid email format is rejected', async ({ page }) => {
    await page.fill('input[name="name"]', 'Alice')
    await page.fill('input[name="email"]', 'not-an-email')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    const emailValid = await page.locator('input[name="email"]').evaluate(
      (el: HTMLInputElement) => el.validity.valid
    )
    expect(emailValid).toBe(false)
    await expect(page).toHaveURL(/\/signup/)
  })

  // FE-16
  test('FE-16: duplicate email shows server error message on screen', async ({ page }) => {
    await mockSignUpError(page, 'User already exists')
    await page.fill('input[name="name"]', 'Alice')
    await page.fill('input[name="email"]', 'existing@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page.locator('p.text-red-600')).toBeVisible()
    await expect(page.locator('p.text-red-600')).toContainText('User already exists')
  })

  // FE-17
  test('FE-17: "Log in" link navigates back to /login', async ({ page }) => {
    await page.getByRole('link', { name: 'Log in' }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
