import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiFetch } from '../../src/lib/apiClient.js';

test('FormData keeps browser boundary and uses the canonical bearer session',async()=>{
  const originalFetch=globalThis.fetch, originalStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>key==='saas_token'?'synthetic-session':null}});
  let received:RequestInit;
  globalThis.fetch=async (_url,init)=>{received=init!;return Response.json({success:true});};
  try{
    const form=new FormData();form.append('file',new Blob(['test']),'test.png');
    await apiFetch('/api/upload',{method:'POST',body:form});
    const headers=new Headers(received!.headers);
    assert.equal(headers.get('Authorization'),'Bearer synthetic-session');
    assert.equal(headers.has('Content-Type'),false);assert.equal(received!.body,form);
  }finally{globalThis.fetch=originalFetch;if(originalStorage)Object.defineProperty(globalThis,'localStorage',originalStorage);else delete (globalThis as any).localStorage;}
});
