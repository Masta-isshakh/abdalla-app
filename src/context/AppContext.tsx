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
  AppNotification,
  AppRole,
  AppUserRecord,
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

const STORAGE_KEY = 'jahzeen-platform-state-v4';
const MANUAL_ADMIN_EMAILS = ['owner@jahzeen.app', 'admin@jahzeen.app'];

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
  invitations: CompanyInvitation[];
  catalogItems: CatalogItem[];
  offerPromotions: OfferPromotion[];
  notifications: AppNotification[];
  bookings: Booking[];
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
  invitations: CompanyInvitation[];
  catalogItems: CatalogItem[];
  offerPromotions: OfferPromotion[];
  notifications: AppNotification[];
  bookings: Booking[];
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
  const [invitations, setInvitations] = useState<CompanyInvitation[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [offerPromotions, setOfferPromotions] = useState<OfferPromotion[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
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
          setCompanies(parsed.companies ?? []);
          setInvitations(parsed.invitations ?? []);
          setCatalogItems(parsed.catalogItems ?? []);
          setOfferPromotions(parsed.offerPromotions ?? []);
          setNotifications(parsed.notifications ?? []);
          setBookings(parsed.bookings ?? []);
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
        invitations,
        catalogItems,
        offerPromotions,
        notifications,
        bookings,
        ratings,
        loyaltyPrograms,
      }),
    ).catch(() => {
      // Ignore persistence errors.
    });
  }, [initialized, profile, addresses, users, companies, invitations, catalogItems, offerPromotions, notifications, bookings, ratings, loyaltyPrograms]);

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
      const response = await (dataClient.mutations as any)?.[mutationName]?.(argumentsInput);
      return response?.data ?? null;
    } catch {
      return null;
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

    setAuthMessage(
      result?.success
        ? `Invitation email sent to ${invitation.email}.`
        : `Invitation saved, but email delivery failed: ${emailDeliveryError}`,
    );
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

  async function ensureUserRecord(nextAuthUser: AuthUser) {
    const email = nextAuthUser.email.trim().toLowerCase();
    const existingUser = users.find((entry) => entry.email.toLowerCase() === email);
    const matchingInvitation = invitations.find((entry) => entry.email.toLowerCase() === email && entry.status === 'pending');

    if (existingUser) {
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
      const [remoteUsers, remoteCompanies, remoteInvitations, remoteItems, remotePromotions, remoteNotifications, remoteBookings, remoteRatings, remotePrograms, remoteAddresses, remoteProfiles] = await Promise.all([
        safeList('AppUser'),
        safeList('Company'),
        safeList('CompanyInvitation'),
        safeList('CatalogItem'),
        safeList('OfferPromotion'),
        safeList('AppNotification'),
        safeList('Booking'),
        safeList('Rating'),
        safeList('LoyaltyProgram'),
        safeList('Address'),
        safeList('UserProfile'),
      ]);

      if (remoteUsers.length) {
        setUsers(remoteUsers.map((entry: any) => ({ id: entry.id, email: entry.email, fullName: entry.fullName, phone: entry.phone ?? '', role: entry.role, companyId: entry.companyId ?? undefined, companyName: entry.companyName ?? undefined, invitedByEmail: entry.invitedByEmail ?? undefined, status: entry.status })));
      }
      if (remoteCompanies.length) {
        setCompanies(remoteCompanies.map((entry: any) => ({ id: entry.id, name: entry.name, slug: entry.slug, description: entry.description ?? '', supportEmail: entry.supportEmail, supportPhone: entry.supportPhone ?? '', accentColor: entry.accentColor ?? '#0F7B45', logoText: entry.logoText ?? entry.name.slice(0, 2).toUpperCase(), ownerEmail: entry.ownerEmail ?? '', isActive: !!entry.isActive, createdAtLabel: entry.createdAtLabel ?? nowLabel() })));
      }
      if (remoteInvitations.length) {
        setInvitations(remoteInvitations.map((entry: any) => ({ id: entry.id, companyId: entry.companyId, companyName: entry.companyName, email: entry.email, invitedByEmail: entry.invitedByEmail, status: entry.status, message: entry.message ?? '', emailDeliveryStatus: entry.emailDeliveryStatus ?? 'pending', emailDeliveryError: entry.emailDeliveryError ?? undefined, emailSentAtLabel: entry.emailSentAtLabel ?? undefined })));
      }
      if (remoteItems.length) {
        setCatalogItems(remoteItems.map((entry: any) => ({ id: entry.id, companyId: entry.companyId, companyName: entry.companyName, kind: entry.kind, title: entry.title, summary: entry.summary, description: entry.description ?? '', category: entry.category, price: Number(entry.price ?? 0), durationLabel: entry.durationLabel ?? '', isPublished: !!entry.isPublished, featured: !!entry.featured, tags: parseList(entry.tags), loyaltyPoints: Number(entry.loyaltyPoints ?? 0), imageHint: entry.imageHint ?? '' })));
      }
      if (remotePromotions.length) {
        setOfferPromotions(remotePromotions.map((entry: any) => ({ id: entry.id, companyId: entry.companyId, companyName: entry.companyName, catalogItemId: entry.catalogItemId, catalogItemTitle: entry.catalogItemTitle, title: entry.title, headline: entry.headline ?? '', badgeText: entry.badgeText ?? '', discountLabel: entry.discountLabel ?? '', startsAtLabel: entry.startsAtLabel ?? '', endsAtLabel: entry.endsAtLabel ?? '', isActive: !!entry.isActive, sortOrder: Number(entry.sortOrder ?? 0) })));
      }
      if (remoteNotifications.length) {
        setNotifications(remoteNotifications.map((entry: any) => ({ id: entry.id, recipientRole: entry.recipientRole, recipientEmail: entry.recipientEmail ?? undefined, companyId: entry.companyId ?? undefined, title: entry.title, body: entry.body ?? '', kind: entry.kind, destinationTab: entry.destinationTab ?? 'overview', isRead: !!entry.isRead, createdAtLabel: entry.createdAtLabel ?? nowLabel() })));
      }
      if (remoteBookings.length) {
        setBookings(remoteBookings.map((entry: any) => ({ id: entry.id, bookingNumber: entry.bookingNumber, customerEmail: entry.customerEmail, customerName: entry.customerName, companyId: entry.companyId, companyName: entry.companyName, itemId: entry.itemId, itemTitle: entry.itemTitle, kind: entry.kind, scheduleDate: entry.scheduleDate, scheduleTime: entry.scheduleTime, addressLabel: entry.addressLabel, addressLine: entry.addressLine, paymentMethod: entry.paymentMethod, notes: entry.notes ?? '', status: entry.status, subtotal: Number(entry.subtotal ?? 0), serviceFee: Number(entry.serviceFee ?? 0), discount: Number(entry.discount ?? 0), total: Number(entry.total ?? 0), loyaltyPointsEarned: Number(entry.loyaltyPointsEarned ?? 0), ratingSubmitted: !!entry.ratingSubmitted, timeline: parseTimeline(entry.timeline) })));
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
      await signOut();
      setAuthUser(null);
      setAuthGroups([]);
      setPendingEmail('');
      setNeedsConfirmation(false);
      setSignInChallenge('none');
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
  }

  async function saveAddress(address: Omit<Address, 'id'> & { id?: string }) {
    const nextAddress: Address = { ...address, id: address.id ?? `address-${Date.now()}` };
    setAddresses((current) => address.id ? current.map((entry) => (entry.id === address.id ? nextAddress : nextAddress.isDefault ? { ...entry, isDefault: false } : entry)) : [...current.map((entry) => (nextAddress.isDefault ? { ...entry, isDefault: false } : entry)), nextAddress]);
    if (address.id) {
      await safeUpdate('Address', { ...nextAddress });
    } else {
      await safeCreate('Address', { ...nextAddress });
    }
  }

  async function createCompany(draft: CompanyDraft) {
    const company: Company = { id: `company-${Date.now()}`, name: draft.name, slug: slugify(draft.name), description: draft.description, supportEmail: draft.supportEmail, supportPhone: draft.supportPhone, accentColor: draft.accentColor, logoText: draft.logoText, ownerEmail: '', isActive: true, createdAtLabel: nowLabel() };
    setCompanies((current) => [company, ...current]);
    await safeCreate('Company', { ...company });
    return company;
  }

  async function updateCompany(companyId: string, draft: CompanyDraft) {
    setCompanies((current) => current.map((entry) => (entry.id === companyId ? { ...entry, name: draft.name, slug: slugify(draft.name), description: draft.description, supportEmail: draft.supportEmail, supportPhone: draft.supportPhone, accentColor: draft.accentColor, logoText: draft.logoText } : entry)));
    await safeUpdate('Company', { id: companyId, ...draft, slug: slugify(draft.name) });
  }

  async function setCompanyActive(companyId: string, isActive: boolean) {
    setCompanies((current) => current.map((entry) => (entry.id === companyId ? { ...entry, isActive } : entry)));
    await safeUpdate('Company', { id: companyId, isActive });
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
  }

  async function inviteCompany(draft: InvitationDraft) {
    const existingCompany = companies.find((entry) => entry.name === draft.companyName);
    const company = existingCompany ?? (await createCompany({ name: draft.companyName, description: 'New partner workspace', supportEmail: draft.email, supportPhone: '', accentColor: '#145DA0', logoText: draft.companyName.slice(0, 2).toUpperCase() }));
    const invitation: CompanyInvitation = { id: `invite-${Date.now()}`, companyId: company.id, companyName: company.name, email: draft.email.trim().toLowerCase(), invitedByEmail: authUser?.email ?? 'admin@jahzeen.app', status: 'pending', message: draft.message, emailDeliveryStatus: 'pending' };
    setInvitations((current) => [invitation, ...current]);
    await safeCreate('CompanyInvitation', { ...invitation });
    await dispatchInvitationEmail(invitation);
    await Promise.all([
      createNotification({ recipientRole: 'admin', title: `Invitation sent to ${invitation.email}`, body: `${invitation.companyName} is waiting for company owner activation.`, kind: 'invitation', destinationTab: 'settings' }),
      createNotification({ recipientRole: 'company', recipientEmail: invitation.email, companyId: invitation.companyId, title: `You were invited to ${invitation.companyName}`, body: 'Sign in with your invited company account after confirming your email.', kind: 'invitation', destinationTab: 'overview' }),
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
  }

  async function revokeInvitation(invitationId: string) {
    const invitation = invitations.find((entry) => entry.id === invitationId);
    setInvitations((current) => current.map((entry) => (entry.id === invitationId ? { ...entry, status: 'revoked' } : entry)));
    await safeUpdate('CompanyInvitation', { id: invitationId, status: 'revoked' });
    if (invitation) {
      await createNotification({ recipientRole: 'admin', title: `Invitation revoked for ${invitation.email}`, body: `${invitation.companyName} invitation has been revoked.`, kind: 'invitation', destinationTab: 'settings' });
    }
  }

  async function saveCatalogItem(companyId: string, draft: CatalogItemDraft) {
    const company = companies.find((entry) => entry.id === companyId);
    if (!company) {
      return;
    }
    const item: CatalogItem = { id: draft.id ?? `item-${Date.now()}`, companyId, companyName: company.name, kind: draft.kind, title: draft.title, summary: draft.summary, description: draft.description, category: draft.category, price: draft.price, durationLabel: draft.durationLabel, isPublished: draft.isPublished, featured: draft.featured, tags: draft.tags, loyaltyPoints: draft.loyaltyPoints, imageHint: draft.imageHint };
    setCatalogItems((current) => draft.id ? current.map((entry) => (entry.id === draft.id ? item : entry)) : [item, ...current]);
    if (draft.id) {
      await safeUpdate('CatalogItem', { ...item, tags: JSON.stringify(item.tags) });
    } else {
      await safeCreate('CatalogItem', { ...item, tags: JSON.stringify(item.tags) });
    }
  }

  async function deleteCatalogItem(itemId: string) {
    setCatalogItems((current) => current.filter((entry) => entry.id !== itemId));
    const linkedPromotions = offerPromotions.filter((entry) => entry.catalogItemId === itemId);
    setOfferPromotions((current) => current.filter((entry) => entry.catalogItemId !== itemId));
    await safeDelete('CatalogItem', itemId);
    await Promise.all(linkedPromotions.map((entry) => safeDelete('OfferPromotion', entry.id)));
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
  }

  async function deleteOfferPromotion(promotionId: string) {
    setOfferPromotions((current) => current.filter((entry) => entry.id !== promotionId));
    await safeDelete('OfferPromotion', promotionId);
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
  }

  async function placeBooking(draft: BookingDraft) {
    if (!authUser) {
      throw new Error('Please sign in before booking.');
    }
    const item = catalogItems.find((entry) => entry.id === draft.itemId && entry.companyId === draft.companyId);
    const address = addresses.find((entry) => entry.id === draft.addressId) ?? addresses[0];
    const companyProgram = loyaltyPrograms.find((entry) => entry.scope === 'company' && entry.companyId === draft.companyId && entry.isActive);
    if (!item || !address) {
      throw new Error('Booking details are incomplete.');
    }
    const booking: Booking = { id: `booking-${Date.now()}`, bookingNumber: `JHZ-${String(Date.now()).slice(-6)}`, customerEmail: authUser.email, customerName: profile.fullName || authUser.fullName, companyId: item.companyId, companyName: item.companyName, itemId: item.id, itemTitle: item.title, kind: item.kind, scheduleDate: draft.scheduleDate, scheduleTime: draft.scheduleTime, addressLabel: address.label, addressLine: formatAddress(address), paymentMethod: draft.paymentMethod, notes: draft.notes, status: 'pending', subtotal: item.price, serviceFee: item.kind === 'service' ? 10 : 0, discount: 0, total: item.price + (item.kind === 'service' ? 10 : 0), loyaltyPointsEarned: companyProgram?.pointsPerBooking ?? item.loyaltyPoints, ratingSubmitted: false, timeline: [{ id: 'pending', title: 'Booking requested', time: 'Just now', done: true }, { id: 'approval', title: 'Awaiting company approval', time: 'Pending', done: false }, { id: 'service', title: 'Service or delivery window', time: `${draft.scheduleDate} · ${draft.scheduleTime}`, done: false }] };
    setBookings((current) => [booking, ...current]);
    await safeCreate('Booking', { ...booking, timeline: JSON.stringify(booking.timeline) });
    await Promise.all([
      createNotification({ recipientRole: 'customer', recipientEmail: authUser.email, title: `Booking ${booking.bookingNumber} submitted`, body: `${booking.itemTitle} is waiting for company approval.`, kind: 'booking', destinationTab: 'orders' }),
      createNotification({ recipientRole: 'company', companyId: booking.companyId, title: `New booking for ${booking.itemTitle}`, body: `${booking.customerName} placed ${booking.bookingNumber}.`, kind: 'booking', destinationTab: 'bookings' }),
      createNotification({ recipientRole: 'admin', title: `New marketplace booking ${booking.bookingNumber}`, body: `${booking.companyName} received a new booking.`, kind: 'booking', destinationTab: 'bookings' }),
    ]);
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
  }

  return (
    <AppContext.Provider value={{ initialized, busy, authUser, authMessage, needsConfirmation, signInChallenge, activeRole, profile, addresses, users, companies, invitations, catalogItems, offerPromotions, notifications, bookings, ratings, loyaltyPrograms, currentUserRecord, currentCompany, marketplaceItems, signInWithEmail, completeNewPassword, signUpWithEmail, confirmEmailCode, signOutCurrentUser, saveProfile, saveAddress, createCompany, updateCompany, setCompanyActive, deleteCompany, inviteCompany, resendCompanyInvitation, revokeInvitation, saveCatalogItem, deleteCatalogItem, saveOfferPromotion, deleteOfferPromotion, markNotificationRead, saveLoyaltyProgram, placeBooking, changeBookingStatus, submitRating }}>
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
