import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { pool, isDatabaseUnavailable } from '../mysql.js';

const types: Record<string, string> = {
  'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp',
  'image/gif': '.gif', 'application/pdf': '.pdf',
};

/** Check bytes, not a user-controlled extension/MIME. Not a malware scanner. */
export function matchesUploadType(bytes: Buffer, mime: string): boolean {
  switch (mime) {
    case 'image/png': return bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    case 'image/jpeg': return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    case 'image/webp': return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    case 'image/gif': return ['GIF87a','GIF89a'].includes(bytes.toString('ascii', 0, 6));
    case 'application/pdf': return bytes.toString('ascii', 0, 5) === '%PDF-';
    default: return false;
  }
}

export function createUploadRouter(directory: string) {
  const router = Router();
  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, callback) => callback(null, directory),
      filename: (_req, file, callback) => callback(null, randomUUID() + types[file.mimetype]),
    }),
    limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 10 },
    fileFilter: (_req, file, callback) => callback(null, Object.hasOwn(types, file.mimetype)),
  });

  router.post('/upload', requireAuth, async (req, res, next) => {
    try {
      const candidate = req.query.companyId ?? req.headers['x-company-id'];
      const companyId = typeof candidate === 'string' ? candidate : '';
      if ((!companyId && req.user!.role !== 'admin_master') || companyId.length > 255) {
        return res.status(400).json({ error: 'Empresa não identificada para este upload.' });
      }
      if (companyId) {
        const [companies]: any = await pool.query('SELECT id FROM companies WHERE id=? LIMIT 1', [companyId]);
        if (!companies.length) return res.status(404).json({ error: 'Empresa não encontrada.' });
        if (req.user!.role !== 'admin_master') {
          const [members]: any = await pool.query('SELECT company_id FROM companies_users WHERE user_id=? AND company_id=? LIMIT 1', [req.user!.id, companyId]);
          if (!members.length) return res.status(403).json({ error: 'Acesso negado a esta empresa.' });
        }
      }
      res.locals.uploadCompanyId = companyId || null;
      await fs.mkdir(directory, { recursive: true });
      upload.single('file')(req, res, error => {
        if (error) {
          const tooLarge = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE';
          return res.status(tooLarge ? 413 : 400).json({ error: tooLarge ? 'Arquivo excede o limite de 10 MB.' : 'Envie somente um arquivo válido.' });
        }
        next();
      });
    } catch (error) {
      res.status(isDatabaseUnavailable(error) ? 503 : 500).json({ error: 'Não foi possível validar o upload.' });
    }
  }, async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Nenhum arquivo válido enviado.' });
    const companyId = res.locals.uploadCompanyId;
    try {
      const handle = await fs.open(file.path, 'r');
      let valid = false;
      try {
        const bytes = Buffer.alloc(16);
        const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0);
        valid = matchesUploadType(bytes.subarray(0, bytesRead), file.mimetype);
      } finally { await handle.close(); }
      if (!valid) {
        await fs.unlink(file.path);
        return res.status(415).json({ error: 'O conteúdo não corresponde ao tipo de arquivo informado.' });
      }
      const id = `media_${randomUUID()}`, url = `/uploads/${path.basename(file.filename)}`;
      await pool.query('INSERT INTO media_items (id,url,entityId,entityType,fileType,createdAt) VALUES (?,?,?,?,?,NOW())',
        [id,url,companyId,companyId ? 'company_asset' : 'platform',file.mimetype]);
      res.json({ success: true, url, mediaId: id, companyId });
    } catch (error) {
      await fs.unlink(file.path).catch(() => {});
      res.status(isDatabaseUnavailable(error) ? 503 : 500).json({ error: 'Não foi possível registrar o arquivo.' });
    }
  });
  return router;
}
