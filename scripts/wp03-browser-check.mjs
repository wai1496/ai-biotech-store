import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.AIBT_BASE_URL || 'http://127.0.0.1:4173';
const evidenceDir = path.resolve(process.env.AIBT_EVIDENCE_DIR || 'artifacts/wp03-browser');
const viewports = [
  ['mobile-360x800', { width: 360, height: 800 }],
  ['mobile-390x844', { width: 390, height: 844 }],
  ['mobile-412x915', { width: 412, height: 915 }],
  ['tablet-768x1024', { width: 768, height: 1024 }],
  ['desktop-1366x768', { width: 1366, height: 768 }],
  ['desktop-1440x900', { width: 1440, height: 900 }]
];
const categorySamples = ['Metabolism', 'Tissue', 'Healing', 'Brain', 'Longevity', 'Special Blend'];
const ignoredUrl = /favicon\.ico|google-analytics|doubleclick|googletagmanager/i;

fs.mkdirSync(evidenceDir, { recursive: true });

function pushUnique(list, value) {
  if (value && !list.includes(value)) list.push(value);
}

async function selectVisibleFormat(page, format) {
  return page.evaluate(async targetFormat => {
    const cards = [...document.querySelectorAll('#productGrid .product-card')];
    const candidate = cards.find(card => {
      const select = card.querySelector('select[aria-label="Format"]');
      return select && [...select.options].some(option => option.value === targetFormat);
    });
    if (!candidate) return { skipped: true, reason: `No visible product offers ${targetFormat}` };
    const id = candidate.id;
    const select = candidate.querySelector('select[aria-label="Format"]');
    select.value = targetFormat;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 350));
    const card = document.getElementById(id);
    const stage = card?.querySelector('.product-visual-stage');
    const image = stage?.querySelector('.product-visual-image');
    return {
      skipped: false,
      cardId: id,
      format: stage?.dataset.format || '',
      overlayMode: stage?.dataset.overlayMode || '',
      source: stage?.dataset.visualSource || '',
      image: image?.getAttribute('src') || '',
      naturalWidth: image?.naturalWidth || 0,
      naturalHeight: image?.naturalHeight || 0,
      textCount: stage?.querySelectorAll('.product-visual-text').length || 0,
      maskCount: stage?.querySelectorAll('.product-visual-color').length || 0,
      stageRect: stage?.getBoundingClientRect().toJSON() || null,
      nameRect: stage?.querySelector('.product-visual-name')?.getBoundingClientRect().toJSON() || null,
      strengthRect: stage?.querySelector('.product-visual-strength')?.getBoundingClientRect().toJSON() || null
    };
  }, format);
}

function validateStage(row, failures, prefix = '') {
  if (row.skipped) {
    failures.push(`${prefix}${row.reason}`);
    return;
  }
  if (row.source !== 'master') failures.push(`${prefix}${row.format}: expected master source, received ${row.source || 'empty'}`);
  if (!row.naturalWidth || !row.naturalHeight) failures.push(`${prefix}${row.format}: image failed to render`);
  if (/master-pending|yjauxyvtrmdriwtmckkl|cartridge-master-v2|cartoon/i.test(row.image)) {
    failures.push(`${prefix}${row.format}: legacy or protected image source remains: ${row.image}`);
  }
  if (row.format === 'Vial') {
    if (row.overlayMode !== 'vial') failures.push(`${prefix}Vial overlay mode must be vial`);
    if (!/vial-master-v4\.svg/i.test(row.image)) failures.push(`${prefix}Vial must use V4 master: ${row.image}`);
    if (row.textCount !== 2 || row.maskCount !== 3) failures.push(`${prefix}Vial requires two text fields and three exact masks`);
  } else if (row.format === 'Pen') {
    if (row.overlayMode !== 'pen') failures.push(`${prefix}Pen overlay mode must be pen`);
    if (!/pen-master-v4\.svg/i.test(row.image)) failures.push(`${prefix}Pen must use V4 master: ${row.image}`);
    if (row.textCount !== 2 || row.maskCount !== 0) failures.push(`${prefix}Pen requires two text fields and no Vial masks`);
  } else if (row.format === 'Cartridge') {
    if (row.overlayMode !== 'none') failures.push(`${prefix}Cartridge overlay mode must be none`);
    if (!/cartridge-master-v5\.svg/i.test(row.image)) failures.push(`${prefix}Cartridge must use V5 master: ${row.image}`);
    if (row.textCount !== 0 || row.maskCount !== 0) failures.push(`${prefix}Cartridge must have no dynamic overlay`);
  }
  for (const [label, rect] of [['name', row.nameRect], ['strength', row.strengthRect]]) {
    if (!rect || !row.stageRect) continue;
    const stage = row.stageRect;
    const inside = rect.x >= stage.x - 1 && rect.y >= stage.y - 1 && rect.x + rect.width <= stage.x + stage.width + 1 && rect.y + rect.height <= stage.y + stage.height + 1;
    if (!inside) failures.push(`${prefix}${row.format} ${label} escaped the square coordinate stage`);
  }
  if (row.format === 'Vial' && row.nameRect && row.strengthRect && row.stageRect) {
    const nameRatio = (row.nameRect.y - row.stageRect.y) / row.stageRect.height;
    const strengthRatio = (row.strengthRect.y - row.stageRect.y) / row.stageRect.height;
    if (nameRatio < 0.50) failures.push(`${prefix}Vial product name is too high and may overlap the logo`);
    if (strengthRatio <= nameRatio) failures.push(`${prefix}Vial strength must sit below the product name`);
  }
}

async function inspectViewport(browser, name, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const failures = [];
  const consoleErrors = [];
  const pageErrors = [];
  const requestFailures = [];
  const httpErrors = [];

  page.on('console', message => {
    if (message.type() === 'error') pushUnique(consoleErrors, message.text());
  });
  page.on('pageerror', error => pushUnique(pageErrors, String(error?.message || error)));
  page.on('requestfailed', request => {
    if (!ignoredUrl.test(request.url())) requestFailures.push({ url: request.url(), error: request.failure()?.errorText || 'failed' });
  });
  page.on('response', response => {
    if (response.status() >= 400 && !ignoredUrl.test(response.url())) httpErrors.push({ url: response.url(), status: response.status() });
  });

  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 120_000 });
  await page.waitForSelector('#productGrid .product-card', { timeout: 60_000 });
  await page.waitForTimeout(1500);

  const initial = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#productGrid .product-card')];
    const stages = [...document.querySelectorAll('#productGrid .product-visual-stage')];
    const images = [...document.images].map(image => ({
      src: image.currentSrc || image.src,
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      alt: image.alt
    }));
    return {
      title: document.title,
      cards: cards.length,
      stages: stages.length,
      bodyScrollWidth: document.body.scrollWidth,
      viewportWidth: window.innerWidth,
      visualCssLoaded: [...document.styleSheets].some(sheet => String(sheet.href || '').includes('product-visuals.css')),
      catalogSummary: document.querySelector('#catalogSummary')?.textContent || '',
      brokenImages: images.filter(image => image.complete && image.naturalWidth === 0),
      unsafeImages: images.filter(image => /master-pending|yjauxyvtrmdriwtmckkl|cartridge-master-v2|cartoon/i.test(image.src)),
      hero: ['Vial', 'Pen', 'Cartridge'].map(format => {
        const image = document.getElementById(`hero${format}`);
        return { format, src: image?.getAttribute('src') || '', naturalWidth: image?.naturalWidth || 0 };
      })
    };
  });

  if (initial.cards < 1) failures.push('No product cards rendered');
  if (initial.cards !== initial.stages) failures.push(`Expected one visual stage per product card; cards=${initial.cards}, stages=${initial.stages}`);
  if (!initial.visualCssLoaded) failures.push('product-visuals.css was not loaded');
  if (initial.bodyScrollWidth > initial.viewportWidth + 2) failures.push(`Horizontal overflow: body=${initial.bodyScrollWidth}, viewport=${initial.viewportWidth}`);
  if (initial.brokenImages.length) failures.push(`Broken images: ${initial.brokenImages.map(image => image.src).join(', ')}`);
  if (initial.unsafeImages.length) failures.push(`Legacy/protected images: ${initial.unsafeImages.map(image => image.src).join(', ')}`);
  if (!/39 products/i.test(initial.catalogSummary)) failures.push(`Catalog summary did not report the expected staging product set: ${initial.catalogSummary}`);
  for (const hero of initial.hero) {
    if (!hero.naturalWidth) failures.push(`Hero ${hero.format} image failed to render`);
    const expected = hero.format === 'Vial' ? 'vial-master-v4.svg' : hero.format === 'Pen' ? 'pen-master-v4.svg' : 'cartridge-master-v5.svg';
    if (!hero.src.includes(expected)) failures.push(`Hero ${hero.format} uses the wrong master: ${hero.src}`);
  }

  await page.evaluate(() => window.showAllProducts?.());
  await page.waitForTimeout(450);
  const formatResults = {};
  for (const format of ['Vial', 'Pen', 'Cartridge']) {
    const result = await selectVisibleFormat(page, format);
    formatResults[format] = result;
    validateStage(result, failures, 'Card: ');
  }

  const categoryResults = [];
  for (const category of categorySamples) {
    const result = await page.evaluate(async selectedCategory => {
      const select = document.getElementById('categoryFilter');
      if (!select || ![...select.options].some(option => option.value === selectedCategory)) return { category: selectedCategory, skipped: true };
      select.value = selectedCategory;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 260));
      const card = document.querySelector('#productGrid .product-card');
      const stage = card?.querySelector('.product-visual-stage');
      return {
        category: selectedCategory,
        skipped: false,
        cards: document.querySelectorAll('#productGrid .product-card').length,
        format: stage?.dataset.format || '',
        categoryColor: getComputedStyle(stage || document.documentElement).getPropertyValue('--visual-category').trim(),
        maskCount: stage?.querySelectorAll('.product-visual-color').length || 0
      };
    }, category);
    categoryResults.push(result);
    if (result.skipped) failures.push(`Category sample unavailable: ${category}`);
    else {
      if (result.cards < 1) failures.push(`Category ${category} rendered no products`);
      if (!/^#[0-9a-f]{6}$/i.test(result.categoryColor)) failures.push(`Category ${category} has invalid visual colour: ${result.categoryColor}`);
    }
  }

  await page.evaluate(() => {
    const select = document.getElementById('categoryFilter');
    if (select && [...select.options].some(option => option.value === 'All')) {
      select.value = 'All';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await page.waitForTimeout(300);
  const infoButton = page.locator('#productGrid .info-btn').first();
  await infoButton.click();
  await page.waitForTimeout(350);
  const modalResult = await page.evaluate(() => {
    const wrap = document.querySelector('#modalWrap.show');
    const modal = wrap?.querySelector('.modal');
    const stage = wrap?.querySelector('.product-visual-stage');
    return {
      visible: Boolean(wrap),
      stage: Boolean(stage),
      modalRect: modal?.getBoundingClientRect().toJSON() || null,
      stageRect: stage?.getBoundingClientRect().toJSON() || null,
      source: stage?.dataset.visualSource || '',
      viewportWidth: window.innerWidth
    };
  });
  if (!modalResult.visible || !modalResult.stage) failures.push('Product information modal does not use the shared visual stage');
  if (modalResult.modalRect && modalResult.modalRect.width > modalResult.viewportWidth + 1) failures.push('Product information modal is wider than the viewport');
  await page.evaluate(() => window.closeModal?.());

  if (formatResults.Cartridge && !formatResults.Cartridge.skipped) {
    await page.evaluate(cardId => {
      const card = document.getElementById(cardId);
      const button = card?.querySelector('.add-btn');
      button?.click();
    }, formatResults.Cartridge.cardId);
    await page.waitForTimeout(250);
    await page.evaluate(() => window.openCart?.());
    await page.waitForTimeout(250);
    const cartResult = await page.evaluate(() => {
      const item = document.querySelector('#cartItems .cart-item');
      const image = item?.querySelector('img');
      return {
        item: Boolean(item),
        src: image?.getAttribute('src') || '',
        naturalWidth: image?.naturalWidth || 0,
        meta: item?.querySelector('small')?.textContent || ''
      };
    });
    if (!cartResult.item) failures.push('Cart did not render the selected exact variant');
    if (/Cartridge/i.test(cartResult.meta) && !/cartridge-master-v5\.svg/i.test(cartResult.src)) failures.push(`Cart Cartridge uses the wrong master: ${cartResult.src}`);
    if (cartResult.item && !cartResult.naturalWidth) failures.push('Cart image failed to render');
    await page.evaluate(() => window.closeCart?.());
  }

  const screenshotPath = path.join(evidenceDir, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  if (consoleErrors.length) failures.push(`Console errors: ${consoleErrors.join(' | ')}`);
  if (pageErrors.length) failures.push(`Page errors: ${pageErrors.join(' | ')}`);
  if (requestFailures.length) failures.push(`Request failures: ${requestFailures.map(item => `${item.url} (${item.error})`).join(' | ')}`);
  if (httpErrors.length) failures.push(`HTTP errors: ${httpErrors.map(item => `${item.url} (${item.status})`).join(' | ')}`);

  await context.close();
  return {
    name,
    viewport,
    pass: failures.length === 0,
    failures,
    initial,
    formatResults,
    categoryResults,
    modalResult,
    consoleErrors,
    pageErrors,
    requestFailures,
    httpErrors,
    screenshotPath
  };
}

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const [name, viewport] of viewports) results.push(await inspectViewport(browser, name, viewport));
} finally {
  await browser.close();
}

const report = {
  workPackage: 'WP-03 Product Visuals',
  baseUrl,
  testedAt: new Date().toISOString(),
  pass: results.every(result => result.pass),
  results
};
const reportPath = path.join(evidenceDir, 'report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exit(1);
