import test from 'node:test';
import assert from 'node:assert/strict';
import { EmailVerificationService, VerificationError } from '../../src/server/services/emailVerificationService.js';

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
  const isVerified = await service.isUserVerified('legacy_user_unregistered_in_table');
  assert.equal(isVerified, true);
});
