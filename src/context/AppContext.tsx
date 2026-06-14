import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  confirmSignIn,
  confirmSignUp,
  fetchAuthSession,
  fetchUserAttributes,
  getCurrentUser,
  signIn,
  signOut,
  signUp,
} from 'aws-amplify/auth';

import { dataClient } from '../lib/amplify';
import {
  Address,
  AvailabilitySlot,
  AvailabilitySlotDraft,
  AppCategorySetting,
  AppNotification,
  AppRole,
  AppUserRecord,
  AuditEvent,
  AuditEventDraft,
  AuthUser,
  Booking,
  BookingDraft,
  BookingStatus,
  CatalogApprovalStatus,
  CatalogItem,
  CatalogItemDraft,
  Company,
  CompanyDraft,
  CompanyInvitation,
  InvitationDraft,
  LoyaltyProgram,
  LoyaltyProgramDraft,
  NotificationDraft,
  OfferPromotion,
  OfferPromotionDraft,
  SignUpPayload,
  UserProfile,
  SupportRequest,
  SupportRequestDraft,
} from '../app-types';

const STORAGE_KEY = 'jahzeen-platform-state-v5';
const MANUAL_ADMIN_EMAILS = ['owner@jahzeen.app', 'admin@jahzeen.app'];
const APP_DEFAULT_COMPANY_CATEGORY = 'Home Cleaning';
const CUSTOM_MUTATION_DOCUMENTS: Record<string, string> = {
  sendCompanyInvitationEmail: `
    mutation SendCompanyInvitationEmail(
      $companyName: String!
      $inviteeEmail: String!
      $invitedByEmail: String!
      $message: String
    ) {
      sendCompanyInvitationEmail(
        companyName: $companyName
        inviteeEmail: $inviteeEmail
        invitedByEmail: $invitedByEmail
        message: $message
      ) {
        success
        message
        sentAtLabel
      }
    }
  `,
};

function isUsefulErrorMessage(message: unknown): message is string {
  return typeof message === 'string' && !!message.trim() && !/^an unknown error has occurred\.?$/i.test(message.trim());
}

function toErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Mutation failed.';
  }

  const candidate = error as {
    message?: unknown;
    errorMessage?: unknown;
    code?: unknown;
    name?: unknown;
    errors?: Array<{ message?: unknown }>;
    cause?: unknown;
    originalError?: unknown;
    recoverySuggestion?: unknown;
    underlyingError?: unknown;
  };

  const graphQlMessages = Array.isArray(candidate.errors)
    ? candidate.errors
        .map((entry) => (typeof entry?.message === 'string' ? entry.message : ''))
        .filter(Boolean)
    : [];

  if (graphQlMessages.length) {
    return graphQlMessages.join(' | ');
  }

  if (isUsefulErrorMessage(candidate.message)) {
    return candidate.message;
  }

  if (isUsefulErrorMessage(candidate.errorMessage)) {
    return candidate.errorMessage;
  }

  const nestedMessage = [candidate.cause, candidate.originalError, candidate.underlyingError]
    .map((entry) => toErrorMessage(entry))
    .find((entry) => entry && entry !== 'Mutation failed.');

  if (nestedMessage) {
    return nestedMessage;
  }

  if (typeof candidate.message === 'string' && candidate.message.trim()) {
    return candidate.message;
  }

  if (isUsefulErrorMessage(candidate.recoverySuggestion)) {
    return candidate.recoverySuggestion;
  }

  if (isUsefulErrorMessage(candidate.code)) {
    return String(candidate.code);
  }

  if (isUsefulErrorMessage(candidate.name)) {
    return String(candidate.name);
  }

  try {
    return JSON.stringify(error);
  } catch {
    return 'Mutation failed.';
  }
}

const starterProfile: UserProfile = {
  fullName: 'Guest Customer',
  email: '',
  phone: '',
  preferredLanguage: 'en',
  defaultPaymentMethod: 'card',
};

const starterAddress: Address = {
  id: 'address-1',
  label: 'Home',
  area: '',
  street: '',
  building: '',
  unitNumber: '',
  instructions: '',
  contactName: 'Guest Customer',
  contactPhone: '',
  isDefault: true,
};

type PersistedState = {
  profile: UserProfile;
  addresses: Address[];
  users: AppUserRecord[];
  companies: Company[];
  appCategorySettings: AppCategorySetting[];
  invitations: CompanyInvitation[];
  supportRequests: SupportRequest[];
  catalogItems: CatalogItem[];
  offerPromotions: OfferPromotion[];
  notifications: AppNotification[];
  auditEvents: AuditEvent[];
  bookings: Booking[];
  availabilitySlots: AvailabilitySlot[];
  ratings: Array<{ id: string; bookingId: string; companyId: string; itemId: string; customerEmail: string; score: number; review: string; createdAtLabel: string }>;
  loyaltyPrograms: LoyaltyProgram[];
};

interface AppContextValue {
  initialized: boolean;
  busy: boolean;
  authUser: AuthUser | null;
  authMessage: string;
  needsConfirmation: boolean;
  signInChallenge: 'none' | 'newPasswordRequired';
  requiredSignInAttributes: string[];
  activeRole: AppRole;
  profile: UserProfile;
  addresses: Address[];
  users: AppUserRecord[];
  companies: Company[];
  appCategorySettings: AppCategorySetting[];
  invitations: CompanyInvitation[];
  supportRequests: SupportRequest[];
  catalogItems: CatalogItem[];
  offerPromotions: OfferPromotion[];
  notifications: AppNotification[];
  auditEvents: AuditEvent[];
  bookings: Booking[];
  availabilitySlots: AvailabilitySlot[];
  ratings: PersistedState['ratings'];
  loyaltyPrograms: LoyaltyProgram[];
  currentUserRecord: AppUserRecord | null;
  currentCompany: Company | null;
  marketplaceItems: CatalogItem[];
  refreshCurrentAuthUser: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  completeNewPassword: (newPassword: string, attributes?: Record<string, string>) => Promise<void>;
  signUpWithEmail: (payload: SignUpPayload) => Promise<void>;
  confirmEmailCode: (code: string) => Promise<void>;
  signOutCurrentUser: () => Promise<void>;
  saveProfile: (nextProfile: UserProfile) => Promise<void>;
  saveAddress: (address: Omit<Address, 'id'> & { id?: string }) => Promise<void>;
  createCompany: (draft: CompanyDraft) => Promise<Company>;
  updateCompany: (companyId: string, draft: CompanyDraft) => Promise<void>;
  setCompanyActive: (companyId: string, isActive: boolean) => Promise<void>;
  deleteCompany: (companyId: string) => Promise<void>;
  inviteCompany: (draft: InvitationDraft) => Promise<void>;
  resendCompanyInvitation: (invitationId: string) => Promise<void>;
  revokeInvitation: (invitationId: string) => Promise<void>;
  saveCatalogItem: (companyId: string, draft: CatalogItemDraft) => Promise<void>;
  reviewCatalogItem: (itemId: string, decision: 'approved' | 'rejected') => Promise<void>;
  deleteCatalogItem: (itemId: string) => Promise<void>;
  saveOfferPromotion: (companyId: string, draft: OfferPromotionDraft) => Promise<void>;
  reviewOfferPromotion: (promotionId: string, decision: 'approved' | 'rejected') => Promise<void>;
  deleteOfferPromotion: (promotionId: string) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  submitSupportRequest: (draft: SupportRequestDraft) => Promise<void>;
  saveLoyaltyProgram: (scope: 'admin' | 'company', companyId: string | undefined, draft: LoyaltyProgramDraft) => Promise<void>;
  saveCategorySetting: (category: string, isComingSoon: boolean) => Promise<void>;
  saveAvailabilitySlot: (companyId: string, draft: AvailabilitySlotDraft) => Promise<void>;
  deleteAvailabilitySlot: (slotId: string) => Promise<void>;
  placeBooking: (draft: BookingDraft) => Promise<Booking>;
  changeBookingStatus: (bookingId: string, status: BookingStatus) => Promise<void>;
  submitRating: (bookingId: string, score: number, review: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function normalizeText(value?: string) {
  return (value ?? '').trim().toLowerCase();
}

function isLikelyEmail(value: string) {
  return value.includes('@');
}

function normalizePhoneNumber(value: string) {
  const compact = value.trim().replace(/[\s\-()]/g, '');
  if (!compact) {
    return '';
  }

  if (/^\+\d{8,15}$/.test(compact)) {
    return compact;
  }

  const digits = compact.replace(/\D/g, '');
  if (digits.length === 8) {
    return `+974${digits}`;
  }

  if (digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`;
  }

  return '';
}

function formatAddress(address: Address) {
  return [address.area, address.street, address.building, address.unitNumber].filter(Boolean).join(', ');
}

function companyMatchesEmail(company: Pick<Company, 'ownerEmail' | 'supportEmail'>, email: string) {
  const normalizedEmail = normalizeText(email);
  return normalizeText(company.ownerEmail) === normalizedEmail || normalizeText(company.supportEmail) === normalizedEmail;
}

function displayNameFromEmail(email: string) {
  const localPart = email.split('@')[0] || 'Company';
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Company';
}

function toCompanyRecord(entry: any): Company {
  const name = entry.name ?? displayNameFromEmail(entry.supportEmail ?? entry.ownerEmail ?? 'company@jahzeen.app');

  return {
    id: entry.id,
    name,
    slug: entry.slug ?? slugify(name),
    description: entry.description ?? 'Partner workspace',
    category: entry.category ?? APP_DEFAULT_COMPANY_CATEGORY,
    supportEmail: entry.supportEmail ?? entry.ownerEmail ?? '',
    supportPhone: entry.supportPhone ?? '',
    accentColor: entry.accentColor ?? '#0F7B45',
    logoText: entry.logoText ?? name.slice(0, 2).toUpperCase(),
    profileImageUrl: entry.profileImageUrl ?? '',
    ownerEmail: entry.ownerEmail ?? entry.supportEmail ?? '',
    isActive: !!entry.isActive,
    createdAtLabel: entry.createdAtLabel ?? nowLabel(),
  };
}

function nowLabel() {
  return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function serializeState(state: PersistedState) {
  return JSON.stringify(state);
}

function parseList(raw?: string) {
  if (!raw) {
    return [] as string[];
  }

  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [] as string[];
  }
}

function parseTimeline(raw?: string) {
  if (!raw) {
    return [] as Booking['timeline'];
  }

  try {
    return JSON.parse(raw) as Booking['timeline'];
  } catch {
    return [] as Booking['timeline'];
  }
}

export function readableBookingStatus(status: BookingStatus) {
  if (status === 'enRoute') return 'On the way';
  if (status === 'inProgress') return 'In progress';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authGroups, setAuthGroups] = useState<string[]>([]);
  const [authMessage, setAuthMessage] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [signInChallenge, setSignInChallenge] = useState<'none' | 'newPasswordRequired'>('none');
  const [requiredSignInAttributes, setRequiredSignInAttributes] = useState<string[]>([]);
  const [pendingEmail, setPendingEmail] = useState('');
  const [profile, setProfile] = useState<UserProfile>(starterProfile);
  const [addresses, setAddresses] = useState<Address[]>([starterAddress]);
  const [users, setUsers] = useState<AppUserRecord[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [appCategorySettings, setAppCategorySettings] = useState<AppCategorySetting[]>([]);
  const [invitations, setInvitations] = useState<CompanyInvitation[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [offerPromotions, setOfferPromotions] = useState<OfferPromotion[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [ratings, setRatings] = useState<PersistedState['ratings']>([]);
  const [loyaltyPrograms, setLoyaltyPrograms] = useState<LoyaltyProgram[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && !cancelled) {
          const parsed = JSON.parse(stored) as PersistedState;
          setProfile(parsed.profile ?? starterProfile);
          setAddresses(parsed.addresses?.length ? parsed.addresses : [starterAddress]);
          setUsers(parsed.users ?? []);
          setCompanies((parsed.companies ?? []).map((entry) => ({
            ...entry,
            category: entry.category ?? APP_DEFAULT_COMPANY_CATEGORY,
            profileImageUrl: entry.profileImageUrl ?? '',
          })));
          setAppCategorySettings((parsed as PersistedState & { appCategorySettings?: AppCategorySetting[] }).appCategorySettings ?? []);
          setInvitations(parsed.invitations ?? []);
          setSupportRequests((parsed as PersistedState & { supportRequests?: SupportRequest[] }).supportRequests ?? []);
          setCatalogItems(
            (parsed.catalogItems ?? []).map((entry) => ({
              ...entry,
              approvalStatus: entry.approvalStatus ?? (entry.isPublished ? 'approved' : 'draft'),
            })),
          );
          setOfferPromotions(parsed.offerPromotions ?? []);
          setNotifications(parsed.notifications ?? []);
          setAuditEvents(parsed.auditEvents ?? []);
          setBookings(parsed.bookings ?? []);
          setAvailabilitySlots((parsed as PersistedState & { availabilitySlots?: AvailabilitySlot[] }).availabilitySlots ?? []);
          setRatings(parsed.ratings ?? []);
          setLoyaltyPrograms(parsed.loyaltyPrograms ?? []);
        }

        await refreshAuthUser();
        await syncCloudRecords();
      } finally {
        if (!cancelled) {
          setInitialized(true);
        }
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    AsyncStorage.setItem(
      STORAGE_KEY,
      serializeState({
        profile,
        addresses,
        users,
        companies,
        appCategorySettings,
        invitations,
        supportRequests,
        catalogItems,
        offerPromotions,
        notifications,
        auditEvents,
        bookings,
        availabilitySlots,
        ratings,
        loyaltyPrograms,
      }),
    ).catch(() => {
      // Ignore persistence errors.
    });
  }, [initialized, profile, addresses, users, companies, appCategorySettings, invitations, supportRequests, catalogItems, offerPromotions, notifications, auditEvents, bookings, availabilitySlots, ratings, loyaltyPrograms]);

  const currentUserRecord = useMemo(() => {
    if (!authUser) {
      return null;
    }

    return users.find((entry) => entry.email.toLowerCase() === authUser.email.toLowerCase()) ?? null;
  }, [authUser, users]);

  const activeRole: AppRole = useMemo(() => {
    if (!authUser) {
      return 'guest';
    }

    const normalizedEmail = authUser.email.toLowerCase();

    if (authGroups.includes('admin') || MANUAL_ADMIN_EMAILS.includes(normalizedEmail)) {
      return 'admin';
    }

    if (authGroups.includes('company')) {
      return 'company';
    }

    if (authGroups.includes('customer')) {
      return 'customer';
    }

    return currentUserRecord?.role ?? 'customer';
  }, [authGroups, authUser, currentUserRecord]);

  const currentCompany = useMemo(() => {
    if (!currentUserRecord?.companyId) {
      const normalizedEmail = authUser?.email.toLowerCase() ?? '';
      if (normalizedEmail && authGroups.includes('company')) {
        return companies.find((entry) => companyMatchesEmail(entry, normalizedEmail)) ?? null;
      }

      return null;
    }
    return companies.find((entry) => entry.id === currentUserRecord.companyId) ?? null;
  }, [authGroups, authUser, companies, currentUserRecord]);

  const marketplaceItems = useMemo(
    () => catalogItems.filter((item) => item.isPublished && item.approvalStatus === 'approved' && companies.find((entry) => entry.id === item.companyId)?.isActive),
    [catalogItems, companies],
  );

  async function safeList(modelName: string) {
    try {
      const result = await (dataClient.models as any)?.[modelName]?.list?.();
      return result?.data ?? [];
    } catch {
      return [];
    }
  }

  async function safeCreate(modelName: string, payload: object) {
    try {
      await (dataClient.models as any)?.[modelName]?.create?.(payload);
    } catch {
      // Local-first fallback.
    }
  }

  async function safeUpdate(modelName: string, payload: object) {
    try {
      await (dataClient.models as any)?.[modelName]?.update?.(payload);
    } catch {
      // Local-first fallback.
    }
  }

  async function safeDelete(modelName: string, id: string) {
    try {
      await (dataClient.models as any)?.[modelName]?.delete?.({ id });
    } catch {
      // Local-first fallback.
    }
  }

  async function safeMutation(mutationName: string, argumentsInput: object) {
    try {
      const mutation = (dataClient.mutations as Record<string, ((input: object) => Promise<any>) | undefined> | undefined)?.[mutationName];
      let response: any;

      if (mutation) {
        response = await mutation(argumentsInput);
      } else {
        const query = CUSTOM_MUTATION_DOCUMENTS[mutationName];
        if (!query || typeof dataClient.graphql !== 'function') {
          throw new Error(`Mutation \"${mutationName}\" is not available in the configured Amplify client.`);
        }

        try {
          await fetchAuthSession({ forceRefresh: true });
        } catch {
          // Continue with the best available session state.
        }

        response = await dataClient.graphql({
          query,
          variables: argumentsInput,
          authMode: mutationName === 'sendCompanyInvitationEmail' ? 'userPool' : undefined,
        });
      }

      const errors = response?.errors as Array<{ message?: string }> | undefined;
      if (errors?.length) {
        throw new Error(errors.map((entry) => entry.message).filter(Boolean).join(' | ') || 'Mutation failed.');
      }

      const payload = response?.data;
      if (payload && typeof payload === 'object' && mutationName in payload) {
        return (payload as Record<string, unknown>)[mutationName] ?? null;
      }

      return payload ?? null;
    } catch (error) {
      throw new Error(toErrorMessage(error));
    }
  }

  async function dispatchInvitationEmail(invitation: CompanyInvitation) {
    const result = await safeMutation('sendCompanyInvitationEmail', {
      companyName: invitation.companyName,
      inviteeEmail: invitation.email,
      invitedByEmail: invitation.invitedByEmail,
      message: invitation.message,
    });

    const deliveryStatus = result?.success ? 'sent' : 'failed';
    const emailDeliveryError = result?.success ? undefined : result?.message ?? 'Email delivery failed.';
    const emailSentAtLabel = result?.success ? result?.sentAtLabel ?? nowLabel() : undefined;

    setInvitations((current) =>
      current.map((entry) =>
        entry.id === invitation.id
          ? {
              ...entry,
              emailDeliveryStatus: deliveryStatus,
              emailDeliveryError,
              emailSentAtLabel,
            }
          : entry,
      ),
    );

    await safeUpdate('CompanyInvitation', {
      id: invitation.id,
      emailDeliveryStatus: deliveryStatus,
      emailDeliveryError,
      emailSentAtLabel,
    });

    if (result?.success) {
      setAuthMessage(`Invitation email sent to ${invitation.email}.`);
      return;
    }

    const failureMessage = `Invitation saved, but email delivery failed: ${emailDeliveryError}`;
    setAuthMessage(failureMessage);
    throw new Error(emailDeliveryError);
  }

  async function createNotification(draft: NotificationDraft) {
    const notification: AppNotification = {
      id: `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      recipientRole: draft.recipientRole,
      recipientEmail: draft.recipientEmail,
      companyId: draft.companyId,
      title: draft.title,
      body: draft.body,
      kind: draft.kind,
      destinationTab: draft.destinationTab,
      isRead: draft.isRead ?? false,
      createdAtLabel: nowLabel(),
    };

    setNotifications((current) => [notification, ...current]);
    await safeCreate('AppNotification', { ...notification });
  }

  async function submitSupportRequest(draft: SupportRequestDraft) {
    const requestMessage = draft.message.trim();
    if (!requestMessage) {
      throw new Error('Message is required.');
    }

    const request: SupportRequest = {
      id: `support-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      requestType: draft.requestType,
      category: draft.category.trim() || (draft.requestType === 'contact' ? 'support' : 'general'),
      requesterName: draft.requesterName.trim() || profile.fullName || 'Guest Customer',
      requesterEmail: draft.requesterEmail.trim().toLowerCase() || authUser?.email?.toLowerCase() || profile.email.trim().toLowerCase(),
      requesterPhone: draft.requesterPhone.trim(),
      subject: draft.subject?.trim() || (draft.requestType === 'contact' ? 'Contact request' : 'Feedback submission'),
      message: requestMessage,
      status: 'new',
      createdAtLabel: nowLabel(),
    };

    setSupportRequests((current) => [request, ...current]);
    await safeCreate('SupportRequest', { ...request });
  }

  async function createAuditEvent(draft: AuditEventDraft) {
    const actorRole = draft.actorRole ?? (authUser ? (activeRole === 'guest' ? 'system' : activeRole) : 'system');
    const actorEmail = draft.actorEmail ?? authUser?.email ?? 'system@jahzeen.app';
    const event: AuditEvent = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      actorRole,
      actorEmail,
      entityType: draft.entityType,
      entityId: draft.entityId,
      companyId: draft.companyId,
      action: draft.action,
      status: draft.status,
      summary: draft.summary,
      metadata: draft.metadata ?? [],
      createdAtLabel: nowLabel(),
    };

    setAuditEvents((current) => [event, ...current].slice(0, 200));
    await safeCreate('AuditEvent', { ...event, metadata: JSON.stringify(event.metadata) });
  }

  function resolveRoleFromGroups(groups: string[], email: string, fallback: AppUserRecord['role'] = 'customer') {
    if (groups.includes('admin') || MANUAL_ADMIN_EMAILS.includes(email)) {
      return 'admin';
    }

    if (groups.includes('company')) {
      return 'company';
    }

    if (groups.includes('customer')) {
      return 'customer';
    }

    return fallback;
  }

  async function ensureCompanyWorkspaceForEmail(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const localCompany = companies.find((entry) => companyMatchesEmail(entry, normalizedEmail));

    if (localCompany) {
      return localCompany;
    }

    const remoteCompanies = await safeList('Company');
    const normalizedRemoteCompanies: Company[] = (remoteCompanies as any[]).map(toCompanyRecord);
    const remoteCompany = normalizedRemoteCompanies.find((entry) => companyMatchesEmail(entry, normalizedEmail));

    if (normalizedRemoteCompanies.length) {
      setCompanies((current) => {
        const currentIds = new Set(current.map((entry) => entry.id));
        const missingCompanies = normalizedRemoteCompanies.filter((entry) => !currentIds.has(entry.id));
        return missingCompanies.length ? [...missingCompanies, ...current] : current;
      });
    }

    if (remoteCompany) {
      return remoteCompany;
    }

    const fallbackName = `${displayNameFromEmail(normalizedEmail)} Workspace`;
    const fallbackCompany: Company = {
      id: `company-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: fallbackName,
      slug: slugify(fallbackName),
      description: 'Company workspace created for a manually provisioned Cognito company user.',
      category: APP_DEFAULT_COMPANY_CATEGORY,
      supportEmail: normalizedEmail,
      supportPhone: '',
      accentColor: '#0F7B45',
      logoText: fallbackName.slice(0, 2).toUpperCase(),
      profileImageUrl: '',
      ownerEmail: normalizedEmail,
      isActive: true,
      createdAtLabel: nowLabel(),
    };

    setCompanies((current) => [fallbackCompany, ...current]);
    await safeCreate('Company', { ...fallbackCompany });
    return fallbackCompany;
  }

  async function ensureUserRecord(nextAuthUser: AuthUser, groups: string[]) {
    const email = nextAuthUser.email.trim().toLowerCase();
    const existingUser = users.find((entry) => entry.email.toLowerCase() === email);
    const matchingInvitation = invitations.find((entry) => entry.email.toLowerCase() === email && entry.status === 'pending');
    const targetRole = resolveRoleFromGroups(groups, email, matchingInvitation ? 'company' : existingUser?.role ?? 'customer');
    let companyId = matchingInvitation?.companyId ?? existingUser?.companyId;
    let companyName = matchingInvitation?.companyName ?? existingUser?.companyName;
    let invitedByEmail = matchingInvitation?.invitedByEmail ?? existingUser?.invitedByEmail;

    if (targetRole === 'company' && !companyId) {
      const company = await ensureCompanyWorkspaceForEmail(email);
      companyId = company.id;
      companyName = company.name;
    }

    if (existingUser) {
      const shouldUpdateUser =
        matchingInvitation ||
        existingUser.status !== 'active' ||
        existingUser.fullName !== nextAuthUser.fullName ||
        existingUser.role !== targetRole ||
        existingUser.companyId !== companyId ||
        existingUser.companyName !== companyName ||
        existingUser.invitedByEmail !== invitedByEmail;

      if (shouldUpdateUser) {
        setUsers((current) =>
          current.map((entry) =>
            entry.id === existingUser.id
              ? {
                  ...entry,
                  fullName: nextAuthUser.fullName,
                  role: targetRole,
                  companyId,
                  companyName,
                  invitedByEmail,
                  status: 'active',
                }
              : entry,
          ),
        );
        await safeUpdate('AppUser', {
          id: existingUser.id,
          fullName: nextAuthUser.fullName,
          role: targetRole,
          companyId,
          companyName,
          invitedByEmail,
          status: 'active',
        });

        if (matchingInvitation) {
          setInvitations((current) => current.map((entry) => (entry.id === matchingInvitation.id ? { ...entry, status: 'accepted' } : entry)));
          setCompanies((current) => current.map((entry) => (entry.id === matchingInvitation.companyId ? { ...entry, ownerEmail: email } : entry)));
          await safeUpdate('CompanyInvitation', { id: matchingInvitation.id, status: 'accepted' });
          await safeUpdate('Company', { id: matchingInvitation.companyId, ownerEmail: email });
        }
      }

      return;
    }

    if (matchingInvitation) {
      setInvitations((current) => current.map((entry) => (entry.id === matchingInvitation.id ? { ...entry, status: 'accepted' } : entry)));
      setCompanies((current) => current.map((entry) => (entry.id === matchingInvitation.companyId ? { ...entry, ownerEmail: email } : entry)));
      await safeUpdate('CompanyInvitation', { id: matchingInvitation.id, status: 'accepted' });
      await safeUpdate('Company', { id: matchingInvitation.companyId, ownerEmail: email });
    }

    const newUser: AppUserRecord = {
      id: `user-${Date.now()}`,
      email,
      fullName: nextAuthUser.fullName,
      phone: profile.phone,
      role: targetRole,
      companyId,
      companyName,
      invitedByEmail,
      status: 'active',
    };

    setUsers((current) => [newUser, ...current]);
    await safeCreate('AppUser', { ...newUser });
  }

  async function refreshAuthUser() {
    try {
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession({ forceRefresh: true });
      const attributes = await fetchUserAttributes();
      const tokenGroups = session.tokens?.idToken?.payload?.['cognito:groups'];
      const nextGroups = Array.isArray(tokenGroups)
        ? tokenGroups
            .filter((entry): entry is string => typeof entry === 'string')
            .map((entry) => entry.trim().toLowerCase())
        : typeof tokenGroups === 'string'
          ? [tokenGroups.trim().toLowerCase()].filter(Boolean)
          : [];
      const nextAuthUser: AuthUser = {
        userId: currentUser.userId,
        email: attributes.email ?? '',
        fullName: attributes.name ?? attributes.email ?? 'Jahzeen user',
      };
      setAuthUser(nextAuthUser);
      setAuthGroups(nextGroups);
      setSignInChallenge('none');
      setRequiredSignInAttributes([]);
      setProfile((current: UserProfile) => ({ ...current, fullName: nextAuthUser.fullName || current.fullName, email: nextAuthUser.email || current.email }));
      await ensureUserRecord(nextAuthUser, nextGroups);
      setAuthMessage('');
    } catch {
      setAuthUser(null);
      setAuthGroups([]);
      setSignInChallenge('none');
      setRequiredSignInAttributes([]);
    }
  }

  async function syncCloudRecords() {
    try {
      const [remoteUsers, remoteCompanies, remoteCategorySettings, remoteInvitations, remoteSupportRequests, remoteItems, remotePromotions, remoteNotifications, remoteAuditEvents, remoteBookings, remoteSlots, remoteRatings, remotePrograms, remoteAddresses, remoteProfiles] = await Promise.all([
        safeList('AppUser'),
        safeList('Company'),
        safeList('AppCategorySetting'),
        safeList('CompanyInvitation'),
        safeList('SupportRequest'),
        safeList('CatalogItem'),
        safeList('OfferPromotion'),
        safeList('AppNotification'),
        safeList('AuditEvent'),
        safeList('Booking'),
        safeList('AvailabilitySlot'),
        safeList('Rating'),
        safeList('LoyaltyProgram'),
        safeList('Address'),
        safeList('UserProfile'),
      ]);

      if (remoteUsers.length) {
        setUsers(remoteUsers.map((entry: any) => ({ id: entry.id, email: entry.email, fullName: entry.fullName, phone: entry.phone ?? '', role: entry.role, companyId: entry.companyId ?? undefined, companyName: entry.companyName ?? undefined, invitedByEmail: entry.invitedByEmail ?? undefined, status: entry.status })));
      }
      if (remoteCompanies.length) {
        const normalizedRemoteCompanies: Company[] = (remoteCompanies as any[]).map(toCompanyRecord);
        setCompanies((current) => {
          const remoteIds = new Set(normalizedRemoteCompanies.map((entry) => entry.id));
          const localOnlyCompanies = current.filter((entry) => !remoteIds.has(entry.id));
          return [...normalizedRemoteCompanies, ...localOnlyCompanies];
        });
      }
      if (remoteCategorySettings.length) {
        setAppCategorySettings(remoteCategorySettings.map((entry: any) => ({ id: entry.id, category: entry.category, isComingSoon: !!entry.isComingSoon })));
      }
      if (remoteInvitations.length) {
        setInvitations(remoteInvitations.map((entry: any) => ({ id: entry.id, companyId: entry.companyId, companyName: entry.companyName, email: entry.email, invitedByEmail: entry.invitedByEmail, status: entry.status, message: entry.message ?? '', emailDeliveryStatus: entry.emailDeliveryStatus ?? 'pending', emailDeliveryError: entry.emailDeliveryError ?? undefined, emailSentAtLabel: entry.emailSentAtLabel ?? undefined })));
      }
      if (remoteSupportRequests.length) {
        setSupportRequests(remoteSupportRequests.map((entry: any) => ({
          id: entry.id,
          requestType: entry.requestType === 'feedback' ? 'feedback' : 'contact',
          category: entry.category ?? 'general',
          requesterName: entry.requesterName ?? 'Guest Customer',
          requesterEmail: entry.requesterEmail ?? '',
          requesterPhone: entry.requesterPhone ?? '',
          subject: entry.subject ?? '',
          message: entry.message ?? '',
          status: entry.status === 'inReview' || entry.status === 'resolved' ? entry.status : 'new',
          createdAtLabel: entry.createdAtLabel ?? nowLabel(),
        })));
      }
      if (remoteItems.length) {
        setCatalogItems(
          remoteItems.map((entry: any) => {
            const approvalStatus: CatalogApprovalStatus =
              entry.approvalStatus === 'approved' || entry.approvalStatus === 'pending' || entry.approvalStatus === 'rejected'
                ? entry.approvalStatus
                : entry.isPublished
                  ? 'approved'
                  : 'draft';

            return {
              id: entry.id,
              companyId: entry.companyId,
              companyName: entry.companyName,
              kind: entry.kind,
              title: entry.title,
              summary: entry.summary,
              description: entry.description ?? '',
              category: entry.category,
              price: Number(entry.price ?? 0),
              durationLabel: entry.durationLabel ?? '',
              isPublished: !!entry.isPublished,
              approvalStatus,
              approvedAtLabel: entry.approvedAtLabel ?? undefined,
              approvedByEmail: entry.approvedByEmail ?? undefined,
              featured: !!entry.featured,
              tags: parseList(entry.tags),
              loyaltyPoints: Number(entry.loyaltyPoints ?? 0),
              imageUrl: entry.imageUrl ?? '',
              imageHint: entry.imageHint ?? '',
            };
          }),
        );
      }
      if (remotePromotions.length) {
        setOfferPromotions(remotePromotions.map((entry: any) => ({ id: entry.id, companyId: entry.companyId, companyName: entry.companyName, catalogItemId: entry.catalogItemId, catalogItemTitle: entry.catalogItemTitle, title: entry.title, headline: entry.headline ?? '', badgeText: entry.badgeText ?? '', discountLabel: entry.discountLabel ?? '', startsAtLabel: entry.startsAtLabel ?? '', endsAtLabel: entry.endsAtLabel ?? '', isActive: !!entry.isActive, sortOrder: Number(entry.sortOrder ?? 0) })));
      }
      if (remoteNotifications.length) {
        setNotifications(remoteNotifications.map((entry: any) => ({ id: entry.id, recipientRole: entry.recipientRole, recipientEmail: entry.recipientEmail ?? undefined, companyId: entry.companyId ?? undefined, title: entry.title, body: entry.body ?? '', kind: entry.kind, destinationTab: entry.destinationTab ?? 'overview', isRead: !!entry.isRead, createdAtLabel: entry.createdAtLabel ?? nowLabel() })));
      }
      if (remoteAuditEvents.length) {
        setAuditEvents(remoteAuditEvents.map((entry: any) => ({ id: entry.id, actorRole: entry.actorRole, actorEmail: entry.actorEmail, entityType: entry.entityType, entityId: entry.entityId, companyId: entry.companyId ?? undefined, action: entry.action, status: entry.status, summary: entry.summary, metadata: parseList(entry.metadata), createdAtLabel: entry.createdAtLabel ?? nowLabel() })));
      }
      if (remoteBookings.length) {
        setBookings(remoteBookings.map((entry: any) => ({ id: entry.id, bookingNumber: entry.bookingNumber, customerEmail: entry.customerEmail, customerName: entry.customerName, companyId: entry.companyId, companyName: entry.companyName, itemId: entry.itemId, itemTitle: entry.itemTitle, slotId: entry.slotId ?? undefined, kind: entry.kind, scheduleDate: entry.scheduleDate, scheduleTime: entry.scheduleTime, addressLabel: entry.addressLabel, addressLine: entry.addressLine, paymentMethod: entry.paymentMethod, notes: entry.notes ?? '', status: entry.status, subtotal: Number(entry.subtotal ?? 0), serviceFee: Number(entry.serviceFee ?? 0), discount: Number(entry.discount ?? 0), total: Number(entry.total ?? 0), loyaltyPointsEarned: Number(entry.loyaltyPointsEarned ?? 0), ratingSubmitted: !!entry.ratingSubmitted, timeline: parseTimeline(entry.timeline) })));
      }
      if (remoteSlots.length) {
        setAvailabilitySlots(remoteSlots.map((entry: any) => ({ id: entry.id, companyId: entry.companyId, companyName: entry.companyName, dateLabel: entry.dateLabel, timeLabel: entry.timeLabel, status: entry.status, note: entry.note ?? '' })));
      }
      if (remoteRatings.length) {
        setRatings(remoteRatings.map((entry: any) => ({ id: entry.id, bookingId: entry.bookingId, companyId: entry.companyId, itemId: entry.itemId, customerEmail: entry.customerEmail, score: Number(entry.score ?? 0), review: entry.review ?? '', createdAtLabel: entry.createdAtLabel ?? nowLabel() })));
      }
      if (remotePrograms.length) {
        setLoyaltyPrograms(remotePrograms.map((entry: any) => ({ id: entry.id, scope: entry.scope, companyId: entry.companyId ?? undefined, title: entry.title, description: entry.description ?? '', pointsPerBooking: Number(entry.pointsPerBooking ?? 0), rewardText: entry.rewardText ?? '', tierRules: parseList(entry.tierRules), isActive: !!entry.isActive })));
      }
      if (remoteAddresses.length) {
        setAddresses(remoteAddresses.map((entry: any) => ({ id: entry.id, label: entry.label, area: entry.area, street: entry.street, building: entry.building ?? '', unitNumber: entry.unitNumber ?? '', instructions: entry.instructions ?? '', contactName: entry.contactName ?? '', contactPhone: entry.contactPhone ?? '', isDefault: !!entry.isDefault })));
      }
      if (remoteProfiles[0]) {
        setProfile((current: UserProfile) => ({ ...current, fullName: remoteProfiles[0].fullName ?? current.fullName, email: remoteProfiles[0].email ?? current.email, phone: remoteProfiles[0].phone ?? current.phone, preferredLanguage: remoteProfiles[0].preferredLanguage ?? current.preferredLanguage, defaultPaymentMethod: remoteProfiles[0].defaultPaymentMethod ?? current.defaultPaymentMethod }));
      }
    } catch {
      // Optional cloud sync.
    }
  }

  async function signInWithEmail(email: string, password: string) {
    setBusy(true);
    setAuthMessage('');
    setSignInChallenge('none');
    setRequiredSignInAttributes([]);
    try {
      const identifier = email.trim();
      const identifierCandidates = Array.from(new Set([
        identifier,
        isLikelyEmail(identifier) ? identifier.toLowerCase() : identifier,
      ].filter(Boolean)));

      let response: Awaited<ReturnType<typeof signIn>> | null = null;
      let lastError: unknown = null;

      for (const candidate of identifierCandidates) {
        try {
          response = await signIn({ username: candidate, password });
          break;
        } catch (error) {
          lastError = error;
          const message = error instanceof Error ? error.message : String(error);
          const isRetryableIdentifierMismatch = /User does not exist|Incorrect username|Unable to verify secret hash|NotAuthorizedException/i.test(message);
          if (!isRetryableIdentifierMismatch || candidate === identifierCandidates[identifierCandidates.length - 1]) {
            throw error;
          }
        }
      }

      if (!response) {
        throw (lastError instanceof Error ? lastError : new Error('Unable to open the session.'));
      }

      // Check if sign-in completed
      if (response.isSignedIn) {
        setNeedsConfirmation(false);
        setSignInChallenge('none');
        await refreshAuthUser();
        return;
      }

      // Handle sign-in challenges
      const nextStep = response.nextStep;
      if (!nextStep) {
        throw new Error('Sign-in could not be completed. Please try again.');
      }

      const nextStepName = (nextStep.signInStep || (nextStep as { challengeName?: string }).challengeName || '').toString();

      // NEW_PASSWORD_REQUIRED challenge
      if (nextStepName === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED' || nextStepName === 'NEW_PASSWORD_REQUIRED') {
        const missingAttributes = Array.isArray((nextStep as { missingAttributes?: unknown[] }).missingAttributes)
          ? (nextStep as { missingAttributes: unknown[] }).missingAttributes
              .filter((entry): entry is string => typeof entry === 'string')
              .map((entry) => entry.trim())
              .filter(Boolean)
          : [];
        setPendingEmail(identifier);
        setSignInChallenge('newPasswordRequired');
        setRequiredSignInAttributes(missingAttributes);
        setAuthMessage('Set a new password to finish signing in.');
        return;
      }

      // CONFIRM_SIGN_UP required
      if (nextStepName === 'CONFIRM_SIGN_UP' || nextStepName === 'CONFIRM_SIGN_UP_STEP') {
        setPendingEmail(identifier);
        setNeedsConfirmation(true);
        throw new Error('Please confirm your email before signing in.');
      }

      throw new Error(`Sign-in step ${nextStepName} not yet supported. Please try again.`);
    } catch (error) {
      setAuthMessage(toErrorMessage(error));
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function completeNewPassword(newPassword: string, attributes: Record<string, string> = {}) {
    setBusy(true);
    setAuthMessage('');
    try {
      const cleanedAttributes = Object.fromEntries(
        Object.entries(attributes)
          .map(([key, value]) => [key, value.trim()])
          .filter(([, value]) => !!value),
      ) as Record<string, string>;

      const response = await confirmSignIn({
        challengeResponse: newPassword.trim(),
        options: Object.keys(cleanedAttributes).length ? { userAttributes: cleanedAttributes as any } : undefined,
      });

      if (!response.isSignedIn) {
        if (response.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
          const missingAttributes = Array.isArray((response.nextStep as { missingAttributes?: unknown[] }).missingAttributes)
            ? (response.nextStep as { missingAttributes: unknown[] }).missingAttributes
                .filter((entry): entry is string => typeof entry === 'string')
                .map((entry) => entry.trim())
                .filter(Boolean)
            : [];
          setRequiredSignInAttributes(missingAttributes);
        }

        throw new Error('Password update could not be completed. Try again.');
      }

      setSignInChallenge('none');
      setRequiredSignInAttributes([]);
      setNeedsConfirmation(false);
      await refreshAuthUser();
    } catch (error) {
      setAuthMessage(toErrorMessage(error));
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function signUpWithEmail(payload: SignUpPayload) {
    setBusy(true);
    setAuthMessage('');
    setSignInChallenge('none');
    setRequiredSignInAttributes([]);
    try {
      const normalizedEmail = payload.email.trim().toLowerCase();
      const normalizedPhone = normalizePhoneNumber(payload.phone);

      if (MANUAL_ADMIN_EMAILS.includes(normalizedEmail)) {
        setAuthMessage('Admin access is assigned manually in Cognito after phone verification.');
        return;
      }

      if (!normalizedPhone) {
        throw new Error('Use a valid phone number with country code, for example +97455551234.');
      }

      const response = await signUp({
        username: normalizedEmail,
        password: payload.password,
        options: {
          userAttributes: {
            email: normalizedEmail,
            name: payload.fullName.trim(),
            phone_number: normalizedPhone,
          },
          clientMetadata: {
            appRole: 'customer',
          },
        },
      });
      setPendingEmail(normalizedEmail);
      setNeedsConfirmation(response.nextStep.signUpStep !== 'DONE');
      setProfile((current: UserProfile) => ({ ...current, fullName: payload.fullName, email: normalizedEmail, phone: normalizedPhone }));
      setAuthMessage('Account created. Enter the email verification code.');
    } catch (error) {
      setAuthMessage(toErrorMessage(error));
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function confirmEmailCode(code: string) {
    if (!pendingEmail) {
      setAuthMessage('Create an account before confirming your email.');
      return;
    }
    setBusy(true);
    setAuthMessage('');
    setSignInChallenge('none');
    try {
      const normalizedPendingEmail = pendingEmail.trim().toLowerCase();
      const invitedCompanyUser = invitations.some(
        (entry) => entry.email.trim().toLowerCase() === normalizedPendingEmail && entry.status === 'pending',
      );

      await confirmSignUp({
        username: pendingEmail,
        confirmationCode: code.trim(),
        options: invitedCompanyUser
          ? {
              clientMetadata: {
                appRole: 'company',
              },
            }
          : undefined,
      });
      setNeedsConfirmation(false);
      setAuthMessage('Email verified.');
    } catch (error) {
      setAuthMessage(toErrorMessage(error));
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function signOutCurrentUser() {
    setBusy(true);
    setAuthMessage('');
    try {
      const signedOutEmail = authUser?.email ?? '';
      await signOut();
      setAuthUser(null);
      setAuthGroups([]);
      setPendingEmail('');
      setNeedsConfirmation(false);
      setSignInChallenge('none');
      setRequiredSignInAttributes([]);
      if (signedOutEmail) {
        await createAuditEvent({ actorEmail: signedOutEmail, actorRole: activeRole === 'guest' ? 'system' : activeRole, entityType: 'auth', entityId: signedOutEmail, action: 'signOut', status: 'info', summary: 'User signed out of the workspace.' });
      }
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Unable to sign out.');
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(nextProfile: UserProfile) {
    setProfile(nextProfile);
    const existingProfiles = await safeList('UserProfile');
    const firstProfile = existingProfiles[0];
    if (firstProfile?.id) {
      await safeUpdate('UserProfile', { id: firstProfile.id, ...nextProfile });
    } else {
      await safeCreate('UserProfile', { ...nextProfile });
    }
    await createAuditEvent({ entityType: 'profile', entityId: nextProfile.email || authUser?.email || 'profile', action: 'saveProfile', status: 'success', summary: 'Customer profile preferences were updated.', metadata: [nextProfile.defaultPaymentMethod, nextProfile.preferredLanguage] });
  }

  async function saveAddress(address: Omit<Address, 'id'> & { id?: string }) {
    const nextAddress: Address = { ...address, id: address.id ?? `address-${Date.now()}` };
    setAddresses((current) => address.id ? current.map((entry) => (entry.id === address.id ? nextAddress : nextAddress.isDefault ? { ...entry, isDefault: false } : entry)) : [...current.map((entry) => (nextAddress.isDefault ? { ...entry, isDefault: false } : entry)), nextAddress]);
    if (address.id) {
      await safeUpdate('Address', { ...nextAddress });
    } else {
      await safeCreate('Address', { ...nextAddress });
    }
    await createAuditEvent({ entityType: 'address', entityId: nextAddress.id, action: address.id ? 'updateAddress' : 'createAddress', status: 'success', summary: `Saved default address ${nextAddress.label}.`, metadata: [nextAddress.area, nextAddress.street].filter(Boolean) });
  }

  async function createCompany(draft: CompanyDraft) {
    const normalizedName = normalizeText(draft.name);
    const normalizedSupportEmail = normalizeText(draft.supportEmail);
    const normalizedSupportPhone = normalizeText(draft.supportPhone);

    const localDuplicate = companies.find((entry) => {
      const entryName = normalizeText(entry.name);
      const entryEmail = normalizeText(entry.supportEmail);
      const entryPhone = normalizeText(entry.supportPhone);
      return (
        entryName === normalizedName ||
        entryEmail === normalizedSupportEmail ||
        (!!normalizedSupportPhone && entryPhone === normalizedSupportPhone && entryName === normalizedName)
      );
    });

    if (localDuplicate) {
      if (normalizeText(localDuplicate.supportEmail) === normalizedSupportEmail) {
        throw new Error('A company with this support email already exists.');
      }
      throw new Error('A company with the same details already exists.');
    }

    const remoteCompanies = await safeList('Company');
    const remoteDuplicate = remoteCompanies.find((entry: any) => {
      const entryName = normalizeText(entry?.name);
      const entryEmail = normalizeText(entry?.supportEmail);
      const entryPhone = normalizeText(entry?.supportPhone);
      return (
        entryName === normalizedName ||
        entryEmail === normalizedSupportEmail ||
        (!!normalizedSupportPhone && entryPhone === normalizedSupportPhone && entryName === normalizedName)
      );
    });

    if (remoteDuplicate) {
      if (normalizeText(remoteDuplicate.supportEmail) === normalizedSupportEmail) {
        throw new Error('A company with this support email already exists.');
      }
      throw new Error('A company with the same details already exists.');
    }

    const company: Company = { id: `company-${Date.now()}`, name: draft.name, slug: slugify(draft.name), description: draft.description, category: draft.category, supportEmail: draft.supportEmail, supportPhone: draft.supportPhone, accentColor: draft.accentColor, logoText: draft.logoText, profileImageUrl: draft.profileImageUrl, ownerEmail: '', isActive: true, createdAtLabel: nowLabel() };
    setCompanies((current) => [company, ...current]);
    await safeCreate('Company', { ...company });
    await createAuditEvent({ entityType: 'company', entityId: company.id, companyId: company.id, action: 'createCompany', status: 'success', summary: `Created company workspace for ${company.name}.`, metadata: [company.supportEmail, company.accentColor] });
    return company;
  }

  async function updateCompany(companyId: string, draft: CompanyDraft) {
    const normalizedName = normalizeText(draft.name);
    const normalizedSupportEmail = normalizeText(draft.supportEmail);
    const normalizedSupportPhone = normalizeText(draft.supportPhone);

    const localDuplicate = companies.find((entry) => {
      if (entry.id === companyId) {
        return false;
      }

      const entryName = normalizeText(entry.name);
      const entryEmail = normalizeText(entry.supportEmail);
      const entryPhone = normalizeText(entry.supportPhone);
      return (
        entryName === normalizedName ||
        entryEmail === normalizedSupportEmail ||
        (!!normalizedSupportPhone && entryPhone === normalizedSupportPhone && entryName === normalizedName)
      );
    });

    if (localDuplicate) {
      if (normalizeText(localDuplicate.supportEmail) === normalizedSupportEmail) {
        throw new Error('Another company already uses this support email.');
      }
      throw new Error('Another company already exists with the same details.');
    }

    const remoteCompanies = await safeList('Company');
    const remoteDuplicate = remoteCompanies.find((entry: any) => {
      if (entry?.id === companyId) {
        return false;
      }

      const entryName = normalizeText(entry?.name);
      const entryEmail = normalizeText(entry?.supportEmail);
      const entryPhone = normalizeText(entry?.supportPhone);
      return (
        entryName === normalizedName ||
        entryEmail === normalizedSupportEmail ||
        (!!normalizedSupportPhone && entryPhone === normalizedSupportPhone && entryName === normalizedName)
      );
    });

    if (remoteDuplicate) {
      if (normalizeText(remoteDuplicate.supportEmail) === normalizedSupportEmail) {
        throw new Error('Another company already uses this support email.');
      }
      throw new Error('Another company already exists with the same details.');
    }

    setCompanies((current) => current.map((entry) => (entry.id === companyId ? { ...entry, name: draft.name, slug: slugify(draft.name), description: draft.description, category: draft.category, supportEmail: draft.supportEmail, supportPhone: draft.supportPhone, accentColor: draft.accentColor, logoText: draft.logoText, profileImageUrl: draft.profileImageUrl } : entry)));
    await safeUpdate('Company', { id: companyId, ...draft, slug: slugify(draft.name) });
    await createAuditEvent({ entityType: 'company', entityId: companyId, companyId, action: 'updateCompany', status: 'success', summary: `Updated company workspace details for ${draft.name}.`, metadata: [draft.supportEmail, draft.accentColor] });
  }

  async function setCompanyActive(companyId: string, isActive: boolean) {
    setCompanies((current) => current.map((entry) => (entry.id === companyId ? { ...entry, isActive } : entry)));
    await safeUpdate('Company', { id: companyId, isActive });
    await createAuditEvent({ entityType: 'company', entityId: companyId, companyId, action: 'setCompanyActive', status: isActive ? 'success' : 'warning', summary: `Company workspace was ${isActive ? 'reactivated' : 'paused'}.`, metadata: [isActive ? 'active' : 'paused'] });
  }

  async function deleteCompany(companyId: string) {
    setCompanies((current) => current.filter((entry) => entry.id !== companyId));
    setCatalogItems((current) => current.filter((entry) => entry.companyId !== companyId));
    setOfferPromotions((current) => current.filter((entry) => entry.companyId !== companyId));
    setNotifications((current) => current.filter((entry) => entry.companyId !== companyId));
    setBookings((current) => current.filter((entry) => entry.companyId !== companyId));
    setUsers((current) => current.filter((entry) => entry.companyId !== companyId));
    setInvitations((current) => current.filter((entry) => entry.companyId !== companyId));
    setLoyaltyPrograms((current) => current.filter((entry) => entry.companyId !== companyId));
    await safeDelete('Company', companyId);
    await createAuditEvent({ entityType: 'company', entityId: companyId, companyId, action: 'deleteCompany', status: 'warning', summary: 'Company workspace and linked operational records were removed.' });
  }

  async function inviteCompany(draft: InvitationDraft) {
    const normalizedCompanyName = normalizeText(draft.companyName);
    const existingCompany = companies.find((entry) => normalizeText(entry.name) === normalizedCompanyName);
    const company = existingCompany ?? (await createCompany({ name: draft.companyName, description: 'New partner workspace', category: APP_DEFAULT_COMPANY_CATEGORY, supportEmail: draft.email, supportPhone: '', accentColor: '#0F7B45', logoText: draft.companyName.slice(0, 2).toUpperCase(), profileImageUrl: '' }));
    const normalizedInviteEmail = draft.email.trim().toLowerCase();
    const duplicateInvitation = invitations.find(
      (entry) =>
        entry.companyId === company.id &&
        entry.email.trim().toLowerCase() === normalizedInviteEmail &&
        entry.status !== 'revoked',
    );

    if (duplicateInvitation) {
      throw new Error('An invitation for this company and email already exists.');
    }

    const invitation: CompanyInvitation = { id: `invite-${Date.now()}`, companyId: company.id, companyName: company.name, email: draft.email.trim().toLowerCase(), invitedByEmail: authUser?.email ?? 'admin@jahzeen.app', status: 'pending', message: draft.message, emailDeliveryStatus: 'pending' };
    setInvitations((current) => [invitation, ...current]);
    await safeCreate('CompanyInvitation', { ...invitation });

    const existingCompanyUser = users.find((entry) => entry.email.toLowerCase() === invitation.email);
    if (!existingCompanyUser) {
      const invitedUser: AppUserRecord = {
        id: `user-${Date.now()}`,
        email: invitation.email,
        fullName: `${company.name} owner`,
        phone: '',
        role: 'company',
        companyId: company.id,
        companyName: company.name,
        invitedByEmail: invitation.invitedByEmail,
        status: 'invited',
      };
      setUsers((current) => [invitedUser, ...current]);
      await safeCreate('AppUser', { ...invitedUser });
    }

    try {
      await dispatchInvitationEmail(invitation);
      await createAuditEvent({ entityType: 'invitation', entityId: invitation.id, companyId: invitation.companyId, action: 'sendInvitation', status: 'success', summary: `Invitation sent to ${invitation.email}.`, metadata: [invitation.companyName, 'delivery:sent'] });
    } catch (error) {
      await createAuditEvent({ entityType: 'invitation', entityId: invitation.id, companyId: invitation.companyId, action: 'sendInvitation', status: 'warning', summary: `Invitation saved for ${invitation.email}, but delivery needs attention.`, metadata: [error instanceof Error ? error.message : 'delivery failed'] });
      throw error;
    }

    await Promise.all([
      createNotification({ recipientRole: 'admin', title: `Invitation sent to ${invitation.email}`, body: `${invitation.companyName} is waiting for company owner activation.`, kind: 'invitation', destinationTab: 'companies' }),
        createNotification({ recipientRole: 'company', recipientEmail: invitation.email, companyId: invitation.companyId, title: `You were invited to ${invitation.companyName}`, body: 'Verify your phone number, then ask an operator to move your Cognito user into the company group.', kind: 'invitation', destinationTab: 'overview' }),
    ]);
  }

  async function resendCompanyInvitation(invitationId: string) {
    const invitation = invitations.find((entry) => entry.id === invitationId);
    if (!invitation) {
      return;
    }

    setInvitations((current) =>
      current.map((entry) =>
        entry.id === invitationId
          ? { ...entry, emailDeliveryStatus: 'pending', emailDeliveryError: undefined }
          : entry,
      ),
    );
    await safeUpdate('CompanyInvitation', {
      id: invitationId,
      emailDeliveryStatus: 'pending',
      emailDeliveryError: undefined,
    });
    await dispatchInvitationEmail({ ...invitation, emailDeliveryStatus: 'pending', emailDeliveryError: undefined });
    await createNotification({ recipientRole: 'admin', title: `Invitation resent to ${invitation.email}`, body: `${invitation.companyName} invitation delivery was retried.`, kind: 'invitation', destinationTab: 'companies' });
    await createAuditEvent({ entityType: 'invitation', entityId: invitationId, companyId: invitation.companyId, action: 'resendInvitation', status: 'success', summary: `Invitation delivery retried for ${invitation.email}.`, metadata: [invitation.companyName] });
  }

  async function revokeInvitation(invitationId: string) {
    const invitation = invitations.find((entry) => entry.id === invitationId);
    setInvitations((current) => current.map((entry) => (entry.id === invitationId ? { ...entry, status: 'revoked' } : entry)));
    await safeUpdate('CompanyInvitation', { id: invitationId, status: 'revoked' });
    if (invitation) {
      await createNotification({ recipientRole: 'admin', title: `Invitation revoked for ${invitation.email}`, body: `${invitation.companyName} invitation has been revoked.`, kind: 'invitation', destinationTab: 'companies' });
      await createAuditEvent({ entityType: 'invitation', entityId: invitationId, companyId: invitation.companyId, action: 'revokeInvitation', status: 'warning', summary: `Invitation revoked for ${invitation.email}.`, metadata: [invitation.companyName] });
    }
  }

  async function saveCatalogItem(companyId: string, draft: CatalogItemDraft) {
    const company = companies.find((entry) => entry.id === companyId);
    if (!company) {
      throw new Error('No active company workspace was found for this catalog item.');
    }

    const existingItem = draft.id ? catalogItems.find((entry) => entry.id === draft.id) : undefined;
    const actorIsAdmin = activeRole === 'admin';

    let approvalStatus: CatalogApprovalStatus = 'draft';
    let approvedAtLabel: string | undefined;
    let approvedByEmail: string | undefined;

    if (draft.isPublished) {
      if (actorIsAdmin) {
        approvalStatus = 'approved';
        approvedAtLabel = nowLabel();
        approvedByEmail = authUser?.email ?? 'admin@jahzeen.app';
      } else {
        approvalStatus = 'pending';
      }
    }

    if (!draft.isPublished) {
      approvalStatus = 'draft';
    }

    if (existingItem && existingItem.approvalStatus === 'approved' && approvalStatus === 'approved') {
      approvedAtLabel = existingItem.approvedAtLabel;
      approvedByEmail = existingItem.approvedByEmail;
    }

    const item: CatalogItem = {
      id: draft.id ?? `item-${Date.now()}`,
      companyId,
      companyName: company.name,
      kind: draft.kind,
      title: draft.title,
      summary: draft.summary,
      description: draft.description,
      category: draft.category,
      price: draft.price,
      durationLabel: draft.durationLabel,
      isPublished: draft.isPublished,
      approvalStatus,
      approvedAtLabel,
      approvedByEmail,
      featured: draft.featured,
      tags: draft.tags,
      loyaltyPoints: draft.loyaltyPoints,
      imageUrl: draft.imageUrl,
      imageHint: draft.imageHint,
    };

    setCatalogItems((current) => (draft.id ? current.map((entry) => (entry.id === draft.id ? item : entry)) : [item, ...current]));

    const payload = {
      ...item,
      tags: JSON.stringify(item.tags),
    };

    if (draft.id) {
      await safeUpdate('CatalogItem', payload);
    } else {
      await safeCreate('CatalogItem', payload);
    }

    if (approvalStatus === 'pending') {
      await createNotification({
        recipientRole: 'admin',
        title: `Approval required: ${item.title}`,
        body: `${company.name} submitted a ${item.kind} for publishing approval.`,
        kind: 'system',
        destinationTab: 'publishing',
      });
    }

    const statusSummary =
      approvalStatus === 'approved'
        ? ' and approved for publishing.'
        : approvalStatus === 'pending'
          ? ' and submitted for admin approval.'
          : ' as a draft.';

    await createAuditEvent({
      entityType: 'catalogItem',
      entityId: item.id,
      companyId,
      action: draft.id ? 'updateCatalogItem' : 'createCatalogItem',
      status: approvalStatus === 'approved' ? 'success' : approvalStatus === 'pending' ? 'warning' : 'info',
      summary: `${item.title} was ${draft.id ? 'updated' : 'saved'}${statusSummary}`,
      metadata: [item.kind, item.category, `${item.price}`, approvalStatus],
    });
  }

  async function reviewCatalogItem(itemId: string, decision: 'approved' | 'rejected') {
    const existing = catalogItems.find((entry) => entry.id === itemId);
    if (!existing) {
      throw new Error('Catalog item not found.');
    }

    const nextStatus: CatalogApprovalStatus = decision;
    const approvedByEmail = decision === 'approved' ? authUser?.email ?? 'admin@jahzeen.app' : undefined;
    const approvedAtLabel = decision === 'approved' ? nowLabel() : undefined;

    const nextItem: CatalogItem = {
      ...existing,
      approvalStatus: nextStatus,
      isPublished: decision === 'approved',
      approvedAtLabel,
      approvedByEmail,
    };

    setCatalogItems((current) => current.map((entry) => (entry.id === itemId ? nextItem : entry)));

    await safeUpdate('CatalogItem', {
      ...nextItem,
      tags: JSON.stringify(nextItem.tags),
    });

    await Promise.all([
      createNotification({
        recipientRole: 'company',
        companyId: existing.companyId,
        title: `${existing.title} ${decision === 'approved' ? 'approved' : 'rejected'}`,
        body:
          decision === 'approved'
            ? 'Your listing is now live for customers.'
            : 'Your listing was rejected. Update it and submit again.',
        kind: 'system',
        destinationTab: 'catalog',
      }),
      ...(decision === 'approved'
        ? [
            createNotification({
              recipientRole: 'customer',
              title: `${existing.title} is now live`,
              body: `${existing.companyName} published a new ${existing.kind}.`,
              kind: 'system',
              destinationTab: 'explore',
            }),
          ]
        : []),
    ]);

    await createAuditEvent({
      entityType: 'catalogItem',
      entityId: existing.id,
      companyId: existing.companyId,
      action: decision === 'approved' ? 'approveCatalogItem' : 'rejectCatalogItem',
      status: decision === 'approved' ? 'success' : 'warning',
      summary:
        decision === 'approved'
          ? `${existing.title} was approved and is now live.`
          : `${existing.title} was rejected and stays hidden from customers.`,
      metadata: [existing.kind, existing.category, decision],
    });
  }

  async function deleteCatalogItem(itemId: string) {
    setCatalogItems((current) => current.filter((entry) => entry.id !== itemId));
    const linkedPromotions = offerPromotions.filter((entry) => entry.catalogItemId === itemId);
    setOfferPromotions((current) => current.filter((entry) => entry.catalogItemId !== itemId));
    await safeDelete('CatalogItem', itemId);
    await Promise.all(linkedPromotions.map((entry) => safeDelete('OfferPromotion', entry.id)));
    await createAuditEvent({ entityType: 'catalogItem', entityId: itemId, action: 'deleteCatalogItem', status: 'warning', summary: 'Catalog item and linked promotions were removed.' });
  }

  async function saveOfferPromotion(companyId: string, draft: OfferPromotionDraft) {
    const company = companies.find((entry) => entry.id === companyId);
    const item = catalogItems.find((entry) => entry.id === draft.catalogItemId && entry.companyId === companyId);
    if (!company || !item) {
      throw new Error('Select a valid company item for this promotion.');
    }
    if (!(item.approvalStatus === 'approved' && item.isPublished)) {
      throw new Error('Promotions can only be linked to approved and published catalog items.');
    }

    const actorIsAdmin = activeRole === 'admin';

    let approvalStatus: CatalogApprovalStatus = 'draft';
    let approvedAtLabel: string | undefined;
    let approvedByEmail: string | undefined;

    if (actorIsAdmin) {
      approvalStatus = 'approved';
      approvedAtLabel = nowLabel();
      approvedByEmail = authUser?.email ?? 'admin@jahzeen.app';
    } else {
      // Any company-side save (new or edit) must be approved by admin before going live.
      approvalStatus = 'pending';
      approvedAtLabel = undefined;
      approvedByEmail = undefined;
    }

    const nextPromotion: OfferPromotion = {
      id: draft.id ?? `promotion-${Date.now()}`,
      companyId,
      companyName: company.name,
      catalogItemId: item.id,
      catalogItemTitle: item.title,
      title: draft.title,
      headline: draft.headline,
      badgeText: draft.badgeText,
      discountLabel: draft.discountLabel,
      startsAtLabel: draft.startsAtLabel,
      endsAtLabel: draft.endsAtLabel,
      isActive: draft.isActive && approvalStatus === 'approved',
      approvalStatus,
      approvedAtLabel,
      approvedByEmail,
      sortOrder: draft.sortOrder,
    };

    setOfferPromotions((current) => draft.id ? current.map((entry) => (entry.id === draft.id ? nextPromotion : entry)) : [nextPromotion, ...current]);

    if (draft.id) {
      await safeUpdate('OfferPromotion', { ...nextPromotion });
    } else {
      await safeCreate('OfferPromotion', { ...nextPromotion });
    }

    // Send admin notification when a promotion requires approval.
    if (approvalStatus === 'pending') {
      await createNotification({
        recipientRole: 'admin',
        title: `Approval needed: "${nextPromotion.title}"`,
        body: `${company.name} ${draft.id ? 'updated' : 'submitted'} a promotion for publishing approval.`,
        kind: 'promotion',
        destinationTab: 'publishing',
      });
    }

    await Promise.all([
      createNotification({ recipientRole: 'company', companyId, title: `${nextPromotion.title} is ${approvalStatus === 'pending' ? 'submitted for approval' : nextPromotion.isActive ? 'live' : 'saved'}`, body: `Promotion linked to ${nextPromotion.catalogItemTitle}.`, kind: 'promotion', destinationTab: 'offers' }),
      ...(approvalStatus === 'approved' && nextPromotion.isActive && !draft.id
        ? [createNotification({ recipientRole: 'customer', title: `${nextPromotion.title} is now live`, body: nextPromotion.headline, kind: 'promotion', destinationTab: 'explore' })]
        : []),
    ]);
    await createAuditEvent({ entityType: 'promotion', entityId: nextPromotion.id, companyId, action: draft.id ? 'updatePromotion' : 'createPromotion', status: nextPromotion.isActive ? 'success' : 'info', summary: `${nextPromotion.title} promotion ${nextPromotion.isActive ? 'went live' : 'was saved as paused'}.`, metadata: [nextPromotion.catalogItemTitle, nextPromotion.discountLabel].filter(Boolean) });
  }

  async function deleteOfferPromotion(promotionId: string) {
    setOfferPromotions((current) => current.filter((entry) => entry.id !== promotionId));
    await safeDelete('OfferPromotion', promotionId);
    await createAuditEvent({ entityType: 'promotion', entityId: promotionId, action: 'deletePromotion', status: 'warning', summary: 'Promotion was removed from the marketplace plan.' });
  }

  async function reviewOfferPromotion(promotionId: string, decision: 'approved' | 'rejected') {
    const existing = offerPromotions.find((entry) => entry.id === promotionId);
    if (!existing) {
      throw new Error('Promotion not found.');
    }

    const nextStatus: CatalogApprovalStatus = decision;
    const approvedByEmail = decision === 'approved' ? authUser?.email ?? 'admin@jahzeen.app' : undefined;
    const approvedAtLabel = decision === 'approved' ? nowLabel() : undefined;

    const nextPromotion: OfferPromotion = {
      ...existing,
      approvalStatus: nextStatus,
      isActive: decision === 'approved',
      approvedAtLabel,
      approvedByEmail,
    };

    setOfferPromotions((current) => current.map((entry) => (entry.id === promotionId ? nextPromotion : entry)));

    await safeUpdate('OfferPromotion', { ...nextPromotion });

    await Promise.all([
      createNotification({
        recipientRole: 'company',
        companyId: existing.companyId,
        title: `Promotion "${existing.title}" ${decision === 'approved' ? 'approved' : 'rejected'}`,
        body:
          decision === 'approved'
            ? `Your promotion is now live and customers can see it.`
            : `Your promotion was rejected. Review and update the details to resubmit.`,
        kind: 'promotion',
        destinationTab: 'offers',
      }),
      ...(decision === 'approved'
        ? [
            createNotification({
              recipientRole: 'customer',
              title: `${existing.title} is live`,
              body: `${existing.companyName} is running a new promotion on ${existing.catalogItemTitle}.`,
              kind: 'promotion',
              destinationTab: 'explore',
            }),
          ]
        : []),
    ]);

    await createAuditEvent({
      entityType: 'promotion',
      entityId: existing.id,
      companyId: existing.companyId,
      action: decision === 'approved' ? 'approvePromotion' : 'rejectPromotion',
      status: decision === 'approved' ? 'success' : 'warning',
      summary:
        decision === 'approved'
          ? `"${existing.title}" was approved and is now live.`
          : `"${existing.title}" was rejected and stays hidden from customers.`,
      metadata: [existing.catalogItemTitle, decision],
    });
  }

  async function markNotificationRead(notificationId: string) {
    setNotifications((current) => current.map((entry) => (entry.id === notificationId ? { ...entry, isRead: true } : entry)));
    await safeUpdate('AppNotification', { id: notificationId, isRead: true });
  }

  async function saveLoyaltyProgram(scope: 'admin' | 'company', companyId: string | undefined, draft: LoyaltyProgramDraft) {
    const existing = loyaltyPrograms.find((entry) => entry.scope === scope && entry.companyId === companyId);
    const nextProgram: LoyaltyProgram = { id: existing?.id ?? `loyalty-${Date.now()}`, scope, companyId, title: draft.title, description: draft.description, pointsPerBooking: draft.pointsPerBooking, rewardText: draft.rewardText, tierRules: draft.tierRules, isActive: draft.isActive };
    setLoyaltyPrograms((current) => existing ? current.map((entry) => (entry.id === existing.id ? nextProgram : entry)) : [nextProgram, ...current]);
    if (existing) {
      await safeUpdate('LoyaltyProgram', { ...nextProgram, tierRules: JSON.stringify(nextProgram.tierRules) });
    } else {
      await safeCreate('LoyaltyProgram', { ...nextProgram, tierRules: JSON.stringify(nextProgram.tierRules) });
    }
    await createAuditEvent({ entityType: 'loyaltyProgram', entityId: nextProgram.id, companyId, action: existing ? 'updateLoyaltyProgram' : 'createLoyaltyProgram', status: nextProgram.isActive ? 'success' : 'info', summary: `${nextProgram.title} loyalty program ${nextProgram.isActive ? 'is active' : 'was paused'}.`, metadata: [scope, `${nextProgram.pointsPerBooking} pts`] });
  }

  async function saveCategorySetting(category: string, isComingSoon: boolean) {
    const normalizedCategory = category.trim();
    if (!normalizedCategory) {
      throw new Error('Category name is required.');
    }

    const existing = appCategorySettings.find((entry) => entry.category === normalizedCategory);
    const nextSetting: AppCategorySetting = {
      id: existing?.id ?? `category-setting-${slugify(normalizedCategory)}`,
      category: normalizedCategory,
      isComingSoon,
    };

    setAppCategorySettings((current) => {
      const remaining = current.filter((entry) => entry.category !== normalizedCategory);
      return [nextSetting, ...remaining].sort((left, right) => left.category.localeCompare(right.category));
    });

    if (existing) {
      await safeUpdate('AppCategorySetting', { ...nextSetting });
    } else {
      await safeCreate('AppCategorySetting', { ...nextSetting });
    }

    await createAuditEvent({ entityType: 'system', entityId: nextSetting.id, action: 'updateCategorySetting', status: isComingSoon ? 'warning' : 'success', summary: `${normalizedCategory} is now ${isComingSoon ? 'coming soon' : 'live for booking'}.`, metadata: [normalizedCategory, isComingSoon ? 'comingSoon' : 'live'] });
  }

  async function saveAvailabilitySlot(companyId: string, draft: AvailabilitySlotDraft) {
    const company = companies.find((entry) => entry.id === companyId);
    if (!company) {
      throw new Error('No active company workspace was found for this schedule slot.');
    }

    const nextSlot: AvailabilitySlot = {
      id: draft.id ?? `slot-${Date.now()}`,
      companyId,
      companyName: company.name,
      dateLabel: draft.dateLabel,
      timeLabel: draft.timeLabel,
      status: draft.status,
      note: draft.note,
    };

    setAvailabilitySlots((current) => draft.id ? current.map((entry) => (entry.id === draft.id ? nextSlot : entry)) : [nextSlot, ...current]);

    if (draft.id) {
      await safeUpdate('AvailabilitySlot', { ...nextSlot });
    } else {
      await safeCreate('AvailabilitySlot', { ...nextSlot });
    }

    await createAuditEvent({ entityType: 'system', entityId: nextSlot.id, companyId, action: draft.id ? 'updateAvailabilitySlot' : 'createAvailabilitySlot', status: nextSlot.status === 'blocked' ? 'warning' : 'success', summary: `${company.name} ${draft.id ? 'updated' : 'added'} a ${nextSlot.status} slot for ${nextSlot.dateLabel} ${nextSlot.timeLabel}.`, metadata: [nextSlot.status, nextSlot.note].filter(Boolean) });
  }

  async function deleteAvailabilitySlot(slotId: string) {
    const slot = availabilitySlots.find((entry) => entry.id === slotId);
    setAvailabilitySlots((current) => current.filter((entry) => entry.id !== slotId));
    await safeDelete('AvailabilitySlot', slotId);
    if (slot) {
      await createAuditEvent({ entityType: 'system', entityId: slotId, companyId: slot.companyId, action: 'deleteAvailabilitySlot', status: 'warning', summary: `${slot.companyName} removed a schedule slot.`, metadata: [slot.dateLabel, slot.timeLabel] });
    }
  }

  async function placeBooking(draft: BookingDraft) {
    if (!authUser) {
      throw new Error('Please verify your phone number before booking.');
    }
    const item = catalogItems.find((entry) => entry.id === draft.itemId && entry.companyId === draft.companyId);
    const address = addresses.find((entry) => entry.id === draft.addressId) ?? addresses[0];
    const companyProgram = loyaltyPrograms.find((entry) => entry.scope === 'company' && entry.companyId === draft.companyId && entry.isActive);
    const selectedSlot = draft.slotId ? availabilitySlots.find((entry) => entry.id === draft.slotId && entry.companyId === draft.companyId) : null;
    if (!item || !address) {
      throw new Error('Booking details are incomplete.');
    }

    if (selectedSlot && selectedSlot.status !== 'available') {
      throw new Error('That time slot is no longer available. Please choose another slot.');
    }

    const bookingDate = selectedSlot?.dateLabel ?? draft.scheduleDate;
    const bookingTime = selectedSlot?.timeLabel ?? draft.scheduleTime;
    const booking: Booking = { id: `booking-${Date.now()}`, bookingNumber: `JHZ-${String(Date.now()).slice(-6)}`, customerEmail: authUser.email, customerName: profile.fullName || authUser.fullName, companyId: item.companyId, companyName: item.companyName, itemId: item.id, itemTitle: item.title, slotId: selectedSlot?.id, kind: item.kind, scheduleDate: bookingDate, scheduleTime: bookingTime, addressLabel: address.label, addressLine: formatAddress(address), paymentMethod: draft.paymentMethod, notes: draft.notes, status: 'pending', subtotal: item.price, serviceFee: item.kind === 'service' ? 10 : 0, discount: 0, total: item.price + (item.kind === 'service' ? 10 : 0), loyaltyPointsEarned: companyProgram?.pointsPerBooking ?? item.loyaltyPoints, ratingSubmitted: false, timeline: [{ id: 'pending', title: 'Booking requested', time: 'Just now', done: true }, { id: 'approval', title: 'Awaiting company approval', time: 'Pending', done: false }, { id: 'service', title: 'Service or delivery window', time: `${bookingDate} · ${bookingTime}`, done: false }] };
    setBookings((current) => [booking, ...current]);
    await safeCreate('Booking', { ...booking, timeline: JSON.stringify(booking.timeline) });
    if (selectedSlot) {
      setAvailabilitySlots((current) => current.map((entry) => (entry.id === selectedSlot.id ? { ...entry, status: 'booked', note: `Booked by ${authUser.email}` } : entry)));
      await safeUpdate('AvailabilitySlot', { id: selectedSlot.id, status: 'booked', note: `Booked by ${authUser.email}` });
    }
    await Promise.all([
      createNotification({ recipientRole: 'customer', recipientEmail: authUser.email, title: `Booking ${booking.bookingNumber} submitted`, body: `${booking.itemTitle} is waiting for company approval.`, kind: 'booking', destinationTab: 'orders' }),
      createNotification({ recipientRole: 'company', companyId: booking.companyId, title: `New booking for ${booking.itemTitle}`, body: `${booking.customerName} placed ${booking.bookingNumber}.`, kind: 'booking', destinationTab: 'bookings' }),
      createNotification({ recipientRole: 'admin', title: `New marketplace booking ${booking.bookingNumber}`, body: `${booking.companyName} received a new booking.`, kind: 'booking', destinationTab: 'bookings' }),
    ]);
    await createAuditEvent({ entityType: 'booking', entityId: booking.id, companyId: booking.companyId, action: 'placeBooking', status: 'success', summary: `Booking ${booking.bookingNumber} was placed for ${booking.itemTitle}.`, metadata: [booking.companyName, `${booking.total}`] });
    return booking;
  }

  async function changeBookingStatus(bookingId: string, status: BookingStatus) {
    setBookings((current) => current.map((entry) => entry.id === bookingId ? { ...entry, status, timeline: entry.timeline.map((item: Booking['timeline'][number], index: number) => ({ ...item, done: status === 'completed' ? true : index === 0 ? true : status === 'approved' ? index <= 1 : status === 'enRoute' ? index <= 2 : item.done })) } : entry));
    const booking = bookings.find((entry) => entry.id === bookingId);
    if (booking) {
      const nextTimeline = booking.timeline.map((item: Booking['timeline'][number], index: number) => ({ ...item, done: status === 'completed' ? true : index === 0 ? true : status === 'approved' ? index <= 1 : status === 'enRoute' ? index <= 2 : item.done }));
      await safeUpdate('Booking', { id: bookingId, status, timeline: JSON.stringify(nextTimeline) });
      await Promise.all([
        createNotification({ recipientRole: 'customer', recipientEmail: booking.customerEmail, title: `${booking.itemTitle} is ${readableBookingStatus(status).toLowerCase()}`, body: `Booking ${booking.bookingNumber} moved to ${readableBookingStatus(status)}.`, kind: 'booking', destinationTab: 'orders' }),
        createNotification({ recipientRole: 'admin', title: `${booking.bookingNumber} moved to ${readableBookingStatus(status)}`, body: `${booking.companyName} updated ${booking.itemTitle}.`, kind: 'booking', destinationTab: 'bookings' }),
      ]);
      await createAuditEvent({ entityType: 'booking', entityId: bookingId, companyId: booking.companyId, action: 'changeBookingStatus', status: status === 'completed' ? 'success' : 'info', summary: `Booking ${booking.bookingNumber} moved to ${readableBookingStatus(status)}.`, metadata: [booking.itemTitle, booking.companyName] });
    }
  }

  async function submitRating(bookingId: string, score: number, review: string) {
    const booking = bookings.find((entry) => entry.id === bookingId);
    if (!booking || !authUser) {
      return;
    }
    const rating = { id: `rating-${Date.now()}`, bookingId, companyId: booking.companyId, itemId: booking.itemId, customerEmail: authUser.email, score, review, createdAtLabel: nowLabel() };
    setRatings((current) => [rating, ...current]);
    setBookings((current) => current.map((entry) => (entry.id === bookingId ? { ...entry, ratingSubmitted: true } : entry)));
    await safeCreate('Rating', rating);
    await safeUpdate('Booking', { id: bookingId, ratingSubmitted: true });
    await Promise.all([
      createNotification({ recipientRole: 'company', companyId: booking.companyId, title: `New rating for ${booking.itemTitle}`, body: `${authUser.fullName} left a ${score}/5 review.`, kind: 'system', destinationTab: 'overview' }),
      createNotification({ recipientRole: 'admin', title: `Customer review submitted`, body: `${booking.companyName} received a ${score}/5 rating for ${booking.itemTitle}.`, kind: 'system', destinationTab: 'overview' }),
    ]);
    await createAuditEvent({ entityType: 'rating', entityId: rating.id, companyId: booking.companyId, action: 'submitRating', status: 'success', summary: `${booking.itemTitle} received a ${score}/5 rating.`, metadata: [booking.companyName, authUser.email] });
  }

  return (
    <AppContext.Provider value={{ initialized, busy, authUser, authMessage, needsConfirmation, signInChallenge, requiredSignInAttributes, activeRole, profile, addresses, users, companies, appCategorySettings, invitations, supportRequests, catalogItems, offerPromotions, notifications, auditEvents, bookings, availabilitySlots, ratings, loyaltyPrograms, currentUserRecord, currentCompany, marketplaceItems, refreshCurrentAuthUser: refreshAuthUser, signInWithEmail, completeNewPassword, signUpWithEmail, confirmEmailCode, signOutCurrentUser, saveProfile, saveAddress, createCompany, updateCompany, setCompanyActive, deleteCompany, inviteCompany, resendCompanyInvitation, revokeInvitation, saveCatalogItem, reviewCatalogItem, deleteCatalogItem, saveOfferPromotion, reviewOfferPromotion, deleteOfferPromotion, markNotificationRead, submitSupportRequest, saveLoyaltyProgram, saveCategorySetting, saveAvailabilitySlot, deleteAvailabilitySlot, placeBooking, changeBookingStatus, submitRating }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used inside AppProvider.');
  }
  return context;
}
