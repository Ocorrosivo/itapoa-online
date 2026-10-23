import { randomUUID } from 'node:crypto';
import { pool } from '../mysql.js';
import { EntitlementService } from './entitlementService.js';
import { ServiceError } from './crudService.js';

export async function addGalleryPhoto(companyId: string, url: unknown, fileType: unknown) {
  if (typeof url !== 'string' || url.length > 2048 || !url.trim()) throw new ServiceError(400,'URL da imagem obrigatória.');
  const value=url.trim();
  if (!value.startsWith('/uploads/')) {
    try { const parsed=new URL(value);if(parsed.protocol!=='https:'||parsed.username||parsed.password)throw new Error(); }
    catch { throw new ServiceError(400,'URL da imagem inválida.'); }
  }
  if (!['image/jpeg','image/png','image/webp','image/gif'].includes(String(fileType))) throw new ServiceError(400,'Tipo de imagem inválido.');
  const entitlements=await EntitlementService.getCompanyEntitlements(companyId);
  const db=await pool.getConnection();
  try {
    await db.beginTransaction();
    const [company]:any=await db.query('SELECT id FROM companies WHERE id=? FOR UPDATE',[companyId]);
    if(!company.length)throw new ServiceError(404,'Empresa não encontrada.');
    const [existing]:any=await db.query("SELECT id FROM media_items WHERE entityId=? AND entityType='company' AND url=? LIMIT 1",[companyId,value]);
    if(existing.length){await db.commit();return {success:true,item:{id:existing[0].id,url:value,entityId:companyId,entityType:'company'}};}
    const [count]:any=await db.query("SELECT COUNT(*) total FROM media_items WHERE entityId=? AND entityType='company'",[companyId]);
    if(Number(count[0].total)>=entitlements.limits.maxGalleryPhotos)throw new ServiceError(403,`Limite de fotos atingido para o plano ${entitlements.planName}.`);
    let id=`media_${randomUUID()}`;
    if(value.startsWith('/uploads/')){
      const [asset]:any=await db.query("SELECT id FROM media_items WHERE entityId=? AND entityType='company_asset' AND url=? LIMIT 1",[companyId,value]);
      if(!asset.length)throw new ServiceError(403,'Arquivo não pertence à biblioteca desta empresa.');
      id=asset[0].id;
      await db.query("UPDATE media_items SET entityType='company' WHERE id=?",[id]);
    }else{
      await db.query("INSERT INTO media_items(id,url,entityId,entityType,fileType,createdAt) VALUES(?,?,?,'company',?,NOW())",[id,value,companyId,fileType]);
    }
    await db.commit();
    return {success:true,item:{id,url:value,entityId:companyId,entityType:'company'}};
  }catch(error){await db.rollback();throw error;}finally{db.release();}
}
