import { expect, test } from '@playwright/test';

test('creates a confirmed load from the manual entry form', async ({ page }) => {
  let manualPayload: Record<string, unknown> | undefined;

  await page.route('**/auth/login', async (route) => {
    await route.fulfill({
      json: {
        accessToken: 'manual-load-token',
        user: {
          id: 'dispatcher-1',
          email: 'alex@example.test',
          fullName: 'Alex',
          role: 'DISPATCHER',
        },
      },
    });
  });
  await page.route('**/loads', async (route) => {
    if (route.request().method() === 'GET') await route.fulfill({ json: [] });
  });
  await page.route('**/loads/manual', async (route) => {
    manualPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      json: {
        id: 'manual-load-1',
        internalLoadId: '312KG-10043',
        brokerLoadNumber: 'RC-784521',
        customerName: 'C.H. Robinson',
        brokerName: 'C.H. Robinson',
        commodity: 'FAK',
        rate: '2766.85',
        driverPayAmount: '830.06',
        status: 'CONFIRMED',
        createdAt: '2026-09-28T06:00:00.000Z',
      },
    });
  });
  await page.route('**/loads/manual-load-1', async (route) => {
    await route.fulfill({
      json: {
        id: 'manual-load-1',
        internalLoadId: '312KG-10043',
        brokerLoadNumber: 'RC-784521',
        customerName: 'C.H. Robinson',
        brokerName: 'C.H. Robinson',
        commodity: 'FAK',
        rate: '2766.85',
        driverPayAmount: '830.06',
        status: 'CONFIRMED',
        createdAt: '2026-09-28T06:00:00.000Z',
        stops: [
          {
            id: 'stop-1',
            type: 'PICKUP',
            facilityName: 'Origin Warehouse',
            city: 'Dallas',
            state: 'TX',
            appointmentAt: null,
          },
          {
            id: 'stop-2',
            type: 'DELIVERY',
            facilityName: 'Destination DC',
            city: 'Austin',
            state: 'TX',
            appointmentAt: null,
          },
        ],
        assignedDriver: null,
        fieldVisibility: [],
      },
    });
  });

  await page.goto('/');
  await page.getByLabel('Email').fill('alex@example.test');
  await page.getByLabel('Password').fill('password-for-test');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: 'Create Load' }).click();

  await page.getByPlaceholder('e.g. C.H. Robinson').fill('C.H. Robinson');
  await page.getByPlaceholder('e.g. 312 KG Logistics').fill('312 KG Logistics');
  await page.getByPlaceholder('e.g. Altyn').fill('Altyn');
  await page.getByPlaceholder('e.g. Team 13').fill('Team 13');
  await page.getByPlaceholder('e.g. 784521').fill('RC-784521');

  const facilities = page.getByLabel('Facility / Company');
  const addresses = page.getByLabel('Street address');
  const cities = page.getByLabel('City');
  const states = page.getByLabel('State');
  const zips = page.getByLabel('ZIP Code');
  await facilities.nth(0).fill('Origin Warehouse');
  await addresses.nth(0).fill('100 Origin Ave');
  await cities.nth(0).fill('Dallas');
  await states.nth(0).fill('TX');
  await zips.nth(0).fill('75201');
  await facilities.nth(1).fill('Destination DC');
  await addresses.nth(1).fill('200 Delivery Rd');
  await cities.nth(1).fill('Austin');
  await states.nth(1).fill('TX');
  await zips.nth(1).fill('78701');

  await page.getByLabel('Goods / Commodity').fill('FAK');
  await page.getByLabel('Goods description').fill('General Freight');
  await page.getByLabel('Goods weight').fill('42,500 lbs');
  await page.getByLabel('Goods units').fill('24');
  await page.getByLabel('Goods pallets').fill('24');
  await page.getByPlaceholder('2,766.85').fill('2766.85');
  await page.getByPlaceholder('830.06').fill('830.06');
  await page.getByRole('button', { name: 'Save Load' }).click();

  await expect
    .poll(() => manualPayload)
    .toMatchObject({
      saveAsDraft: false,
      customerName: 'C.H. Robinson',
      driverPayAmount: '830.06',
      rate: '2766.85',
    });
  expect(manualPayload?.stops).toHaveLength(2);
  expect(manualPayload?.commodities).toEqual([
    expect.objectContaining({
      commodity: 'FAK',
      description: 'General Freight',
      units: 24,
      pallets: 24,
    }),
  ]);
  await expect(page.getByRole('dialog', { name: 'Review 312KG-10043' })).toBeVisible();
});
