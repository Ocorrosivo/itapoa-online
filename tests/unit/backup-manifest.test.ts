import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const manifest=(directory:string)=>JSON.parse(execFileSync(process.execPath,['scripts/upload-backup-manifest.cjs',directory],{encoding:'utf8'}));
async function fixture(action:(directory:string)=>Promise<void>){
  const temporaryRoot=path.resolve(os.tmpdir());
  const directory=await fs.mkdtemp(path.join(temporaryRoot,'itapoa-manifest-test-'));
  try{await action(directory);}finally{
    if(path.dirname(path.resolve(directory))!==temporaryRoot||!path.basename(directory).startsWith('itapoa-manifest-test-'))throw new Error('Unsafe fixture cleanup');
    await fs.rm(directory,{recursive:true,force:true});
  }
}
test('backup manifest is deterministic and checks copied file bytes recursively',async()=>fixture(async directory=>{
  await fs.mkdir(path.join(directory,'nested'));
  await fs.writeFile(path.join(directory,'b.png'),'synthetic fixture');
  await fs.writeFile(path.join(directory,'nested','a.png'),'another fixture');
  const first=manifest(directory);
  assert.equal(first.count,2);assert.deepEqual(first.files.map((file:any)=>file.name),['b.png','nested/a.png']);
  assert.deepEqual(manifest(directory),first);
  await fs.writeFile(path.join(directory,'b.png'),'modified fixture');
  assert.notEqual(manifest(directory).files[0].sha256,first.files[0].sha256);
}));
test('empty upload directory is recorded as empty, not fabricated recovery',async()=>fixture(async directory=>{
  assert.deepEqual(manifest(directory),{count:0,files:[]});
}));
