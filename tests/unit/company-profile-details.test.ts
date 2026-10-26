import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readProfileDetails,
  profileDetailsError,
  formatProfileAddress,
  formatProfileHours,
  isAllowedPortalCity,
  getPortalCityId,
} from '../../src/utils/companyProfileDetails.js';

test('legacy profiles remain empty and structured profiles round trip', () => {
  const p = readProfileDetails(null);
  assert.equal(formatProfileAddress(p), '');
  assert.equal(formatProfileHours(p), '');
  Object.assign(p, {
    cep: '89249-000',
    street: 'Rua Portugal',
    number: '45',
    neighborhood: 'Sertão',
    city: 'Itapoá',
    state: 'SC',
  });
  p.schedule[0] = { ...p.schedule[0], open: '08:00', close: '18:00' };
  p.schedule[2].closed = true;
  assert.deepEqual(readProfileDetails(JSON.stringify(p)), p);
  assert.equal(profileDetailsError(p), '');
  assert.match(formatProfileAddress(p), /Rua Portugal, 45/);
  assert.match(formatProfileHours(p), /Domingo: Fechado/);
});

test('invalid CEP, unsafe social URLs and equal opening/closing hours are rejected', () => {
  const p = readProfileDetails({ cep: '12' });
  assert.ok(profileDetailsError(p));
  p.cep = '89249-000';
  p.x = 'javascript:alert(1)';
  assert.ok(profileDetailsError(p));
  p.x = 'https://x.com/empresa';
  // Horário com abertura igual a fechamento deve ser rejeitado
  p.schedule[0].open = '18:00';
  p.schedule[0].close = '18:00';
  assert.ok(profileDetailsError(p));

  // Horário noturno que ultrapassa meia-noite (ex: 18:00 às 02:00) deve ser aceito
  p.schedule[0].close = '02:00';
  assert.equal(profileDetailsError(p), '');
});

test('portal cities allow Itapoá and Curitiba and reject others', () => {
  assert.equal(isAllowedPortalCity('Itapoá', 'SC'), true);
  assert.equal(isAllowedPortalCity('itapoa', 'SC'), true);
  assert.equal(isAllowedPortalCity('Curitiba', 'PR'), true);
  assert.equal(isAllowedPortalCity('curitiba'), true);
  assert.equal(isAllowedPortalCity('Joinville', 'SC'), false);
  assert.equal(isAllowedPortalCity('Florianópolis', 'SC'), false);

  assert.equal(getPortalCityId('Itapoá', 'SC'), 'city_itapoa');
  assert.equal(getPortalCityId('Curitiba', 'PR'), 'city_curitiba');
  assert.equal(getPortalCityId('Joinville', 'SC'), null);
});

