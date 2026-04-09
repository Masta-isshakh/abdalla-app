export type AppRole = 'guest' | 'customer' | 'company' | 'admin';

export type PaymentMethod = 'card' | 'cash' | 'applePay';

export type BookingStatus = 'pending' | 'approved' | 'scheduled' | 'enRoute' | 'inProgress' | 'completed' | 'cancelled';

export type ItemKind = 'service' | 'product';

export type LoyaltyScope = 'admin' | 'company';

export interface AuthUser {
  userId: string;
  email: string;
  fullName: string;
}

export interface SignUpPayload {
  fullName: string;
  email: string;
  password: string;
  phone: string;
}

export interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
  preferredLanguage: 'en' | 'ar';
  defaultPaymentMethod: PaymentMethod;
}

export interface Address {
  id: string;
  label: string;
  area: string;
  street: string;
  building: string;
  unitNumber: string;
  instructions: string;
  contactName: string;
  contactPhone: string;
  isDefault: boolean;
}

export interface AppUserRecord {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: Exclude<AppRole, 'guest'>;
  companyId?: string;
  companyName?: string;
  invitedByEmail?: string;
  status: 'active' | 'invited' | 'disabled';
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  description: string;
  supportEmail: string;
  supportPhone: string;
  accentColor: string;
  logoText: string;
  ownerEmail: string;
  isActive: boolean;
  createdAtLabel: string;
}

export interface CompanyInvitation {
  id: string;
  companyId: string;
  companyName: string;
  email: string;
  invitedByEmail: string;
  status: 'pending' | 'accepted' | 'revoked';
  message: string;
  emailDeliveryStatus: 'pending' | 'sent' | 'failed';
  emailDeliveryError?: string;
  emailSentAtLabel?: string;
}

export interface CatalogItem {
  id: string;
  companyId: string;
  companyName: string;
  kind: ItemKind;
  title: string;
  summary: string;
  description: string;
  category: string;
  price: number;
  durationLabel: string;
  isPublished: boolean;
  featured: boolean;
  tags: string[];
  loyaltyPoints: number;
  imageHint: string;
}

export interface OfferPromotion {
  id: string;
  companyId: string;
  companyName: string;
  catalogItemId: string;
  catalogItemTitle: string;
  title: string;
  headline: string;
  badgeText: string;
  discountLabel: string;
  startsAtLabel: string;
  endsAtLabel: string;
  isActive: boolean;
  sortOrder: number;
}

export interface LoyaltyProgram {
  id: string;
  scope: LoyaltyScope;
  companyId?: string;
  title: string;
  description: string;
  pointsPerBooking: number;
  rewardText: string;
  tierRules: string[];
  isActive: boolean;
}

export interface Rating {
  id: string;
  bookingId: string;
  companyId: string;
  itemId: string;
  customerEmail: string;
  score: number;
  review: string;
  createdAtLabel: string;
}

export interface BookingTimelineItem {
  id: string;
  title: string;
  time: string;
  done: boolean;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  customerEmail: string;
  customerName: string;
  companyId: string;
  companyName: string;
  itemId: string;
  itemTitle: string;
  kind: ItemKind;
  scheduleDate: string;
  scheduleTime: string;
  addressLabel: string;
  addressLine: string;
  paymentMethod: PaymentMethod;
  notes: string;
  status: BookingStatus;
  subtotal: number;
  serviceFee: number;
  discount: number;
  total: number;
  loyaltyPointsEarned: number;
  ratingSubmitted: boolean;
  timeline: BookingTimelineItem[];
}

export interface BookingDraft {
  itemId: string;
  companyId: string;
  scheduleDate: string;
  scheduleTime: string;
  addressId: string;
  notes: string;
  paymentMethod: PaymentMethod;
}

export interface CompanyDraft {
  name: string;
  description: string;
  supportEmail: string;
  supportPhone: string;
  accentColor: string;
  logoText: string;
}

export interface InvitationDraft {
  companyName: string;
  email: string;
  message: string;
}

export interface CatalogItemDraft {
  id?: string;
  kind: ItemKind;
  title: string;
  summary: string;
  description: string;
  category: string;
  price: number;
  durationLabel: string;
  isPublished: boolean;
  featured: boolean;
  tags: string[];
  loyaltyPoints: number;
  imageHint: string;
}

export interface OfferPromotionDraft {
  id?: string;
  catalogItemId: string;
  title: string;
  headline: string;
  badgeText: string;
  discountLabel: string;
  startsAtLabel: string;
  endsAtLabel: string;
  isActive: boolean;
  sortOrder: number;
}

export interface LoyaltyProgramDraft {
  title: string;
  description: string;
  pointsPerBooking: number;
  rewardText: string;
  tierRules: string[];
  isActive: boolean;
}

export interface MarketplaceMetric {
  label: string;
  value: string;
}
