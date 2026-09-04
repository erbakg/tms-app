import { expect, test } from '@playwright/test';

const draftLoad = {
  id: 'load-1',
  brokerLoadNumber: 'DRAFT-42',
  brokerName: 'C.H. Robinson',
  rate: '$1,200.00',
  commodity: 'Paper products',
  equipmentType: "53' Dry Van",
  specialInstructions: null,
  internalLoadId: null,
  status: 'DRAFT',
  createdAt: '2026-09-04T01:00:00.000Z',
};

test('signs in, searches, reviews, confirms, and uploads a rate confirmation', async ({ page }) => {
  let wasPatched = false;
  let wasConfirmed = false;

  await page.route('**/auth/login', async (route) => {
    await route.fulfill({
      json: {
        accessToken: 'test-token',
        user: { id: 'dispatcher-1', email: 'dispatcher@example.test', role: 'DISPATCHER' },
      },
    });
  });
  await page.route('**/loads', async (route) => {
    if (route.request().method() === 'GET') await route.fulfill({ json: [draftLoad] });
  });
  await page.route('**/loads/load-1/confirm', async (route) => {
    wasConfirmed = true;
    await route.fulfill({
      json: { ...draftLoad, internalLoadId: '312KG-10042', status: 'CONFIRMED' },
    });
  });
  await page.route('**/loads/load-1', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { ...draftLoad, stops: [] } });
      return;
    }
    wasPatched = true;
    await route.fulfill({
      json: { ...draftLoad, brokerLoadNumber: 'DRAFT-42-UPDATED', rate: '1250.00' },
    });
  });
  await page.route('**/loads/rate-confirmations', async (route) => {
    expect(route.request().method()).toBe('POST');
    await route.fulfill({
      json: { load: { ...draftLoad, id: 'uploaded-load', brokerLoadNumber: 'UP-1' } },
    });
  });
  await page.route('**/loads/uploaded-load', async (route) => {
    await route.fulfill({
      json: { ...draftLoad, id: 'uploaded-load', brokerLoadNumber: 'UP-1', stops: [] },
    });
  });

  await page.goto('/');
  await page.getByLabel('Email').fill('dispatcher@example.test');
  await page.getByLabel('Password').fill('password-for-test');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('heading', { name: 'Recent loads' })).toBeVisible();
  await expect(page.getByRole('button', { name: /DRAFT-42/ })).toBeVisible();

  await page.getByLabel('Search loads').fill('not found');
  await expect(
    page.getByText('No loads found. Upload a rate confirmation to start.'),
  ).toBeVisible();
  await page.getByLabel('Search loads').fill('draft');
  await page.getByRole('button', { name: /DRAFT-42/ }).click();

  await expect(page.getByRole('dialog', { name: 'Review DRAFT-42' })).toBeVisible();
  await page.getByLabel('Broker load number').fill('DRAFT-42-UPDATED');
  await page.getByLabel('Rate to customer').fill('1250.00');
  await page.getByRole('button', { name: 'Save review' }).click();
  await expect.poll(() => wasPatched).toBe(true);
  await page.getByRole('button', { name: 'Confirm Load' }).click();
  await expect.poll(() => wasConfirmed).toBe(true);
  await expect(page.getByRole('heading', { name: '312KG-10042', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Upload rate confirmation' }).click();
  await page.getByLabel('Rate Confirmation file').setInputFiles({
    name: 'rate-confirmation.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 test'),
  });
  await page
    .getByLabel(/Broker load number/)
    .last()
    .fill('UP-1');
  await page.getByRole('button', { name: 'Create draft from RC' }).click();
  await expect(page.getByRole('dialog', { name: 'Review UP-1' })).toBeVisible();
});
