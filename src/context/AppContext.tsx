import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  confirmSignUp,
  fetchUserAttributes,
  getCurrentUser,
  signIn,
  signOut,
  signUp,
} from 'aws-amplify/auth';

import { getServiceByKey } from '../data/catalog';
import { dataClient } from '../lib/amplify';
import {
  Address,
  AuthUser,
  Booking,
  BookingDraft,
  BookingStage,
  PaymentMethod,
  SignUpPayload,
  UserProfile,
} from '../types';

const STORAGE_KEY = 'jahzeen-app-state-v1';

const starterProfile: UserProfile = {
  fullName: 'Guest Customer',
  email: '',
  phone: '+974 5555 5555',
  preferredLanguage: 'en',
  defaultPaymentMethod: 'card',
};

const starterAddress: Address = {
  id: 'address-1',
  label: 'Home',
  area: 'West Bay',
  street: 'Conference Centre Street',
  building: 'Tower 12',
  unitNumber: 'Apt 1804',
  instructions: 'Call on arrival and use visitor parking.',
  contactName: 'Guest Customer',
  contactPhone: '+974 5555 5555',
  isDefault: true,
};

const starterBooking: Booking = {
  id: 'booking-1',
  bookingNumber: 'JHZ-10482',
  serviceKey: 'cleaning',
  serviceTitle: 'Home Cleaning',
  packageTitle: 'Regular Refresh',
  dateLabel: 'Today',
  timeLabel: '4:00 PM - 6:00 PM',
  recurrence: 'Weekly',
  addressLabel: 'Home',
  addressLine: 'West Bay, Tower 12, Apt 1804',
  paymentMethod: 'card',
  notes: 'Please focus on the kitchen and guest bathroom.',
  subtotal: 89,
  serviceFee: 10,
  discount: 10,
  total: 89,
  status: 'enRoute',
  extras: ['Add ironing'],
  timeline: [
    { id: 't1', title: 'Booking confirmed', time: '10:12 AM', done: true },
    { id: 't2', title: 'Professional assigned', time: '10:24 AM', done: true },
    { id: 't3', title: 'On the way', time: '3:32 PM', done: true },
    { id: 't4', title: 'Service in progress', time: 'Estimated 4:00 PM', done: false },
  ],
};

interface AppContextValue {
  initialized: boolean;
  busy: boolean;
  authUser: AuthUser | null;
  authMessage: string;
  needsConfirmation: boolean;
  profile: UserProfile;
  addresses: Address[];
  bookings: Booking[];
  activeBooking: Booking | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (payload: SignUpPayload) => Promise<void>;
  confirmEmailCode: (code: string) => Promise<void>;
  signOutCurrentUser: () => Promise<void>;
  saveProfile: (nextProfile: UserProfile) => Promise<void>;
  saveAddress: (address: Omit<Address, 'id'> & { id?: string }) => Promise<void>;
  placeBooking: (draft: BookingDraft) => Promise<Booking>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

function serializeState(profile: UserProfile, addresses: Address[], bookings: Booking[]) {
  return JSON.stringify({ profile, addresses, bookings });
}

function formatAddress(address: Address) {
  return `${address.area}, ${address.building}, ${address.unitNumber}`;
}

function toTitle(status: BookingStage) {
  if (status === 'confirmed') return 'Confirmed';
  if (status === 'assigned') return 'Assigned';
  if (status === 'enRoute') return 'On the way';
  if (status === 'inProgress') return 'In progress';
  return 'Completed';
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authMessage, setAuthMessage] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [profile, setProfile] = useState<UserProfile>(starterProfile);
  const [addresses, setAddresses] = useState<Address[]>([starterAddress]);
  const [bookings, setBookings] = useState<Booking[]>([starterBooking]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && !cancelled) {
          const parsed = JSON.parse(stored) as {
            profile: UserProfile;
            addresses: Address[];
            bookings: Booking[];
          };
          setProfile(parsed.profile ?? starterProfile);
          setAddresses(parsed.addresses?.length ? parsed.addresses : [starterAddress]);
          setBookings(parsed.bookings?.length ? parsed.bookings : [starterBooking]);
        }

        await refreshAuthUser();
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

    AsyncStorage.setItem(STORAGE_KEY, serializeState(profile, addresses, bookings)).catch(() => {
      // Ignore persistence failures and keep the app responsive.
    });
  }, [initialized, profile, addresses, bookings]);

  async function refreshAuthUser() {
    try {
      const currentUser = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      const nextAuthUser: AuthUser = {
        userId: currentUser.userId,
        email: attributes.email ?? '',
        fullName: attributes.name ?? attributes.email ?? 'Jahzeen customer',
      };
      setAuthUser(nextAuthUser);
      setProfile((currentProfile) => ({
        ...currentProfile,
        email: nextAuthUser.email || currentProfile.email,
        fullName: nextAuthUser.fullName || currentProfile.fullName,
      }));
      setAuthMessage('Signed in to Amplify. Cloud sync is enabled.');
      await syncCloudRecords();
    } catch {
      setAuthUser(null);
    }
  }

  async function syncCloudRecords() {
    try {
      const [remoteBookings, remoteAddresses, remoteProfiles] = await Promise.all([
        dataClient.models.Booking.list(),
        dataClient.models.Address.list(),
        dataClient.models.UserProfile.list(),
      ]);

      if (remoteBookings.data?.length) {
        const mappedBookings = remoteBookings.data.map((entry: any) => ({
          id: entry.id,
          bookingNumber: entry.bookingNumber ?? entry.id,
          serviceKey: (entry.serviceKey as Booking['serviceKey']) ?? 'cleaning',
          serviceTitle: entry.serviceTitle ?? 'Home Cleaning',
          packageTitle: entry.packageTitle ?? 'Regular Refresh',
          dateLabel: entry.dateLabel ?? 'Upcoming',
          timeLabel: entry.timeLabel ?? 'TBD',
          recurrence: entry.recurrence ?? 'One time',
          addressLabel: entry.addressLabel ?? 'Saved address',
          addressLine: entry.addressLine ?? '',
          paymentMethod: (entry.paymentMethod as PaymentMethod) ?? 'card',
          notes: entry.notes ?? '',
          subtotal: Number(entry.subtotal ?? 0),
          serviceFee: Number(entry.serviceFee ?? 0),
          discount: Number(entry.discount ?? 0),
          total: Number(entry.total ?? 0),
          status: (entry.status as BookingStage) ?? 'confirmed',
          extras: entry.extras ? JSON.parse(entry.extras) : [],
          timeline: entry.timeline ? JSON.parse(entry.timeline) : [],
        }));
        setBookings(mappedBookings);
      }

      if (remoteAddresses.data?.length) {
        const mappedAddresses = remoteAddresses.data.map((entry: any) => ({
          id: entry.id,
          label: entry.label ?? 'Address',
          area: entry.area ?? '',
          street: entry.street ?? '',
          building: entry.building ?? '',
          unitNumber: entry.unitNumber ?? '',
          instructions: entry.instructions ?? '',
          contactName: entry.contactName ?? '',
          contactPhone: entry.contactPhone ?? '',
          isDefault: !!entry.isDefault,
        }));
        setAddresses(mappedAddresses);
      }

      if (remoteProfiles.data?.[0]) {
        const firstProfile = remoteProfiles.data[0];
        setProfile((currentProfile) => ({
          ...currentProfile,
          fullName: firstProfile.fullName ?? currentProfile.fullName,
          email: firstProfile.email ?? currentProfile.email,
          phone: firstProfile.phone ?? currentProfile.phone,
          preferredLanguage: (firstProfile.preferredLanguage as UserProfile['preferredLanguage']) ?? currentProfile.preferredLanguage,
          defaultPaymentMethod: (firstProfile.defaultPaymentMethod as PaymentMethod) ?? currentProfile.defaultPaymentMethod,
        }));
      }
    } catch {
      // Cloud sync is optional until the backend schema is deployed.
    }
  }

  async function signInWithEmail(email: string, password: string) {
    setBusy(true);
    setAuthMessage('');
    try {
      await signIn({ username: email.trim().toLowerCase(), password });
      setNeedsConfirmation(false);
      await refreshAuthUser();
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  }

  async function signUpWithEmail(payload: SignUpPayload) {
    setBusy(true);
    setAuthMessage('');
    try {
      const response = await signUp({
        username: payload.email.trim().toLowerCase(),
        password: payload.password,
        options: {
          userAttributes: {
            email: payload.email.trim().toLowerCase(),
            name: payload.fullName,
          },
        },
      });
      setPendingEmail(payload.email.trim().toLowerCase());
      setNeedsConfirmation(response.nextStep.signUpStep !== 'DONE');
      setProfile((currentProfile) => ({
        ...currentProfile,
        fullName: payload.fullName,
        email: payload.email.trim().toLowerCase(),
        phone: payload.phone,
      }));
      setAuthMessage('Account created. Enter the code sent to your email.');
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Unable to create the account.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmEmailCode(code: string) {
    if (!pendingEmail) {
      setAuthMessage('Create an account before confirming the verification code.');
      return;
    }

    setBusy(true);
    setAuthMessage('');
    try {
      await confirmSignUp({ username: pendingEmail, confirmationCode: code.trim() });
      setNeedsConfirmation(false);
      setAuthMessage('Email verified. You can now sign in.');
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Unable to confirm your code.');
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
      setAuthMessage('You have been signed out.');
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Unable to sign out.');
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(nextProfile: UserProfile) {
    setProfile(nextProfile);
    if (!authUser) {
      return;
    }

    try {
      const remoteProfiles = await dataClient.models.UserProfile.list();
      const existingProfile = remoteProfiles.data?.[0];
      if (existingProfile) {
        await dataClient.models.UserProfile.update({
          id: existingProfile.id,
          fullName: nextProfile.fullName,
          email: nextProfile.email,
          phone: nextProfile.phone,
          preferredLanguage: nextProfile.preferredLanguage,
          defaultPaymentMethod: nextProfile.defaultPaymentMethod,
        });
      } else {
        await dataClient.models.UserProfile.create({
          fullName: nextProfile.fullName,
          email: nextProfile.email,
          phone: nextProfile.phone,
          preferredLanguage: nextProfile.preferredLanguage,
          defaultPaymentMethod: nextProfile.defaultPaymentMethod,
        });
      }
    } catch {
      // Saving locally keeps the UX working even when cloud sync is unavailable.
    }
  }

  async function saveAddress(address: Omit<Address, 'id'> & { id?: string }) {
    const nextAddress: Address = {
      ...address,
      id: address.id ?? `address-${Date.now()}`,
    };

    const updatedAddresses = nextAddress.id && addresses.some((entry) => entry.id === nextAddress.id)
      ? addresses.map((entry) => {
          if (entry.id === nextAddress.id) {
            return nextAddress;
          }
          return nextAddress.isDefault ? { ...entry, isDefault: false } : entry;
        })
      : [
          ...addresses.map((entry) => (nextAddress.isDefault ? { ...entry, isDefault: false } : entry)),
          nextAddress,
        ];

    setAddresses(updatedAddresses);

    if (!authUser) {
      return;
    }

    try {
      if (address.id) {
        await dataClient.models.Address.update({
          id: nextAddress.id,
          label: nextAddress.label,
          area: nextAddress.area,
          street: nextAddress.street,
          building: nextAddress.building,
          unitNumber: nextAddress.unitNumber,
          instructions: nextAddress.instructions,
          contactName: nextAddress.contactName,
          contactPhone: nextAddress.contactPhone,
          isDefault: nextAddress.isDefault,
        });
      } else {
        await dataClient.models.Address.create({
          label: nextAddress.label,
          area: nextAddress.area,
          street: nextAddress.street,
          building: nextAddress.building,
          unitNumber: nextAddress.unitNumber,
          instructions: nextAddress.instructions,
          contactName: nextAddress.contactName,
          contactPhone: nextAddress.contactPhone,
          isDefault: nextAddress.isDefault,
        });
      }
    } catch {
      // Fall back to local-first behavior.
    }
  }

  async function placeBooking(draft: BookingDraft) {
    const address = addresses.find((entry) => entry.id === draft.addressId) ?? addresses[0];
    const nextBooking: Booking = {
      id: `booking-${Date.now()}`,
      bookingNumber: `JHZ-${String(Date.now()).slice(-5)}`,
      serviceKey: draft.serviceKey,
      serviceTitle: draft.serviceTitle,
      packageTitle: draft.packageTitle,
      dateLabel: draft.dateLabel,
      timeLabel: draft.timeLabel,
      recurrence: draft.recurrence,
      addressLabel: address.label,
      addressLine: formatAddress(address),
      paymentMethod: draft.paymentMethod,
      notes: draft.notes,
      subtotal: draft.subtotal,
      serviceFee: draft.serviceFee,
      discount: draft.discount,
      total: draft.total,
      status: 'confirmed',
      extras: draft.extras,
      timeline: [
        { id: 'confirmed', title: 'Booking confirmed', time: 'Just now', done: true },
        { id: 'assigned', title: 'Professional assignment', time: 'Expected in 15 min', done: false },
        { id: 'arrival', title: 'Arrival at your location', time: draft.timeLabel, done: false },
      ],
    };

    setBookings((currentBookings) => [nextBooking, ...currentBookings]);

    if (authUser) {
      try {
        await dataClient.models.Booking.create({
          bookingNumber: nextBooking.bookingNumber,
          serviceKey: nextBooking.serviceKey,
          serviceTitle: nextBooking.serviceTitle,
          packageTitle: nextBooking.packageTitle,
          dateLabel: nextBooking.dateLabel,
          timeLabel: nextBooking.timeLabel,
          recurrence: nextBooking.recurrence,
          addressLabel: nextBooking.addressLabel,
          addressLine: nextBooking.addressLine,
          paymentMethod: nextBooking.paymentMethod,
          notes: nextBooking.notes,
          subtotal: nextBooking.subtotal,
          serviceFee: nextBooking.serviceFee,
          discount: nextBooking.discount,
          total: nextBooking.total,
          status: nextBooking.status,
          extras: JSON.stringify(nextBooking.extras),
          timeline: JSON.stringify(nextBooking.timeline),
        });
      } catch {
        // Local creation already succeeded.
      }
    }

    const selectedService = getServiceByKey(draft.serviceKey);
    setAuthMessage(`${selectedService.title} booked successfully. Tracking is now available.`);
    return nextBooking;
  }

  const activeBooking = bookings.find((entry) => entry.status !== 'completed') ?? null;

  return (
    <AppContext.Provider
      value={{
        initialized,
        busy,
        authUser,
        authMessage,
        needsConfirmation,
        profile,
        addresses,
        bookings,
        activeBooking,
        signInWithEmail,
        signUpWithEmail,
        confirmEmailCode,
        signOutCurrentUser,
        saveProfile,
        saveAddress,
        placeBooking,
      }}
    >
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

export { toTitle };
