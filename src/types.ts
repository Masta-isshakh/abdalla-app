export type ServiceCategoryKey = 'cleaning' | 'laundry' | 'carwash' | 'homecare';

export type PaymentMethod = 'card' | 'cash' | 'applePay';

export type BookingStage = 'confirmed' | 'assigned' | 'enRoute' | 'inProgress' | 'completed';

export interface ServiceExtra {
  id: string;
  title: string;
  price: number;
}

export interface ServicePackage {
  id: string;
  title: string;
  subtitle: string;
  duration: string;
  price: number;
  features: string[];
}

export interface ServiceCategory {
  key: ServiceCategoryKey;
  title: string;
  subtitle: string;
  shortDescription: string;
  accent: string;
  background: string;
  icon: string;
  heroMetric: string;
  benefits: string[];
  packages: ServicePackage[];
  extras: ServiceExtra[];
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  code: string;
}

export interface Testimonial {
  id: string;
  quote: string;
  name: string;
  service: string;
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

export interface BookingTimelineItem {
  id: string;
  title: string;
  time: string;
  done: boolean;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  serviceKey: ServiceCategoryKey;
  serviceTitle: string;
  packageTitle: string;
  dateLabel: string;
  timeLabel: string;
  recurrence: string;
  addressLabel: string;
  addressLine: string;
  paymentMethod: PaymentMethod;
  notes: string;
  subtotal: number;
  serviceFee: number;
  discount: number;
  total: number;
  status: BookingStage;
  extras: string[];
  timeline: BookingTimelineItem[];
}

export interface BookingDraft {
  serviceKey: ServiceCategoryKey;
  serviceTitle: string;
  packageTitle: string;
  dateLabel: string;
  timeLabel: string;
  recurrence: string;
  addressId: string;
  notes: string;
  paymentMethod: PaymentMethod;
  extras: string[];
  subtotal: number;
  serviceFee: number;
  discount: number;
  total: number;
}

export interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
  preferredLanguage: 'en' | 'ar';
  defaultPaymentMethod: PaymentMethod;
}

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
