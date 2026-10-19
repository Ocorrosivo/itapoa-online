/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Environment configuration - fail fast, no insecure defaults.
 */

import dotenv from 'dotenv';

dotenv.config();

const REQUIRED_VARS = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET'
] as const;

type RequiredVar = (typeof REQUIRED_VARS)[number];

const MIN_JWT_SECRET_LENGTH = 32;

const collectMissing = (): string[] => {
  const problems: string[] = [];

  for (const name of REQUIRED_VARS) {
    const value = process.env[name];
    // DB_PASSWORD may be defined as empty only if the operator explicitly opts in.
    if (value === undefined || value.trim() === '') {
      problems.push(`${name} não definida`);
    }
  }

  const secret = process.env.JWT_SECRET;
  if (secret && secret.trim().length > 0 && secret.trim().length < MIN_JWT_SECRET_LENGTH) {
    problems.push(`JWT_SECRET curta demais (mínimo ${MIN_JWT_SECRET_LENGTH} caracteres)`);
  }

  for (const name of ['PORT', 'DB_PORT']) {
    const port = Number(process.env[name]);
    if (process.env[name] && (!Number.isInteger(port) || port < 1 || port > 65535)) {
      problems.push(`${name} deve ser uma porta válida`);
    }
  }

  return problems;
};

const problems = collectMissing();

if (problems.length > 0) {
  // Names only. Never print values.
  console.error('❌ Configuração de ambiente inválida:');
  for (const problem of problems) {
    console.error(`   - ${problem}`);
  }
  console.error('   Consulte .env.example. A aplicação não sobe sem estas variáveis.');
  process.exit(1);
}

const required = (name: RequiredVar): string => process.env[name] as string;

const subscriptionsEnabled = String(process.env.SUBSCRIPTIONS_ENABLED ?? '').toLowerCase() === 'true';

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 3000),
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  appUrl: process.env.APP_URL || 'https://ajborrachariamovel.com.br',
  apiUrl: process.env.API_URL || `${process.env.APP_URL || 'https://ajborrachariamovel.com.br'}/api`,

  db: {
    host: required('DB_HOST'),
    port: Number(required('DB_PORT')),
    name: required('DB_NAME'),
    user: required('DB_USER'),
    password: required('DB_PASSWORD')
  },

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  subscriptionsEnabled
};
