import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createPaymentHarness } from '../helpers/paymentHarness.js';

let h: Awaited<ReturnType<typeof createPaymentHarness>>, directory: string;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=','base64');
before(async()=>{directory=await fs.mkdtemp(path.join(os.tmpdir(),'itapoa-upload-test-'));h=await createPaymentHarness(directory);});
beforeEach(async()=>{await h.reset();await h.admin.query('DELETE FROM media_items');});
after(async()=>{if(h)await h.close();if(directory)await fs.rm(directory,{recursive:true,force:true});});
async function upload(bytes: Uint8Array=png, type='image/png', user='a', company='a') {
  const form=new FormData();form.append('file',new Blob([bytes as BlobPart],{type}),'../../fake.php');
  const response=await fetch(h.base+'/api/upload?companyId='+company,{method:'POST',headers:user?{Authorization:'Bearer '+h.tokens[user]}:{},body:form});
  return {status:response.status,body:await response.json()};
}

test('multipart upload authenticates, stores real bytes and associates company',async()=>{
  const result=await upload();assert.equal(result.status,200);
  assert.match(result.body.url,/^\/uploads\/[a-f0-9-]+\.png$/);
  const response=await fetch(h.base+result.body.url);assert.equal(response.status,200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()),png);
  const [rows]:any=await h.admin.query('SELECT entityId,fileType FROM media_items WHERE id=?',[result.body.mediaId]);
  assert.equal(rows[0].entityId,'a');assert.equal(rows[0].fileType,'image/png');
});
test('upload without session or across tenants cannot create files',async()=>{
  const before=(await fs.readdir(directory)).length;
  assert.equal((await upload(png,'image/png','')).status,401);
  assert.equal((await upload(png,'image/png','b','a')).status,403);
  assert.equal((await fs.readdir(directory)).length,before);
});
test('library upload is not counted as gallery; adding it twice is idempotent',async()=>{
  const uploaded=await upload();assert.equal(uploaded.status,200);
  assert.equal((await h.request('/api/companies/a/media')).body.length,0);
  const input={url:uploaded.body.url,fileType:'image/png'};
  const added=await h.request('/api/companies/a/media','POST',input);
  assert.equal(added.status,200);assert.equal(added.body.item.id,uploaded.body.mediaId);
  assert.equal((await h.request('/api/companies/a/media','POST',input)).body.item.id,added.body.item.id);
  assert.equal((await h.request('/api/companies/a/media')).body.length,1);
  const stolen=await h.request('/api/companies/b/media','POST',input,'b');assert.equal(stolen.status,403);
});
test('parallel gallery additions enforce the free plan limit atomically',async()=>{
  const results=await Promise.all(Array.from({length:5},(_,i)=>h.request('/api/companies/a/media','POST',{url:`https://example.test/synthetic-${i}.png`,fileType:'image/png'})));
  assert.equal(results.filter(r=>r.status===200).length,3);assert.equal(results.filter(r=>r.status===403).length,2);
  assert.equal((await h.request('/api/companies/a/media')).body.length,3);
});
test('spoofed image, SVG and oversized upload are rejected without leftovers',async()=>{
  const before=(await fs.readdir(directory)).length;
  assert.equal((await upload(Buffer.from('<script>alert(1)</script>'))).status,415);
  assert.equal((await upload(Buffer.from('<svg/>'),'image/svg+xml')).status,400);
  assert.equal((await upload(Buffer.alloc(10*1024*1024+1))).status,413);
  assert.equal((await fs.readdir(directory)).length,before);
});
test('failed database insertion removes physical upload and returns 503',async()=>{
  const before=(await fs.readdir(directory)).length, original=h.pool.query;
  (h.pool as any).query=async function(sql:string,...args:any[]){
    if(sql.startsWith('INSERT INTO media_items'))throw Object.assign(new Error('synthetic'),{code:'ECONNRESET'});
    return original.call(this,sql,...args);
  };
  try{assert.equal((await upload()).status,503);}finally{h.pool.query=original;}
  assert.equal((await fs.readdir(directory)).length,before);
});
test('email address never grants administrator rights at login or middleware',async()=>{
  const email='suprememidias.ok@gmail.com';
  await h.admin.query('UPDATE users SET email=? WHERE id=?',[email,'a']);
  try{
    const result=await h.request('/api/auth/login','POST',{email,password:'Fixture-password-123'},'');
    assert.equal(result.status,200);assert.equal(result.body.user.role,'advertiser');
    const response=await fetch(h.base+'/api/admin/users',{headers:{Authorization:'Bearer '+result.body.token}});
    assert.equal(response.status,403);
  }finally{await h.admin.query('UPDATE users SET email=? WHERE id=?',['a@example.test','a']);}
});
test('tenant update cannot move its product into another company',async()=>{
  await h.admin.query("INSERT INTO products (id,company_id,name,price) VALUES ('scope_test','a','Original',1)");
  try{
    const result=await h.request('/api/products/scope_test','PUT',{company_id:'b',name:'Updated'});
    assert.equal(result.status,200);
    const [rows]:any=await h.admin.query("SELECT company_id,name FROM products WHERE id='scope_test'");
    assert.equal(rows[0].company_id,'a');assert.equal(rows[0].name,'Updated');
  }finally{await h.admin.query("DELETE FROM products WHERE id='scope_test'");}
});
test('profile edits cannot create a trial or fabricate ratings',async()=>{
  const result=await h.request('/api/companies/a','PUT',{name:'Company a',access_grant_type:'trial',trial_ends_at:'2099-01-01',has_used_trial:0,rating:5,reviewCount:999});
  assert.equal(result.status,200);
  const [rows]:any=await h.admin.query("SELECT access_grant_type,trial_ends_at,rating,reviewCount FROM companies WHERE id='a'");
  assert.equal(rows[0].access_grant_type,'bronze');assert.equal(rows[0].trial_ends_at,null);assert.notEqual(rows[0].reviewCount,999);
});
test('support ticket creation does not rely on an undeclared runtime dependency',async()=>{
  const created=await h.request('/api/support/tickets','POST',{subject:'Synthetic',message:'Fixture only'});
  assert.equal(created.status,200);
  await h.admin.query('DELETE FROM support_tickets WHERE id=?',[created.body.id]);
});
test('company creation rolls back when ownership insert fails',async()=>{
  const { companyService }=await import('../../src/server/services/companyService.js');
  await assert.rejects(()=>companyService.createCompany({name:'Rollback fixture'},'nonexistent-fixture-user'));
  const [rows]:any=await h.admin.query("SELECT id FROM companies WHERE name='Rollback fixture'");assert.equal(rows.length,0);
});
