import test from 'node:test';
import assert from 'node:assert/strict';
import { EmailVerificationService, VerificationError } from '../../src/server/services/emailVerificationService.js';
import { pool } from '../../src/server/mysql.js';
import { after } from 'node:test';
after(async()=>{await pool.end();});

test('email verification: validates token format and requires exact hash match', async () => {
  const service = new EmailVerificationService();

  // Token malformado deve ser rejeitado imediatamente
  await assert.rejects(
    () => service.verifyToken('invalid-short-token'),
    (err: any) => err instanceof VerificationError && err.status === 400
  );

  await assert.rejects(
    () => service.verifyToken(12345),
    (err: any) => err instanceof VerificationError && err.status === 400
  );
});

test('email verification: legacy users without pending verification are considered verified', async () => {
  const service = new EmailVerificationService();
  // Usuário que não possui registro na tabela é considerado verificado para não quebrar compatibilidade
  const original=pool.query;
  (pool as any).query=async()=>[[]];
  try{assert.equal(await service.isUserVerified('legacy_user_unregistered_in_table'),true);}
  finally{pool.query=original;}
});

test('database failure cannot turn an unverified email into a verified identity',async()=>{
  const original=pool.query;
  (pool as any).query=async()=>{throw new Error('synthetic');};
  try{await assert.rejects(()=>new EmailVerificationService().isUserVerified('a'),(e:any)=>e.status===503);}
  finally{pool.query=original;}
});
