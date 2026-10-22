import { before, beforeEach, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { createPaymentHarness } from '../helpers/paymentHarness.js';

// Real frontend -> real local Express routes -> real MariaDB. Only SDK and MP API
// boundaries are synthetic. No route interception of the application's API.
let h: Awaited<ReturnType<typeof createPaymentHarness>>, browser: Browser, context: BrowserContext;
before(async () => { h=await createPaymentHarness(); browser=await chromium.launch({headless:true}); });
beforeEach(async () => {
  if(context) await context.close(); await h.reset();
  context=await browser.newContext({viewport:{width:1366,height:900}});
  await context.addInitScript(({token}) => {
    localStorage.setItem('saas_token',token);
    localStorage.setItem('saas_user',JSON.stringify({id:'a',name:'Fixture a',email:'a@example.test',phone:'47999990000',role:'advertiser'}));
  }, {token:h.tokens.a});
  await context.route('https://sdk.mercadopago.com/js/v2', route=>route.fulfill({contentType:'application/javascript',body:`window.MercadoPago=class{bricks(){return{create:async(type,id,settings)=>{const c=document.getElementById(id);const b=document.createElement('button');b.textContent='Pagar com SDK simulado';b.onclick=()=>Promise.resolve(settings.callbacks.onSubmit({token:'synthetic-sdk-token',payment_method_id:'visa',installments:1,payer:{identification:{type:'CPF',number:'12345678909'}}})).catch(()=>{});c.appendChild(b);settings.callbacks.onReady();return{unmount:()=>{c.innerHTML=''}}}}}};`}));
});
after(async () => { if(context)await context.close();if(browser)await browser.close();if(h)await h.close(); });
async function checkout(page:Page) {
  await page.goto(h.base+'/planos');
  const choose=page.getByRole('button',{name:'Assinar Gold VIP',exact:true});
  await expect(choose.or(page.locator('#checkout-phone')).first()).toBeVisible();
  if(await choose.isVisible()) await choose.click();
  await expect(page.locator('#checkout-phone')).toBeVisible();
  await page.locator('#checkout-phone').fill('(47) 99999-0000');
  await page.locator('#checkout-company').selectOption('a');
}
const confirmed = (page:Page)=>page.getByRole('heading',{name:'Pagamento confirmado com sucesso!',exact:true});
test('approved card response is not success; reload resumes; webhook activates DB and then screen', async () => {
  h.setResponseState('approved'); const page=await context.newPage();await checkout(page);
  await page.getByRole('button',{name:'Pagar com SDK simulado'}).click();
  await expect(page.getByRole('heading',{name:'Aguardando confirmação do pagamento'})).toBeVisible();
  assert.equal((await h.snapshot()).companies[0].planLevel,'bronze');await expect(confirmed(page)).toHaveCount(0);
  await page.reload();await expect(page.getByRole('heading',{name:'Aguardando confirmação do pagamento'})).toBeVisible();
  assert.equal(h.calls.filter(c=>c.method==='POST').length,1);
  const paymentId=[...h.gateway.keys()][0];assert.equal((await h.webhook(paymentId)).status,200);
  await expect(confirmed(page)).toBeVisible({timeout:10000});assert.equal((await h.snapshot()).companies[0].planLevel,'gold_vip');
});
test('rejected and in-process cards show no false success', async () => {
  h.setResponseState('rejected');const page=await context.newPage();await checkout(page);
  await page.getByRole('button',{name:'Pagar com SDK simulado'}).click();
  await expect(page.getByRole('alert')).toContainText('recusado');await expect(confirmed(page)).toHaveCount(0);
  assert.equal((await h.snapshot()).companies[0].planLevel,'bronze');
  h.setResponseState('in_process');await page.getByRole('button',{name:'Pagar com SDK simulado'}).click();
  await expect(page.getByRole('heading',{name:'Aguardando confirmação do pagamento'})).toBeVisible();
  await page.getByRole('button',{name:'Verificar pagamento agora'}).click();
  await expect(confirmed(page)).toHaveCount(0);assert.equal((await h.snapshot()).companies[0].planLevel,'bronze');
});
test('mobile Pix has copy/paste, reload recovers without new charge, confirmation updates real backend', async () => {
  const page=await context.newPage();await page.setViewportSize({width:390,height:844});await checkout(page);
  await page.getByRole('button',{name:'Pix oficial',exact:true}).click();await page.getByRole('button',{name:/Gerar QR Code Pix/i}).click();
  await expect(page.getByLabel('Pix Copia e Cola')).toHaveValue('SYNTHETIC-PIX-NOT-PAYABLE');
  await page.reload();await expect(page.getByLabel('Pix Copia e Cola')).toHaveValue('SYNTHETIC-PIX-NOT-PAYABLE');
  assert.equal(h.calls.filter(c=>c.method==='POST').length,1);
  const paymentId=[...h.gateway.keys()][0], payment=h.gateway.get(paymentId);
  payment.status='approved';payment.date_last_updated=new Date(Date.now()+1000).toISOString();
  assert.equal((await h.webhook(paymentId)).status,200);
  await expect(confirmed(page)).toBeVisible({timeout:10000});assert.equal((await h.snapshot()).subscriptions[0].status,'active');
});
test('two browser tabs share one pending card charge and one activation', async () => {
  h.setResponseState('approved');const first=await context.newPage(),second=await context.newPage();
  await checkout(first);await checkout(second);
  await Promise.all([first.getByRole('button',{name:'Pagar com SDK simulado'}).click(),second.getByRole('button',{name:'Pagar com SDK simulado'}).click()]);
  await expect(first.getByRole('heading',{name:'Aguardando confirmação do pagamento'})).toBeVisible();
  await expect(second.getByRole('heading',{name:'Aguardando confirmação do pagamento'})).toBeVisible();
  assert.equal(h.calls.filter(c=>c.method==='POST').length,1);
  await h.webhook([...h.gateway.keys()][0]);
  await expect(confirmed(first)).toBeVisible({timeout:10000});await expect(confirmed(second)).toBeVisible({timeout:10000});
  assert.equal((await h.snapshot()).gateway_payment_state.length,1);
});
