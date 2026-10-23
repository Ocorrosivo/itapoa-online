// Opt-in SDK rendering check. Isolated SQL, synthetic session, no payment submit.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { createPaymentHarness } from '../helpers/paymentHarness.js';

const publicKey=process.env.PAYMENT_SDK_PUBLIC_KEY;
if(process.env.PAYMENT_SDK_RENDER_CHECK!=='read-only'||!publicKey)throw new Error('Explicit read-only SDK check and public key required');
const h=await createPaymentHarness();
let browser: Awaited<ReturnType<typeof chromium.launch>>;
try{
  await h.admin.query('UPDATE payment_config SET publicKey=? WHERE id=?',[publicKey,'payment']);
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1366,height:900}});
  await context.addInitScript(({token})=>{
    localStorage.setItem('saas_token',token);
    localStorage.setItem('saas_user',JSON.stringify({id:'a',name:'Fixture a',email:'a@example.test',phone:'47999990000',role:'advertiser'}));
  },{token:h.tokens.a});
  await context.route('**/v1/payments',async route=>{
    if(route.request().method()==='POST')await route.abort('blockedbyclient');else await route.continue();
  });
  const page=await context.newPage();
  await page.goto(h.base+'/planos');
  await page.getByRole('button',{name:'Assinar Gold VIP',exact:true}).click();
  await page.locator('#checkout-phone').fill('(47) 99999-0000');
  const container=page.locator('#itapoa-secure-card-payment-brick');
  await container.locator('iframe').first().waitFor({state:'visible',timeout:45000});
  const labels=await container.innerText();
  const frames=await container.locator('iframe').count();
  const hasNumber=/n[uú]mero.*cart[aã]o/i.test(labels);
  const hasSecurityCode=/seguran[cç]a|CVV/i.test(labels);
  assert.ok(frames>=2&&hasNumber&&hasSecurityCode,'Secure SDK card fields must be rendered');
  assert.equal(h.calls.filter(call=>call.method==='POST').length,0);
  console.log(JSON.stringify({realSdkRendered:true,secureFrames:frames,cardNumberLabel:hasNumber,securityCodeLabel:hasSecurityCode,financialSubmissions:0}));
}finally{if(browser!)await browser.close();await h.close();}
