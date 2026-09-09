import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const artifactRoot=path.resolve(process.env.FUNCTIONAL_QA_ARTIFACT_DIR||'artifacts/preview-functional-qa');
const previewUrl=new URL(String(process.env.PREVIEW_URL||''));
const oidc=String(process.env.VERCEL_TRUSTED_OIDC_TOKEN||'').trim();
const runId=String(process.env.GITHUB_RUN_ID||Date.now());
const marker=`AIBT_QA_${runId}_${crypto.randomUUID().slice(0,8)}`;
const email=`aibt.qa.${runId}.${crypto.randomUUID().slice(0,8)}@example.test`;
const password=`${crypto.randomBytes(18).toString('base64url')}Aa1!`;
const evidence={
  startedAt:new Date().toISOString(),
  previewHost:previewUrl.hostname,
  marker,email,userId:null,orderId:null,billCode:null,
  signedOut:false,
  steps:{},
  network:[]
};
let browser,context,page;
let accountSubmissionAttempted=false;

fs.mkdirSync(artifactRoot,{recursive:true});
fs.writeFileSync(path.join(artifactRoot,'qa-account.json'),`${JSON.stringify({marker,email},null,2)}\n`);

function clean(value){return String(value||'').replace(/\s+/g,' ').trim().slice(0,500)}
function record(name,status,detail){evidence.steps[name]={status,detail:clean(detail)};}
async function shot(name){await page.screenshot({path:path.join(artifactRoot,`${name}.png`),fullPage:true,animations:'disabled'});}
async function step(name,fn){
  try{const detail=await fn();record(name,'PASS',detail||'Verified');}
  catch(error){record(name,'BLOCKED',error.message||error);throw error;}
}
function assert(condition,message){if(!condition)throw new Error(message);}

function markdown(){
  const lines=[
    '# Disposable protected Preview functional QA','',
    `- Started: ${evidence.startedAt}`,
    `- Finished: ${new Date().toISOString()}`,
    `- Preview: ${evidence.previewHost}`,
    `- QA marker: ${evidence.marker}`,
    `- QA email: ${evidence.email}`,
    `- QA user ID: ${evidence.userId||'not created/observed'}`,
    `- QA order ID: ${evidence.orderId||'not created/observed'}`,
    `- ToyyibPay bill code: ${evidence.billCode||'not created/observed'}`,
    `- Browser sign-out/revocation attempted successfully: ${evidence.signedOut?'yes':'no'}`,
    '- Safety: isolated Staging origin only; ToyyibPay dev/sandbox page only; no payment or shipment purchase action was performed.','',
    '| Gate | Result | Evidence |','|---|---|---|'
  ];
  for(const [name,result] of Object.entries(evidence.steps))lines.push(`| ${name} | ${result.status} | ${result.detail.replace(/\|/g,'\\|')} |`);
  return `${lines.join('\n')}\n`;
}

function persist(){
  evidence.finishedAt=new Date().toISOString();
  fs.writeFileSync(path.join(artifactRoot,'results.json'),`${JSON.stringify(evidence,null,2)}\n`);
  fs.writeFileSync(path.join(artifactRoot,'report.md'),markdown());
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,markdown());
}

try{
  assert(previewUrl.protocol==='https:'&&previewUrl.hostname==='ai-biotech-store-git-integration-white-clean-core-v1-rk-cd1c.vercel.app','Exact protected branch Preview URL is required.');
  assert(oidc,'Short-lived GitHub OIDC token is unavailable.');

  const {chromium}=await import('playwright');
  browser=await chromium.launch({headless:true});
  context=await browser.newContext({
    viewport:{width:390,height:844},screen:{width:390,height:844},
    deviceScaleFactor:1,isMobile:true,hasTouch:true,
    userAgent:'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'
  });
  await context.route('**/*',async route=>{
    const request=route.request();
    const url=new URL(request.url());
    evidence.network.push({method:request.method(),host:url.hostname,path:url.pathname});
    if(url.hostname===previewUrl.hostname){
      await route.continue({headers:{...request.headers(),'x-vercel-trusted-oidc-idp-token':oidc}});
      return;
    }
    await route.continue();
  });
  page=await context.newPage();

  await step('Unlocked Preview readiness',async()=>{
    await page.goto(new URL('/member.html',previewUrl).href,{waitUntil:'domcontentloaded',timeout:45_000});
    const resolvedHost=new URL(page.url()).hostname;
    assert(resolvedHost!=='ai-biotech-store.vercel.app'&&resolvedHost!=='ai-biotech-store-git-main-rk-cd1c.vercel.app','Member readiness check resolved to a forbidden Production/main host.');
    const state=await page.evaluate(()=>({
      memberEnabled:window.AIBT_CONFIG?.memberEnabled===true,
      checkoutEnabled:window.AIBT_CONFIG?.checkoutEnabled===true,
      writesEnabled:window.AIBTRuntime?.writesEnabled===true,
      runtimeReason:String(window.AIBTRuntime?.reason||'')
    }));
    assert(state.memberEnabled&&state.checkoutEnabled,'Protected branch Preview did not publish both explicit temporary QA flags.');
    assert(state.writesEnabled&&state.runtimeReason.includes('Temporary authenticated Preview QA'),'Protected branch Preview did not activate the isolated temporary runtime bridge on Member.');
    return `Protected Member route on ${resolvedHost} exposed both temporary QA flags and the isolated Staging-only runtime bridge.`;
  });

  await step('Disposable account creation',async()=>{
    await page.goto(new URL('/member.html',previewUrl).href,{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'Register'}).click();
    await page.locator('#registerName').fill(marker);
    await page.locator('#registerPhone').fill('0100000000');
    await page.locator('#registerEmail').fill(email);
    await page.locator('#registerPassword').fill(password);
    accountSubmissionAttempted=true;
    await page.getByRole('button',{name:'Create account'}).click();
    await page.locator('#memberMessage').filter({hasText:/Account created|confirmation/i}).waitFor({timeout:30_000});
    await shot('01-account-created');
    return 'One clearly marked Staging QA account was submitted through the Member UI.';
  });

  await step('Member sign-in',async()=>{
    await page.reload({waitUntil:'domcontentloaded'});
    if(await page.locator('#memberApp').isVisible()){
      await page.locator('#memberSignOut').click();
      await page.locator('#memberLogin').waitFor({state:'visible',timeout:20_000});
    }
    await page.locator('#memberEmail').fill(email);
    await page.locator('#memberPassword').fill(password);
    await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await page.locator('#memberApp').waitFor({state:'visible',timeout:30_000});
    const account=await page.evaluate(async()=>{
      const {data,error}=await window.AIBTRuntime.createClient().auth.getUser();
      if(error)throw error;
      return {id:data.user?.id||null,email:data.user?.email||null};
    });
    assert(account.id&&account.email===email,'Authenticated session does not belong to the disposable QA account.');
    evidence.userId=account.id;
    await shot('02-member-signed-in');
    return `Authenticated disposable member ${account.id}; member application became visible.`;
  });

  await step('Staging cart',async()=>{
    await page.goto(previewUrl.href,{waitUntil:'domcontentloaded'});
    const button=page.locator('#productGrid .add-btn:not([disabled])').first();
    await button.waitFor({state:'visible',timeout:30_000});
    await button.click();
    await page.locator('[data-cart-count]').first().filter({hasText:'1'}).waitFor({timeout:10_000});
    return 'Added one active in-stock Staging catalog variant through the storefront UI.';
  });

  await step('EasyParcel demo quote and checkout',async()=>{
    await page.goto(new URL('/checkout.html',previewUrl).href,{waitUntil:'domcontentloaded'});
    await page.locator('#checkoutApp').waitFor({state:'visible',timeout:30_000});
    if(!(await page.locator('#newAddressForm').isVisible()))await page.getByRole('button',{name:'Add new address'}).click();
    await page.locator('#shipRecipient').fill(marker);
    await page.locator('#shipPhone').fill('0100000000');
    await page.locator('#shipLine1').fill('1 QA Preview Street');
    await page.locator('#shipPostcode').fill('10450');
    await page.locator('#shipCity').fill('George Town');
    await page.locator('#shipState').selectOption({label:'Penang'});
    if(await page.locator('#saveAddressBook').isChecked())await page.locator('#saveAddressBook').uncheck();
    await page.getByRole('button',{name:'USE THIS ADDRESS'}).click();
    const firstRate=page.locator('input[name="easyparcelRate"]').first();
    await firstRate.waitFor({state:'visible',timeout:60_000});
    await firstRate.check();
    await page.locator('#placeOrderBtn').waitFor({state:'visible'});
    assert(!(await page.locator('#placeOrderBtn').isDisabled()),'Place-order button remained disabled after selecting the demo quote.');
    await shot('03-checkout-ready');

    const paymentResponsePromise=page.waitForResponse(response=>{
      const url=new URL(response.url());
      return url.hostname===previewUrl.hostname&&url.pathname==='/api/toyyibpay-create'&&response.request().method()==='POST';
    },{timeout:120_000});
    await page.locator('#placeOrderBtn').click();
    const paymentResponse=await paymentResponsePromise;
    const payment=await paymentResponse.json().catch(()=>({}));
    assert(paymentResponse.ok(),payment.error||`ToyyibPay sandbox creation returned ${paymentResponse.status()}.`);
    assert(payment.mode==='sandbox'&&payment.billCode&&payment.paymentUrl,'Sandbox payment creation response was incomplete.');
    evidence.billCode=payment.billCode;
    const state=await context.storageState();
    const previewState=state.origins.find(origin=>new URL(origin.origin).hostname===previewUrl.hostname);
    const intentEntry=previewState?.localStorage?.find(entry=>entry.name.startsWith('aibt_checkout_intent:'));
    const intent=intentEntry?JSON.parse(intentEntry.value):null;
    evidence.orderId=intent?.orderId||null;
    assert(evidence.orderId,'Checkout did not persist its order ID before payment redirection.');
    return `Order ${evidence.orderId} created with a server-reverified EasyParcel demo quote; ToyyibPay sandbox bill ${evidence.billCode} created.`;
  });

  await step('ToyyibPay sandbox payment page',async()=>{
    await page.waitForURL(url=>url.hostname==='dev.toyyibpay.com',{timeout:60_000});
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2500);
    let body=clean(await page.locator('body').innerText());
    const fpx=/FPX|online banking/i.test(body);
    const duitControl=page.getByText(/DuitNow(?:\s+QR)?/i).first();
    if(await duitControl.isVisible().catch(()=>false)){
      await duitControl.click().catch(()=>{});
      await page.waitForTimeout(2000);
      body=clean(await page.locator('body').innerText());
    }
    const qr=/DuitNow|QR/i.test(body)||await page.locator('img[src*="qr" i],canvas').count()>0;
    assert(fpx,'ToyyibPay sandbox page did not expose FPX/online-banking evidence.');
    assert(qr,'ToyyibPay sandbox page did not expose DuitNow QR evidence.');
    await shot('04-toyyibpay-sandbox');
    return 'Reached dev.toyyibpay.com only; FPX and DuitNow QR evidence were visible and no payment action was submitted.';
  });

  await step('Pending payment return',async()=>{
    const url=new URL('/payment-return.html',previewUrl);
    url.searchParams.set('order_id',evidence.orderId);
    url.searchParams.set('billcode',evidence.billCode);
    await page.goto(url.href,{waitUntil:'domcontentloaded'});
    await page.locator('#paymentTitle').filter({hasText:/Payment pending|Payment not completed|Payment successful|Verification unavailable/}).waitFor({timeout:90_000});
    const title=clean(await page.locator('#paymentTitle').innerText());
    assert(title==='Payment pending',`Expected an unpaid sandbox bill to remain pending; observed ${title}.`);
    await shot('05-payment-return-pending');
    return `Payment Return reconciled sandbox bill ${evidence.billCode} as pending without marking the order paid.`;
  });
}catch(error){
  evidence.fatal=clean(error.message||error);
  process.exitCode=1;
}finally{
  if(page&&accountSubmissionAttempted){
    try{
      await page.goto(new URL('/member.html',previewUrl).href,{waitUntil:'domcontentloaded',timeout:30_000});
      await page.evaluate(async()=>{await window.AIBTRuntime.createClient().auth.signOut({scope:'global'});});
      evidence.signedOut=true;
      record('QA session sign-out','PASS','Global sign-out completed for the disposable browser session.');
      await shot('06-signed-out');
    }catch(error){record('QA session sign-out','BLOCKED',error.message||error);process.exitCode=1;}
  }else if(page){
    evidence.signedOut=true;
    record('QA session sign-out','PASS','No QA account submission occurred; no disposable session existed to revoke.');
  }
  await context?.close().catch(()=>{});
  await browser?.close().catch(()=>{});
  persist();
  process.stdout.write(markdown());
}
