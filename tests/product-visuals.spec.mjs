import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

// Visual gate: fail only on product-visual/catalog requests; local optional API noise is non-blocking.
const expectedAssets = Object.freeze({
  Vial: '/assets/vial-master-v4.svg',
  Pen: '/assets/pen-master-v4.svg',
  Cartridge: '/assets/cartridge-master-v5.svg'
});

function pathOf(value, pageUrl) {
  return new URL(value, pageUrl).pathname;
}

function isCriticalVisualRequest(url) {
  return /\/(?:assets|product-visuals\.css|product-visual-resolver\.js|clean-store\.js)(?:\/|\?|$)/.test(url);
}

function isCriticalCatalogRequest(url) {
  return url.includes('.supabase.co/rest/v1/') && /\/(?:products|categories|media_templates)(?:\?|$)/.test(url);
}

async function findEligibleCardId(page, format) {
  return page.evaluate(requestedFormat => {
    const cards = [...document.querySelectorAll('.product-card')];
    const match = cards.find(card => {
      const formatSelect = card.querySelector('select[aria-label="Format"]');
      const addButton = card.querySelector('.add-btn');
      return formatSelect &&
        [...formatSelect.options].some(option => option.value === requestedFormat) &&
        addButton && !addButton.disabled;
    });
    return match?.id || '';
  }, format);
}

test('approved masters remain authoritative across hero, cards, modal and cart', async ({ page }, testInfo) => {
  const failures = [];
  const screenshotDir = path.join('test-results', 'visuals');
  fs.mkdirSync(screenshotDir, { recursive: true });

  page.on('pageerror', error => failures.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    // Chromium emits generic console errors for non-critical local-harness/API and
    // optional anonymous requests. Their actual URLs/statuses are checked below.
    if (/^Failed to load resource: the server responded with a status of \d+/.test(text)) return;
    failures.push(`console: ${text}`);
  });
  page.on('response', response => {
    const url = response.url();
    if (response.status() >= 400 && (isCriticalVisualRequest(url) || isCriticalCatalogRequest(url))) {
      failures.push(`response: ${response.status()} ${url}`);
    }
  });
  page.on('requestfailed', request => {
    const url = request.url();
    if (isCriticalVisualRequest(url) || isCriticalCatalogRequest(url)) {
      failures.push(`requestfailed: ${url} — ${request.failure()?.errorText || 'unknown error'}`);
    }
  });

  await page.addInitScript(() => localStorage.clear());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#productGrid .product-card').first()).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => window.showAllProducts?.());
  await expect(page.locator('#productGrid .product-card').first()).toBeVisible();

  const viewport = page.viewportSize();
  const projectSlug = testInfo.project.name.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();

  for (const [format, expectedPath] of Object.entries(expectedAssets)) {
    const hero = page.locator(`#hero${format}`);
    await expect(hero).toHaveAttribute('src', new RegExp(expectedPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    expect(pathOf(await hero.getAttribute('src'), page.url())).toBe(expectedPath);

    const cardId = await findEligibleCardId(page, format);
    expect(cardId, `No in-stock product card offered ${format}`).not.toBe('');

    let card = page.locator(`#${cardId}`);
    await card.locator('select[aria-label="Format"]').selectOption(format);
    card = page.locator(`#${cardId}`);
    await expect(card).toHaveAttribute('data-format', format);

    const stage = card.locator('.product-visual-stage');
    await expect(stage).toBeVisible();
    await expect(stage).toHaveAttribute('data-overlay-mode', format === 'Cartridge' ? 'none' : format.toLowerCase());

    const image = stage.locator('img.product-visual-image');
    await expect(image).toBeVisible();
    expect(pathOf(await image.getAttribute('src'), page.url())).toBe(expectedPath);
    await expect(card).toHaveAttribute('data-visual-source', 'master');

    if (format === 'Vial') {
      await expect(stage.locator('.product-visual-cap')).toHaveCount(1);
      await expect(stage.locator('.product-visual-stopper')).toHaveCount(1);
      await expect(stage.locator('.product-visual-strength-field')).toHaveCount(1);
      await expect(stage.locator('.product-visual-name')).toContainText((await card.locator('.product-name').textContent()).trim());
      await expect(stage.locator('.product-visual-strength')).toContainText((await card.locator('select[aria-label="Strength"]').inputValue()).trim());
    } else if (format === 'Pen') {
      await expect(stage.locator('.product-visual-color')).toHaveCount(0);
      await expect(stage.locator('.product-visual-name')).toHaveCount(1);
      await expect(stage.locator('.product-visual-strength')).toHaveCount(1);
    } else {
      await expect(stage.locator('.product-visual-color')).toHaveCount(0);
      await expect(stage.locator('.product-visual-text')).toHaveCount(0);
    }

    const stageBounds = await stage.boundingBox();
    expect(stageBounds, `${format} stage has no measurable bounds`).not.toBeNull();
    expect(Math.abs(stageBounds.width - stageBounds.height), `${format} stage must remain square`).toBeLessThanOrEqual(2);
    expect(stageBounds.width, `${format} stage exceeds viewport width`).toBeLessThanOrEqual(viewport.width);

    await card.screenshot({ path: path.join(screenshotDir, `${projectSlug}-${format.toLowerCase()}-card.png`) });

    await card.locator('.info-btn').click();
    const modal = page.locator('#modalWrap.show .modal');
    await expect(modal).toBeVisible();
    const modalStage = modal.locator('.info-visual .product-visual-stage');
    await expect(modalStage).toBeVisible();
    expect(pathOf(await modalStage.locator('img.product-visual-image').getAttribute('src'), page.url())).toBe(expectedPath);
    await modal.screenshot({ path: path.join(screenshotDir, `${projectSlug}-${format.toLowerCase()}-modal.png`) });
    await modal.locator('.close-btn').click();
    await expect(page.locator('#modalWrap')).not.toHaveClass(/show/);

    await card.locator('.add-btn').click();
    await page.evaluate(() => window.openCart?.());
    const cartItem = page.locator('#cartItems .cart-item').last();
    await expect(cartItem).toBeVisible();
    await expect(cartItem.locator('small')).toContainText(format);
    expect(pathOf(await cartItem.locator('img').getAttribute('src'), page.url())).toBe(expectedPath);
    await page.evaluate(() => window.closeCart?.());
  }

  await page.screenshot({ path: path.join(screenshotDir, `${projectSlug}-catalog.png`), fullPage: true });

  expect(failures, failures.join('\n')).toEqual([]);
});
