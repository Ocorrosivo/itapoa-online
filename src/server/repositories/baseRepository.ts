/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Base repository. Every identifier that reaches SQL is validated against an
 * explicit per-table whitelist; only values ever become bound parameters.
 */

import { pool } from '../mysql.js';

/**
 * Columns a client is allowed to filter/sort by, per table.
 * Anything absent from this map is ignored — never interpolated into SQL.
 */
const TABLE_COLUMNS: Record<string, string[]> = {
  users: ['id', 'name', 'email', 'role', 'phone', 'city', 'avatarUrl', 'created_at', 'updated_at'],
  companies: [
    'instagram', 'facebook', 'tiktok', 'website',
    'id', 'name', 'slug', 'logo', 'coverImage', 'categoryId', 'cityId', 'description',
    'detailedDescription', 'rating', 'reviewCount', 'phone', 'whatsapp', 'address', 'hours',
    'latitude', 'longitude', 'isSponsored', 'planLevel', 'features', 'views', 'clicksWhatsapp',
    'clicksPhone', 'clicksRoute',
    'access_grant_type', 'trial_ends_at', 'has_used_trial', 'createdAt'
  ],
  companies_users: ['user_id', 'company_id', 'access_level'],
  cities: ['id', 'name', 'state', 'created_at'],
  districts: ['id', 'city_id', 'name', 'created_at'],
  categories: ['id', 'name', 'slug', 'icon', 'description', 'parent_id', 'created_at'],
  products: ['id', 'company_id', 'name', 'description', 'price', 'image', 'created_at'],
  services: ['id', 'company_id', 'name', 'description', 'price', 'created_at'],
  coupons: [
    'id', 'companyId', 'title', 'description', 'discountValue', 'discountType', 'code',
    'expirationDate', 'isActive', 'totalLimit', 'usedCount', 'rules', 'createdAt'
  ],
  promotions: [
    'id', 'company_id', 'title', 'description', 'discount_percentage', 'start_date',
    'end_date', 'created_at'
  ],
  reviews: [
    'id', 'entityId', 'entityType', 'userId', 'userName', 'userAvatar', 'rating', 'comment',
    'createdAt'
  ],
  jobs: [
    'id', 'companyId', 'title', 'description', 'requirements', 'salary', 'type', 'isActive',
    'applicationsCount', 'createdAt'
  ],
  job_applications: [
    'id', 'jobId', 'userId', 'name', 'email', 'phone', 'coverLetter', 'resumeUrl', 'status',
    'createdAt'
  ],
  professionals: [
    'id', 'userId', 'name', 'slug', 'title', 'bio', 'avatar', 'categoryId', 'cityId', 'rating',
    'views', 'contactPhone', 'contactEmail', 'createdAt'
  ],
  portfolio_items: ['id', 'professional_id', 'title', 'description', 'image_url', 'createdAt'],
  blog_posts: [
    'id', 'title', 'slug', 'content', 'excerpt', 'coverImage', 'authorId', 'categoryId',
    'views', 'status', 'createdAt'
  ],
  blog_comments: ['id', 'postId', 'userId', 'userName', 'comment', 'createdAt'],
  events: ['id', 'title', 'slug', 'description', 'date', 'location', 'coverImage', 'createdAt'],
  tourism_places: [
    'id', 'title', 'slug', 'description', 'location', 'coverImage', 'rating', 'createdAt'
  ],
  route_guides: ['id', 'title', 'description', 'duration', 'distance', 'createdAt'],
  route_guide_steps: ['id', 'route_guide_id', 'title', 'description', 'stop_order'],
  solidarity_campaigns: [
    'id', 'title', 'slug', 'description', 'goalAmount', 'raisedAmount', 'organizer', 'endDate',
    'createdAt'
  ],
  campaign_comments: ['id', 'campaignId', 'userName', 'comment', 'createdAt'],
  plans: [
    'id', 'name', 'display_name', 'description', 'price', 'billing_cycle', 'version',
    'max_gallery_photos', 'max_products', 'max_coupons',
    'has_home_highlight', 'has_crm', 'has_full_presentation', 'has_analytics',
    'badge', 'button_text', 'sort_order', 'is_recommended', 'allow_new_subscriptions', 'trial_days',
    'is_active', 'features'
  ],
  admin_plan_grants: [
    'id', 'company_id', 'granted_plan', 'start_date', 'end_date', 'reason', 'status',
    'granted_by_user_id', 'granted_by_email', 'revoked_at', 'revoked_reason', 'created_at', 'updated_at'
  ],
  plan_audit_logs: [
    'id', 'plan_id', 'action', 'changed_by_user_id', 'changed_by_email', 'changes_json', 'ip_address', 'created_at'
  ],
  subscriptions: [
    'id', 'userId', 'companyId', 'planId', 'status', 'amount', 'paymentMethod',
    'payment_type', 'billing_period_days', 'plan_version', 'contracted_price',
    'nextBillingDate', 'createdAt'
  ],
  payment_logs: ['id', 'subscriptionId', 'amount', 'status', 'gateway_reference', 'createdAt'],
  crm_leads: ['id', 'company_id', 'name', 'email', 'phone', 'source', 'status', 'interest', 'notes', 'next_contact_at', 'createdAt'],
  support_tickets: ['id', 'userId', 'company_id', 'subject', 'message', 'status', 'createdAt'],
  company_analytics_events: ['id', 'company_id', 'event_type', 'source', 'device', 'created_at'],
  media_items: ['id', 'url', 'entityId', 'entityType', 'fileType', 'createdAt'],
  faq_items: ['id', 'entityId', 'question', 'answer', 'createdAt'],
  audit_logs: ['id', 'userId', 'userName', 'userEmail', 'action', 'details', 'ip', 'createdAt'],
  seo_settings: ['id', 'page', 'title', 'description', 'keywords', 'updatedAt'],
  general_config: [
    'id', 'platformName', 'tagline', 'logoMain', 'colorPrimary', 'phone', 'whatsapp',
    'emailSupport', 'facebook', 'instagram', 'updatedAt'
  ],
  payment_config: ['id', 'gateway', 'publicKey', 'accessToken', 'webhookUrl', 'updatedAt'],
  notifications: ['id', 'userId', 'title', 'message', 'isRead', 'createdAt']
};

/** Columns that must never reach a client response. */
const HIDDEN_COLUMNS: Record<string, string[]> = {
  users: ['password'],
  payment_config: ['accessToken']
};

/** Query-string keys that control pagination/sorting rather than filtering. */
const RESERVED_QUERY_KEYS = new Set([
  'limit', 'offset', 'page', 'pageSize', 'sort', 'order', 'orderBy', 'fields', 'columns', 'q', 'search'
]);

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 100;

export interface ListOptions {
  /** Public catalogue only: hide incomplete private checkout shells before pagination. */
  publicCompanies?: boolean;
  /** Filters forced by the service layer. Never client-controlled. */
  scope?: Record<string, any>;
  textSearch?: { columns: string[]; term: string };
}

export class BaseRepository {
  protected readonly allowedColumns: string[];

  constructor(protected tableName: string) {
    const columns = TABLE_COLUMNS[tableName];
    if (!columns) {
      throw new Error(`Tabela não registrada no whitelist: ${tableName}`);
    }
    this.allowedColumns = columns;
  }

  protected isAllowedColumn(name: unknown): name is string {
    return typeof name === 'string' && this.allowedColumns.includes(name);
  }

  protected sanitize(row: Record<string, any> | null): Record<string, any> | null {
    if (!row) return row;
    const hidden = HIDDEN_COLUMNS[this.tableName];
    if (!hidden) return row;
    const clone: Record<string, any> = { ...row };
    for (const column of hidden) delete clone[column];
    return clone;
  }

  protected sanitizeMany(rows: Record<string, any>[]): Record<string, any>[] {
    const hidden = HIDDEN_COLUMNS[this.tableName];
    if (!hidden) return rows;
    return rows.map(row => this.sanitize(row) as Record<string, any>);
  }

  /** Builds ORDER BY from client input using whitelisted identifiers only. */
  private buildOrderBy(filters: Record<string, any>): string {
    const requested = filters.orderBy ?? filters.sort;
    if (!this.isAllowedColumn(requested)) return '';
    const direction = String(filters.order ?? '').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    return ` ORDER BY \`${requested}\` ${direction}`;
  }

  /**
   * Bounded LIMIT/OFFSET. Values are inlined as validated integers because
   * MySQL prepared statements reject placeholders inside LIMIT.
   */
  private buildLimit(filters: Record<string, any>): string {
    const rawLimit = Number(filters.limit);
    const limit = Number.isInteger(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, MAX_LIMIT)
      : DEFAULT_LIMIT;

    const rawOffset = Number(filters.offset);
    const offset = Number.isInteger(rawOffset) && rawOffset > 0 ? rawOffset : 0;

    return offset > 0 ? ` LIMIT ${limit} OFFSET ${offset}` : ` LIMIT ${limit}`;
  }

  async findAll(filters: Record<string, any> = {}, options: ListOptions = {}) {
    let sql = `SELECT * FROM \`${this.tableName}\` WHERE 1=1`;
    const params: any[] = [];
    if (this.tableName === 'companies' && options.publicCompanies) {
      sql += " AND NOT (LEFT(id, 9) = 'checkout_' AND (categoryId IS NULL OR cityId IS NULL))";
    }

    // Server-enforced scope is applied first and cannot be overridden by input.
    for (const [key, value] of Object.entries(options.scope ?? {})) {
      if (!this.isAllowedColumn(key)) {
        throw new Error(`Coluna de escopo inválida: ${key}`);
      }
      sql += ` AND \`${key}\` = ?`;
      params.push(value);
    }

    const scopedKeys = new Set(Object.keys(options.scope ?? {}));

    for (const [key, value] of Object.entries(filters)) {
      if (RESERVED_QUERY_KEYS.has(key)) continue;
      if (scopedKeys.has(key)) continue;
      if (!this.isAllowedColumn(key)) continue;
      if (value === undefined || value === null || value === '') continue;
      if (typeof value === 'object') continue;

      sql += ` AND \`${key}\` = ?`;
      params.push(value);
    }

    if (options.textSearch?.term) {
      const columns = options.textSearch.columns.filter(column => this.isAllowedColumn(column));
      if (columns.length > 0) {
        // Accent-insensitive matching happens before LIMIT/OFFSET. Escape user
        // wildcards explicitly; MariaDB LOCATE does not honor accent folding.
        sql += ` AND (${columns.map(column =>
          `CONVERT(\`${column}\` USING utf8mb4) COLLATE utf8mb4_unicode_ci LIKE ? ESCAPE '='`
        ).join(' OR ')})`;
        const pattern = `%${options.textSearch.term.replace(/[=%_]/g, '=$&')}%`;
        params.push(...columns.map(() => pattern));
      }
    }

    sql += this.buildOrderBy(filters);
    sql += this.buildLimit(filters);

    const [rows]: any = await pool.query(sql, params);
    return this.sanitizeMany(rows);
  }

  async findById(id: string | number) {
    const [rows]: any = await pool.query(
      `SELECT * FROM \`${this.tableName}\` WHERE id = ? LIMIT 1`,
      [id]
    );
    return this.sanitize(rows[0] || null);
  }

  async findBySlug(slug: string) {
    if (!this.allowedColumns.includes('slug')) return null;
    const [rows]: any = await pool.query(
      `SELECT * FROM \`${this.tableName}\` WHERE slug = ? LIMIT 1`,
      [slug]
    );
    return this.sanitize(rows[0] || null);
  }

  /** Internal lookup that keeps hidden columns (auth needs the password hash). */
  async findRawBy(column: string, value: any) {
    if (!this.isAllowedColumn(column)) {
      throw new Error(`Coluna inválida: ${column}`);
    }
    const [rows]: any = await pool.query(
      `SELECT * FROM \`${this.tableName}\` WHERE \`${column}\` = ? LIMIT 1`,
      [value]
    );
    return rows[0] || null;
  }

  private physicalColumnsCache: Set<string> | null = null;

  async getPhysicalColumns(): Promise<Set<string>> {
    if (this.physicalColumnsCache) return this.physicalColumnsCache;
    try {
      const [rows]: any = await pool.query(`SHOW COLUMNS FROM \`${this.tableName}\``);
      this.physicalColumnsCache = new Set(rows.map((r: any) => r.Field));
      return this.physicalColumnsCache;
    } catch {
      return new Set(this.allowedColumns);
    }
  }

  clearPhysicalColumnsCache(): void {
    this.physicalColumnsCache = null;
  }

  /** Keeps only whitelisted columns from an untrusted payload. */
  protected pickWritable(data: Record<string, any>): Record<string, any> {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (!this.isAllowedColumn(key)) continue;
      clean[key] = (typeof value === 'object' && value !== null) ? JSON.stringify(value) : value;
    }
    return clean;
  }

  async create(data: Record<string, any>) {
    const clean = this.pickWritable(data);
    const physical = await this.getPhysicalColumns();
    for (const key of Object.keys(clean)) {
      if (!physical.has(key)) delete clean[key];
    }
    const keys = Object.keys(clean);
    if (keys.length === 0) {
      throw new Error('Nenhum campo válido informado.');
    }

    const columns = keys.map(k => `\`${k}\``).join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map(k => clean[k]);

    await pool.query(
      `INSERT INTO \`${this.tableName}\` (${columns}) VALUES (${placeholders})`,
      values
    );

    return clean.id !== undefined ? this.findById(clean.id) : this.sanitize(clean);
  }

  async update(id: string | number, data: Record<string, any>) {
    const clean = this.pickWritable(data);
    delete clean.id; // primary key is never client-mutable

    const physical = await this.getPhysicalColumns();
    for (const key of Object.keys(clean)) {
      if (!physical.has(key)) delete clean[key];
    }

    const keys = Object.keys(clean);
    if (keys.length === 0) return this.findById(id);

    const setClauses = keys.map(k => `\`${k}\` = ?`).join(', ');
    const values = keys.map(k => clean[k]);
    values.push(id);

    await pool.query(
      `UPDATE \`${this.tableName}\` SET ${setClauses} WHERE id = ?`,
      values
    );
    return this.findById(id);
  }

  async delete(id: string | number) {
    const [result]: any = await pool.query(
      `DELETE FROM \`${this.tableName}\` WHERE id = ?`,
      [id]
    );
    return result.affectedRows > 0;
  }

  /**
   * Column that ties rows of this table to a company, or null when the table
   * is not company-scoped. Used by the tenant-isolation middleware.
   */
  get companyColumn(): string | null {
    if (this.allowedColumns.includes('companyId')) return 'companyId';
    if (this.allowedColumns.includes('company_id')) return 'company_id';
    return null;
  }
}

// Generic repositories for the simple entities.
export const UserRepository = new BaseRepository('users');
export const CategoryRepository = new BaseRepository('categories');
export const CityRepository = new BaseRepository('cities');
export const DistrictRepository = new BaseRepository('districts');
export const ProductRepository = new BaseRepository('products');
export const ServiceRepository = new BaseRepository('services');
export const CouponRepository = new BaseRepository('coupons');
export const ReviewRepository = new BaseRepository('reviews');
export const JobRepository = new BaseRepository('jobs');
export const JobApplicationRepository = new BaseRepository('job_applications');
export const ProfessionalRepository = new BaseRepository('professionals');
export const BlogPostRepository = new BaseRepository('blog_posts');
export const BlogCommentRepository = new BaseRepository('blog_comments');
export const EventRepository = new BaseRepository('events');
export const TourismPlaceRepository = new BaseRepository('tourism_places');
export const SolidarityCampaignRepository = new BaseRepository('solidarity_campaigns');
export const CampaignCommentRepository = new BaseRepository('campaign_comments');
export const PlanRepository = new BaseRepository('plans');
export const SubscriptionRepository = new BaseRepository('subscriptions');
export const PaymentLogRepository = new BaseRepository('payment_logs');
export const CrmLeadRepository = new BaseRepository('crm_leads');
export const SupportTicketRepository = new BaseRepository('support_tickets');
export const MediaItemRepository = new BaseRepository('media_items');
export const CompanyAnalyticsEventRepository = new BaseRepository('company_analytics_events');
export const AuditLogRepository = new BaseRepository('audit_logs');
export const GeneralConfigRepository = new BaseRepository('general_config');
export const PaymentConfigRepository = new BaseRepository('payment_config');
export const NotificationRepository = new BaseRepository('notifications');
export const AdminPlanGrantRepository = new BaseRepository('admin_plan_grants');
export const PlanAuditLogRepository = new BaseRepository('plan_audit_logs');
