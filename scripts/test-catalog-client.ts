import assert from 'node:assert/strict';
import { CompanyRepository } from '../src/repositories/companyRepository';
import { CategoryRepository } from '../src/repositories/categoryRepository';
import { arrayFromPayload, featureArray, matchesCompanySearch } from '../src/utils/catalogSearch';

Object.defineProperty(globalThis, 'localStorage', { value: { getItem: () => 'test-session-token' }, configurable: true });
const originalFetch = globalThis.fetch;
let reply: unknown;
const calls: Array<{ path: string; init: RequestInit }> = [];
globalThis.fetch = async (path, init = {}) => {
  calls.push({ path: String(path), init });
  return Response.json(reply);
};
try {
  reply = { success: true, company: { id: 'created', name: 'Teste' } };
  assert.equal((await CompanyRepository.save({ name: 'Teste' }))?.id, 'created');
  assert.equal(calls.at(-1)?.path, '/api/companies/create');
  assert.equal(calls.at(-1)?.init.method, 'POST');
  assert.equal(new Headers(calls.at(-1)?.init.headers).get('Authorization'), 'Bearer test-session-token');
  await CompanyRepository.save({ id: 'company/1', name: 'Atualizado' });
  assert.equal(calls.at(-1)?.path, '/api/companies/company%2F1');
  assert.equal(calls.at(-1)?.init.method, 'PUT');

  for (const wrapped of [false, true]) {
    const list = [{ id: 'company', name: 'Clínica', features: '["Café incluso"]' }];
    reply = wrapped ? { data: list } : list;
    assert.deepEqual((await CompanyRepository.getAll())[0].features, ['Café incluso']);
    assert.equal((await CategoryRepository.getAll()).length, 1);
  }
  assert.deepEqual(arrayFromPayload(null), []);
  assert.deepEqual(featureArray(null), []);
  assert.deepEqual(featureArray('invalid'), []);
  assert.equal(matchesCompanySearch({ name: 'Clínica' }, 'clinica'), true);
  assert.equal(matchesCompanySearch({ features: '["Café incluso"]' }, 'cafe'), true);
  assert.equal(matchesCompanySearch({ detailedDescription: 'Hambúrguer artesanal' }, 'hamburguer'), true);
  assert.equal(matchesCompanySearch({ name: 'Mercado' }, 'inexistente'), false);
  console.log('PASS: Bearer, POST/PUT, response envelopes, feature arrays and accent normalization.');
} finally { globalThis.fetch = originalFetch; }
