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

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (!error || typeof error !== 'object') {
    return 'Mutation failed.';
  }

  const candidate = error as {
    message?: unknown;
    errors?: Array<{ message?: unknown }>;
    cause?: unknown;
    originalError?: unknown;
    recoverySuggestion?: unknown;
  };

  const graphQlMessages = Array.isArray(candidate.errors)
    ? candidate.errors
        .map((entry) => (typeof entry?.message === 'string' ? entry.message : ''))
        .filter(Boolean)
    : [];

  if (graphQlMessages.length) {
    return graphQlMessages.join(' | ');
  }

  if (typeof candidate.message === 'string' && candidate.message.trim()) {
    return candidate.message;
  }

  const nestedMessage = [candidate.cause, candidate.originalError]
    .map((entry) => toErrorMessage(entry))
    .find((entry) => entry && entry !== 'Mutation failed.');

  if (nestedMessage) {
    return nestedMessage;
  }

  if (typeof candidate.recoverySuggestion === 'string' && candidate.recoverySuggestion.trim()) {
    return candidate.recoverySuggestion;
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
  activeRole: AppRole;
  profile: UserProfile;
  addresses: Address[];
  users: AppUserRecord[];
  companies: Company[];
  appCategorySettings: AppCategorySetting[];
  invitations: CompanyInvitation[];
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
  signInWithEmail: (email: string, password: string) => Promise<void>;
  completeNewPassword: (newPassword: string) => Promise<void>;
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
  deleteCatalogItem: (itemId: string) => Promise<void>;
  saveOfferPromotion: (companyId: string, draft: OfferPromotionDraft) => Promise<void>;
  deleteOfferPromotion: (promotionId: string) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
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

function formatAddress(address: Address) {
  return [address.area, address.street, address.building, address.unitNumber].filter(Boolean).join(', ');
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
  const [pendingEmail, setPendingEmail] = useState('');
  const [profile, setProfile] = useState<UserProfile>(starterProfile);
  const [addresses, setAddresses] = useState<Address[]>([starterAddress]);
  const [users, setUsers] = useState<AppUserRecord[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [appCategorySettings, setAppCategorySettings] = useState<AppCategorySetting[]>([]);
  const [invitations, setInvitations] = useState<CompanyInvitation[]>([]);
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
          setCatalogItems(parsed.catalogItems ?? []);
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
  }, [initialized, profile, addresses, users, companies, appCategorySettings, invitations, catalogItems, offerPromotions, notifications, auditEvents, bookings, availabilitySlots, ratings, loyaltyPrograms]);

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
      return null;
    }
    return companies.find((entry) => entry.id === currentUserRecord.companyId) ?? null;
  }, [companies, currentUserRecord]);

  const marketplaceItems = useMemo(
    () => catalogItems.filter((item) => item.isPublished && companies.find((entry) => entry.id === item.companyId)?.isActive),
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

  async function ensureUserRecord(nextAuthUser: AuthUser) {
    const email = nextAuthUser.email.trim().toLowerCase();
    const existingUser = users.find((entry) => entry.email.toLowerCase() === email);
    const matchingInvitation = invitations.find((entry) => entry.email.toLowerCase() === email && entry.status === 'pending');

    if (existingUser) {
      if (matchingInvitation || existingUser.status !== 'active') {
        const nextRole = MANUAL_ADMIN_EMAILS.includes(email) ? 'admin' : matchingInvitation ? 'company' : existingUser.role;
        const nextCompanyId = matchingInvitation?.companyId ?? existingUser.companyId;
        const nextCompanyName = matchingInvitation?.companyName ?? existingUser.companyName;
        const nextInvitedByEmail = matchingInvitation?.invitedByEmail ?? existingUser.invitedByEmail;

        setUsers((current) =>
          current.map((entry) =>
            entry.id === existingUser.id
              ? {
                  ...entry,
                  fullName: nextAuthUser.fullName,
                  role: nextRole,
                  companyId: nextCompanyId,
                  companyName: nextCompanyName,
                  invitedByEmail: nextInvitedByEmail,
                  status: 'active',
                }
              : entry,
          ),
        );
        await safeUpdate('AppUser', {
          id: existingUser.id,
          fullName: nextAuthUser.fullName,
          role: nextRole,
          companyId: nextCompanyId,
          companyName: nextCompanyName,
          invitedByEmail: nextInvitedByEmail,
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

    let role: AppUserRecord['role'] = 'customer';
    let companyId: string | undefined;
    let companyName: string | undefined;
    let invitedByEmail: string | undefined;

    if (MANUAL_ADMIN_EMAILS.includes(email)) {
      role = 'admin';
    } else if (matchingInvitation) {
      role = 'company';
      companyId = matchingInvitation.companyId;
      companyName = matchingInvitation.companyName;
      invitedByEmail = matchingInvitation.invitedByEmail;
      setInvitations((current) => current.map((entry) => (entry.id === matchingInvitation.id ? { ...entry, status: 'accepted' } : entry)));
      setCompanies((current) => current.map((entry) => (entry.id === matchingInvitation.companyId ? { ...entry, ownerEmail: email } : entry)));
    }

    const newUser: AppUserRecord = {
      id: `user-${Date.now()}`,
      email,
      fullName: nextAuthUser.fullName,
      phone: profile.phone,
      role,
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
      const session = await fetchAuthSession();
      const attributes = await fetchUserAttributes();
      const tokenGroups = session.tokens?.idToken?.payload?.['cognito:groups'];
      const nextGroups = Array.isArray(tokenGroups)
        ? tokenGroups.filter((entry): entry is string => typeof entry === 'string')
        : [];
      const nextAuthUser: AuthUser = {
        userId: currentUser.userId,
        email: attributes.email ?? '',
        fullName: attributes.name ?? attributes.email ?? 'Jahzeen user',
      };
      setAuthUser(nextAuthUser);
      setAuthGroups(nextGroups);
      setSignInChallenge('none');
      setProfile((current: UserProfile) => ({ ...current, fullName: nextAuthUser.fullName || current.fullName, email: nextAuthUser.email || current.email }));
      await ensureUserRecord(nextAuthUser);
      setAuthMessage('');
    } catch {
      setAuthUser(null);
      setAuthGroups([]);
      setSignInChallenge('none');
    }
  }

  async function syncCloudRecords() {
    try {
      const [remoteUsers, remoteCompanies, remoteCategorySettings, remoteInvitations, remoteItems, remotePromotions, remoteNotifications, remoteAuditEvents, remoteBookings, remoteSlots, remoteRatings, remotePrograms, remoteAddresses, remoteProfiles] = await Promise.all([
        safeList('AppUser'),
        safeList('Company'),
        safeList('AppCategorySetting'),
        safeList('CompanyInvitation'),
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
        setCompanies(remoteCompanies.map((entry: any) => ({ id: entry.id, name: entry.name, slug: entry.slug, description: entry.description ?? '', category: entry.category ?? APP_DEFAULT_COMPANY_CATEGORY, supportEmail: entry.supportEmail, supportPhone: entry.supportPhone ?? '', accentColor: entry.accentColor ?? '#0F7B45', logoText: entry.logoText ?? entry.name.slice(0, 2).toUpperCase(), profileImageUrl: entry.profileImageUrl ?? '', ownerEmail: entry.ownerEmail ?? '', isActive: !!entry.isActive, createdAtLabel: entry.createdAtLabel ?? nowLabel() })));
      }
      if (remoteCategorySettings.length) {
        setAppCategorySettings(remoteCategorySettings.map((entry: any) => ({ id: entry.id, category: entry.category, isComingSoon: !!entry.isComingSoon })));
      }
      if (remoteInvitations.length) {
        setInvitations(remoteInvitations.map((entry: any) => ({ id: entry.id, companyId: entry.companyId, companyName: entry.companyName, email: entry.email, invitedByEmail: entry.invitedByEmail, status: entry.status, message: entry.message ?? '', emailDeliveryStatus: entry.emailDeliveryStatus ?? 'pending', emailDeliveryError: entry.emailDeliveryError ?? undefined, emailSentAtLabel: entry.emailSentAtLabel ?? undefined })));
      }
      if (remoteItems.length) {
        setCatalogItems(remoteItems.map((entry: any) => ({ id: entry.id, companyId: entry.companyId, companyName: entry.companyName, kind: entry.kind, title: entry.title, summary: entry.summary, description: entry.description ?? '', category: entry.category, price: Number(entry.price ?? 0), durationLabel: entry.durationLabel ?? '', isPublished: !!entry.isPublished, featured: !!entry.featured, tags: parseList(entry.tags), loyaltyPoints: Number(entry.loyaltyPoints ?? 0), imageUrl: entry.imageUrl ?? '', imageHint: entry.imageHint ?? '' })));
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
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await signIn({ username: normalizedEmail, password });
      if (!response.isSignedIn) {
        if (response.nextStep.signInStep === 'CONFIRM_SIGN_UP') {
          setPendingEmail(normalizedEmail);
          setNeedsConfirmation(true);
          throw new Error('Confirm your email before signing in.');
        }

        if (response.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
          setPendingEmail(normalizedEmail);
          setSignInChallenge('newPasswordRequired');
          setAuthMessage('Set a new password to finish signing in.');
          return;
        }

        throw new Error('Sign-in could not be completed. Please try again.');
      }

      setNeedsConfirmation(false);
      setSignInChallenge('none');
      await refreshAuthUser();
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Unable to sign in.');
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function completeNewPassword(newPassword: string) {
    setBusy(true);
    setAuthMessage('');
    try {
      const response = await confirmSignIn({ challengeResponse: newPassword.trim() });

      if (!response.isSignedIn) {
        throw new Error('Password update could not be completed. Try again.');
      }

      setSignInChallenge('none');
      setNeedsConfirmation(false);
      await refreshAuthUser();
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Unable to set a new password.');
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function signUpWithEmail(payload: SignUpPayload) {
    setBusy(true);
    setAuthMessage('');
    setSignInChallenge('none');
    try {
      const normalizedEmail = payload.email.trim().toLowerCase();

      if (MANUAL_ADMIN_EMAILS.includes(normalizedEmail)) {
        setAuthMessage('Admin accounts are created manually. Use sign in with the admin credentials instead.');
        return;
      }

      const response = await signUp({ username: normalizedEmail, password: payload.password, options: { userAttributes: { email: normalizedEmail, name: payload.fullName } } });
      setPendingEmail(normalizedEmail);
      setNeedsConfirmation(response.nextStep.signUpStep !== 'DONE');
      setProfile((current: UserProfile) => ({ ...current, fullName: payload.fullName, email: normalizedEmail, phone: payload.phone }));
      setAuthMessage('Account created. Enter the email verification code.');
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Unable to create account.');
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
      setAuthMessage('Email verified. You can sign in now.');
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Unable to confirm your code.');
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
    const company: Company = { id: `company-${Date.now()}`, name: draft.name, slug: slugify(draft.name), description: draft.description, category: draft.category, supportEmail: draft.supportEmail, supportPhone: draft.supportPhone, accentColor: draft.accentColor, logoText: draft.logoText, profileImageUrl: draft.profileImageUrl, ownerEmail: '', isActive: true, createdAtLabel: nowLabel() };
    setCompanies((current) => [company, ...current]);
    await safeCreate('Company', { ...company });
    await createAuditEvent({ entityType: 'company', entityId: company.id, companyId: company.id, action: 'createCompany', status: 'success', summary: `Created company workspace for ${company.name}.`, metadata: [company.supportEmail, company.accentColor] });
    return company;
  }

  async function updateCompany(companyId: string, draft: CompanyDraft) {
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
    const existingCompany = companies.find((entry) => entry.name === draft.companyName);
    const company = existingCompany ?? (await createCompany({ name: draft.companyName, description: 'New partner workspace', category: APP_DEFAULT_COMPANY_CATEGORY, supportEmail: draft.email, supportPhone: '', accentColor: '#0F7B45', logoText: draft.companyName.slice(0, 2).toUpperCase(), profileImageUrl: '' }));
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
      createNotification({ recipientRole: 'admin', title: `Invitation sent to ${invitation.email}`, body: `${invitation.companyName} is waiting for company owner activation.`, kind: 'invitation', destinationTab: 'settings' }),
      createNotification({ recipientRole: 'company', recipientEmail: invitation.email, companyId: invitation.companyId, title: `You were invited to ${invitation.companyName}`, body: 'Use the email invitation from Cognito to sign in with your temporary password and create a new one.', kind: 'invitation', destinationTab: 'overview' }),
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
    await createNotification({ recipientRole: 'admin', title: `Invitation resent to ${invitation.email}`, body: `${invitation.companyName} invitation delivery was retried.`, kind: 'invitation', destinationTab: 'settings' });
    await createAuditEvent({ entityType: 'invitation', entityId: invitationId, companyId: invitation.companyId, action: 'resendInvitation', status: 'success', summary: `Invitation delivery retried for ${invitation.email}.`, metadata: [invitation.companyName] });
  }

  async function revokeInvitation(invitationId: string) {
    const invitation = invitations.find((entry) => entry.id === invitationId);
    setInvitations((current) => current.map((entry) => (entry.id === invitationId ? { ...entry, status: 'revoked' } : entry)));
    await safeUpdate('CompanyInvitation', { id: invitationId, status: 'revoked' });
    if (invitation) {
      await createNotification({ recipientRole: 'admin', title: `Invitation revoked for ${invitation.email}`, body: `${invitation.companyName} invitation has been revoked.`, kind: 'invitation', destinationTab: 'settings' });
      await createAuditEvent({ entityType: 'invitation', entityId: invitationId, companyId: invitation.companyId, action: 'revokeInvitation', status: 'warning', summary: `Invitation revoked for ${invitation.email}.`, metadata: [invitation.companyName] });
    }
  }

  async function saveCatalogItem(companyId: string, draft: CatalogItemDraft) {
    const company = companies.find((entry) => entry.id === companyId);
    if (!company) {
      throw new Error('No active company workspace was found for this catalog item.');
    }
    const item: CatalogItem = { id: draft.id ?? `item-${Date.now()}`, companyId, companyName: company.name, kind: draft.kind, title: draft.title, summary: draft.summary, description: draft.description, category: draft.category, price: draft.price, durationLabel: draft.durationLabel, isPublished: draft.isPublished, featured: draft.featured, tags: draft.tags, loyaltyPoints: draft.loyaltyPoints, imageUrl: draft.imageUrl, imageHint: draft.imageHint };
    setCatalogItems((current) => draft.id ? current.map((entry) => (entry.id === draft.id ? item : entry)) : [item, ...current]);
    if (draft.id) {
      await safeUpdate('CatalogItem', { ...item, tags: JSON.stringify(item.tags) });
    } else {
      await safeCreate('CatalogItem', { ...item, tags: JSON.stringify(item.tags) });
    }
    await createAuditEvent({ entityType: 'catalogItem', entityId: item.id, companyId, action: draft.id ? 'updateCatalogItem' : 'createCatalogItem', status: item.isPublished ? 'success' : 'info', summary: `${item.title} was ${draft.id ? 'updated' : 'saved'}${item.isPublished ? ' and published' : ' as a draft'}.`, metadata: [item.kind, item.category, `${item.price}`] });
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
      isActive: draft.isActive,
      sortOrder: draft.sortOrder,
    };

    setOfferPromotions((current) => draft.id ? current.map((entry) => (entry.id === draft.id ? nextPromotion : entry)) : [nextPromotion, ...current]);

    if (draft.id) {
      await safeUpdate('OfferPromotion', { ...nextPromotion });
    } else {
      await safeCreate('OfferPromotion', { ...nextPromotion });
    }

    await Promise.all([
      createNotification({ recipientRole: 'company', companyId, title: `${nextPromotion.title} is ${nextPromotion.isActive ? 'live' : 'saved'}`, body: `Promotion linked to ${nextPromotion.catalogItemTitle}.`, kind: 'promotion', destinationTab: 'offers' }),
      ...(nextPromotion.isActive
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
      throw new Error('Please sign in before booking.');
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
    <AppContext.Provider value={{ initialized, busy, authUser, authMessage, needsConfirmation, signInChallenge, activeRole, profile, addresses, users, companies, appCategorySettings, invitations, catalogItems, offerPromotions, notifications, auditEvents, bookings, availabilitySlots, ratings, loyaltyPrograms, currentUserRecord, currentCompany, marketplaceItems, signInWithEmail, completeNewPassword, signUpWithEmail, confirmEmailCode, signOutCurrentUser, saveProfile, saveAddress, createCompany, updateCompany, setCompanyActive, deleteCompany, inviteCompany, resendCompanyInvitation, revokeInvitation, saveCatalogItem, deleteCatalogItem, saveOfferPromotion, deleteOfferPromotion, markNotificationRead, saveLoyaltyProgram, saveCategorySetting, saveAvailabilitySlot, deleteAvailabilitySlot, placeBooking, changeBookingStatus, submitRating }}>
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
