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
  let wereStopsApplied = false;
  let wasStopUpdated = false;
  let wasStopCreated = false;
  let wasStopsReordered = false;
  let wasDriverAssigned = false;
  const baseDetails = { assignedDriver: null, fieldVisibility: [] };

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
  await page.route('**/users?role=DRIVER', async (route) => {
    await route.fulfill({
      json: [
        {
          id: 'driver-1',
          email: 'alex.driver@example.test',
          fullName: 'Alex Driver',
          role: 'DRIVER',
        },
      ],
    });
  });
  await page.route('**/loads/load-1/confirm', async (route) => {
    wasConfirmed = true;
    await route.fulfill({
      json: { ...draftLoad, internalLoadId: '312KG-10042', status: 'CONFIRMED' },
    });
  });
  await page.route('**/loads/load-1', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { ...draftLoad, ...baseDetails, stops: [] } });
      return;
    }
    wasPatched = true;
    await route.fulfill({
      json: { ...draftLoad, brokerLoadNumber: 'DRAFT-42-UPDATED', rate: '1250.00' },
    });
  });
  await page.route('**/loads/load-1/documents', async (route) => {
    await route.fulfill({
      json: [
        {
          id: 'document-1',
          version: 1,
          isCurrent: true,
          filename: 'rate-confirmation.pdf',
          createdAt: '2026-09-04T01:00:00.000Z',
        },
      ],
    });
  });
  await page.route('**/loads/load-1/documents/document-1/extraction', async (route) => {
    if (route.request().method() === 'POST') {
      wereStopsApplied = true;
      await route.fulfill({
        json: [
          {
            id: 'stop-1',
            type: 'PICKUP',
            facilityName: 'Origin Warehouse',
            city: 'Dallas',
            state: 'TX',
            appointmentAt: null,
          },
        ],
      });
      return;
    }
    await route.fulfill({
      json: {
        status: 'COMPLETED',
        error: null,
        result: {
          brokerName: { value: 'C.H. Robinson', confidence: 'HIGH' },
          brokerLoadNumber: { value: 'DRAFT-42', confidence: 'HIGH' },
          rate: { value: '$1,200.00', confidence: 'HIGH' },
          commodity: { value: 'Paper products', confidence: 'HIGH' },
          equipmentType: { value: "53' Dry Van", confidence: 'HIGH' },
          specialInstructions: { value: null, confidence: 'NOT_FOUND' },
          stops: [
            {
              type: 'PICKUP',
              facilityName: { value: 'Origin Warehouse', confidence: 'HIGH' },
              address: { value: '100 Origin Ave, Dallas, TX', confidence: 'HIGH' },
            },
          ],
        },
      },
    });
  });
  await page.route('**/loads/load-1/documents/document-1/extraction/apply-stops', async (route) => {
    wereStopsApplied = true;
    await route.fulfill({
      json: [
        {
          id: 'stop-1',
          type: 'PICKUP',
          position: 1,
          facilityName: 'Origin Warehouse',
          addressLine1: '100 Origin Ave',
          city: 'Dallas',
          state: 'TX',
          appointmentAt: null,
        },
      ],
    });
  });
  await page.route('**/loads/load-1/stops/stop-1', async (route) => {
    if (route.request().method() === 'PATCH') {
      wasStopUpdated = true;
      await route.fulfill({
        json: {
          id: 'stop-1',
          type: 'PICKUP',
          position: 1,
          facilityName: 'Updated Origin',
          addressLine1: '100 Origin Ave',
          city: 'Dallas',
          state: 'TX',
          appointmentAt: null,
        },
      });
    }
  });
  await page.route('**/loads/load-1/stops', async (route) => {
    if (route.request().method() === 'POST') {
      wasStopCreated = true;
      await route.fulfill({
        json: {
          id: 'stop-2',
          type: 'DELIVERY',
          position: 2,
          facilityName: 'Destination',
          addressLine1: '200 Delivery Rd',
          city: 'Austin',
          state: 'TX',
          appointmentAt: null,
        },
      });
    }
  });
  await page.route('**/loads/load-1/stops/reorder', async (route) => {
    wasStopsReordered = true;
    await route.fulfill({
      json: [
        {
          id: 'stop-2',
          type: 'DELIVERY',
          position: 1,
          facilityName: 'Destination',
          addressLine1: '200 Delivery Rd',
          city: 'Austin',
          state: 'TX',
          appointmentAt: null,
        },
        {
          id: 'stop-1',
          type: 'PICKUP',
          position: 2,
          facilityName: 'Updated Origin',
          addressLine1: '100 Origin Ave',
          city: 'Dallas',
          state: 'TX',
          appointmentAt: null,
        },
      ],
    });
  });
  await page.route('**/loads/load-1/assign-driver', async (route) => {
    wasDriverAssigned = true;
    await route.fulfill({
      json: { ...draftLoad, internalLoadId: '312KG-10042', status: 'CONFIRMED' },
    });
  });
  await page.route('**/loads/load-1/field-visibility', async (route) => {
    await route.fulfill({ status: 204 });
  });
  await page.route('**/loads/rate-confirmations', async (route) => {
    expect(route.request().method()).toBe('POST');
    await route.fulfill({
      json: { load: { ...draftLoad, id: 'uploaded-load', brokerLoadNumber: 'UP-1' } },
    });
  });
  await page.route('**/loads/uploaded-load', async (route) => {
    await route.fulfill({
      json: {
        ...draftLoad,
        ...baseDetails,
        id: 'uploaded-load',
        brokerLoadNumber: 'UP-1',
        stops: [],
      },
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
  await expect(page.getByText('AI suggestions', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Apply AI stops' }).click();
  await expect.poll(() => wereStopsApplied).toBe(true);
  await expect(page.getByText('PICKUP: Origin Warehouse')).toBeVisible();
  await page.getByLabel('Edit Origin Warehouse').click();
  await page.getByLabel('Facility').fill('Updated Origin');
  await page.getByRole('button', { name: 'Save stop' }).click();
  await expect.poll(() => wasStopUpdated).toBe(true);
  await page.getByRole('button', { name: 'Add stop' }).first().click();
  await page.getByLabel('Facility').fill('Destination');
  await page.getByLabel('City').fill('Austin');
  await page.getByRole('button', { name: 'Add stop' }).last().click();
  await expect.poll(() => wasStopCreated).toBe(true);
  await page.getByLabel('Move Updated Origin down').click();
  await expect.poll(() => wasStopsReordered).toBe(true);
  await page.getByLabel('Broker load number').fill('DRAFT-42-UPDATED');
  await page.getByLabel('Rate to customer').fill('1250.00');
  await page.getByRole('button', { name: 'Save review' }).click();
  await expect.poll(() => wasPatched).toBe(true);
  await page.getByRole('button', { name: 'Confirm Load' }).click();
  await expect.poll(() => wasConfirmed).toBe(true);
  await expect(page.getByRole('heading', { name: '312KG-10042', exact: true })).toBeVisible();
  await page.getByLabel('Assigned driver').selectOption('driver-1');
  await page.getByRole('button', { name: 'Assign' }).click();
  await expect.poll(() => wasDriverAssigned).toBe(true);

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
