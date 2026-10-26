/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Domain Type Definitions - Guia Comercial SaaS Multiempresa
 */

export type UserRole = 'admin_master' | 'advertiser' | 'user' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
  city?: string;
  createdAt: string;
}

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  phone?: string;
  city?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface City {
  id: string;
  name: string;
  state: string;
  slug: string;
}

export interface Neighborhood {
  id: string;
  cityId: string;
  name: string;
  slug: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  color: string;
}

export interface GalleryImage {
  id: string;
  url: string;
  caption?: string;
}

export type PlanLevel = 'bronze' | 'prata' | 'ouro' | 'diamond' | 'gold_vip' | 'diamond_extremo';

export interface Company {
  id: string;
  ownerId?: string;
  name: string;
  slug: string;
  logo: string;
  coverImage: string;
  categoryId: string;
  cityId: string;
  neighborhoodId?: string;
  description: string;
  detailedDescription?: string;
  rating: number;
  reviewCount: number;
  phone: string;
  whatsapp: string;
  instagram?: string;
  profileDetails?: string;
  facebook?: string;
  tiktok?: string;
  website?: string;
  hours: string;
  address: string;
  latitude: number;
  longitude: number;
  isSponsored: boolean;
  planLevel: PlanLevel;
  access_grant_type?: 'bronze' | 'trial' | 'paid' | 'admin_grant';
  trial_ends_at?: string | null;
  features: string[];
  gallery?: string[];
  photos?: string[];
  products: ProductOrService[];
  faqs: FAQItem[];
  views: number;
  clicksWhatsapp: number;
  clicksPhone?: number;
  clicksRoutes?: number;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductOrService {
  id: string;
  companyId?: string;
  type?: 'product' | 'service';
  name: string;
  description: string;
  price?: number;
  imageUrl?: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface Professional {
  id: string;
  ownerId?: string;
  name: string;
  slug: string;
  photoUrl: string;
  title: string;
  bio: string;
  cityId: string;
  categoryId: string;
  skills: string[];
  rating: number;
  reviewCount: number;
  whatsapp: string;
  instagram?: string;
  website?: string;
  portfolio: PortfolioItem[];
  availableHours?: string[];
  pricing?: string;
  views: number;
  isVip: boolean;
  createdAt: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  imageUrl: string;
  description: string;
}

export interface Job {
  id: string;
  companyId: string;
  companyName: string;
  companyLogo: string;
  cityId: string;
  title: string;
  type: 'full_time' | 'part_time' | 'remote' | 'freelance';
  salary?: string;
  description: string;
  requirements: string[];
  benefits: string[];
  isActive: boolean;
  views: number;
  applicationsCount: number;
  createdAt: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  name: string;
  email: string;
  phone: string;
  resumeUrl?: string;
  coverLetter?: string;
  status: 'pending' | 'reviewed' | 'interview' | 'hired' | 'rejected';
  createdAt: string;
}

export interface Review {
  id: string;
  entityId: string;
  entityType: 'company' | 'professional';
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  reply?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'advertiser' | 'ai';
  text: string;
  createdAt: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  category: string;
  authorName?: string;
  views: number;
  tags?: string[];
  comments: BlogComment[];
  createdAt: string;
  // Campos de SEO e Mídias Sociais
  metaTitle?: string;
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  imageAlt?: string;
  imageFilename?: string;
  canonicalUrl?: string;
  suggestedKeywords?: string[];
  internalLinks?: string[];
  externalLinks?: string[];
  readingTimeMinutes?: number;
  schemaJson?: string;
}

export interface BlogComment {
  id: string;
  userName: string;
  comment: string;
  createdAt: string;
}

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'expired';
export type PaymentMethodType = 'stripe' | 'pix' | 'mercado_pago';

export interface Subscription {
  id: string;
  userId: string;
  companyId?: string;
  planLevel: PlanLevel;
  status: SubscriptionStatus;
  paymentMethod: PaymentMethodType;
  amount: number;
  currentPeriodStart?: string;
  nextBillingDate: string;
  createdAt: string;
}

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  position: 'home_hero' | 'sidebar' | 'footer_banner';
  isActive: boolean;
  clicks: number;
}

export interface SeoSettings {
  titleTemplate: string;
  metaDescription: string;
  ogType: string;
  ogImage: string;
  robotsTxt: string;
}

export interface Notification {
  id: string;
  userId: string;
  companyId?: string;
  title: string;
  message: string;
  isRead: boolean;
  type?: 'info' | 'success' | 'warning' | 'error';
  createdAt: string;
}

export interface CampaignComment {
  id: string;
  userName: string;
  comment: string;
  createdAt: string;
}

export interface SolidarityCampaign {
  id: string;
  title: string;
  slug: string;
  description: string;
  detailedDescription?: string;
  meta: string;
  contact: string;
  pix: string;
  bgColor: string;
  textColor: string;
  badgeColor: string;
  imageUrl: string;
  category: string;
  deadline: string;
  responsible: string;
  gallery: string[];
  bankTransfer?: string;
  address?: string;
  supportingCompanies?: string[];
  comments?: CampaignComment[];
}

export interface Plan {
  id: string;
  name: string;
  slug?: string;
  priceMonthly: number;
  priceYearly: number;
  discount: number;
  durationDays: number;
  maxImages: number;
  maxVideos: number;
  maxProducts?: number;
  maxJobs: number;
  maxCampaigns: number;
  maxAds?: number;
  priority: number;
  badgePremium: boolean;
  badgeDiamond: boolean;
  statsEnabled: boolean;
  chatEnabled: boolean;
  crmEnabled: boolean;
  seoEnabled: boolean;
  isPopular?: boolean;
}

export interface PaymentConfig {
  pixKey: string;
  pixQrCode: string;
  pixBank: string;
  cardsAccepted: string[];
  installmentsMax: number;
  enableBoleto: boolean;
  enableRecurring: boolean;
  autoRenewal: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  ip: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  description: string;
  category: 'payment' | 'announcement' | 'technical' | 'other';
  status: 'open' | 'pending' | 'resolved' | 'closed';
  messages: {
    id: string;
    senderName: string;
    senderRole: 'user' | 'admin';
    text: string;
    createdAt: string;
  }[];
  createdAt: string;
}

export type CrmLeadStatus = 'new' | 'contacted' | 'proposal' | 'negotiation' | 'won' | 'lost';

export interface CrmLead {
  id: string;
  companyId?: string;
  ownerId?: string;
  name: string;
  companyName?: string;
  email: string;
  phone: string;
  status: CrmLeadStatus;
  value: number;
  notes?: string;
  createdAt: string;
}

export interface Coupon {
  id: string;
  companyId?: string;
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses?: number;
  currentUses?: number;
  expiryDate: string;
  isActive: boolean;
}

export interface Promotion {
  id: string;
  companyId: string;
  companyName?: string;
  companyLogo?: string;
  title: string;
  slug: string;
  description: string;
  bannerUrl?: string;
  imageUrl?: string;
  startDate: string;
  endDate?: string;
  ctaText?: string;
  ctaUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export type EventCategory = 'shows' | 'feiras' | 'festivais' | 'praias' | 'religiosos' | 'esportivos';

export interface EventItem {
  id: string;
  companyId?: string;
  title: string;
  slug: string;
  description: string;
  category: EventCategory;
  bannerUrl: string;
  location: string;
  latitude?: number;
  longitude?: number;
  startDate: string;
  endDate?: string;
  ticketUrl?: string;
  isFeatured: boolean;
  createdAt: string;
}

export type TourismCategory = 'onde_comer' | 'onde_dormir' | 'onde_passear' | 'praias' | 'trilhas' | 'campings' | 'mirantes' | 'pesca' | 'surf' | 'pontos_turisticos';

export interface TouristSpot {
  id: string;
  name: string;
  slug: string;
  category: TourismCategory;
  description: string;
  detailedDescription?: string;
  imageUrl: string;
  gallery: string[];
  address?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
}

export interface RouteGuideStep {
  title: string;
  description: string;
  time?: string;
  location?: string;
}

export interface RouteGuide {
  id: string;
  title: string;
  slug: string;
  duration: '1_day' | '2_days' | 'weekend';
  profile: 'family' | 'couple' | 'pet_friendly' | 'budget' | 'luxury';
  description: string;
  steps: RouteGuideStep[];
  imageUrl: string;
  createdAt: string;
}

export interface GeneralConfig {
  portalName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  supportEmail: string;
  supportPhone: string;
  supportWhatsapp: string;
  socialFacebook?: string;
  socialInstagram?: string;
  socialYoutube?: string;
  smtpServer?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  pixKey?: string;
}

export interface MediaItem {
  id: string;
  companyId?: string;
  ownerId?: string;
  name: string;
  url: string;
  category: string;
  folder: string;
  size: number;
  width: number;
  height: number;
  format: string;
  isFavorite: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
}
