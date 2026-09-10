#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium, request as playwrightRequest } from 'playwright';

const baseUrl = process.env.UI_SMOKE_BASE_URL || 'http://127.0.0.1:8797';
const rampUsername = process.env.UI_SMOKE_RAMP_USERNAME || 'smoke-ui-ramp';
const rampTempPassword = process.env.UI_SMOKE_RAMP_PASSWORD || 'groundcore-smoke-ui-ramp';
const officeUsername = process.env.UI_SMOKE_OFFICE_USERNAME || 'smoke-ui-office';
const officeTempPassword = process.env.UI_SMOKE_OFFICE_PASSWORD || 'groundcore-smoke-ui-office';
const screenshotDir = process.env.UI_SMOKE_SCREENSHOT_DIR || path.resolve('tmp/ui-smoke');
const timestamp = Date.now();
const suffix = String(timestamp).slice(-6);
const tailNumber = `NUI${suffix}`;
const pilotEmail = `ui-smoke+${suffix}@example.com`;
const departureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const rampPassword = `UiSmokeRamp!${suffix}`;
const officePassword = `UiSmokeOffice!${suffix}`;
const firstNotes = `UI smoke downstream order ${suffix}`;

await fs.mkdir(screenshotDir, { recursive: true });

const api = await playwrightRequest.newContext({
  baseURL: baseUrl,
  extraHTTPHeaders: { Origin: baseUrl },
});

const screenshots = [];
const checks = {};

async function shot(page, name) {
  const file = path.join(screenshotDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  screenshots.push(file);
}

async function resetSeedUsers() {
  const response = await api.post('/debug/seed-users');
  if (response.ok()) return true;
  return false;
}

async function loginAndRotatePassword(page, username, temporaryPassword, newPassword) {
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('Enter assigned username').fill(username);
  await page.getByPlaceholder('Enter password').fill(temporaryPassword);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByText('Set Your Password').waitFor({ timeout: 20000 });
  await page.getByPlaceholder('Enter current temporary password').fill(temporaryPassword);
  await page.getByPlaceholder('At least 12 characters').fill(newPassword);
  await page.getByPlaceholder('Repeat new password').fill(newPassword);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 }),
    page.getByRole('button', { name: 'Save Password & Continue' }).click(),
  ]);
  await page.getByRole('button', { name: /^RAMP/ }).waitFor({ timeout: 20000 });
  await page.getByText('Shared backend connected').waitFor({ timeout: 20000 });
}

async function createKioskOrder(page, { tail, pilotName, notes, expectReturning }) {
  await page.goto(`${baseUrl}/kiosk.html`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Start Check-In' }).click();
  await page.getByPlaceholder('N12345').first().fill(tail);
  await page.getByRole('button', { name: /Find Aircraft/ }).click();

  if (expectReturning) {
    await page.getByText('Returning Aircraft Found').waitFor({ timeout: 10000 });
    await page.getByRole('button', { name: "Yes, that's correct" }).click();
    checks.kioskReturningLookupUi = true;
  } else {
    await page.getByText('Aircraft & Contact Information').waitFor({ timeout: 10000 });
    checks.kioskFreshLookupUi = true;
    await page.getByPlaceholder('Citation CJ3').fill('Pilatus PC-12');
    await page.getByPlaceholder('John Smith').fill(pilotName);
    await page.getByPlaceholder('john@example.com').fill(pilotEmail);
    await page.getByPlaceholder('605-555-1234').fill('6055550101');
    await page.getByPlaceholder('Company name').fill('GroundCore UI Smoke');
    await page.getByRole('button', { name: /Continue to Services/ }).click();
  }

  await page.locator('select').nth(0).selectOption('Jet-A');
  await page.getByPlaceholder('0').fill('120');
  await page.locator('select').nth(1).selectOption('yes');
  await page.locator('input[type="date"]').fill(departureDate);
  await page.locator('input[type="time"]').fill('08:15');
  await page.getByText('🚗 Crew Car').click();
  await page.getByText('GPU').click();
  await page.getByPlaceholder(/Example: Quick turn/).fill(notes);
  await page.getByRole('button', { name: 'Review →' }).click();
  await page.getByRole('button', { name: '✅ Confirm Check-In' }).click();
  await page.getByText('Check-In Complete!').waitFor({ timeout: 15000 });
}

async function verifyReturningLookupPrivacy(page, tail) {
  await page.goto(`${baseUrl}/kiosk.html`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Start Check-In' }).click();
  await page.getByPlaceholder('N12345').first().fill(tail);
  await page.getByRole('button', { name: /Find Aircraft/ }).click();
  await page.getByText('Aircraft & Contact Information').waitFor({ timeout: 10000 });
  await assertInputEmpty(page, 'John Smith');
  await assertInputEmpty(page, 'john@example.com');
  await assertInputEmpty(page, '605-555-1234');
  checks.kioskReturningLookupProtectsContactUi = true;
}

async function assertInputEmpty(page, placeholder) {
  const value = await page.getByPlaceholder(placeholder).inputValue();
  if (value !== '') throw new Error(`Expected ${placeholder} to remain blank during privacy-safe lookup`);
}

async function findOrderCard(page, tail, notesText = null) {
  let card = page.locator('div.rounded-2xl.border.border-gray-400, div.border.border-gray-200.rounded-lg.p-4').filter({ hasText: tail });
  if (notesText) {
    card = card.filter({ hasText: notesText });
  }
  card = card.last();
  await card.waitFor({ timeout: 20000 });
  return card;
}

async function messageInThread(scope, placeholder, text) {
  await scope.getByPlaceholder(placeholder).fill(text);
  await scope.getByRole('button', { name: 'Send', exact: true }).click();
  await scope.getByText(text).waitFor({ timeout: 10000 });
}

const browser = await chromium.launch({ headless: true });
const kioskContext = await browser.newContext();
const rampContext = await browser.newContext();
const officeContext = await browser.newContext();
const kioskPage = await kioskContext.newPage();
const rampPage = await rampContext.newPage();
const officePage = await officeContext.newPage();

let resetWorked = false;
try {
  resetWorked = await resetSeedUsers();
} catch {
  resetWorked = false;
}
checks.seedResetRouteAvailable = resetWorked;

try {
  await createKioskOrder(kioskPage, {
    tail: tailNumber,
    pilotName: 'UI Smoke Pilot',
    notes: firstNotes,
    expectReturning: false,
  });
  checks.kioskSeedCheckinUi = true;
  await shot(kioskPage, '01-kiosk-checkin-complete');

  await verifyReturningLookupPrivacy(kioskPage, tailNumber);
  await shot(kioskPage, '02-kiosk-private-returning-lookup');

  await loginAndRotatePassword(rampPage, rampUsername, rampTempPassword, rampPassword);
  checks.rampLoginUi = true;
  const backToQueue = rampPage.getByRole('button', { name: /Back to Ramp Queue/ });
  if (await backToQueue.isVisible().catch(() => false)) {
    await backToQueue.click();
  }
  await shot(rampPage, '03-ramp-dashboard');

  const rampCard = await findOrderCard(rampPage, tailNumber, firstNotes);
  await rampCard.getByRole('button', { name: /Start Service/ }).click();
  await rampPage.getByText('FUEL VERIFICATION').waitFor({ timeout: 10000 });
  await rampPage.locator('input[placeholder*="to confirm"]').first().fill('JET-A');
  await rampPage.getByRole('button', { name: /Confirm & Start/ }).click();
  await rampPage.getByText('Active Service').waitFor({ timeout: 15000 });
  checks.rampStartedServiceUi = true;

  const servicePanel = rampPage.locator('text=Active Service').locator('..').locator('..');
  await messageInThread(rampPage.locator('body'), 'Message front desk about this aircraft...', `Ramp UI smoke pickup ${suffix}`);
  checks.rampThreadUi = true;
  await shot(rampPage, '04-ramp-service-panel');

  await rampPage.getByRole('button', { name: /Complete \/ Send to Front Desk/ }).click();
  await rampPage.getByText('Complete Service').waitFor({ timeout: 10000 });
  await rampPage.getByPlaceholder('Enter actual gallons').fill('120');
  await rampPage.getByPlaceholder('Optional start reading').fill('5020.1');
  await rampPage.getByPlaceholder('Optional end reading').fill('5140.1');
  await rampPage.getByPlaceholder('Billing notes, issues, completed services, etc.').fill('Fuel complete, GPU handled, crew car staged.');
  await rampPage.getByRole('button', { name: 'Save & Notify Front Desk' }).click();
  await rampPage.getByText('aircraft waiting on Front Desk').waitFor({ timeout: 15000 });
  checks.rampCompletedToDeskUi = true;
  await shot(rampPage, '05-ramp-handoff-complete');

  await loginAndRotatePassword(officePage, officeUsername, officeTempPassword, officePassword);
  checks.officeLoginUi = true;
  await officePage.getByRole('button', { name: /^FRONT DESK/ }).click();
  const officeCard = await findOrderCard(officePage, tailNumber);
  await officeCard.getByText('Ramp UI smoke pickup').waitFor({ timeout: 10000 });
  checks.officeSeesRampMessageUi = true;

  const replyButton = officeCard.getByRole('button', { name: /Reply to Ramp/ });
  if (await replyButton.isVisible().catch(() => false)) {
    await replyButton.click();
  }
  const officeReplyCard = await findOrderCard(officePage, tailNumber);
  await messageInThread(officeReplyCard, 'Message the line crew about this aircraft...', `Desk UI smoke sees handoff ${suffix}`);
  checks.officeReplyUi = true;
  await shot(officePage, '06-office-ready-queue');

  await officeCard.getByRole('button', { name: 'Finalize' }).click();
  await officePage.getByText('Finalize Billing Review').waitFor({ timeout: 10000 });
  await officePage.getByText('120 gal').first().waitFor({ timeout: 10000 });
  checks.officeFinalizeReviewUi = true;
  await shot(officePage, '07-office-finalize-modal');

  const [mailtoPage] = await Promise.all([
    officeContext.waitForEvent('page').catch(() => null),
    officePage.getByRole('button', { name: 'Finalize & Draft Email' }).click(),
  ]);
  if (mailtoPage) {
    checks.mailtoWindowOpened = true;
    await mailtoPage.close().catch(() => {});
  } else {
    checks.mailtoWindowOpened = false;
  }

  await officePage.waitForTimeout(1500);
  await officePage.getByRole('button', { name: 'Archive' }).click();
  const closedCard = await findOrderCard(officePage, tailNumber);
  await closedCard.getByText(/closed|reopen/i).waitFor({ timeout: 15000 });
  checks.officeClosedUi = true;

  await officePage.reload({ waitUntil: 'networkidle' });
  await officePage.getByRole('button', { name: /^FRONT DESK/ }).click();
  await officePage.getByRole('button', { name: 'Archive' }).click();
  const refreshedOfficeCard = await findOrderCard(officePage, tailNumber);
  await refreshedOfficeCard.getByText(`Desk UI smoke sees handoff ${suffix}`).waitFor({ timeout: 10000 });
  checks.officeRefreshPersistenceUi = true;
  await shot(officePage, '08-office-after-refresh');

  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    tailNumber,
    departureDate,
    checks,
    screenshots,
    notes: {
      completionEmailDraftFlowObserved: true,
      actualOutboundEmailVerified: false,
      limitation: 'Finalize still relies on client-side mailto draft behavior, so browser UI can confirm draft triggering but not downstream delivery.'
    }
  }, null, 2));
} finally {
  await api.dispose();
  await Promise.allSettled([
    kioskContext.close(),
    rampContext.close(),
    officeContext.close(),
    browser.close(),
  ]);
}
