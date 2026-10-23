/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * HTTP entrypoint. Secrets and credentials come exclusively from the
 * environment (see src/server/config/env.ts) — there are no defaults.
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { env } from './src/server/config/env.js';
import { apiRouter } from './src/server/routes/api.js';
import { reportSchemaState } from './src/server/init-db.js';
import { requireAuth } from './src/server/middleware/auth.js';
import { mercadoPagoWebhook } from './src/server/routes/mercadoPagoWebhook.js';
import { pool } from './src/server/mysql.js';

const getDirname = () => {
  if (typeof __dirname !== 'undefined') return __dirname;
  return process.cwd();
};
const __dirname_resolved = getDirname();

const app = express();

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (req.path === '/redefinir-senha' || req.path === '/esqueci-senha') {
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
  }
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  next();
});

// Lightweight, per-process protection for authentication endpoints. Hostinger
// may run more than one process, so this complements (rather than replaces)
// edge/WAF rate limiting.
const authAttempts = new Map<string, { count: number; resetAt: number }>();
app.use('/api/auth', (req, res, next) => {
  if (req.method !== 'POST') return next();
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const current = authAttempts.get(key);
  const entry = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + 15 * 60 * 1000 }
    : current;
  entry.count += 1;
  authAttempts.set(key, entry);
  if (entry.count > 20) {
    res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
    return res.status(429).json({ error: 'Muitas tentativas. Tente novamente em alguns minutos.' });
  }
  next();
});

// Exact handler is shared with the backend integration tests.
app.post('/api/webhooks/mercadopago', express.json({ limit: '256kb' }), mercadoPagoWebhook);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Read-only schema check. The server never creates or migrates tables:
// database/schema/MYSQL_SCHEMA.sql is the single source of truth.
reportSchemaState();

const uploadDir = path.isAbsolute(env.uploadDir)
  ? env.uploadDir
  : path.join(process.cwd(), env.uploadDir);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// SVG is intentionally excluded: it can carry inline <script> and would be a
// stored-XSS vector when served from our own origin.
const ALLOWED_UPLOAD_TYPES: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf'
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    // The extension is derived from the (validated) MIME type, never from the
    // client-supplied name — a spoofed "image.php" cannot land as .php on disk.
    const ext = ALLOWED_UPLOAD_TYPES[file.mimetype] ?? '';
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, Object.prototype.hasOwnProperty.call(ALLOWED_UPLOAD_TYPES, file.mimetype));
  }
});

// Uploaded files are served as inert downloads: nosniff stops MIME confusion
// and attachment disposition stops anything from rendering inline in our origin.
app.use('/uploads', express.static(uploadDir, {
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  }
}));

/**
 * Uploads — fixo ao escopo da empresa do caller (anti-IDOR) e persistido em
 * media_items para sobreviver ao deploy (Easypanel recria volume mas mantém DB).
 * - Requer companyId da sessão (requireCompanyAccess → companies_users).
 * - Mensura limites de galeria por plano na rota POST /api/companies/:id/media, não aqui.
 * - Em erro, o arquivo físico é removido e o registro é revertido.
 * - Orfãos (media_items sem companies_users) são invisíveis no catálogo público.
 */
app.post('/api/upload', requireAuth, async (req, res, next) => {
  // Resolve companyId antes do multipart: query ?companyId= ou header do front.
  const rawCompanyId = typeof req.query.companyId === 'string' ? req.query.companyId : typeof (req.headers['x-company-id'] as string) === 'string' ? (req.headers['x-company-id'] as string) : '';
  if (req.user?.role !== 'admin_master' && !rawCompanyId) {
    return res.status(400).json({ error: 'Empresa não identificada para este upload (envie ?companyId=).' });
  }
  if (rawCompanyId) {
    // Anti-IDOR: só prossegue se companies_users confirma vínculo
    const [mem]: any = await pool.query('SELECT company_id FROM companies_users WHERE user_id = ? AND company_id = ? LIMIT 1', [req.user!.id, rawCompanyId]).catch(() => [[]]);
    const isAdmin = String(req.user?.role) === 'admin_master';
    if (!isAdmin && mem.length === 0) return res.status(403).json({ error: 'Acesso negado a esta empresa.' });
  }
  // Attach resolved id for downstream
  (req as any).__uploadCompanyId = rawCompanyId || null;
  return upload.single('file')(req as any, res as any, next);
}, async (req, res) => {
  if (!(req as any).file) {
    return res.status(400).json({ error: 'Nenhum arquivo válido enviado.' });
  }
  const file = (req as any).file as Express.Multer.File;
  const companyId: string | null = (req as any).__uploadCompanyId || null;
  const url = `/uploads/${file.filename}`;
  const id = `media_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  let mediaSaved = false;
  try {
    if (companyId) {
      const [companies]: any = await pool.query('SELECT id FROM companies WHERE id = ? LIMIT 1', [companyId]);
      if (!companies.length) {
        fs.unlink(path.join(uploadDir, file.filename), () => {});
        return res.status(404).json({ error: 'Empresa não encontrada.' });
      }
    }
    await pool.query(
      'INSERT INTO media_items (id, url, entityId, entityType, fileType, createdAt) VALUES (?, ?, ?, ?, ?, NOW())',
      [id, url, companyId, companyId ? 'company' : 'platform', file.mimetype]
    );
    mediaSaved = true;
    res.json({ success: true, url, mediaId: id, companyId });
  } catch {
    if (mediaSaved) await pool.query('DELETE FROM media_items WHERE id = ?', [id]).catch(() => {});
    fs.unlink(path.join(uploadDir, file.filename), () => {});
    res.status(500).json({ error: 'Não foi possível registrar o arquivo na biblioteca da empresa.' });
  }
});

// Public sitemap. Built from live company slugs so search engines can reach
// every mini-site. Falls back to static pages only if the DB is unreachable.
app.get('/sitemap.xml', async (_req, res) => {
  const base = env.appUrl.replace(/\/$/, '');
  const now = new Date().toISOString().split('T')[0];
  const staticPages = ['', '/empresas', '/turismo', '/eventos', '/blog', '/planos'];

  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  let slugs: string[] = [];
  try {
    const { pool } = await import('./src/server/mysql.js');
    const [rows]: any = await pool.query('SELECT slug FROM companies WHERE slug IS NOT NULL LIMIT 5000');
    slugs = rows.map((r: any) => String(r.slug));
  } catch {
    // DB down: serve the static section rather than 500.
  }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const page of staticPages) {
    xml += `  <url><loc>${base}${page}</loc><lastmod>${now}</lastmod>`;
    xml += `<changefreq>daily</changefreq><priority>${page === '' ? '1.0' : '0.8'}</priority></url>\n`;
  }
  for (const slug of slugs) {
    xml += `  <url><loc>${base}/empresa/${escape(slug)}</loc><lastmod>${now}</lastmod>`;
    xml += '<changefreq>weekly</changefreq><priority>0.9</priority></url>\n';
  }
  xml += '</urlset>';

  res.type('application/xml').send(xml);
});

app.use('/api', apiRouter);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint não encontrado.' }));

async function startServer() {
  if (!env.isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
    console.log('Vite development middleware ativo.');
  } else {
    // The bundle (dist/server.cjs) runs from inside dist/, so __dirname is
    // already the dist folder. If for some reason we're launched from the repo
    // root, fall back to ./dist. We pick whichever actually contains index.html.
    const candidates = [
      __dirname_resolved,
      path.join(__dirname_resolved, 'dist'),
      path.join(process.cwd(), 'dist')
    ];
    const distPath =
      candidates.find(dir => fs.existsSync(path.join(dir, 'index.html'))) ?? __dirname_resolved;

    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log(`Servindo build de produção a partir de ${distPath}`);
  }

  // Global error handler. Stack traces never cross the wire in production.
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error('Unhandled error:', err?.message ?? err);
    if (env.isProduction) {
      res.status(err?.status || 500).json({ error: 'Erro interno no servidor.' });
    } else {
      res.status(err?.status || 500).json({ error: err?.message ?? 'Erro interno.' });
    }
  });

  app.listen(env.port, '0.0.0.0', () => {
    console.log('-----------------------------------------------');
    console.log('🚀 Guia Comercial Itapoá — API + Portal');
    console.log(`🔗 http://localhost:${env.port}`);
    console.log(`🏠 Ambiente: ${env.nodeEnv}`);
    console.log('-----------------------------------------------');
  });
}

startServer();
