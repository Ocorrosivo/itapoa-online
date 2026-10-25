import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const REQUIRED_ENV = {
  DB_HOST: '127.0.0.1',
  DB_PORT: '65534',
  DB_NAME: 'ci_offline',
  DB_USER: 'ci_offline',
  DB_PASSWORD: 'ci_offline',
  JWT_SECRET: 'ci-only-not-a-production-secret-0123456789abcdef0123456789abcdef',
} as const;

const savedEnv: Record<string, string | undefined> = {};
before(() => {
  for (const [key, value] of Object.entries(REQUIRED_ENV)) {
    savedEnv[key] = process.env[key];
    process.env[key] = value;
  }
});
after(() => {
  for (const key of Object.keys(REQUIRED_ENV)) {
    const prior = savedEnv[key];
    if (prior === undefined) delete process.env[key];
    else process.env[key] = prior;
  }
});

const { companyService } = await import('../../src/server/services/companyService.js');
const { CompanyRepository } = await import('../../src/server/repositories/companyRepository.js');

// These regression tests pin the contract that broke in production:
// EditMiniSiteView sends instagram/facebook/website/tiktok, but the service
// filter and the repository whitelist dropped them, so the API answered
// success while nothing was stored. They must never be discarded silently.

const withRepositoryUpdate = async (
  payload: Record<string, unknown>,
  assertInside: (received: Record<string, unknown>) => void
): Promise<void> => {
  const original = CompanyRepository.update;
  let received: Record<string, unknown> | undefined;
  CompanyRepository.update = async (_id, data) => {
    received = data;
    return data;
  };
  try {
    await companyService.updateCompany('company_test', payload);
    assert.ok(received, 'o repositório deve receber um payload');
    assertInside(received!);
  } finally {
    CompanyRepository.update = original;
  }
};

test('social links and website sent by the panel reach the repository', async () => {
  await withRepositoryUpdate(
    {
      name: 'Norte Contábil',
      instagram: '@nortecontabil',
      facebook: 'https://facebook.com/nortecontabil',
      tiktok: '@nortecontabil',
      website: 'https://nortecontabil.com.br',
    },
    received => {
      assert.equal(received.instagram, '@nortecontabil');
      assert.equal(received.facebook, 'https://facebook.com/nortecontabil');
      assert.equal(received.tiktok, '@nortecontabil');
      assert.equal(received.website, 'https://nortecontabil.com.br');
    }
  );
});

test('the repository whitelist accepts the four profile columns', () => {
  const writable = (CompanyRepository as unknown as {
    pickWritable(data: Record<string, unknown>): Record<string, unknown>;
  }).pickWritable({
    instagram: '@a',
    facebook: 'https://b',
    tiktok: '@c',
    website: 'https://d',
  });
  assert.deepEqual(writable, {
    instagram: '@a',
    facebook: 'https://b',
    tiktok: '@c',
    website: 'https://d',
  });
});

test('profile completion still cannot grant a paid plan or hijack identity', async () => {
  await withRepositoryUpdate(
    {
      name: 'Empresa',
      categoryId: 'cat_test',
      id: 'another_company',
      planLevel: 'diamond_extremo',
      isSponsored: 1,
      access_grant_type: 'paid',
    },
    received => {
      assert.deepEqual(received, { name: 'Empresa', categoryId: 'cat_test' });
    }
  );
});

test('a partial save keeps the other fields instead of blanking them', async () => {
  // Only the website is edited; the service must forward exactly what arrived
  // so the UPDATE statement never rewrites untouched columns with nulls.
  await withRepositoryUpdate({ website: 'https://novo.com.br' }, received => {
    assert.deepEqual(received, { website: 'https://novo.com.br' });
  });
});
