/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Public engagement: reviews, blog/campaign comments and job applications.
 * Everything is persisted in MySQL through parameterised statements.
 */

import { pool } from '../mysql.js';
import {
  ReviewRepository,
  BlogPostRepository,
  BlogCommentRepository,
  CampaignCommentRepository,
  SolidarityCampaignRepository,
  JobRepository,
  JobApplicationRepository
} from '../repositories/baseRepository.js';

export class EngagementError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const ENTITY_TYPES = new Set(['company', 'professional', 'product']);

const newId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const requireText = (value: unknown, field: string, max = 2000): string => {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new EngagementError(400, `${field} é obrigatório.`);
  return text.slice(0, max);
};

export class EngagementService {
  /** Reviews for one entity, newest first. */
  async listReviews(filters: Record<string, any>) {
    return ReviewRepository.findAll({ ...filters, orderBy: 'createdAt', order: 'DESC' });
  }

  /**
   * Stores a review and recomputes the company's rating from the reviews table,
   * so the aggregate always matches the stored rows.
   */
  async createReview(payload: Record<string, any>, userId: string | null) {
    const entityId = requireText(payload.entityId, 'Entidade', 255);
    const entityType = typeof payload.entityType === 'string' ? payload.entityType : 'company';
    if (!ENTITY_TYPES.has(entityType)) {
      throw new EngagementError(400, 'Tipo de entidade inválido.');
    }

    const rating = Number(payload.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new EngagementError(400, 'A nota deve estar entre 1 e 5.');
    }

    const review = await ReviewRepository.create({
      id: newId('rev'),
      entityId,
      entityType,
      userId,
      userName: requireText(payload.userName, 'Nome', 255),
      rating,
      comment: requireText(payload.comment, 'Comentário')
    });

    if (entityType === 'company') {
      await pool.query(
        `UPDATE companies c
            SET c.rating = (
                  SELECT ROUND(AVG(r.rating), 2) FROM reviews r
                   WHERE r.entityId = c.id AND r.entityType = 'company'
                ),
                c.reviewCount = (
                  SELECT COUNT(*) FROM reviews r
                   WHERE r.entityId = c.id AND r.entityType = 'company'
                )
          WHERE c.id = ?`,
        [entityId]
      );
    }

    return review;
  }

  /** Blog post with its stored comments. Accepts id or slug. */
  async getBlogPost(idOrSlug: string) {
    const post =
      (await BlogPostRepository.findById(idOrSlug)) ??
      (await BlogPostRepository.findBySlug(idOrSlug));
    if (!post) throw new EngagementError(404, 'Publicação não encontrada.');

    const comments = await BlogCommentRepository.findAll({
      postId: post.id,
      orderBy: 'createdAt',
      order: 'DESC'
    });
    return { ...post, comments };
  }

  async addBlogComment(postId: string, payload: Record<string, any>, userId: string | null) {
    const post = await BlogPostRepository.findById(postId);
    if (!post) throw new EngagementError(404, 'Publicação não encontrada.');

    await BlogCommentRepository.create({
      id: newId('bcom'),
      postId: post.id,
      userId,
      userName: requireText(payload.userName, 'Nome', 255),
      comment: requireText(payload.comment, 'Comentário')
    });

    return { success: true, post: await this.getBlogPost(post.id) };
  }

  /** Solidarity campaign with its stored comments. Accepts id or slug. */
  async getCampaign(idOrSlug: string) {
    const campaign =
      (await SolidarityCampaignRepository.findById(idOrSlug)) ??
      (await SolidarityCampaignRepository.findBySlug(idOrSlug));
    if (!campaign) throw new EngagementError(404, 'Campanha não encontrada.');

    const comments = await CampaignCommentRepository.findAll({
      campaignId: campaign.id,
      orderBy: 'createdAt',
      order: 'DESC'
    });
    return { ...campaign, comments };
  }

  async addCampaignComment(campaignId: string, payload: Record<string, any>) {
    const campaign = await SolidarityCampaignRepository.findById(campaignId);
    if (!campaign) throw new EngagementError(404, 'Campanha não encontrada.');

    await CampaignCommentRepository.create({
      id: newId('ccom'),
      campaignId: campaign.id,
      userName: requireText(payload.userName, 'Nome', 255),
      comment: requireText(payload.comment, 'Comentário')
    });

    return { success: true, campaign: await this.getCampaign(campaign.id) };
  }

  /** Job application. applicationsCount is recounted from the stored rows. */
  async applyToJob(jobId: string, payload: Record<string, any>, userId: string | null) {
    const job = await JobRepository.findById(jobId);
    if (!job) throw new EngagementError(404, 'Vaga não encontrada.');

    const email = requireText(payload.email, 'E-mail', 255).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new EngagementError(400, 'E-mail inválido.');
    }

    const application = await JobApplicationRepository.create({
      id: newId('app'),
      jobId: job.id,
      userId,
      name: requireText(payload.name, 'Nome', 255),
      email,
      phone: typeof payload.phone === 'string' ? payload.phone.slice(0, 50) : null,
      coverLetter: typeof payload.coverLetter === 'string' ? payload.coverLetter.slice(0, 4000) : null,
      resumeUrl: typeof payload.resumeUrl === 'string' ? payload.resumeUrl.slice(0, 255) : null,
      status: 'pending'
    });

    await pool.query(
      `UPDATE jobs SET applicationsCount =
         (SELECT COUNT(*) FROM job_applications WHERE jobId = ?)
       WHERE id = ?`,
      [job.id, job.id]
    );

    return { success: true, application };
  }
}

export const engagementService = new EngagementService();
