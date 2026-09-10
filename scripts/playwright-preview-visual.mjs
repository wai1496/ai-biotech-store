import fs from 'node:fs';
import path from 'node:path';

const VIEWPORTS = [
  {width: 360, height: 800},
  {width: 390, height: 844},
  {width: 620, height: 1100},
  {width: 720, height: 1280}
];

const ROUTES = [
  {slug: 'storefront', pathname: '/', text: 'STAGING PREVIEW — ISOLATED FROM PRODUCTION WRITES'},
  {slug: 'research-insight', pathname: '/research-insight.html', text: 'Research Insight'},
  {slug: 'peptide-calculator', pathname: '/peptide-calculator.html', text: 'Research Solution Calculator'},
  {slug: 'visual-composer', pathname: '/visual-composer.html', text: 'PREVIEW ONLY — NO PRODUCTION WRITES'},
  {slug: 'member', pathname: '/member.html', text: 'AI BioTech Member'},
  {slug: 'checkout', pathname: '/checkout.html', text: 'Checkout'},
  {slug: 'payment-return', pathname: '/payment-return.html', text: 'Payment Status'},
  {slug: 'admin', pathname: '/admin.html', text: 'Ai BioTech Admin'}
];

const PRODUCT_DIALOG = {slug: 'product-detail-dialog', pathname: '/'};
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const artifactRoot = path.resolve(process.env.VISUAL_QA_ARTIFACT_DIR || 'artifacts/playwright-preview-visual');
const results = [];
const blockedRequests = [];
const startedAt = new Date().toISOString();

fs.mkdirSync(artifactRoot, {recursive: true});

function cleanReason(value) {
  return String(value || 'Unknown blocker').replace(/\s+/g, ' ').trim();
}

function isCommitPreviewHost(hostname) {
  return hostname.startsWith('ai-biotech-store-') && hostname.endsWith('-rk-cd1c.vercel.app') &&
    hostname !== 'ai-biotech-store.vercel.app' && hostname !== 'ai-biotech-store-git-main-rk-cd1c.vercel.app';
}

function parsePreviewUrl(value) {
  const url = new URL(String(value || '').trim());
  if (url.protocol !== 'https:') throw new Error('Preview URL must use HTTPS.');
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('Preview URL must not contain credentials, query parameters or fragments.');
  }
  if (url.hostname === 'ai-biotech-store.vercel.app' || url.hostname === 'ai-biotech-store-git-main-rk-cd1c.vercel.app') {
    throw new Error('Production and main aliases are forbidden for this Preview-only job.');
  }
  if (!url.hostname.startsWith('ai-biotech-store-') || !url.hostname.endsWith('.vercel.app')) {
    throw new Error('Preview URL must be an AI BioTech Vercel Preview deployment.');
  }
  url.pathname = '/';
  return url;
}

function allTargets(reason) {
  for (const viewport of VIEWPORTS) {
    for (const route of [...ROUTES, PRODUCT_DIALOG]) {
      results.push({width: viewport.width, route: route.slug, status: 'BLOCKED', reasons: [cleanReason(reason)], screenshot: null});
    }
  }
}

function markdownReport(previewUrl, fatalReason = '') {
  const passCount = results.filter(result => result.status === 'PASS').length;
  const blockedCount = results.length - passCount;
  const lines = [
    '# Protected Vercel Preview Android visual QA',
    '',
    `- Started: ${startedAt}`,
    `- Finished: ${new Date().toISOString()}`,
    `- Preview host: ${previewUrl?.hostname || 'unavailable'}`,
    `- Exact CSS widths: ${VIEWPORTS.map(viewport => viewport.width).join(', ')}`,
    `- Result: ${blockedCount === 0 ? 'PASS' : 'BLOCKED'} (${passCount} PASS / ${blockedCount} BLOCKED)`,
    '- Safety: read-only browser interception blocked every non-GET/HEAD/OPTIONS request.',
    '- Authentication: x-vercel-trusted-oidc-idp-token follows only the protected integration Preview and its commit-specific redirect target; Vercel Authentication was not disabled.',
    ''
  ];
  if (fatalReason) lines.push(`> BLOCKED: ${cleanReason(fatalReason)}`, '');
  lines.push('| Width | Route | Result | Screenshot | Evidence |', '|---:|---|---|---|---|');
  for (const result of results) {
    lines.push(`| ${result.width} | ${result.route} | ${result.status} | ${result.screenshot || '—'} | ${result.reasons.length ? result.reasons.join('; ') : 'Exact viewport and route checks passed'} |`);
  }
  if (blockedRequests.length) {
    lines.push('', '## Requests blocked by the read-only network guard', '');
    for (const request of blockedRequests) lines.push(`- ${request.method} ${request.host}${request.pathname}`);
  }
  return `${lines.join('\n')}\n`;
}

function writeEvidence(previewUrl, fatalReason = '') {
  const report = markdownReport(previewUrl, fatalReason);
  fs.writeFileSync(path.join(artifactRoot, 'report.md'), report);
  fs.writeFileSync(path.join(artifactRoot, 'results.json'), `${JSON.stringify({startedAt, previewHost: previewUrl?.hostname || null, viewports: VIEWPORTS, results, blockedRequests}, null, 2)}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  process.stdout.write(report);
}

function safeRequestRecord(requestUrl, method) {
  try {
    const url = new URL(requestUrl);
    return {method, host: url.host, pathname: url.pathname};
  } catch {
    return {method, host: 'invalid-url', pathname: '/'};
  }
}

async function inspectLayout(page, width) {
  return page.evaluate(expectedWidth => {
    const visible = element => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
    };
    const intentionallyScrollable = element => {
      for (let node = element.parentElement; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (['auto', 'scroll'].includes(style.overflowX) && node.scrollWidth > node.clientWidth) return true;
      }
      return false;
    };
    const escaped = [...document.querySelectorAll('h1,h2,h3,p,a,button,label,input,select,textarea,img')]
      .filter(visible)
      .filter(element => !intentionallyScrollable(element))
      .map(element => ({element, rect: element.getBoundingClientRect()}))
      .filter(({rect}) => rect.left < -1 || rect.right > innerWidth + 1)
      .slice(0, 10)
      .map(({element, rect}) => ({
        tag: element.tagName.toLowerCase(),
        label: (element.getAttribute('aria-label') || element.textContent || element.getAttribute('alt') || '').trim().slice(0, 80),
        left: Math.round(rect.left),
        right: Math.round(rect.right)
      }));
    const brokenImages = [...document.images]
      .filter(visible)
      .filter(image => image.complete && image.naturalWidth === 0)
      .map(image => image.getAttribute('alt') || image.getAttribute('src') || 'unnamed image')
      .slice(0, 10);
    return {
      innerWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0),
      exactWidth: innerWidth === expectedWidth && document.documentElement.clientWidth === expectedWidth,
      escaped,
      brokenImages
    };
  }, width);
}

async function captureRoute(context, previewUrl, trustedPreviewHosts, viewport, route) {
  const page = await context.newPage();
  const reasons = [];
  const pageErrors = [];
  const sameOriginFailures = [];
  const writeStart = blockedRequests.length;
  page.on('pageerror', error => pageErrors.push(cleanReason(error.message)));
  page.on('response', response => {
    const url = new URL(response.url());
    if (trustedPreviewHosts.has(url.hostname) && response.status() >= 400) {
      sameOriginFailures.push(`${response.status()} ${url.pathname}`);
    }
  });
  const screenshotPath = path.join(String(viewport.width), `${route.slug}.png`);
  const absoluteScreenshotPath = path.join(artifactRoot, screenshotPath);
  fs.mkdirSync(path.dirname(absoluteScreenshotPath), {recursive: true});
  try {
    const response = await page.goto(new URL(route.pathname, previewUrl).href, {waitUntil: 'domcontentloaded', timeout: 45_000});
    await page.waitForTimeout(1800);
    if (!response || response.status() >= 400) reasons.push(`Route returned HTTP ${response?.status() ?? 'unknown'}`);
    const resolvedHost = new URL(page.url()).hostname;
    if (!trustedPreviewHosts.has(resolvedHost)) reasons.push('Protected Preview authentication resolved outside the trusted Preview deployment set.');
    const bodyText = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    if (!bodyText.includes(route.text)) reasons.push(`Expected route evidence not found: ${route.text}`);
    const layout = await inspectLayout(page, viewport.width);
    if (!layout.exactWidth) reasons.push(`Viewport mismatch: innerWidth ${layout.innerWidth}, clientWidth ${layout.clientWidth}`);
    if (layout.scrollWidth > viewport.width + 1) reasons.push(`Horizontal overflow: document width ${layout.scrollWidth}px`);
    if (layout.escaped.length) reasons.push(`Visible elements escaped viewport: ${JSON.stringify(layout.escaped)}`);
    if (layout.brokenImages.length) reasons.push(`Broken visible images: ${layout.brokenImages.join(', ')}`);
    if (pageErrors.length) reasons.push(`Page errors: ${pageErrors.join(' | ')}`);
    if (sameOriginFailures.length) reasons.push(`Same-origin HTTP failures: ${sameOriginFailures.join(', ')}`);
    if (blockedRequests.length > writeStart) reasons.push('Page attempted a non-read network request; the QA guard blocked it.');
  } catch (error) {
    reasons.push(cleanReason(error.message));
  } finally {
    try {
      await page.screenshot({path: absoluteScreenshotPath, fullPage: true, animations: 'disabled'});
    } catch (error) {
      reasons.push(`Screenshot unavailable: ${cleanReason(error.message)}`);
    }
    await page.close();
  }
  results.push({width: viewport.width, route: route.slug, status: reasons.length ? 'BLOCKED' : 'PASS', reasons, screenshot: screenshotPath});
}

async function captureProductDialog(context, previewUrl, trustedPreviewHosts, viewport) {
  const page = await context.newPage();
  const reasons = [];
  const writeStart = blockedRequests.length;
  const screenshotPath = path.join(String(viewport.width), `${PRODUCT_DIALOG.slug}.png`);
  const absoluteScreenshotPath = path.join(artifactRoot, screenshotPath);
  fs.mkdirSync(path.dirname(absoluteScreenshotPath), {recursive: true});
  try {
    await page.goto(previewUrl.href, {waitUntil: 'domcontentloaded', timeout: 45_000});
    const resolvedHost = new URL(page.url()).hostname;
    if (!trustedPreviewHosts.has(resolvedHost)) reasons.push('Product dialog resolved outside the trusted Preview deployment set.');
    const productButton = page.getByRole('button', {name: 'RETATRUTIDE', exact: true}).first();
    await productButton.waitFor({state: 'visible', timeout: 20_000});
    await productButton.click();
    const dialog = page.getByRole('dialog', {name: 'RETATRUTIDE'});
    await dialog.waitFor({state: 'visible', timeout: 10_000});
    const layout = await inspectLayout(page, viewport.width);
    if (!layout.exactWidth) reasons.push(`Viewport mismatch: innerWidth ${layout.innerWidth}, clientWidth ${layout.clientWidth}`);
    if (layout.scrollWidth > viewport.width + 1) reasons.push(`Horizontal overflow: document width ${layout.scrollWidth}px`);
    if (layout.escaped.length) reasons.push(`Visible elements escaped viewport: ${JSON.stringify(layout.escaped)}`);
    if (layout.brokenImages.length) reasons.push(`Broken visible images: ${layout.brokenImages.join(', ')}`);
    if (blockedRequests.length > writeStart) reasons.push('Product dialog attempted a non-read network request; the QA guard blocked it.');
  } catch (error) {
    reasons.push(cleanReason(error.message));
  } finally {
    try {
      await page.screenshot({path: absoluteScreenshotPath, fullPage: true, animations: 'disabled'});
    } catch (error) {
      reasons.push(`Screenshot unavailable: ${cleanReason(error.message)}`);
    }
    await page.close();
  }
  results.push({width: viewport.width, route: PRODUCT_DIALOG.slug, status: reasons.length ? 'BLOCKED' : 'PASS', reasons, screenshot: screenshotPath});
}

let previewUrl;
try {
  previewUrl = parsePreviewUrl(process.env.PREVIEW_URL);
  const trustedOidcToken = String(process.env.VERCEL_TRUSTED_OIDC_TOKEN || '').trim();
  if (!trustedOidcToken) throw new Error('Short-lived GitHub OIDC token is unavailable; protected Preview access remains locked.');
  const {chromium} = await import('playwright');
  const browser = await chromium.launch({headless: true});
  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport,
        screen: viewport,
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
        serviceWorkers: 'block',
        userAgent: 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'
      });
      const trustedPreviewHosts = new Set([previewUrl.hostname]);
      await context.route('**/*', async route => {
        const request = route.request();
        const method = request.method().toUpperCase();
        if (!READ_METHODS.has(method)) {
          blockedRequests.push(safeRequestRecord(request.url(), method));
          await route.abort('blockedbyclient');
          return;
        }
        const requestUrl = new URL(request.url());
        const redirectedFrom = request.redirectedFrom();
        if (redirectedFrom && trustedPreviewHosts.has(new URL(redirectedFrom.url()).hostname) && isCommitPreviewHost(requestUrl.hostname)) {
          trustedPreviewHosts.add(requestUrl.hostname);
        }
        if (trustedPreviewHosts.has(requestUrl.hostname)) {
          await route.continue({headers: {...request.headers(), 'x-vercel-trusted-oidc-idp-token': trustedOidcToken}});
          return;
        }
        await route.continue();
      });
      for (const route of ROUTES) await captureRoute(context, previewUrl, trustedPreviewHosts, viewport, route);
      await captureProductDialog(context, previewUrl, trustedPreviewHosts, viewport);
      await context.close();
    }
  } finally {
    await browser.close();
  }
  writeEvidence(previewUrl);
  if (results.some(result => result.status === 'BLOCKED')) process.exitCode = 1;
} catch (error) {
  const reason = cleanReason(error.message);
  if (!results.length) allTargets(reason);
  writeEvidence(previewUrl, reason);
  process.exitCode = 1;
}
