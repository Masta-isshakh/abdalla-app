import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { confirmSignUp as confirmPhoneSignUp, resendSignUpCode, signUp as signUpWithPhoneOtp } from 'aws-amplify/auth';
import {
  ActivityIndicator,
  Image,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

import { readableBookingStatus, useAppState } from '../context/AppContext';
import { JahzeenLogo } from '../components/JahzeenLogo';
import {
  Address,
  AvailabilitySlot,
  AppCategorySetting,
  AppNotification,
  AppRole,
  AuditEvent,
  Booking,
  BookingStatus,
  CatalogItem,
  Company,
  CompanyInvitation,
  OfferPromotion,
  PaymentMethod,
  UserProfile,
} from '../app-types';

type RootStackParamList = {
  Workspace: undefined;
};

type BannerTone = 'success' | 'error' | 'info';

type BannerState = {
  tone: BannerTone;
  text: string;
} | null;

type ValidationMap = Record<string, string>;
type CustomerSortMode = 'popular' | 'newest' | 'priceLow' | 'priceHigh';
type CustomerTabKey = 'home' | 'browse' | 'explore' | 'orders' | 'profile' | 'notifications';
type CustomerRestrictedTab = 'orders' | 'profile';
type OnboardingStep = 'location' | 'phone' | 'account';

const Stack = createNativeStackNavigator<RootStackParamList>();
const NativeMapComponents = Platform.OS === 'web' ? null : require('react-native-maps');
const NativeMapView = NativeMapComponents?.default;
const NativeMarker = NativeMapComponents?.Marker;

const colors = {
  background: '#F4F8F4',
  surface: '#FFFFFF',
  text: '#0F2A1A',
  muted: '#5A6D61',
  border: '#CFE0D2',
  primary: '#0F7B45',
  accent: '#16A34A',
  hero: '#E8F5EC',
  paleBlue: '#D8EFE1',
  success: '#0F7B45',
  successSurface: '#E8F6EE',
  errorSurface: '#FDEBE7',
  infoSurface: '#ECF6F0',
};

const PAGE_OUTER_WIDTH = Platform.OS === 'ios' ? '100%' : '96%';
const PAGE_CONTENT_WIDTH = Platform.OS === 'ios' ? '100%' : '92%';

const tableToneFilterMemory: Record<string, 'all' | 'error' | 'warning' | 'success'> = {};
const TABLE_TONE_FILTER_STORAGE_PREFIX = 'jahzeen-table-tone-filter:';
const CUSTOMER_FILTER_STORAGE_PREFIX = 'jahzeen-customer-filters:';
const CUSTOMER_ONBOARDING_STORAGE_KEY = 'jahzeen-customer-onboarding:v1';
const DEFAULT_MAP_PIN = { latitude: 25.2854, longitude: 51.531 }; // Doha Corniche fallback
const CATEGORY_DEFINITIONS = [
  { label: 'Home Cleaning', comingSoon: false },
  { label: 'Car Wash', comingSoon: false },
  { label: 'Car Service', comingSoon: false },
  { label: 'Pest Control', comingSoon: false },
  { label: 'Home Moving', comingSoon: false },
  { label: 'Furniture Cleaning', comingSoon: false },
  { label: 'Deep Cleaning', comingSoon: false },
  { label: 'Water Tank Cleaning', comingSoon: false },
  { label: 'AC Cleaning', comingSoon: false },
  { label: 'New AC', comingSoon: true },
  { label: 'Car Winch', comingSoon: true },
  { label: 'Water Delivery', comingSoon: false },
] as const;
const APP_CATEGORY_OPTIONS: string[] = CATEGORY_DEFINITIONS.map((entry) => entry.label);
const DEFAULT_COMING_SOON_CATEGORIES: Set<string> = new Set(CATEGORY_DEFINITIONS.filter((entry) => entry.comingSoon).map((entry) => entry.label));

type CompanyFormState = {
  name: string;
  description: string;
  category: string;
  supportEmail: string;
  supportPhone: string;
  accentColor: string;
  logoText: string;
  profileImageUrl: string;
  inviteEmail: string;
  inviteMessage: string;
};
const CATEGORY_GROUPS: Array<{ key: string; title: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; categories: string[] }> = [
  {
    key: 'home-services',
    title: 'Home Services',
    icon: 'home-outline',
    categories: [
      'Home Cleaning',
      'Deep Cleaning',
      'Furniture Cleaning',
      'Water Tank Cleaning',
      'Pest Control',
      'Home Moving',
    ],
  },
  {
    key: 'car-services',
    title: 'Car Services',
    icon: 'car-sports',
    categories: ['Car Wash', 'Car Service', 'Car Winch'],
  },
  {
    key: 'ac-services',
    title: 'AC Services',
    icon: 'air-conditioner',
    categories: ['AC Cleaning', 'New AC'],
  },
  {
    key: 'utilities',
    title: 'Utilities',
    icon: 'water',
    categories: ['Water Delivery'],
  },
];
const HOME_CAROUSEL_IMAGES = [
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=1400&q=80',
];

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Workspace" component={WorkspaceScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function WorkspaceScreen() {
  const width = useWindowDimensions().width;
  const wide = width >= 980;
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [selectedCustomerCategory, setSelectedCustomerCategory] = useState<string | null>(null);
  const {
    activeRole,
    addresses,
    authMessage,
    authUser,
    bookings,
    busy,
    catalogItems,
    changeBookingStatus,
    companies,
    appCategorySettings,
    confirmEmailCode,
    createCompany,
    currentCompany,
    currentUserRecord,
    deleteCatalogItem,
    deleteCompany,
    completeNewPassword,
    initialized,
    invitations,
    inviteCompany,
    loyaltyPrograms,
    marketplaceItems,
    notifications,
    auditEvents,
    needsConfirmation,
    signInChallenge,
    offerPromotions,
    availabilitySlots,
    placeBooking,
    profile,
    ratings,
    resendCompanyInvitation,
    revokeInvitation,
    saveAddress,
    saveCatalogItem,
    reviewCatalogItem,
    reviewOfferPromotion,
    saveLoyaltyProgram,
    saveCategorySetting,
    saveAvailabilitySlot,
    saveOfferPromotion,
    saveProfile,
    setCompanyActive,
    signInWithEmail,
    signOutCurrentUser,
    signUpWithEmail,
    submitRating,
    updateCompany,
    users,
    deleteOfferPromotion,
    deleteAvailabilitySlot,
    markNotificationRead,
  } = useAppState();

  const [adminTab, setAdminTab] = useState<'overview' | 'companies' | 'publishing' | 'inbox' | 'bookings' | 'settings'>('overview');
  const [companyTab, setCompanyTab] = useState<'overview' | 'catalog' | 'offers' | 'schedule' | 'bookings' | 'loyalty' | 'requests'>('overview');
  const [customerTab, setCustomerTab] = useState<CustomerTabKey>('home');
  const [customerDarkMode, setCustomerDarkMode] = useState(false);
  const [customerSortMode, setCustomerSortMode] = useState<CustomerSortMode>('popular');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [onboardingHydrated, setOnboardingHydrated] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep | null>(null);
  const [onboardingTargetTab, setOnboardingTargetTab] = useState<CustomerRestrictedTab | null>(null);
  const [locationMode, setLocationMode] = useState<'current' | 'map'>('current');
  const [phoneVerificationForm, setPhoneVerificationForm] = useState({ phone: '', code: '' });
  const [pendingPhoneOtpUsername, setPendingPhoneOtpUsername] = useState('');
  const [pendingPhoneOtpTarget, setPendingPhoneOtpTarget] = useState('');
  const [phoneVerificationBusy, setPhoneVerificationBusy] = useState(false);
  const [accountSetupForm, setAccountSetupForm] = useState({ firstName: '', lastName: '', email: '' });
  const [onboardingErrors, setOnboardingErrors] = useState<ValidationMap>({});
  const [locationBusy, setLocationBusy] = useState(false);
  const [mapPin, setMapPin] = useState(DEFAULT_MAP_PIN);
  const [mapRegion, setMapRegion] = useState({
    ...DEFAULT_MAP_PIN,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  });
  const [guestOnboardingProfile, setGuestOnboardingProfile] = useState({
    locationSet: false,
    phoneVerified: false,
    accountSetup: false,
    phone: '',
    firstName: '',
    lastName: '',
    email: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });

  const [signInForm, setSignInForm] = useState({ email: '', password: '' });
  const [signUpForm, setSignUpForm] = useState({ fullName: '', email: '', password: '', phone: '' });
  const [confirmCode, setConfirmCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [profileForm, setProfileForm] = useState<UserProfile>(profile);
  const [addressForm, setAddressForm] = useState<Address>(addresses[0] ?? emptyAddress());
  const [bookingComposer, setBookingComposer] = useState({
    itemId: '',
    companyId: '',
    slotId: '',
    scheduleDate: 'Today',
    scheduleTime: '6:00 PM',
    addressId: addresses[0]?.id ?? '',
    notes: '',
    paymentMethod: profile.defaultPaymentMethod as PaymentMethod,
  });

  const [companyForm, setCompanyForm] = useState<CompanyFormState>({
    name: '',
    description: '',
    category: APP_CATEGORY_OPTIONS[0],
    supportEmail: '',
    supportPhone: '',
    accentColor: '#0F7B45',
    logoText: '',
    profileImageUrl: '',
    inviteEmail: '',
    inviteMessage: '',
  });
  const [catalogForm, setCatalogForm] = useState({
    title: '',
    summary: '',
    description: '',
    category: '',
    price: '0',
    durationLabel: '',
    kind: 'service' as CatalogItem['kind'],
    tags: '',
    isPublished: true,
    featured: false,
    loyaltyPoints: '10',
    imageUrl: '',
    imageHint: '',
  });
  const [companySettingsForm, setCompanySettingsForm] = useState<CompanyFormState>({
    name: '',
    description: '',
    category: APP_CATEGORY_OPTIONS[0],
    supportEmail: '',
    supportPhone: '',
    accentColor: '#0F7B45',
    logoText: '',
    profileImageUrl: '',
    inviteEmail: '',
    inviteMessage: '',
  });
  const [loyaltyForm, setLoyaltyForm] = useState({
    title: '',
    description: '',
    pointsPerBooking: '10',
    rewardText: '',
    tierRules: '',
    isActive: true,
  });
  const [ratingDrafts, setRatingDrafts] = useState<Record<string, { score: string; review: string }>>({});
  const [offerForm, setOfferForm] = useState({
    catalogItemId: '',
    title: '',
    headline: '',
    badgeText: '',
    discountLabel: '',
    startsAtLabel: '',
    endsAtLabel: '',
    isActive: true,
    sortOrder: '0',
  });
  const [scheduleForm, setScheduleForm] = useState({
    id: '',
    catalogItemId: '',
    dateLabel: 'Tomorrow',
    timeLabel: '10:00 AM',
    status: 'available' as AvailabilitySlot['status'],
    note: '',
  });

  const [selectedAdminCompanyId, setSelectedAdminCompanyId] = useState<string | null>(null);
  const [selectedCatalogItemId, setSelectedCatalogItemId] = useState<string | null>(null);
  const [selectedPromotionId, setSelectedPromotionId] = useState<string | null>(null);
  const [catalogSubmitting, setCatalogSubmitting] = useState(false);
  const [companySubmitting, setCompanySubmitting] = useState(false);
  const [globalLoadingCount, setGlobalLoadingCount] = useState(0);
  const [globalLoadingMessage, setGlobalLoadingMessage] = useState('Processing...');
  const [operationPopup, setOperationPopup] = useState<{ tone: BannerTone; text: string } | null>(null);

  const [companyFormErrors, setCompanyFormErrors] = useState<ValidationMap>({});
  const [catalogFormErrors, setCatalogFormErrors] = useState<ValidationMap>({});
  const [loyaltyFormErrors, setLoyaltyFormErrors] = useState<ValidationMap>({});
  const [offerFormErrors, setOfferFormErrors] = useState<ValidationMap>({});
  const [authErrors, setAuthErrors] = useState<ValidationMap>({});
  const [profileErrors, setProfileErrors] = useState<ValidationMap>({});
  const [addressErrors, setAddressErrors] = useState<ValidationMap>({});
  const [bookingErrors, setBookingErrors] = useState<ValidationMap>({});
  const [ratingErrors, setRatingErrors] = useState<Record<string, string>>({});

  const [adminBanner, setAdminBanner] = useState<BannerState>(null);
  const [companyBanner, setCompanyBanner] = useState<BannerState>(null);
  const [customerBanner, setCustomerBanner] = useState<BannerState>(null);
  const customerFiltersHydratedRef = useRef(false);

  const customerFilterStorageKey = `${CUSTOMER_FILTER_STORAGE_PREFIX}${authUser?.email?.toLowerCase() ?? 'guest'}`;
  const interactionLocked = busy || globalLoadingCount > 0;

  function startGlobalLoading(message: string) {
    setGlobalLoadingMessage(message);
    setGlobalLoadingCount((current) => current + 1);
  }

  function stopGlobalLoading() {
    setGlobalLoadingCount((current) => Math.max(0, current - 1));
  }

  useEffect(() => {
    const nextPopup = customerBanner && (customerBanner.tone === 'success' || customerBanner.tone === 'error')
      ? customerBanner
      : companyBanner && (companyBanner.tone === 'success' || companyBanner.tone === 'error')
        ? companyBanner
        : adminBanner && (adminBanner.tone === 'success' || adminBanner.tone === 'error')
          ? adminBanner
          : null;

    if (nextPopup) {
      setOperationPopup({ tone: nextPopup.tone, text: nextPopup.text });
    }
  }, [adminBanner, companyBanner, customerBanner]);

  useEffect(() => {
    if (!operationPopup) {
      return undefined;
    }

    const timeout = setTimeout(() => setOperationPopup(null), 2600);
    return () => clearTimeout(timeout);
  }, [operationPopup]);

  useEffect(() => {
    const normalizedAuthMessage = authMessage.trim();
    if (!normalizedAuthMessage) {
      return;
    }

    if (/InvalidPasswordException|password policy|temporary password/i.test(normalizedAuthMessage)) {
      setOperationPopup({ tone: 'error', text: normalizedAuthMessage });
    }
  }, [authMessage]);

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(CUSTOMER_ONBOARDING_STORAGE_KEY)
      .then((rawValue) => {
        if (!active || !rawValue) {
          return;
        }

        const parsed = JSON.parse(rawValue) as {
          locationSet?: boolean;
          phoneVerified?: boolean;
          accountSetup?: boolean;
          phone?: string;
          firstName?: string;
          lastName?: string;
          email?: string;
          latitude?: number | null;
          longitude?: number | null;
          location?: Partial<Address>;
        };

        setGuestOnboardingProfile((current) => ({
          ...current,
          locationSet: parsed.locationSet ?? current.locationSet,
          phoneVerified: parsed.phoneVerified ?? current.phoneVerified,
          accountSetup: parsed.accountSetup ?? current.accountSetup,
          phone: parsed.phone ?? current.phone,
          firstName: parsed.firstName ?? current.firstName,
          lastName: parsed.lastName ?? current.lastName,
          email: parsed.email ?? current.email,
          latitude: typeof parsed.latitude === 'number' ? parsed.latitude : current.latitude,
          longitude: typeof parsed.longitude === 'number' ? parsed.longitude : current.longitude,
        }));

        if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
          const hydratedPin = { latitude: parsed.latitude, longitude: parsed.longitude };
          setMapPin(hydratedPin);
          setMapRegion((current) => ({
            ...current,
            ...hydratedPin,
          }));
        }

        if (parsed.location) {
          setAddressForm((current) => ({ ...current, ...parsed.location, isDefault: true }));
        }

        if (parsed.phone) {
          setPhoneVerificationForm((current) => ({ ...current, phone: parsed.phone ?? current.phone }));
        }

        if (parsed.firstName || parsed.lastName || parsed.email) {
          setAccountSetupForm((current) => ({
            ...current,
            firstName: parsed.firstName ?? current.firstName,
            lastName: parsed.lastName ?? current.lastName,
            email: parsed.email ?? current.email,
          }));
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) {
          setOnboardingHydrated(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!onboardingHydrated || authUser) {
      return;
    }

    AsyncStorage.setItem(
      CUSTOMER_ONBOARDING_STORAGE_KEY,
      JSON.stringify({
        ...guestOnboardingProfile,
        latitude: guestOnboardingProfile.latitude,
        longitude: guestOnboardingProfile.longitude,
        location: {
          label: addressForm.label,
          area: addressForm.area,
          street: addressForm.street,
          building: addressForm.building,
          unitNumber: addressForm.unitNumber,
          contactPhone: addressForm.contactPhone,
          isDefault: true,
        },
      }),
    ).catch(() => undefined);
  }, [
    addressForm.area,
    addressForm.building,
    addressForm.contactPhone,
    addressForm.label,
    addressForm.street,
    addressForm.unitNumber,
    authUser,
    guestOnboardingProfile,
    onboardingHydrated,
  ]);

  useEffect(() => {
    if (!onboardingHydrated || authUser) {
      return;
    }

    if (!guestOnboardingProfile.locationSet) {
      setOnboardingStep('location');
    }
  }, [authUser, guestOnboardingProfile.locationSet, onboardingHydrated]);

  useEffect(() => {
    setProfileForm(profile);
  }, [profile]);

  useEffect(() => {
    customerFiltersHydratedRef.current = false;

    AsyncStorage.getItem(customerFilterStorageKey)
      .then((rawValue) => {
        if (!rawValue) {
          setCustomerSearchQuery('');
          setSelectedCustomerCategory(null);
          setCustomerSortMode('popular');
          return;
        }

        const parsed = JSON.parse(rawValue) as {
          searchQuery?: string;
          selectedCategory?: string | null;
          sortMode?: CustomerSortMode;
        };

        setCustomerSearchQuery(parsed.searchQuery ?? '');
        setSelectedCustomerCategory(parsed.selectedCategory ?? null);
        setCustomerSortMode(parsed.sortMode ?? 'popular');
      })
      .catch(() => {
        setCustomerSearchQuery('');
        setSelectedCustomerCategory(null);
        setCustomerSortMode('popular');
      })
      .finally(() => {
        customerFiltersHydratedRef.current = true;
      });
  }, [customerFilterStorageKey]);

  useEffect(() => {
    if (!customerFiltersHydratedRef.current) {
      return;
    }

    AsyncStorage.setItem(
      customerFilterStorageKey,
      JSON.stringify({
        searchQuery: customerSearchQuery,
        selectedCategory: selectedCustomerCategory,
        sortMode: customerSortMode,
      }),
    ).catch(() => undefined);
  }, [customerFilterStorageKey, customerSearchQuery, selectedCustomerCategory, customerSortMode]);

  useEffect(() => {
    setAddressForm(addresses[0] ?? emptyAddress());
    setBookingComposer((current) => ({
      ...current,
      addressId: addresses[0]?.id ?? current.addressId,
      paymentMethod: profile.defaultPaymentMethod,
    }));
  }, [addresses, profile.defaultPaymentMethod]);

  const selectedAdminCompany = useMemo(
    () => companies.find((entry) => entry.id === selectedAdminCompanyId) ?? null,
    [companies, selectedAdminCompanyId],
  );

  useEffect(() => {
    if (selectedAdminCompany) {
      setCompanyForm({
        name: selectedAdminCompany.name,
        description: selectedAdminCompany.description,
        category: selectedAdminCompany.category,
        supportEmail: selectedAdminCompany.supportEmail,
        supportPhone: selectedAdminCompany.supportPhone,
        accentColor: selectedAdminCompany.accentColor,
        logoText: selectedAdminCompany.logoText,
        profileImageUrl: selectedAdminCompany.profileImageUrl,
        inviteEmail: '',
        inviteMessage: '',
      });
      return;
    }

    setCompanyForm({
      name: '',
      description: '',
      category: APP_CATEGORY_OPTIONS[0],
      supportEmail: '',
      supportPhone: '',
      accentColor: '#0F7B45',
      logoText: '',
      profileImageUrl: '',
      inviteEmail: '',
      inviteMessage: '',
    });
  }, [selectedAdminCompany]);

  useEffect(() => {
    if (currentCompany) {
      setCompanySettingsForm({
        name: currentCompany.name,
        description: currentCompany.description,
        category: currentCompany.category,
        supportEmail: currentCompany.supportEmail,
        supportPhone: currentCompany.supportPhone,
        accentColor: currentCompany.accentColor,
        logoText: currentCompany.logoText,
        profileImageUrl: currentCompany.profileImageUrl,
        inviteEmail: '',
        inviteMessage: '',
      });
    }
  }, [currentCompany]);

  const customerBookings = useMemo(
    () => bookings.filter((entry) => entry.customerEmail === authUser?.email),
    [authUser?.email, bookings],
  );
  const companyBookings = useMemo(
    () => bookings.filter((entry) => entry.companyId === currentCompany?.id),
    [bookings, currentCompany?.id],
  );
  const companyItems = useMemo(
    () => catalogItems.filter((entry) => entry.companyId === currentCompany?.id),
    [catalogItems, currentCompany?.id],
  );
  const approvedCompanyItems = useMemo(
    () => companyItems.filter((entry) => entry.approvalStatus === 'approved' && entry.isPublished),
    [companyItems],
  );

  useEffect(() => {
    setScheduleForm((current) => {
      if (current.id || current.catalogItemId || !approvedCompanyItems.length) {
        return current;
      }
      return { ...current, catalogItemId: approvedCompanyItems[0].id };
    });
  }, [approvedCompanyItems]);
  const companyPromotions = useMemo(
    () => offerPromotions.filter((entry) => entry.companyId === currentCompany?.id).sort((left, right) => left.sortOrder - right.sortOrder),
    [currentCompany?.id, offerPromotions],
  );
  const selectedCatalogItem = useMemo(
    () => companyItems.find((entry) => entry.id === selectedCatalogItemId) ?? null,
    [companyItems, selectedCatalogItemId],
  );
  const selectedPromotion = useMemo(
    () => companyPromotions.find((entry) => entry.id === selectedPromotionId) ?? null,
    [companyPromotions, selectedPromotionId],
  );
  const currentCompanyProgram = useMemo(
    () => loyaltyPrograms.find((entry) => entry.scope === 'company' && entry.companyId === currentCompany?.id) ?? null,
    [currentCompany?.id, loyaltyPrograms],
  );
  const companyAvailabilitySlots = useMemo(
    () => availabilitySlots.filter((entry) => entry.companyId === currentCompany?.id).sort((left, right) => `${left.dateLabel} ${left.timeLabel}`.localeCompare(`${right.dateLabel} ${right.timeLabel}`)),
    [availabilitySlots, currentCompany?.id],
  );
  const activeMarketplacePromotions = useMemo(
    () => offerPromotions
      .filter((entry) => entry.isActive)
      .map((promotion) => {
        const item = marketplaceItems.find((catalogItem) => catalogItem.id === promotion.catalogItemId);
        return item ? { promotion, item } : null;
      })
      .filter((entry): entry is { promotion: OfferPromotion; item: CatalogItem } => !!entry)
      .sort((left, right) => left.promotion.sortOrder - right.promotion.sortOrder),
    [marketplaceItems, offerPromotions],
  );

  useEffect(() => {
    if (!authUser) {
      setCustomerTab('home');
    }
  }, [authUser]);

  useEffect(() => {
    if (selectedCatalogItem) {
      setCatalogForm({
        title: selectedCatalogItem.title,
        summary: selectedCatalogItem.summary,
        description: selectedCatalogItem.description,
        category: selectedCatalogItem.category,
        price: String(selectedCatalogItem.price),
        durationLabel: selectedCatalogItem.durationLabel,
        kind: selectedCatalogItem.kind,
        tags: selectedCatalogItem.tags.join(', '),
        isPublished: selectedCatalogItem.isPublished,
        featured: selectedCatalogItem.featured,
        loyaltyPoints: String(selectedCatalogItem.loyaltyPoints),
        imageUrl: selectedCatalogItem.imageUrl,
        imageHint: selectedCatalogItem.imageHint,
      });
      return;
    }

    setCatalogForm({
      title: '',
      summary: '',
      description: '',
      category: '',
      price: '0',
      durationLabel: '',
      kind: 'service',
      tags: '',
      isPublished: true,
      featured: false,
      loyaltyPoints: '10',
      imageUrl: '',
      imageHint: '',
    });
  }, [selectedCatalogItem]);

  useEffect(() => {
    if (currentCompanyProgram) {
      setLoyaltyForm({
        title: currentCompanyProgram.title,
        description: currentCompanyProgram.description,
        pointsPerBooking: String(currentCompanyProgram.pointsPerBooking),
        rewardText: currentCompanyProgram.rewardText,
        tierRules: currentCompanyProgram.tierRules.join(', '),
        isActive: currentCompanyProgram.isActive,
      });
      return;
    }

    setLoyaltyForm({
      title: '',
      description: '',
      pointsPerBooking: '10',
      rewardText: '',
      tierRules: '',
      isActive: true,
    });
  }, [currentCompanyProgram]);

  useEffect(() => {
    if (selectedPromotion) {
      setOfferForm({
        catalogItemId: selectedPromotion.catalogItemId,
        title: selectedPromotion.title,
        headline: selectedPromotion.headline,
        badgeText: selectedPromotion.badgeText,
        discountLabel: selectedPromotion.discountLabel,
        startsAtLabel: selectedPromotion.startsAtLabel,
        endsAtLabel: selectedPromotion.endsAtLabel,
        isActive: selectedPromotion.isActive,
        sortOrder: String(selectedPromotion.sortOrder),
      });
      return;
    }

    setOfferForm({
      catalogItemId: approvedCompanyItems[0]?.id ?? '',
      title: '',
      headline: '',
      badgeText: '',
      discountLabel: '',
      startsAtLabel: '',
      endsAtLabel: '',
      isActive: true,
      sortOrder: '0',
    });
  }, [approvedCompanyItems, selectedPromotion]);

  const adminMetrics = useMemo(
    () => [
      { label: 'Companies', value: String(companies.length) },
      { label: 'Published items', value: String(marketplaceItems.length) },
      { label: 'Bookings', value: String(bookings.length) },
      { label: 'Users', value: String(users.length) },
    ],
    [bookings.length, companies.length, marketplaceItems.length, users.length],
  );

  const customerTabs = [
    { key: 'home', label: 'Home', icon: 'home-variant-outline', activeIcon: 'home-variant' },
    { key: 'orders', label: 'Orders', icon: 'clipboard-text-clock-outline', activeIcon: 'clipboard-text-clock' },
    { key: 'profile', label: 'More', icon: 'dots-horizontal-circle-outline', activeIcon: 'dots-horizontal-circle' },
  ];

  const adminNotifications = useMemo(
    () => notifications.filter((entry) => entry.recipientRole === 'admin'),
    [notifications],
  );
  const companyNotifications = useMemo(
    () => notifications.filter((entry) => entry.recipientRole === 'company' && entry.companyId === currentCompany?.id),
    [currentCompany?.id, notifications],
  );
  const customerNotifications = useMemo(
    () =>
      authUser
        ? notifications.filter(
            (entry) =>
              entry.recipientRole === 'customer' && (!entry.recipientEmail || entry.recipientEmail.toLowerCase() === authUser.email.toLowerCase()),
          )
        : [],
    [authUser, notifications],
  );
  const customerNotificationCount = customerNotifications.filter((entry) => !entry.isRead).length;
  const activeWorkspaceLabel =
    activeRole === 'admin'
      ? 'Admin control center'
      : activeRole === 'company'
        ? 'Company operations workspace'
        : activeRole === 'customer'
          ? 'Customer account workspace'
          : 'Public marketplace access';

  const customerLocationLabel = [
    addressForm.building.trim() ? `Building ${addressForm.building.trim()}` : '',
    addressForm.street.trim(),
  ].filter(Boolean).join(', ') || 'Set your location';

  const canAccessRestrictedTabs = authUser ? true : guestOnboardingProfile.phoneVerified && guestOnboardingProfile.accountSetup;
  const shouldShowOnboarding = !!onboardingStep && !authUser;

  function openRestrictedTabFlow(targetTab: CustomerRestrictedTab) {
    if (authUser) {
      setCustomerTab(targetTab);
      return;
    }

    setOnboardingTargetTab(targetTab);
    setCustomerTab('home');
    if (!guestOnboardingProfile.locationSet) {
      setOnboardingStep('location');
      setCustomerBanner({ tone: 'info', text: 'Set your location first to continue.' });
      return;
    }

    if (!guestOnboardingProfile.phoneVerified) {
      setOnboardingStep('phone');
      setCustomerBanner({ tone: 'info', text: 'Verify your phone number to open Orders and More.' });
      return;
    }

    if (!guestOnboardingProfile.accountSetup) {
      setOnboardingStep('account');
      setCustomerBanner({ tone: 'info', text: 'Complete your account setup to unlock Orders and More.' });
      return;
    }

    setCustomerTab(targetTab);
  }

  function requestCustomerTabChange(nextTab: CustomerTabKey) {
    if ((nextTab === 'orders' || nextTab === 'profile') && !canAccessRestrictedTabs) {
      openRestrictedTabFlow(nextTab);
      return;
    }

    setCustomerTab(nextTab);
  }

  async function applyReverseGeocodedAddress(latitude: number, longitude: number) {
    const geocoded = await Location.reverseGeocodeAsync({ latitude, longitude });
    const primary = geocoded[0];
    const fallbackPhone = phoneVerificationForm.phone.trim() || guestOnboardingProfile.phone.trim() || '+97455551234';

    setAddressForm((current) => ({
      ...current,
      label: current.label.trim() || 'Pinned Location',
      area: current.area.trim() || primary?.district || primary?.subregion || primary?.city || 'Doha',
      street: current.street.trim() || [primary?.streetNumber, primary?.street].filter(Boolean).join(' ').trim() || primary?.name || 'Pinned location',
      building: current.building.trim() || primary?.streetNumber || '1',
      contactPhone: current.contactPhone.trim() || fallbackPhone,
      isDefault: true,
    }));
  }

  async function fetchCurrentGpsLocation() {
    setLocationBusy(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setCustomerBanner({ tone: 'error', text: 'Location permission is required. Please enable it to continue.' });
        return;
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const nextPin = {
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
      };

      setMapPin(nextPin);
      setMapRegion((current) => ({
        ...current,
        ...nextPin,
      }));
      await applyReverseGeocodedAddress(nextPin.latitude, nextPin.longitude);

      setGuestOnboardingProfile((current) => ({
        ...current,
        latitude: nextPin.latitude,
        longitude: nextPin.longitude,
      }));
      setOnboardingErrors((current) => {
        const next = { ...current };
        delete next.locationPin;
        return next;
      });
      setCustomerBanner({ tone: 'success', text: 'Current GPS location detected.' });
    } catch (error) {
      setCustomerBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to fetch your current location.' });
    } finally {
      setLocationBusy(false);
    }
  }

  async function handleMapPinSelection(latitude: number, longitude: number) {
    setLocationBusy(true);
    try {
      setMapPin({ latitude, longitude });
      await applyReverseGeocodedAddress(latitude, longitude);
      setGuestOnboardingProfile((current) => ({
        ...current,
        latitude,
        longitude,
      }));
      setOnboardingErrors((current) => {
        const next = { ...current };
        delete next.locationPin;
        return next;
      });
    } catch (error) {
      setCustomerBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to read map location details.' });
    } finally {
      setLocationBusy(false);
    }
  }

  async function handleOnboardingLocationContinue() {
    if (locationMode === 'current' && (!guestOnboardingProfile.latitude || !guestOnboardingProfile.longitude)) {
      await fetchCurrentGpsLocation();
    }

    const nextAddressDraft = {
      ...addressForm,
      label: addressForm.label.trim() || (locationMode === 'current' ? 'Current Location' : 'Pinned Location'),
      isDefault: true,
    };

    if (!guestOnboardingProfile.latitude || !guestOnboardingProfile.longitude) {
      setOnboardingErrors((current) => ({ ...current, locationPin: 'Choose your exact map pin before continuing.' }));
      setCustomerBanner({ tone: 'error', text: 'Pin your location on map or use current GPS location.' });
      return;
    }

    const locationErrors = validateAddressDraft(nextAddressDraft);
    setOnboardingErrors(locationErrors);
    if (Object.keys(locationErrors).length) {
      setCustomerBanner({ tone: 'error', text: 'Please complete your location details first.' });
      return;
    }

    if (authUser) {
      startGlobalLoading('Saving address...');
      try {
        await saveAddress({ ...nextAddressDraft, isDefault: true });
      } catch (error) {
        setCustomerBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to save location.' });
      } finally {
        stopGlobalLoading();
      }
    }

    setGuestOnboardingProfile((current) => ({ ...current, locationSet: true }));
    setOnboardingErrors({});
    if (onboardingTargetTab === 'orders' || onboardingTargetTab === 'profile') {
      setOnboardingStep('phone');
    } else {
      setOnboardingStep(null);
    }
    setCustomerBanner({ tone: 'success', text: 'Location saved. You are ready to continue.' });
  }

  async function handleIssuePhoneCode() {
    if (phoneVerificationBusy) {
      return;
    }

    const normalizedPhone = normalizePhoneE164(phoneVerificationForm.phone);
    if (!normalizedPhone) {
      setOnboardingErrors((current) => ({ ...current, phone: 'Use a valid phone number in international format.' }));
      return;
    }

    setPhoneVerificationBusy(true);
    startGlobalLoading('Sending SMS verification code...');
    try {
      const signUpResult = await signUpWithPhoneOtp({
        username: normalizedPhone,
        password: generateEphemeralPassword(),
        options: {
          userAttributes: {
            phone_number: normalizedPhone,
          },
        },
      });
      const deliveryDetails = (signUpResult as any)?.nextStep?.codeDeliveryDetails;
      const medium = deliveryDetails?.deliveryMedium;
      const destination = deliveryDetails?.destination;

      setPendingPhoneOtpUsername(normalizedPhone);
      setPendingPhoneOtpTarget(normalizedPhone);
      setPhoneVerificationForm((current) => ({ ...current, phone: normalizedPhone, code: '' }));
      setOnboardingErrors((current) => {
        const next = { ...current };
        delete next.phone;
        delete next.code;
        return next;
      });
      if (medium === 'SMS') {
        setCustomerBanner({ tone: 'info', text: `Verification code sent to ${destination || normalizedPhone}.` });
      } else if (medium) {
        setCustomerBanner({ tone: 'error', text: `Verification code was sent using ${medium}. Please check your Auth configuration to force SMS delivery.` });
      } else {
        setCustomerBanner({ tone: 'info', text: `Verification code requested for ${normalizedPhone}.` });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send SMS verification code.';
      if (/UsernameExistsException/i.test(message)) {
        try {
          const resendUsername = pendingPhoneOtpUsername || normalizedPhone;
          setPendingPhoneOtpUsername(resendUsername);
          setPendingPhoneOtpTarget(normalizedPhone);
          const resendResult = await resendSignUpCode({ username: resendUsername });
          const deliveryDetails = (resendResult as any)?.codeDeliveryDetails;
          const medium = deliveryDetails?.deliveryMedium;
          const destination = deliveryDetails?.destination;
          if (medium === 'SMS') {
            setCustomerBanner({ tone: 'info', text: `Verification code re-sent to ${destination || normalizedPhone}.` });
          } else if (medium) {
            setCustomerBanner({ tone: 'error', text: `Code was re-sent using ${medium}. Please check your Auth configuration to force SMS delivery.` });
          } else {
            setCustomerBanner({ tone: 'info', text: `Verification code re-sent to ${normalizedPhone}.` });
          }
        } catch (resendError) {
          setCustomerBanner({ tone: 'error', text: resendError instanceof Error ? resendError.message : 'Unable to resend verification code.' });
        }
      } else {
        setCustomerBanner({ tone: 'error', text: message });
      }
    } finally {
      stopGlobalLoading();
      setPhoneVerificationBusy(false);
    }
  }

  async function handleVerifyPhoneCode() {
    if (phoneVerificationBusy) {
      return;
    }

    const username = pendingPhoneOtpUsername;
    const verifiedPhone = normalizePhoneE164(phoneVerificationForm.phone) || pendingPhoneOtpTarget;
    if (!username) {
      setOnboardingErrors((current) => ({ ...current, phone: 'Send the SMS code first.' }));
      return;
    }

    if (!phoneVerificationForm.code.trim()) {
      setOnboardingErrors((current) => ({ ...current, code: 'Verification code is required.' }));
      return;
    }

    if (!verifiedPhone) {
      setOnboardingErrors((current) => ({ ...current, phone: 'Use a valid phone number and request a new code.' }));
      return;
    }

    setPhoneVerificationBusy(true);
    startGlobalLoading('Verifying SMS code...');
    try {
      await confirmPhoneSignUp({
        username,
        confirmationCode: phoneVerificationForm.code.trim(),
      });

      setGuestOnboardingProfile((current) => ({
        ...current,
        phoneVerified: true,
        phone: verifiedPhone,
      }));
      setProfileForm((current) => ({ ...current, phone: verifiedPhone || current.phone }));
      setOnboardingErrors({});
      setOnboardingStep('account');
      setPendingPhoneOtpUsername('');
      setPendingPhoneOtpTarget('');
      setCustomerBanner({ tone: 'success', text: 'Phone number verified successfully.' });
    } catch (error) {
      setOnboardingErrors((current) => ({ ...current, code: error instanceof Error ? error.message : 'Invalid verification code.' }));
    } finally {
      stopGlobalLoading();
      setPhoneVerificationBusy(false);
    }
  }

  function handleCompleteGuestAccount() {
    const errors: ValidationMap = {};
    if (!accountSetupForm.firstName.trim()) {
      errors.firstName = 'First name is required.';
    }
    if (!accountSetupForm.lastName.trim()) {
      errors.lastName = 'Last name is required.';
    }
    if (!isEmail(accountSetupForm.email)) {
      errors.email = 'Use a valid email address.';
    }

    setOnboardingErrors(errors);
    if (Object.keys(errors).length) {
      return;
    }

    const fullName = `${accountSetupForm.firstName.trim()} ${accountSetupForm.lastName.trim()}`.trim();
    setGuestOnboardingProfile((current) => ({
      ...current,
      accountSetup: true,
      firstName: accountSetupForm.firstName.trim(),
      lastName: accountSetupForm.lastName.trim(),
      email: accountSetupForm.email.trim().toLowerCase(),
    }));
    setProfileForm((current) => ({
      ...current,
      fullName,
      email: accountSetupForm.email.trim().toLowerCase(),
      phone: phoneVerificationForm.phone.trim() || current.phone,
    }));
    setOnboardingStep(null);
    setOnboardingTargetTab(null);
    setCustomerTab('home');
    setCustomerBanner({ tone: 'success', text: 'Account setup complete. Welcome to Jahzeen.' });
  }

  function resetAdminDrafts() {
    setSelectedAdminCompanyId(null);
    setCompanyFormErrors({});
    setCompanyForm({
      name: '',
      description: '',
      category: APP_CATEGORY_OPTIONS[0],
      supportEmail: '',
      supportPhone: '',
      accentColor: '#0F7B45',
      logoText: '',
      profileImageUrl: '',
      inviteEmail: '',
      inviteMessage: '',
    });
  }

  function resetCatalogDrafts() {
    setSelectedCatalogItemId(null);
    setCatalogFormErrors({});
    setCatalogForm({
      title: '',
      summary: '',
      description: '',
      category: '',
      price: '0',
      durationLabel: '',
      kind: 'service',
      tags: '',
      isPublished: false,
      featured: false,
      loyaltyPoints: '10',
      imageUrl: '',
      imageHint: '',
    });
  }

  async function handleCompanyImagePick() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setAdminBanner({ tone: 'error', text: 'Allow photo access to upload a company profile image.' });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      const mimeType = asset.mimeType || 'image/jpeg';
      const profileImageUrl = asset.base64 ? `data:${mimeType};base64,${asset.base64}` : asset.uri;

      setCompanyForm((current) => ({ ...current, profileImageUrl }));
      setAdminBanner({ tone: 'success', text: 'Company profile image selected.' });
    } catch (error) {
      setAdminBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to select an image.' });
    }
  }

  function handleCompanyImageClear() {
    setCompanyForm((current) => ({ ...current, profileImageUrl: '' }));
    setAdminBanner({ tone: 'info', text: 'Company profile image removed from this draft.' });
  }

  async function handleCatalogImagePick() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setCompanyBanner({ tone: 'error', text: 'Allow photo access to upload a catalog image.' });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.65,
        base64: true,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      const mimeType = asset.mimeType || 'image/jpeg';
      const imageUrl = asset.base64 ? `data:${mimeType};base64,${asset.base64}` : asset.uri;

      setCatalogForm((current) => ({
        ...current,
        imageUrl,
        imageHint: current.imageHint || asset.fileName || `${current.title || 'Catalog'} photo`,
      }));
      setCompanyBanner({ tone: 'success', text: 'Catalog image selected.' });
    } catch (error) {
      setCompanyBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to select an image.' });
    }
  }

  function handleCatalogImageClear() {
    setCatalogForm((current) => ({ ...current, imageUrl: '' }));
    setCompanyBanner({ tone: 'info', text: 'Catalog image removed from this draft.' });
  }

  async function handleCompanySave() {
    if (companySubmitting) {
      return;
    }

    const creatingCompany = !selectedAdminCompany;
    const errors = validateCompanyDraft(companyForm, creatingCompany);

    if (creatingCompany) {
      const normalizedName = companyForm.name.trim().toLowerCase();
      const normalizedSupportEmail = companyForm.supportEmail.trim().toLowerCase();
      const normalizedInviteEmail = companyForm.inviteEmail.trim().toLowerCase();
      const hasDuplicateCompany = companies.some(
        (entry) =>
          entry.name.trim().toLowerCase() === normalizedName ||
          entry.supportEmail.trim().toLowerCase() === normalizedSupportEmail,
      );
      const hasDuplicateInvite = invitations.some(
        (entry) =>
          entry.companyName.trim().toLowerCase() === normalizedName &&
          entry.email.trim().toLowerCase() === normalizedInviteEmail &&
          entry.status !== 'revoked',
      );

      if (hasDuplicateCompany) {
        errors.name = errors.name ?? 'A company with this name or support email already exists.';
        errors.supportEmail = errors.supportEmail ?? 'A company with this name or support email already exists.';
      }

      if (hasDuplicateInvite) {
        errors.inviteEmail = errors.inviteEmail ?? 'This invitation email is already linked to the same company.';
      }

      if (normalizedSupportEmail && normalizedSupportEmail === normalizedInviteEmail) {
        errors.inviteEmail = errors.inviteEmail ?? 'Invitation email must be different from support email.';
      }
    }

    setCompanyFormErrors(errors);
    if (Object.keys(errors).length) {
      setAdminBanner({ tone: 'error', text: creatingCompany ? 'Fix the company and invitation details before creating.' : 'Fix the company form errors before saving.' });
      return;
    }

    const companyDraftPayload = {
      name: companyForm.name,
      description: companyForm.description,
      category: companyForm.category,
      supportEmail: companyForm.supportEmail,
      supportPhone: companyForm.supportPhone,
      accentColor: companyForm.accentColor,
      logoText: companyForm.logoText,
      profileImageUrl: companyForm.profileImageUrl,
    };

    setCompanySubmitting(true);
    startGlobalLoading(creatingCompany ? 'Creating company workspace...' : 'Saving company profile...');
    try {
      if (selectedAdminCompany) {
        await updateCompany(selectedAdminCompany.id, companyDraftPayload);
        setAdminBanner({ tone: 'success', text: 'Company changes saved.' });
      } else {
        await createCompany(companyDraftPayload);
        await inviteCompany({
          companyName: companyForm.name,
          email: companyForm.inviteEmail,
          message: companyForm.inviteMessage,
        });
        setAdminBanner({ tone: 'success', text: `Company workspace created and invitation sent to ${companyForm.inviteEmail.trim().toLowerCase()}.` });
        resetAdminDrafts();
      }
    } catch (error) {
      setAdminBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to save company.' });
    } finally {
      stopGlobalLoading();
      setCompanySubmitting(false);
    }
  }

  async function handleInvitationResend(invitation: CompanyInvitation) {
    startGlobalLoading('Resending invitation...');
    try {
      await resendCompanyInvitation(invitation.id);
      setAdminBanner({ tone: 'success', text: `Invitation re-sent to ${invitation.email}.` });
    } catch (error) {
      setAdminBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to resend invitation.' });
    } finally {
      stopGlobalLoading();
    }
  }

  async function handleInvitationRevoke(invitation: CompanyInvitation) {
    startGlobalLoading('Revoking invitation...');
    try {
      await revokeInvitation(invitation.id);
      setAdminBanner({ tone: 'info', text: `Invitation revoked for ${invitation.email}.` });
    } catch (error) {
      setAdminBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to revoke invitation.' });
    } finally {
      stopGlobalLoading();
    }
  }

  async function handleCompanyStatusChange(companyId: string, isActive: boolean) {
    startGlobalLoading(isActive ? 'Activating company...' : 'Pausing company...');
    try {
      await setCompanyActive(companyId, isActive);
      setAdminBanner({ tone: 'success', text: isActive ? 'Company activated.' : 'Company paused.' });
    } catch (error) {
      setAdminBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to update company status.' });
    } finally {
      stopGlobalLoading();
    }
  }

  async function handleCompanyDelete(companyId: string) {
    startGlobalLoading('Deleting company workspace...');
    try {
      await deleteCompany(companyId);
      setAdminBanner({ tone: 'info', text: 'Company workspace deleted.' });
    } catch (error) {
      setAdminBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to delete company.' });
    } finally {
      stopGlobalLoading();
    }
  }

  async function handleCatalogReview(itemId: string, decision: 'approved' | 'rejected') {
    startGlobalLoading(decision === 'approved' ? 'Approving catalog item...' : 'Rejecting catalog item...');
    try {
      await reviewCatalogItem(itemId, decision);
      setAdminBanner({ tone: 'success', text: decision === 'approved' ? 'Catalog item approved.' : 'Catalog item rejected.' });
    } catch (error) {
      setAdminBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to review catalog item.' });
    } finally {
      stopGlobalLoading();
    }
  }

  async function handleOfferReview(promotionId: string, decision: 'approved' | 'rejected') {
    startGlobalLoading(decision === 'approved' ? 'Approving promotion...' : 'Rejecting promotion...');
    try {
      await reviewOfferPromotion(promotionId, decision);
      setAdminBanner({ tone: 'success', text: decision === 'approved' ? 'Promotion approved.' : 'Promotion rejected.' });
    } catch (error) {
      setAdminBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to review promotion.' });
    } finally {
      stopGlobalLoading();
    }
  }

  async function handleCategoryLaunchChange(category: string, isComingSoon: boolean) {
    try {
      await saveCategorySetting(category, isComingSoon);
      setAdminBanner({ tone: 'success', text: `${category} updated.` });
    } catch (error) {
      setAdminBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to update category launch status.' });
    }
  }

  async function handleCompanySettingsSave() {
    if (!currentCompany) {
      return;
    }
    const errors = validateCompanyDraft(companySettingsForm);
    setCompanyFormErrors(errors);
    if (Object.keys(errors).length) {
      setCompanyBanner({ tone: 'error', text: 'Fix the workspace details before saving.' });
      return;
    }

    startGlobalLoading('Saving workspace settings...');
    try {
      await updateCompany(currentCompany.id, companySettingsForm);
      setCompanyBanner({ tone: 'success', text: 'Workspace settings updated.' });
    } catch (error) {
      setCompanyBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to update company workspace.' });
    } finally {
      stopGlobalLoading();
    }
  }

  async function handleCatalogSave() {
    if (!currentCompany) {
      setCompanyBanner({ tone: 'error', text: 'No company workspace is active. Sign in again and retry.' });
      return;
    }

    const errors = validateCatalogDraft(catalogForm);
    setCatalogFormErrors(errors);
    if (Object.keys(errors).length) {
      setCompanyBanner({ tone: 'error', text: 'Fix the catalog fields before saving.' });
      return;
    }

    setCatalogSubmitting(true);
    startGlobalLoading(selectedCatalogItem ? 'Saving catalog item...' : 'Submitting catalog item...');
    try {
      await saveCatalogItem(currentCompany.id, {
        id: selectedCatalogItem?.id,
        title: catalogForm.title.trim(),
        summary: catalogForm.summary.trim(),
        description: catalogForm.description.trim(),
        category: catalogForm.category.trim(),
        price: Number(catalogForm.price),
        durationLabel: catalogForm.durationLabel.trim(),
        kind: catalogForm.kind,
        isPublished: catalogForm.isPublished,
        featured: catalogForm.featured,
        tags: parseCommaList(catalogForm.tags),
        loyaltyPoints: Number(catalogForm.loyaltyPoints),
        imageUrl: catalogForm.imageUrl.trim(),
        imageHint: catalogForm.imageHint.trim(),
      });
      setCompanyBanner({
        tone: 'success',
        text: catalogForm.isPublished
          ? selectedCatalogItem
            ? 'Catalog item updated and submitted for admin approval.'
            : 'Catalog item submitted for admin approval. It will go live after approval.'
          : selectedCatalogItem
            ? 'Catalog item updated as a draft.'
            : 'Catalog item saved as a draft.',
      });
      resetCatalogDrafts();
    } catch (error) {
      setCompanyBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to save catalog item.' });
    } finally {
      stopGlobalLoading();
      setCatalogSubmitting(false);
    }
  }

  async function handleLoyaltySave() {
    if (!currentCompany) {
      return;
    }
    const errors = validateLoyaltyDraft(loyaltyForm);
    setLoyaltyFormErrors(errors);
    if (Object.keys(errors).length) {
      setCompanyBanner({ tone: 'error', text: 'Fix the loyalty program fields before saving.' });
      return;
    }

    startGlobalLoading('Saving loyalty settings...');
    try {
      await saveLoyaltyProgram('company', currentCompany.id, {
        title: loyaltyForm.title.trim(),
        description: loyaltyForm.description.trim(),
        pointsPerBooking: Number(loyaltyForm.pointsPerBooking),
        rewardText: loyaltyForm.rewardText.trim(),
        tierRules: parseCommaList(loyaltyForm.tierRules),
        isActive: loyaltyForm.isActive,
      });
      setCompanyBanner({ tone: 'success', text: 'Loyalty program saved.' });
    } catch (error) {
      setCompanyBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to save loyalty program.' });
    } finally {
      stopGlobalLoading();
    }
  }

  async function handleOfferSave() {
    if (!currentCompany) {
      return;
    }

    const errors = validateOfferDraft(offerForm);
    setOfferFormErrors(errors);
    if (Object.keys(errors).length) {
      setCompanyBanner({ tone: 'error', text: 'Fix the promotion fields before saving.' });
      return;
    }

    startGlobalLoading(selectedPromotion ? 'Saving promotion...' : 'Creating promotion...');
    try {
      await saveOfferPromotion(currentCompany.id, {
        id: selectedPromotion?.id,
        catalogItemId: offerForm.catalogItemId,
        title: offerForm.title.trim(),
        headline: offerForm.headline.trim(),
        badgeText: offerForm.badgeText.trim(),
        discountLabel: offerForm.discountLabel.trim(),
        startsAtLabel: offerForm.startsAtLabel.trim(),
        endsAtLabel: offerForm.endsAtLabel.trim(),
        isActive: offerForm.isActive,
        sortOrder: Number(offerForm.sortOrder),
      });
      setSelectedPromotionId(null);
      setOfferFormErrors({});
      setCompanyBanner({
        tone: 'success',
        text: selectedPromotion
          ? 'Promotion updated. It stays pending until admin approval.'
          : 'Promotion submitted for admin approval. It will go live after approval.',
      });
    } catch (error) {
      setCompanyBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to save promotion.' });
    } finally {
      stopGlobalLoading();
    }
  }

  async function handleOfferDelete(promotionId: string) {
    startGlobalLoading('Deleting promotion...');
    try {
      await deleteOfferPromotion(promotionId);
      if (selectedPromotionId === promotionId) {
        setSelectedPromotionId(null);
      }
      setCompanyBanner({ tone: 'info', text: 'Promotion removed.' });
    } catch (error) {
      setCompanyBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to delete promotion.' });
    } finally {
      stopGlobalLoading();
    }
  }

  async function handleScheduleSave() {
    if (!currentCompany) {
      return;
    }

    if (!scheduleForm.catalogItemId) {
      setCompanyBanner({ tone: 'error', text: 'Select a published service or product before saving a schedule slot.' });
      return;
    }

    if (!scheduleForm.dateLabel.trim() || !scheduleForm.timeLabel.trim()) {
      setCompanyBanner({ tone: 'error', text: 'Add both date and time for the schedule slot.' });
      return;
    }

    const linkedItem = approvedCompanyItems.find((entry) => entry.id === scheduleForm.catalogItemId);
    if (!linkedItem) {
      setCompanyBanner({ tone: 'error', text: 'The selected item is not published. Choose an approved item.' });
      return;
    }

    const linkedNotePrefix = `Item: ${linkedItem.title}`;
    const rawNote = scheduleForm.note.trim().replace(/^Item:\s.*?(\s\|\s)?/, '').trim();
    const linkedNote = rawNote ? `${linkedNotePrefix} | ${rawNote}` : linkedNotePrefix;

    startGlobalLoading(scheduleForm.id ? 'Saving schedule slot...' : 'Adding schedule slot...');
    try {
      await saveAvailabilitySlot(currentCompany.id, {
        id: scheduleForm.id || undefined,
        dateLabel: scheduleForm.dateLabel.trim(),
        timeLabel: scheduleForm.timeLabel.trim(),
        status: scheduleForm.status,
        note: linkedNote,
      });
      setScheduleForm({ id: '', catalogItemId: approvedCompanyItems[0]?.id ?? '', dateLabel: 'Tomorrow', timeLabel: '10:00 AM', status: 'available', note: '' });
      setCompanyBanner({ tone: 'success', text: 'Schedule slot saved.' });
    } catch (error) {
      setCompanyBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to save schedule slot.' });
    } finally {
      stopGlobalLoading();
    }
  }

  async function handleScheduleDelete(slotId: string) {
    startGlobalLoading('Deleting schedule slot...');
    try {
      await deleteAvailabilitySlot(slotId);
      if (scheduleForm.id === slotId) {
        setScheduleForm({ id: '', catalogItemId: approvedCompanyItems[0]?.id ?? '', dateLabel: 'Tomorrow', timeLabel: '10:00 AM', status: 'available', note: '' });
      }
      setCompanyBanner({ tone: 'info', text: 'Schedule slot removed.' });
    } catch (error) {
      setCompanyBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to delete schedule slot.' });
    } finally {
      stopGlobalLoading();
    }
  }

  async function handleAuthAction() {
    const errors = authMode === 'signin' ? validateSignInDraft(signInForm) : validateSignUpDraft(signUpForm);
    setAuthErrors(errors);
    if (Object.keys(errors).length) {
      setCustomerBanner({ tone: 'error', text: 'Fix the account form before continuing.' });
      return;
    }

    startGlobalLoading(authMode === 'signin' ? 'Signing in...' : 'Creating account...');
    try {
      if (authMode === 'signin') {
        await signInWithEmail(signInForm.email.trim(), signInForm.password);
        setCustomerBanner(null);
      } else {
        await signUpWithEmail({
          fullName: signUpForm.fullName.trim(),
          email: signUpForm.email.trim(),
          password: signUpForm.password,
          phone: signUpForm.phone.trim(),
        });
        setCustomerBanner({
          tone: 'success',
          text: 'Account created. Enter the verification code that was sent to your email.',
        });
      }
    } catch (error) {
      setCustomerBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Authentication failed.' });
    } finally {
      stopGlobalLoading();
    }
  }

  async function handleCompleteNewPassword() {
    const trimmedPassword = newPassword.trim();
    if (trimmedPassword.length < 8) {
      setAuthErrors((current) => ({ ...current, newPassword: 'New password must be at least 8 characters.' }));
      setCustomerBanner({ tone: 'error', text: 'Enter a valid new password to complete sign-in.' });
      return;
    }

    startGlobalLoading('Updating password...');
    try {
      await completeNewPassword(trimmedPassword);
      setAuthErrors((current) => {
        const next = { ...current };
        delete next.newPassword;
        return next;
      });
      setNewPassword('');
      setCustomerBanner({ tone: 'success', text: 'Password updated. You are now signed in.' });
    } catch (error) {
      setCustomerBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to set a new password.' });
    } finally {
      stopGlobalLoading();
    }
  }

  async function handleSignOut() {
    startGlobalLoading('Signing out...');
    try {
      await signOutCurrentUser();
      setCustomerBanner({ tone: 'info', text: 'You have been signed out.' });
      setAdminBanner(null);
      setCompanyBanner(null);
      setCustomerTab('home');
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Unable to sign out.';
      setCustomerBanner({ tone: 'error', text });
      setAdminBanner({ tone: 'error', text });
      setCompanyBanner({ tone: 'error', text });
    } finally {
      stopGlobalLoading();
    }
  }

  async function handleNotificationOpen(notification: AppNotification) {
    if (!notification.isRead) {
      await markNotificationRead(notification.id);
    }

    if (activeRole === 'admin') {
      setAdminTab((['overview', 'companies', 'publishing', 'inbox', 'bookings', 'settings'] as const).includes(notification.destinationTab as any)
        ? (notification.destinationTab as 'overview' | 'companies' | 'publishing' | 'inbox' | 'bookings' | 'settings')
        : 'overview');
      return;
    }

    if (activeRole === 'company') {
      setCompanyTab((['overview', 'catalog', 'offers', 'schedule', 'bookings', 'loyalty', 'requests'] as const).includes(notification.destinationTab as any)
        ? (notification.destinationTab as 'overview' | 'catalog' | 'offers' | 'schedule' | 'bookings' | 'loyalty' | 'requests')
        : 'overview');
      return;
    }

    requestCustomerTabChange((['home', 'browse', 'explore', 'orders', 'profile', 'notifications'] as const).includes(notification.destinationTab as any)
      ? (notification.destinationTab as CustomerTabKey)
      : 'notifications');
  }

  function handleNotificationPress() {
    if (!customerNotifications.length) {
      setCustomerBanner({ tone: 'info', text: authUser ? 'No new notifications right now.' : 'Sign in to receive booking updates and personal notifications.' });
      return;
    }

    requestCustomerTabChange('notifications');
  }

  async function handleConfirmCode() {
    const trimmedCode = confirmCode.trim();
    if (!trimmedCode) {
      setAuthErrors((current) => ({ ...current, confirmCode: 'Verification code is required.' }));
      setCustomerBanner({ tone: 'error', text: 'Enter the email verification code first.' });
      return;
    }

    startGlobalLoading('Confirming email...');
    try {
      await confirmEmailCode(trimmedCode);
      setAuthErrors((current) => {
        const next = { ...current };
        delete next.confirmCode;
        return next;
      });
      setConfirmCode('');
      setCustomerBanner({ tone: 'success', text: 'Email confirmed. You can sign in now.' });
    } catch (error) {
      setCustomerBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to confirm email.' });
    } finally {
      stopGlobalLoading();
    }
  }

  async function handleProfileSave() {
    const errors = validateProfileDraft(profileForm);
    setProfileErrors(errors);
    if (Object.keys(errors).length) {
      setCustomerBanner({ tone: 'error', text: 'Fix the profile details before saving.' });
      return;
    }

    startGlobalLoading('Saving profile...');
    try {
      await saveProfile(profileForm);
      setCustomerBanner({ tone: 'success', text: 'Profile saved.' });
    } catch (error) {
      setCustomerBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to save profile.' });
    } finally {
      stopGlobalLoading();
    }
  }

  async function handleAddressSave() {
    const errors = validateAddressDraft(addressForm);
    setAddressErrors(errors);
    if (Object.keys(errors).length) {
      setCustomerBanner({ tone: 'error', text: 'Fix the address fields before saving.' });
      return;
    }

    startGlobalLoading('Saving address...');
    try {
      await saveAddress({ ...addressForm, isDefault: true });
      setCustomerBanner({ tone: 'success', text: 'Default address saved.' });
    } catch (error) {
      setCustomerBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to save address.' });
    } finally {
      stopGlobalLoading();
    }
  }

  async function handleBookingPlace() {
    const errors = validateBookingDraft(bookingComposer, authUser, addresses);
    setBookingErrors(errors);
    if (Object.keys(errors).length) {
      setCustomerBanner({ tone: 'error', text: authUser ? 'Fix the booking details before placing the order.' : 'Open Profile and sign in before placing a booking.' });
      if (!authUser) {
        requestCustomerTabChange('profile');
      }
      return;
    }

    startGlobalLoading('Placing booking...');
    try {
      await placeBooking(bookingComposer);
      setBookingComposer((current) => ({ ...current, itemId: '', companyId: '', slotId: '', notes: '' }));
      setBookingErrors({});
      requestCustomerTabChange('orders');
      setCustomerBanner({ tone: 'success', text: 'Booking placed successfully.' });
    } catch (error) {
      Alert.alert('Booking failed', error instanceof Error ? error.message : 'Unable to place booking.');
      setCustomerBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to place booking.' });
    } finally {
      stopGlobalLoading();
    }
  }

  async function handleRatingSubmit(bookingId: string) {
    const draft = ratingDrafts[bookingId] ?? { score: '', review: '' };
    const error = validateRatingDraft(draft);
    setRatingErrors((current) => ({ ...current, [bookingId]: error }));
    if (error) {
      setCustomerBanner({ tone: 'error', text: 'Ratings need a score from 1 to 5.' });
      return;
    }

    startGlobalLoading('Submitting rating...');
    try {
      await submitRating(bookingId, Number(draft.score), draft.review.trim());
      setRatingDrafts((current) => {
        const next = { ...current };
        delete next[bookingId];
        return next;
      });
      setRatingErrors((current) => {
        const next = { ...current };
        delete next[bookingId];
        return next;
      });
      setCustomerBanner({ tone: 'success', text: 'Rating submitted.' });
    } catch (error) {
      setCustomerBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to submit rating.' });
    } finally {
      stopGlobalLoading();
    }
  }

  if (!initialized) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (activeRole === 'guest' || activeRole === 'customer') {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.safeArea, customerDarkMode && styles.customerShellSafeAreaDark]}>
        <View style={[styles.customerShell, customerDarkMode && styles.customerShellDark]} pointerEvents={interactionLocked ? 'none' : 'auto'}>
          <PremiumHeader
            logoText="Jahzeen"
            darkMode={customerDarkMode}
            locationText={customerLocationLabel}
            notificationCount={customerNotificationCount}
            onSearchPress={() => setCustomerTab('explore')}
            onNotificationPress={handleNotificationPress}
            onProfilePress={() => requestCustomerTabChange('profile')}
          />

          <View style={styles.customerWorkspaceHost}>
            <CustomerWorkspace
              wide={wide}
              tab={customerTab}
              onTabChange={requestCustomerTabChange}
              authUser={authUser}
              currentUserRole={currentUserRecord?.role ?? 'customer'}
              companies={companies}
              categorySettings={appCategorySettings}
              marketplaceItems={marketplaceItems}
              availabilitySlots={availabilitySlots}
              featuredOffers={activeMarketplacePromotions}
              ratings={ratings}
              notifications={customerNotifications}
              bookingComposer={bookingComposer}
              onBookingComposerChange={setBookingComposer}
              bookingErrors={bookingErrors}
              onSelectItem={(item) =>
                setBookingComposer((current) => ({
                  ...current,
                  itemId: item.id,
                  companyId: item.companyId,
                  slotId: '',
                }))
              }
              onPlaceBooking={handleBookingPlace}
              customerBookings={customerBookings}
              ratingDrafts={ratingDrafts}
              onRatingDraftChange={(bookingId, nextDraft) =>
                setRatingDrafts((current) => ({
                  ...current,
                  [bookingId]: {
                    score: nextDraft.score,
                    review: nextDraft.review,
                  },
                }))
              }
              ratingErrors={ratingErrors}
              onSubmitRating={handleRatingSubmit}
              authMode={authMode}
              onAuthModeChange={setAuthMode}
              signInForm={signInForm}
              onSignInFormChange={setSignInForm}
              signUpForm={signUpForm}
              onSignUpFormChange={setSignUpForm}
              authErrors={authErrors}
              confirmCode={confirmCode}
              onConfirmCodeChange={setConfirmCode}
              needsConfirmation={needsConfirmation}
              signInChallenge={signInChallenge}
              newPassword={newPassword}
              onNewPasswordChange={setNewPassword}
              onAuthAction={handleAuthAction}
              onConfirmCode={handleConfirmCode}
              onCompleteNewPassword={handleCompleteNewPassword}
              onOpenNotification={handleNotificationOpen}
              authBusy={busy}
              darkMode={customerDarkMode}
              onToggleDarkMode={() => setCustomerDarkMode((current) => !current)}
              customerSearchQuery={customerSearchQuery}
              onCustomerSearchQueryChange={setCustomerSearchQuery}
              customerSortMode={customerSortMode}
              onCustomerSortModeChange={setCustomerSortMode}
              selectedCustomerCategory={selectedCustomerCategory}
              onSelectCustomerCategory={setSelectedCustomerCategory}
              profileForm={profileForm}
              onProfileFormChange={setProfileForm}
              profileErrors={profileErrors}
              onSaveProfile={handleProfileSave}
              addressForm={addressForm}
              onAddressFormChange={setAddressForm}
              addressErrors={addressErrors}
              onSaveAddress={handleAddressSave}
              onSignOut={handleSignOut}
              banner={customerBanner}
            />
          </View>

          {shouldShowOnboarding ? (
            <View style={styles.onboardingOverlay}>
              <LinearGradient colors={['rgba(8, 22, 46, 0.82)', 'rgba(15, 64, 123, 0.75)']} style={styles.onboardingOverlayGradient}>
                <View style={styles.onboardingCardWrap}>
                  <ScrollView
                    style={styles.onboardingCardScroll}
                    contentContainerStyle={styles.onboardingCardScrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                  <View style={styles.onboardingTitleRow}>
                    <View style={styles.onboardingIconMark}>
                      <MaterialCommunityIcons
                        name={onboardingStep === 'location' ? 'map-marker-radius' : onboardingStep === 'phone' ? 'cellphone-key' : 'account-edit-outline'}
                        size={22}
                        color="#FFFFFF"
                      />
                    </View>
                    <View style={styles.infoBodyGrow}>
                      <Text style={styles.onboardingEyebrow}>Quick setup</Text>
                      <Text style={styles.onboardingTitle}>
                        {onboardingStep === 'location'
                          ? 'Set your location'
                          : onboardingStep === 'phone'
                            ? 'Verify your phone number'
                            : 'Set up your account'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.onboardingBody}>
                    {onboardingStep === 'location'
                      ? 'Before exploring services, choose your current location or pin a home location on map mode.'
                      : onboardingStep === 'phone'
                        ? `To open ${onboardingTargetTab === 'orders' ? 'Orders' : 'More'}, verify your phone with a one-time code.`
                        : 'Almost done. Add first name, last name, and email to finish account setup.'}
                  </Text>

                  {onboardingStep === 'location' ? (
                    <View style={styles.onboardingSectionStack}>
                      <View style={styles.toggleRow}>
                        <ChoiceChip label="Use current location" selected={locationMode === 'current'} onPress={() => setLocationMode('current')} />
                        <ChoiceChip label="Choose from map" selected={locationMode === 'map'} onPress={() => setLocationMode('map')} />
                      </View>

                      {locationMode === 'current' ? (
                        <View style={styles.onboardingHintCard}>
                          <Text style={styles.onboardingHintTitle}>Current GPS location</Text>
                          <Text style={styles.onboardingHintBody}>Detect your live location using device GPS and set it as your booking default.</Text>
                          <SecondaryButton label={locationBusy ? 'Detecting location...' : 'Use my current location'} onPress={() => { void fetchCurrentGpsLocation(); }} loading={locationBusy} disabled={locationBusy} />
                          {guestOnboardingProfile.latitude && guestOnboardingProfile.longitude ? (
                            <Text style={styles.onboardingGpsMeta}>{`Lat ${guestOnboardingProfile.latitude.toFixed(5)} · Lng ${guestOnboardingProfile.longitude.toFixed(5)}`}</Text>
                          ) : null}
                        </View>
                      ) : (
                        <>
                          {Platform.OS !== 'web' && NativeMapView && NativeMarker ? (
                            <View style={styles.onboardingMapFrame}>
                              <NativeMapView
                                style={styles.onboardingMapView}
                                initialRegion={mapRegion}
                                region={mapRegion}
                                onRegionChangeComplete={(region: any) => setMapRegion(region)}
                                onPress={(event: any) => {
                                  const coords = event?.nativeEvent?.coordinate;
                                  if (coords?.latitude && coords?.longitude) {
                                    setMapPin(coords);
                                    void handleMapPinSelection(coords.latitude, coords.longitude);
                                  }
                                }}
                              >
                                <NativeMarker
                                  coordinate={mapPin}
                                  draggable
                                  onDragEnd={(event: any) => {
                                    const coords = event?.nativeEvent?.coordinate;
                                    if (coords?.latitude && coords?.longitude) {
                                      setMapPin(coords);
                                      void handleMapPinSelection(coords.latitude, coords.longitude);
                                    }
                                  }}
                                />
                              </NativeMapView>
                            </View>
                          ) : (
                            <View style={styles.onboardingHintCard}>
                              <Text style={styles.onboardingHintTitle}>Map preview unavailable on web</Text>
                              <Text style={styles.onboardingHintBody}>Open the app on iPhone/Android to pick an exact map pin. For now, use current location mode.</Text>
                            </View>
                          )}

                          <View style={styles.rowGap}>
                            <FormField label="Area" value={addressForm.area} onChangeText={(value) => setAddressForm((current) => ({ ...current, area: value }))} error={onboardingErrors.area} />
                            <FormField label="Street" value={addressForm.street} onChangeText={(value) => setAddressForm((current) => ({ ...current, street: value }))} error={onboardingErrors.street} />
                            <View style={styles.rowGap}>
                              <FormField label="Building" value={addressForm.building} onChangeText={(value) => setAddressForm((current) => ({ ...current, building: value }))} error={onboardingErrors.building} />
                              <FormField label="Phone" value={addressForm.contactPhone} onChangeText={(value) => setAddressForm((current) => ({ ...current, contactPhone: value }))} error={onboardingErrors.contactPhone} />
                            </View>
                          </View>
                        </>
                      )}

                      {onboardingErrors.locationPin ? <FieldError text={onboardingErrors.locationPin} /> : null}

                      <PrimaryButton label="Save location and continue" onPress={() => { void handleOnboardingLocationContinue(); }} />
                    </View>
                  ) : null}

                  {onboardingStep === 'phone' ? (
                    <View style={styles.onboardingSectionStack}>
                      <View style={styles.onboardingVerificationCard}>
                        <FormField
                          label="Phone"
                          value={phoneVerificationForm.phone}
                          onChangeText={(value) => setPhoneVerificationForm((current) => ({ ...current, phone: value }))}
                          error={onboardingErrors.phone}
                          placeholder="+97450123456"
                        />
                        <FormField
                          label="Verification code"
                          value={phoneVerificationForm.code}
                          onChangeText={(value) => setPhoneVerificationForm((current) => ({ ...current, code: value }))}
                          error={onboardingErrors.code}
                          placeholder="Enter 6-digit code"
                        />
                      </View>
                      <View style={styles.onboardingActionStack}>
                        <SecondaryButton label={phoneVerificationBusy ? 'Sending code...' : 'Send code'} onPress={handleIssuePhoneCode} loading={phoneVerificationBusy} disabled={phoneVerificationBusy} />
                        <PrimaryButton label={phoneVerificationBusy ? 'Verifying...' : 'Verify and continue'} onPress={handleVerifyPhoneCode} loading={phoneVerificationBusy} disabled={phoneVerificationBusy} />
                      </View>
                    </View>
                  ) : null}

                  {onboardingStep === 'account' ? (
                    <View style={styles.onboardingSectionStack}>
                      <View style={styles.rowGap}>
                        <FormField label="First name" value={accountSetupForm.firstName} onChangeText={(value) => setAccountSetupForm((current) => ({ ...current, firstName: value }))} error={onboardingErrors.firstName} />
                        <FormField label="Last name" value={accountSetupForm.lastName} onChangeText={(value) => setAccountSetupForm((current) => ({ ...current, lastName: value }))} error={onboardingErrors.lastName} />
                      </View>
                      <FormField label="Email" value={accountSetupForm.email} onChangeText={(value) => setAccountSetupForm((current) => ({ ...current, email: value }))} error={onboardingErrors.email} />
                      <PrimaryButton label="Submit and go to Home" onPress={handleCompleteGuestAccount} />
                    </View>
                  ) : null}
                  </ScrollView>
                </View>
              </LinearGradient>
            </View>
          ) : null}

          <View style={[styles.customerBottomDock, customerDarkMode && styles.customerBottomDockDark]}>
            <BottomNavBar
              items={customerTabs}
              selectedKey={customerTab}
              onChange={(value) => requestCustomerTabChange(value as CustomerTabKey)}
              containerStyle={customerDarkMode ? styles.bottomNavDark : undefined}
              itemStyle={customerDarkMode ? styles.bottomNavItemDark : undefined}
              textStyle={customerDarkMode ? styles.bottomNavTextDark : undefined}
              darkMode={customerDarkMode}
            />
          </View>

          <OperationPopup visible={!!operationPopup} tone={operationPopup?.tone ?? 'success'} text={operationPopup?.text ?? ''} onClose={() => setOperationPopup(null)} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.flexFill} pointerEvents={interactionLocked ? 'none' : 'auto'}>
        <ScrollView style={styles.scrollFlex} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextWrap}>
              <Text style={styles.brandName}>Abdalla</Text>
              <Text style={styles.brandTagline}>Built for empty-start marketplaces that grow company by company.</Text>
            </View>
            <View style={styles.workspaceUtilityRow}>
              <RoleBadge role={activeRole} />
              <SecondaryButton label={busy ? 'Signing out...' : 'Sign out'} onPress={handleSignOut} disabled={busy} />
            </View>
          </View>
          <Text style={styles.heroTitle}>{activeWorkspaceLabel}</Text>
          <Text style={styles.heroBody}>
            Admins control onboarding and partner governance, companies operate their own publishing workspace, and customers can browse publicly and sign in only when they need to transact.
          </Text>
          {!!authMessage && <Text style={styles.messageText}>{authMessage}</Text>}
        </View>

          {activeRole === 'admin' ? (
            <AdminWorkspace
            wide={wide}
            tab={adminTab}
            onTabChange={setAdminTab}
            metrics={adminMetrics}
            bookings={bookings}
            catalogItems={catalogItems}
            offerPromotions={offerPromotions}
            notifications={adminNotifications}
            auditEvents={auditEvents}
            ratings={ratings}
            users={users}
            companies={companies}
            categorySettings={appCategorySettings}
            invitations={invitations}
            form={companyForm}
            onFormChange={setCompanyForm}
            formErrors={companyFormErrors}
            selectedCompany={selectedAdminCompany}
            onSelectCompany={setSelectedAdminCompanyId}
            onSaveCompany={handleCompanySave}
            companySubmitting={companySubmitting}
            onResetCompany={resetAdminDrafts}
            onDeleteCompany={handleCompanyDelete}
            onToggleCompany={handleCompanyStatusChange}
            onPickCompanyImage={handleCompanyImagePick}
            onClearCompanyImage={handleCompanyImageClear}
            onSaveCategorySetting={handleCategoryLaunchChange}
            onReviewCatalogItem={handleCatalogReview}
            onReviewOfferPromotion={handleOfferReview}
            onResendInvitation={handleInvitationResend}
            onRevokeInvitation={handleInvitationRevoke}
            onOpenNotification={handleNotificationOpen}
            banner={adminBanner}
            />
          ) : null}

          {activeRole === 'company' ? (
            <CompanyWorkspace
            wide={wide}
            tab={companyTab}
            onTabChange={setCompanyTab}
            currentCompany={currentCompany}
            companySettingsForm={companySettingsForm}
            onCompanySettingsFormChange={setCompanySettingsForm}
            companyErrors={companyFormErrors}
            onSaveSettings={handleCompanySettingsSave}
            banner={companyBanner}
            companyItems={companyItems}
            companyPromotions={companyPromotions}
            notifications={companyNotifications}
            auditEvents={auditEvents}
            companyBookings={companyBookings}
            ratings={ratings}
            selectedCatalogItem={selectedCatalogItem}
            catalogForm={catalogForm}
            onCatalogFormChange={setCatalogForm}
            catalogErrors={catalogFormErrors}
            onSelectCatalogItem={setSelectedCatalogItemId}
            onSaveCatalog={handleCatalogSave}
            catalogSubmitting={catalogSubmitting}
            onPickCatalogImage={handleCatalogImagePick}
            onClearCatalogImage={handleCatalogImageClear}
            onDeleteCatalogItem={deleteCatalogItem}
            onResetCatalog={resetCatalogDrafts}
            selectedPromotion={selectedPromotion}
            offerForm={offerForm}
            onOfferFormChange={setOfferForm}
            offerErrors={offerFormErrors}
            onSelectPromotion={setSelectedPromotionId}
            onSaveOffer={handleOfferSave}
            onDeleteOffer={handleOfferDelete}
            onOpenNotification={handleNotificationOpen}
            onChangeBookingStatus={changeBookingStatus}
            companyAvailabilitySlots={companyAvailabilitySlots}
            scheduleForm={scheduleForm}
            onScheduleFormChange={setScheduleForm}
            onSaveSchedule={handleScheduleSave}
            onDeleteSchedule={handleScheduleDelete}
            loyaltyForm={loyaltyForm}
            onLoyaltyFormChange={setLoyaltyForm}
            loyaltyErrors={loyaltyFormErrors}
            onSaveLoyalty={handleLoyaltySave}
            currentProgram={currentCompanyProgram}
            />
          ) : null}

          {busy ? <ActivityIndicator color={colors.primary} style={styles.busyIndicator} /> : null}
        </ScrollView>
        {activeRole === 'admin' ? (
          <AdminBottomNav
            selectedKey={adminTab}
            onChange={(value) => setAdminTab(value as 'overview' | 'companies' | 'publishing' | 'inbox' | 'bookings' | 'settings')}
          />
        ) : null}
        {activeRole === 'company' ? (
          <CompanyBottomNav
            selectedKey={companyTab}
            onChange={(value) => setCompanyTab(value as 'overview' | 'catalog' | 'offers' | 'schedule' | 'bookings' | 'loyalty' | 'requests')}
          />
        ) : null}
      </View>
      <GlobalLoadingOverlay visible={busy || globalLoadingCount > 0} message={globalLoadingMessage} />
      <OperationPopup visible={!!operationPopup} tone={operationPopup?.tone ?? 'success'} text={operationPopup?.text ?? ''} onClose={() => setOperationPopup(null)} />
    </SafeAreaView>
  );
}

type AdminWorkspaceProps = {
  wide: boolean;
  tab: 'overview' | 'companies' | 'publishing' | 'inbox' | 'bookings' | 'settings';
  onTabChange: (tab: 'overview' | 'companies' | 'publishing' | 'inbox' | 'bookings' | 'settings') => void;
  metrics: Array<{ label: string; value: string }>;
  bookings: Booking[];
  catalogItems: CatalogItem[];
  offerPromotions: OfferPromotion[];
  notifications: AppNotification[];
  auditEvents: AuditEvent[];
  ratings: Array<{ id: string; companyId: string; score: number }>;
  users: Array<{ id: string; fullName: string; role: string; email: string; companyName?: string }>;
  companies: Company[];
  categorySettings: AppCategorySetting[];
  invitations: CompanyInvitation[];
  form: {
    name: string;
    description: string;
    category: string;
    supportEmail: string;
    supportPhone: string;
    accentColor: string;
    logoText: string;
    profileImageUrl: string;
    inviteEmail: string;
    inviteMessage: string;
  };
  onFormChange: React.Dispatch<React.SetStateAction<{
    name: string;
    description: string;
    category: string;
    supportEmail: string;
    supportPhone: string;
    accentColor: string;
    logoText: string;
    profileImageUrl: string;
    inviteEmail: string;
    inviteMessage: string;
  }>>;
  formErrors: ValidationMap;
  selectedCompany: Company | null;
  onSelectCompany: (companyId: string | null) => void;
  onSaveCompany: () => void;
  companySubmitting: boolean;
  onResetCompany: () => void;
  onDeleteCompany: (companyId: string) => Promise<void>;
  onToggleCompany: (companyId: string, isActive: boolean) => Promise<void>;
  onPickCompanyImage: () => void;
  onClearCompanyImage: () => void;
  onSaveCategorySetting: (category: string, isComingSoon: boolean) => void;
  onReviewCatalogItem: (itemId: string, decision: 'approved' | 'rejected') => Promise<void>;
  onReviewOfferPromotion: (promotionId: string, decision: 'approved' | 'rejected') => Promise<void>;
  onResendInvitation: (invitation: CompanyInvitation) => void;
  onRevokeInvitation: (invitation: CompanyInvitation) => void;
  onOpenNotification: (notification: AppNotification) => void;
  banner: BannerState;
};

function AdminWorkspace({
  wide,
  tab,
  onTabChange,
  metrics,
  bookings,
  catalogItems,
  offerPromotions,
  notifications,
  auditEvents,
  ratings,
  users,
  companies,
  categorySettings,
  invitations,
  form,
  onFormChange,
  formErrors,
  selectedCompany,
  onSelectCompany,
  onSaveCompany,
  companySubmitting,
  onResetCompany,
  onDeleteCompany,
  onToggleCompany,
  onPickCompanyImage,
  onClearCompanyImage,
  onSaveCategorySetting,
  onReviewCatalogItem,
  onReviewOfferPromotion,
  onResendInvitation,
  onRevokeInvitation,
  onOpenNotification,
  banner,
}: AdminWorkspaceProps) {
  const ultraWide = useWindowDimensions().width >= 1360;
  const [adminTrendWindow, setAdminTrendWindow] = useState<7 | 30 | 90>(30);
  const [adminTrendFocus, setAdminTrendFocus] = useState<'activity' | 'bookings' | 'revenue'>('activity');
  const [companyStatusFilter, setCompanyStatusFilter] = useState<'all' | 'active' | 'paused' | 'attention'>('all');
  const [publishingFilter, setPublishingFilter] = useState<'all' | 'service' | 'product' | 'pending' | 'approved' | 'attention'>('all');
  const [bookingFilter, setBookingFilter] = useState<'all' | 'pending' | 'active' | 'completed' | 'attention'>('all');
  const [companySort, setCompanySort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'risk', direction: 'desc' });
  const [invitationSort, setInvitationSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'delivery', direction: 'desc' });
  const [bookingSort, setBookingSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'risk', direction: 'desc' });
  const [promotionSort, setPromotionSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'countdown', direction: 'asc' });
  const adminUsers = users.filter((user) => user.role === 'admin');
  const companyUsers = users.filter((user) => user.role === 'company');
  const pendingInvitations = invitations.filter((invitation) => invitation.status === 'pending');
  const unreadNotifications = notifications.filter((entry) => !entry.isRead);
  const pausedCompanies = companies.filter((entry) => !entry.isActive);
  const recentBookings = bookings.slice(0, 4);
  const livePromotions = offerPromotions.filter((promotion) => promotion.isActive).length;
  const publishedCatalogCount = catalogItems.filter((item) => item.approvalStatus === 'approved').length;
  const pendingCatalogApprovals = catalogItems.filter((item) => item.approvalStatus === 'pending').length;
  const grossMerchandiseValue = bookings.reduce((total, booking) => total + booking.total, 0);
  const completedBookings = bookings.filter((booking) => booking.status === 'completed').length;
  const averageAdminRating = averageScore(ratings);
  const invitationDeliveryRate = invitations.length
    ? (invitations.filter((invitation) => invitation.emailDeliveryStatus === 'sent').length / invitations.length) * 100
    : 100;
  const recentAdminEvents = getRecentAuditEvents(auditEvents, adminTrendWindow);
  const partnerSnapshots = companies
    .map((company) => buildCompanyOperationalSnapshot(company, bookings, catalogItems, offerPromotions, notifications, invitations, ratings, auditEvents))
    .sort((left, right) => severityWeight(right.tone) - severityWeight(left.tone));
  const recentAuditEvents = auditEvents.slice(0, 6);
  const adminActivityTrend = buildTrendSeries(recentAdminEvents, (event) => (event.status === 'error' ? 0 : 1));
  const adminBookingTrend = buildTrendSeries(
    recentAdminEvents.filter((event) => event.entityType === 'booking' && event.action === 'placeBooking'),
    () => 1,
  );
  const adminRevenueTrend = buildTrendSeries(
    recentAdminEvents.filter((event) => event.entityType === 'booking' && event.action === 'placeBooking'),
    (event) => toNumericMetric(event.metadata.find((entry) => /^\d/.test(entry)) ?? '0'),
  );
  const riskCompanies = partnerSnapshots.filter((snapshot) => snapshot.tone === 'warning' || snapshot.tone === 'error');
  const filteredCompanies = partnerSnapshots.filter((snapshot) => {
    if (companyStatusFilter === 'active') return snapshot.tone !== 'error' && snapshot.detail.startsWith('Active');
    if (companyStatusFilter === 'paused') return snapshot.detail.startsWith('Paused');
    if (companyStatusFilter === 'attention') return snapshot.tone === 'warning' || snapshot.tone === 'error';
    return true;
  });
  const filteredPublishingItems = catalogItems.filter((item) => {
    const company = companies.find((entry) => entry.id === item.companyId);
    const catalogRisk = getCatalogRisk(item, company?.isActive ?? true);
    if (publishingFilter === 'service') return item.kind === 'service';
    if (publishingFilter === 'product') return item.kind === 'product';
    if (publishingFilter === 'pending') return item.approvalStatus === 'pending';
    if (publishingFilter === 'approved') return item.approvalStatus === 'approved';
    if (publishingFilter === 'attention') return catalogRisk.tone === 'warning' || catalogRisk.tone === 'error';
    return true;
  });
  const filteredBookings = bookings.filter((booking) => {
    const bookingRisk = getBookingRisk(booking);
    if (bookingFilter === 'pending') return booking.status === 'pending';
    if (bookingFilter === 'active') return ['approved', 'scheduled', 'enRoute', 'inProgress'].includes(booking.status);
    if (bookingFilter === 'completed') return booking.status === 'completed';
    if (bookingFilter === 'attention') return bookingRisk.tone === 'warning' || bookingRisk.tone === 'error';
    return true;
  });
  const sortedCompanySnapshots = sortRows(filteredCompanies, companySort, {
    name: (snapshot) => snapshot.title,
    risk: (snapshot) => severityWeight(snapshot.tone),
    status: (snapshot) => snapshot.statusLabel,
  });
  const sortedInvitations = sortRows(pendingInvitations, invitationSort, {
    company: (invitation) => invitation.companyName,
    email: (invitation) => invitation.email,
    delivery: (invitation) => invitation.emailDeliveryStatus,
    status: (invitation) => invitation.status,
  });
  const sortedBookings = sortRows(filteredBookings, bookingSort, {
    booking: (booking) => booking.bookingNumber,
    company: (booking) => booking.companyName,
    aging: (booking) => getBookingAgingInfo(booking).sortValue,
    total: (booking) => booking.total,
    status: (booking) => booking.status,
    risk: (booking) => severityWeight(getBookingRisk(booking).tone),
  });
  const sortedPromotions = sortRows(offerPromotions, promotionSort, {
    promotion: (promotion) => promotion.title,
    company: (promotion) => promotion.companyName,
    discount: (promotion) => promotion.discountLabel || '',
    countdown: (promotion) => getCountdownInfo(promotion.endsAtLabel).sortValue,
    status: (promotion) => (promotion.isActive ? 1 : 0),
  });
  const adminTrendDetails = getTrendInsight(adminTrendFocus, adminActivityTrend, adminBookingTrend, adminRevenueTrend, adminTrendWindow);
  const pendingCatalogRequests = catalogItems.filter((item) => item.approvalStatus === 'pending');
  const pendingServiceRequests = pendingCatalogRequests.filter((item) => item.kind === 'service');
  const pendingProductRequests = pendingCatalogRequests.filter((item) => item.kind === 'product');
  const pendingOfferRequests = offerPromotions.filter((promotion) => promotion.approvalStatus === 'pending');
  const categorySettingMap = useMemo(() => new Map(categorySettings.map((entry) => [entry.category, entry.isComingSoon])), [categorySettings]);
  const launchCategories = useMemo(
    () => APP_CATEGORY_OPTIONS.map((category) => ({
      category,
      isComingSoon: categorySettingMap.get(category) ?? DEFAULT_COMING_SOON_CATEGORIES.has(category),
      providerCount: companies.filter((company) => company.category === category && company.isActive).length,
    })),
    [categorySettingMap, companies],
  );

  async function handleBulkCatalogReview(decision: 'approved' | 'rejected', kind?: 'service' | 'product') {
    const targets = pendingCatalogRequests.filter((item) => !kind || item.kind === kind);
    if (!targets.length) {
      return;
    }
    await Promise.all(targets.map((item) => onReviewCatalogItem(item.id, decision)));
  }

  async function handleBulkOfferReview(decision: 'approved' | 'rejected') {
    if (!pendingOfferRequests.length) {
      return;
    }
    await Promise.all(pendingOfferRequests.map((promotion) => onReviewOfferPromotion(promotion.id, decision)));
  }

  return (
    <>
      {banner ? <StatusBanner tone={banner.tone} text={banner.text} /> : null}

      {tab === 'overview' ? (
        <>
          <LinearGradient colors={['#0B5D33', '#0F7B45', '#16A34A']} style={styles.workspaceShowcase}>
            <View style={styles.workspaceShowcaseTopRow}>
              <View style={styles.workspaceShowcaseTextWrap}>
                <Text style={styles.workspaceShowcaseEyebrow}>Admin workspace</Text>
                <Text style={styles.workspaceShowcaseTitle}>Command the marketplace from one mobile-first control center.</Text>
                <Text style={styles.workspaceShowcaseBody}>
                  Monitor onboarding, publishing health, booking flow, and operator alerts without losing your place in the workflow.
                </Text>
              </View>
              <View style={styles.workspaceShowcaseGlow} />
            </View>

            <View style={styles.workspaceShowcaseBadgeRow}>
              <ShowcaseBadge label="Pending invites" value={String(pendingInvitations.length)} />
              <ShowcaseBadge label="Pending approvals" value={String(pendingCatalogApprovals)} />
              <ShowcaseBadge label="Paused companies" value={String(pausedCompanies.length)} />
              <ShowcaseBadge label="Unread alerts" value={String(unreadNotifications.length)} />
              <ShowcaseBadge label="Live promotions" value={String(livePromotions)} />
            </View>

            <View style={styles.workspaceActionDeck}>
              <WorkspaceActionTile
                eyebrow="Ops"
                title="Partner companies"
                body="Create, edit, pause, and reopen company workspaces with clearer controls."
                onPress={() => onTabChange('companies')}
              />
              <WorkspaceActionTile
                eyebrow="Publishing"
                title="Marketplace review"
                body="Inspect what companies have pushed live before customers see it."
                onPress={() => onTabChange('publishing')}
              />
              <WorkspaceActionTile
                eyebrow="Control"
                title="Platform settings"
                body="Manage launch categories and admin access while invitations stay centralized in Companies."
                onPress={() => onTabChange('settings')}
              />
            </View>
          </LinearGradient>

          <View style={[styles.metricGrid, wide && styles.metricGridWide]}>
            {metrics.map((metric) => (
              <MetricCard key={metric.label} label={metric.label} value={metric.value} />
            ))}
            <MetricCard label="Catalog live" value={String(publishedCatalogCount)} />
            <MetricCard label="Awaiting approval" value={String(pendingCatalogApprovals)} />
            <MetricCard label="Action needed" value={String(pendingInvitations.length + pausedCompanies.length + pendingCatalogApprovals)} />
            <MetricCard label="GMV" value={formatMetricValue(grossMerchandiseValue)} />
            <MetricCard label="Completion" value={formatPercentValue(completedBookings, bookings.length)} />
            <MetricCard label="Avg rating" value={averageAdminRating ? averageAdminRating.toFixed(1) : '0.0'} />
            <MetricCard label="Invite delivery" value={formatPercent(invitationDeliveryRate)} />
          </View>
          <View style={[styles.workspaceColumns, wide && styles.workspaceColumnsWide]}>
            <View style={[styles.columnPane, wide && styles.columnPaneWide]}>
              <SectionCard title="Executive scoreboard" subtitle="A premium admin dashboard should expose demand, fulfilment, trust, and onboarding health without making you inspect raw lists first.">
                <View style={styles.statusRail}>
                  <OperationalStatusRow title="GMV" detail={`${formatMetricValue(grossMerchandiseValue)} across ${bookings.length} marketplace bookings`} statusLabel={completedBookings ? `${completedBookings} completed` : 'No completions yet'} tone="success" />
                  <OperationalStatusRow title="Delivery health" detail={`${pendingInvitations.length} pending invites, ${pausedCompanies.length} paused workspaces, ${unreadNotifications.length} unread alerts`} statusLabel={`${formatPercent(invitationDeliveryRate)} deliverability`} tone={pendingInvitations.length || pausedCompanies.length ? 'warning' : 'success'} />
                  <OperationalStatusRow title="Trust score" detail={`${publishedCatalogCount} live listings, ${livePromotions} active promotions, ${ratings.length} customer reviews`} statusLabel={averageAdminRating ? `${averageAdminRating.toFixed(1)} / 5` : 'Awaiting reviews'} tone={averageAdminRating >= 4 ? 'success' : averageAdminRating >= 3 ? 'info' : 'warning'} />
                </View>
                <View style={styles.rowGap}>
                  <SecondaryButton label="Review settings" onPress={() => onTabChange('settings')} />
                  <SecondaryButton label="Open bookings" onPress={() => onTabChange('bookings')} />
                </View>
              </SectionCard>

              <SectionCard title="Partner health" subtitle="A quick view of partner readiness, publishing volume, and support posture.">
                {partnerSnapshots.length ? partnerSnapshots.slice(0, 5).map((snapshot) => (
                  <OperationalStatusRow key={snapshot.id} title={snapshot.title} detail={snapshot.detail} statusLabel={snapshot.statusLabel} tone={snapshot.tone} actionLabel="Manage" onPress={() => onTabChange('companies')} />
                )) : <EmptyState title="No companies yet" body="Create the first partner workspace to start marketplace operations." />}
              </SectionCard>
            </View>

            <View style={[styles.columnPane, wide && styles.columnPaneWide]}>
              <SectionCard title="Audit history" subtitle="Every core operational change is captured so admins can review what changed, who triggered it, and which workspace needs attention.">
                {recentAuditEvents.length ? recentAuditEvents.map((event) => (
                  <AuditEventRow key={event.id} event={event} />
                )) : <EmptyState title="No audit history yet" body="Operational history starts building as soon as admins, companies, and customers take action." />}
              </SectionCard>

              <SectionCard title="Trend monitor" subtitle="Short-horizon trend bars help you spot whether marketplace demand and operator activity are rising or flattening.">
                <View style={styles.filterChipRow}>
                  <ChoiceChip label="7D" selected={adminTrendWindow === 7} onPress={() => setAdminTrendWindow(7)} />
                  <ChoiceChip label="30D" selected={adminTrendWindow === 30} onPress={() => setAdminTrendWindow(30)} />
                  <ChoiceChip label="90D" selected={adminTrendWindow === 90} onPress={() => setAdminTrendWindow(90)} />
                </View>
                <MiniTrendCard title="Operational activity" subtitle="Successful admin, company, and customer actions over recent days." points={adminActivityTrend} tone="info" selected={adminTrendFocus === 'activity'} onPress={() => setAdminTrendFocus('activity')} />
                <MiniTrendCard title="Bookings created" subtitle="Recent booking intake trend from the audit stream." points={adminBookingTrend} tone="success" selected={adminTrendFocus === 'bookings'} onPress={() => setAdminTrendFocus('bookings')} />
                <MiniTrendCard title="Revenue trend" subtitle="Booking value trend from recent booking activity." points={adminRevenueTrend} tone="warning" format="currency" selected={adminTrendFocus === 'revenue'} onPress={() => setAdminTrendFocus('revenue')} />
                <TrendDrilldownCard title={adminTrendDetails.title} description={adminTrendDetails.description} highlight={adminTrendDetails.highlight} footer={adminTrendDetails.footer} points={adminTrendFocus === 'activity' ? adminActivityTrend : adminTrendFocus === 'bookings' ? adminBookingTrend : adminRevenueTrend} format={adminTrendFocus === 'revenue' ? 'currency' : 'number'} />
              </SectionCard>

              <SectionCard title="Notification center" subtitle="Unread and recent updates from invitations, bookings, reviews, and publishing appear here.">
                {notifications.length ? notifications.slice(0, 6).map((notification) => (
                  <NotificationRow key={notification.id} notification={notification} onOpen={() => onOpenNotification(notification)} />
                )) : <EmptyState title="No notifications yet" body="Marketplace activity will start appearing here as soon as admins and companies take action." />}
              </SectionCard>

              <SectionCard title="Latest bookings" subtitle="Keep an eye on the freshest marketplace requests without leaving the dashboard.">
                {recentBookings.length ? recentBookings.map((booking) => (
                  <InfoRow key={booking.id} title={`${booking.bookingNumber} · ${booking.itemTitle}`} subtitle={`${booking.companyName} · ${readableBookingStatus(booking.status)} · ${booking.scheduleDate}`} actionLabel="View" onAction={() => onTabChange('bookings')} />
                )) : <EmptyState title="No bookings yet" body="Bookings will appear here once customers start placing orders." />}
              </SectionCard>
            </View>
          </View>
        </>
      ) : null}

      {tab === 'companies' ? (
        <View style={[styles.workspaceColumns, wide && styles.workspaceColumnsWide]}>
          <View style={[styles.columnPane, wide && styles.columnPaneWide]}>
            <SectionCard title="Company management" subtitle="Use this tab only to manage existing companies: review status, deactivate or reactivate access, and remove a company when needed.">
              <View style={styles.overviewBadgeRow}>
                <CompactBadge label="Companies" value={String(companies.length)} />
                <CompactBadge label="Paused" value={String(pausedCompanies.length)} />
                <CompactBadge label="Invites" value={String(invitations.length)} />
              </View>
              <View style={styles.filterChipRow}>
                <ChoiceChip label="All" selected={companyStatusFilter === 'all'} onPress={() => setCompanyStatusFilter('all')} />
                <ChoiceChip label="Active" selected={companyStatusFilter === 'active'} onPress={() => setCompanyStatusFilter('active')} />
                <ChoiceChip label="Paused" selected={companyStatusFilter === 'paused'} onPress={() => setCompanyStatusFilter('paused')} />
                <ChoiceChip label="Attention" selected={companyStatusFilter === 'attention'} onPress={() => setCompanyStatusFilter('attention')} />
              </View>
            </SectionCard>

            <SectionCard title={selectedCompany ? 'Edit company profile' : 'Create company profile'} subtitle={selectedCompany ? 'Update the company profile details and branding from one centralized card.' : 'Create the company and send the owner invitation from this single form.'}>
              <View style={styles.rowGap}>
                <FormField label="Company name" value={form.name} onChangeText={(value) => onFormChange((current) => ({ ...current, name: value }))} error={formErrors.name} />
                <SelectField label="Company category" value={form.category} options={APP_CATEGORY_OPTIONS} placeholder="Choose a category" error={formErrors.category} onSelect={(value) => onFormChange((current) => ({ ...current, category: value }))} />
              </View>
              <FormField label="Description" value={form.description} onChangeText={(value) => onFormChange((current) => ({ ...current, description: value }))} error={formErrors.description} multiline />
              <View style={styles.rowGap}>
                <FormField label="Support email" value={form.supportEmail} onChangeText={(value) => onFormChange((current) => ({ ...current, supportEmail: value }))} error={formErrors.supportEmail} />
                <FormField label="Support phone" value={form.supportPhone} onChangeText={(value) => onFormChange((current) => ({ ...current, supportPhone: value }))} error={formErrors.supportPhone} />
              </View>
              <View style={styles.rowGap}>
                <FormField label="Accent color" value={form.accentColor} onChangeText={(value) => onFormChange((current) => ({ ...current, accentColor: value }))} error={formErrors.accentColor} />
                <FormField label="Logo text" value={form.logoText} onChangeText={(value) => onFormChange((current) => ({ ...current, logoText: value }))} error={formErrors.logoText} />
              </View>
              {!selectedCompany ? (
                <>
                  <View style={styles.rowGap}>
                    <FormField label="Invitation email" value={form.inviteEmail} onChangeText={(value) => onFormChange((current) => ({ ...current, inviteEmail: value }))} error={formErrors.inviteEmail} />
                    <View style={styles.infoBodyGrow}>
                      <Text style={styles.helperText}>Invitation is sent automatically when you tap Create company.</Text>
                    </View>
                  </View>
                  <FormField label="Invite note" value={form.inviteMessage} onChangeText={(value) => onFormChange((current) => ({ ...current, inviteMessage: value }))} multiline />
                </>
              ) : null}
              <View style={styles.catalogUploadPanel}>
                {form.profileImageUrl ? (
                  <Image source={{ uri: form.profileImageUrl }} style={styles.catalogUploadPreviewImage} resizeMode="cover" />
                ) : (
                  <View style={styles.catalogUploadPlaceholder}>
                    <MaterialCommunityIcons name="image-outline" size={34} color="#12385E" />
                    <Text style={styles.catalogUploadPlaceholderTitle}>Upload company profile image</Text>
                    <Text style={styles.catalogUploadPlaceholderBody}>This image is shown on the customer home and explore screens as the company cover.</Text>
                  </View>
                )}
                <View style={styles.catalogUploadActions}>
                  <SecondaryButton label={form.profileImageUrl ? 'Replace image' : 'Upload image'} tone="contrast" onPress={onPickCompanyImage} />
                  {form.profileImageUrl ? <SecondaryButton label="Remove image" onPress={onClearCompanyImage} /> : null}
                </View>
              </View>
              {formErrors.profileImageUrl ? <FieldError text={formErrors.profileImageUrl} /> : null}
              <View style={styles.rowGap}>
                <PrimaryButton label={selectedCompany ? 'Save company profile' : 'Create company and send invitation'} onPress={onSaveCompany} loading={companySubmitting} disabled={companySubmitting} />
                <SecondaryButton label="Reset form" onPress={onResetCompany} />
              </View>
            </SectionCard>

            <SectionCard title="Pending invitations" subtitle="Track invite delivery and activation without leaving the Companies tab.">
              {pendingInvitations.length ? pendingInvitations.map((invitation) => (
                <InfoRow
                  key={invitation.id}
                  title={`${invitation.companyName} · ${invitation.email}`}
                  subtitle={`Delivery: ${invitation.emailDeliveryStatus}${invitation.emailSentAtLabel ? ` · ${invitation.emailSentAtLabel}` : ''}${invitation.emailDeliveryError ? ` · ${invitation.emailDeliveryError}` : ''}`}
                  actionLabel="Resend"
                  onAction={() => onResendInvitation(invitation)}
                  secondaryActionLabel="Revoke"
                  onSecondaryAction={() => onRevokeInvitation(invitation)}
                />
              )) : <EmptyState title="No pending invitations" body="Every invitation is either accepted, revoked, or ready to be sent." />}
            </SectionCard>

            <SectionCard title="Management rules" subtitle="Use this page to create company profiles and manage activation status with clear operational guardrails.">
              <View style={styles.managementRuleList}>
                <ManagementRule text="Deactivate a company to remove its published items from the customer marketplace." />
                <ManagementRule text="Reactivate a company to restore its storefront immediately." />
                <ManagementRule text="Delete a company only when you want to remove its workspace and linked records." />
              </View>
            </SectionCard>
          </View>

          <View style={[styles.columnPane, wide && styles.columnPaneWide]}>
            <SectionCard title="Partner companies" subtitle="Admins can inspect every company and switch each workspace active or inactive without entering an edit form.">
              {riskCompanies.length ? (
                <View style={styles.statusRail}>
                  {riskCompanies.slice(0, 3).map((snapshot) => (
                    <OperationalStatusRow key={snapshot.id} title={snapshot.title} detail={snapshot.detail} statusLabel={snapshot.statusLabel} tone={snapshot.tone} />
                  ))}
                </View>
              ) : null}
              {wide ? (
                <SortableDataTable
                  columns={[
                    { key: 'name', label: 'Company', sortable: true, render: (snapshot) => snapshot.title },
                    { key: 'bookingsTrend', label: 'Bookings trend', render: (snapshot) => <MiniSparkline values={buildCompanyBookingSparkline(bookings, snapshot.id)} tone={snapshot.tone === 'error' ? 'error' : snapshot.tone === 'warning' ? 'warning' : 'info'} /> },
                    { key: 'risk', label: 'Risk', sortable: true, render: (snapshot) => <TableStatusPill label={toneLabel(snapshot.tone)} tone={snapshot.tone} /> },
                    { key: 'status', label: 'Status', sortable: true, render: (snapshot) => snapshot.statusLabel },
                    { key: 'detail', label: 'Ops detail', render: (snapshot) => snapshot.detail },
                  ]}
                  rows={sortedCompanySnapshots}
                  sortState={companySort}
                  onSortChange={setCompanySort}
                  keyExtractor={(snapshot) => snapshot.id}
                  getRowTone={(snapshot) => snapshot.tone}
                  stickyLeadColumns={ultraWide}
                  stickyLeadingColumnCount={1}
                  filterStorageKey="admin-companies"
                  renderActions={(snapshot) => {
                    const company = companies.find((entry) => entry.id === snapshot.id);
                    return company ? (
                      <View style={styles.tableActionWrap}>
                        <InlineActionButton label={company.isActive ? 'Pause' : 'Activate'} onPress={() => onToggleCompany(company.id, !company.isActive)} tone="neutral" />
                        <InlineActionButton label="Delete" onPress={() => onDeleteCompany(company.id)} tone="danger" />
                      </View>
                    ) : null;
                  }}
                />
              ) : filteredCompanies.length ? filteredCompanies.map((snapshot) => {
                const company = companies.find((entry) => entry.id === snapshot.id);
                return company ? (
                  <View key={company.id} style={styles.stackTight}>
                    <OperationalStatusRow title={snapshot.title} detail={snapshot.detail} statusLabel={snapshot.statusLabel} tone={snapshot.tone} />
                    <CompanyCard
                      company={company}
                      actionLabel={company.isActive ? 'Set inactive' : 'Set active'}
                      onAction={() => onToggleCompany(company.id, !company.isActive)}
                      secondaryActionLabel="Delete"
                      onSecondaryAction={() => onDeleteCompany(company.id)}
                    />
                  </View>
                ) : null;
              }) : <EmptyState title="No companies match this filter" body="Try another state filter to review partner workspaces." />}
            </SectionCard>

            <SectionCard title="Invitation delivery" subtitle="Track invite acceptance and whether delivery succeeded or failed.">
              {wide ? (
                <SortableDataTable
                  columns={[
                    { key: 'company', label: 'Company', sortable: true, render: (invitation) => invitation.companyName },
                    { key: 'email', label: 'Email', sortable: true, render: (invitation) => invitation.email },
                    { key: 'delivery', label: 'Delivery', sortable: true, render: (invitation) => <TableStatusPill label={invitation.emailDeliveryStatus} tone={getInvitationDeliveryTone(invitation.emailDeliveryStatus)} /> },
                    { key: 'status', label: 'State', sortable: true, render: (invitation) => <TableStatusPill label={invitation.status} tone={invitation.status === 'revoked' ? 'error' : invitation.status === 'accepted' ? 'success' : 'warning'} /> },
                  ]}
                  rows={sortedInvitations}
                  sortState={invitationSort}
                  onSortChange={setInvitationSort}
                  keyExtractor={(invitation) => invitation.id}
                  getRowTone={(invitation) => invitation.emailDeliveryStatus === 'failed' ? 'error' : invitation.status === 'pending' ? 'warning' : 'success'}
                  filterStorageKey="admin-invitations"
                  renderActions={(invitation) => invitation.status === 'pending' ? (
                    <View style={styles.tableActionWrap}>
                      <InlineActionButton label="Resend" onPress={() => onResendInvitation(invitation)} />
                      <InlineActionButton label="Revoke" onPress={() => onRevokeInvitation(invitation)} tone="danger" />
                    </View>
                  ) : null}
                />
              ) : invitations.length ? invitations.map((invitation) => (
                <InfoRow
                  key={invitation.id}
                  title={`${invitation.companyName} · ${invitation.email}`}
                  subtitle={`Status: ${invitation.status} · Email: ${invitation.emailDeliveryStatus}${invitation.emailSentAtLabel ? ` · ${invitation.emailSentAtLabel}` : ''}${invitation.emailDeliveryError ? ` · ${invitation.emailDeliveryError}` : ''}`}
                  actionLabel={invitation.status === 'pending' ? 'Resend' : undefined}
                  onAction={invitation.status === 'pending' ? () => onResendInvitation(invitation) : undefined}
                  secondaryActionLabel={invitation.status === 'pending' ? 'Revoke' : undefined}
                  onSecondaryAction={invitation.status === 'pending' ? () => onRevokeInvitation(invitation) : undefined}
                />
              )) : <EmptyState title="No invitations yet" body="Invitation history will appear here after the first company owner invite." />}
            </SectionCard>
          </View>
        </View>
      ) : null}

      {tab === 'publishing' ? (
        <View style={[styles.workspaceColumns, wide && styles.workspaceColumnsWide]}>
          <View style={[styles.columnPane, wide && styles.columnPaneWide]}>
            <SectionCard title="Publishing approvals" subtitle="Company submissions stay hidden from customers until an admin approves them.">
              <View style={styles.filterChipRow}>
                <ChoiceChip label="All" selected={publishingFilter === 'all'} onPress={() => setPublishingFilter('all')} />
                <ChoiceChip label="Pending" selected={publishingFilter === 'pending'} onPress={() => setPublishingFilter('pending')} />
                <ChoiceChip label="Approved" selected={publishingFilter === 'approved'} onPress={() => setPublishingFilter('approved')} />
                <ChoiceChip label="Service" selected={publishingFilter === 'service'} onPress={() => setPublishingFilter('service')} />
                <ChoiceChip label="Product" selected={publishingFilter === 'product'} onPress={() => setPublishingFilter('product')} />
                <ChoiceChip label="Attention" selected={publishingFilter === 'attention'} onPress={() => setPublishingFilter('attention')} />
              </View>
              {filteredPublishingItems.length ? filteredPublishingItems.map((item) => {
                const company = companies.find((entry) => entry.id === item.companyId);
                const risk = getCatalogRisk(item, company?.isActive ?? true);
                return (
                  <View key={item.id} style={styles.stackTight}>
                    <OperationalStatusRow title={`${item.title} risk`} detail={risk.detail} statusLabel={risk.label} tone={risk.tone} />
                    <CatalogCard
                      item={item}
                      actionLabel={item.approvalStatus === 'pending' ? 'Approve' : 'Open company'}
                      onAction={item.approvalStatus === 'pending' ? () => onReviewCatalogItem(item.id, 'approved') : () => onSelectCompany(item.companyId)}
                      secondaryActionLabel={item.approvalStatus === 'pending' ? 'Reject' : undefined}
                      onSecondaryAction={item.approvalStatus === 'pending' ? () => onReviewCatalogItem(item.id, 'rejected') : undefined}
                    />
                  </View>
                );
              }) : <EmptyState title="No catalog items match this filter" body="Try another publishing filter to inspect storefront quality." />}
            </SectionCard>
          </View>

          <View style={[styles.columnPane, wide && styles.columnPaneWide]}>
            <SectionCard title="Live promotions" subtitle="Promotions are now their own backend records, separate from the base product and service catalog.">
              {wide ? (
                <SortableDataTable
                  columns={[
                    { key: 'promotion', label: 'Promotion', sortable: true, render: (promotion) => promotion.title },
                    { key: 'company', label: 'Company', sortable: true, render: (promotion) => promotion.companyName },
                    { key: 'velocity', label: 'Velocity', render: (promotion) => <MiniSparkline values={buildPromotionVelocitySparkline(auditEvents, promotion)} tone={getPromotionRisk(promotion).tone} /> },
                    { key: 'discount', label: 'Discount', sortable: true, render: (promotion) => promotion.discountLabel || 'None set' },
                    { key: 'countdown', label: 'Countdown', sortable: true, render: (promotion) => {
                      const countdown = getCountdownInfo(promotion.endsAtLabel);
                      return <TableStatusPill label={countdown.label} tone={countdown.tone} />;
                    } },
                    { key: 'status', label: 'State', sortable: true, render: (promotion) => <TableStatusPill label={promotion.isActive ? 'Active' : 'Paused'} tone={getPromotionStateTone(promotion.isActive)} /> },
                  ]}
                  rows={sortedPromotions}
                  sortState={promotionSort}
                  onSortChange={setPromotionSort}
                  keyExtractor={(promotion) => promotion.id}
                  getRowTone={(promotion) => getPromotionRisk(promotion).tone}
                  stickyLeadColumns={ultraWide}
                  stickyLeadingColumnCount={2}
                  filterStorageKey="admin-promotions"
                />
              ) : offerPromotions.length ? offerPromotions.map((promotion) => (
                <InfoRow
                  key={promotion.id}
                  title={`${promotion.title} · ${promotion.catalogItemTitle}`}
                  subtitle={`${promotion.companyName} · ${promotion.isActive ? 'Active' : 'Paused'}${promotion.discountLabel ? ` · ${promotion.discountLabel}` : ''}`}
                />
              )) : <EmptyState title="No promotions yet" body="Company promotions will appear here after a company creates them in its offers page." />}
            </SectionCard>
          </View>
        </View>
      ) : null}

      {tab === 'inbox' ? (
        <View style={[styles.workspaceColumns, wide && styles.workspaceColumnsWide]}>
          <View style={[styles.columnPane, wide && styles.columnPaneWide]}>
            <SectionCard title="Approval inbox" subtitle="Grouped request queues with bulk approvals so admins can process publishing fast.">
              <View style={styles.overviewBadgeRow}>
                <CompactBadge label="All pending" value={String(pendingCatalogRequests.length + pendingOfferRequests.length)} />
                <CompactBadge label="Services" value={String(pendingServiceRequests.length)} />
                <CompactBadge label="Products" value={String(pendingProductRequests.length)} />
                <CompactBadge label="Offers" value={String(pendingOfferRequests.length)} />
              </View>
            </SectionCard>

            <SectionCard title="Products/Services requests" subtitle="All pending catalog submissions grouped by item type.">
              <View style={styles.rowGap}>
                <SecondaryButton label="Approve all services" tone="contrast" onPress={() => handleBulkCatalogReview('approved', 'service')} />
                <SecondaryButton label="Reject all services" tone="danger" onPress={() => handleBulkCatalogReview('rejected', 'service')} />
              </View>
              <View style={styles.rowGap}>
                <SecondaryButton label="Approve all products" tone="contrast" onPress={() => handleBulkCatalogReview('approved', 'product')} />
                <SecondaryButton label="Reject all products" tone="danger" onPress={() => handleBulkCatalogReview('rejected', 'product')} />
              </View>

              {pendingCatalogRequests.length ? pendingCatalogRequests.map((item) => (
                <CatalogCard
                  key={`inbox-catalog-${item.id}`}
                  item={item}
                  actionLabel="Approve"
                  onAction={() => onReviewCatalogItem(item.id, 'approved')}
                  secondaryActionLabel="Reject"
                  onSecondaryAction={() => onReviewCatalogItem(item.id, 'rejected')}
                />
              )) : <EmptyState title="No catalog requests" body="All catalog submissions are already reviewed." />}
            </SectionCard>
          </View>

          <View style={[styles.columnPane, wide && styles.columnPaneWide]}>
            <SectionCard title="Offers requests" subtitle="Promotions stay hidden until approved. Process individually or in bulk.">
              <View style={styles.rowGap}>
                <SecondaryButton label="Approve all offers" tone="contrast" onPress={() => handleBulkOfferReview('approved')} />
                <SecondaryButton label="Reject all offers" tone="danger" onPress={() => handleBulkOfferReview('rejected')} />
              </View>

              {pendingOfferRequests.length ? pendingOfferRequests.map((promotion) => (
                <InfoRow
                  key={`inbox-offer-${promotion.id}`}
                  title={`${promotion.title} · ${promotion.catalogItemTitle}`}
                  subtitle={`${promotion.companyName}${promotion.discountLabel ? ` · ${promotion.discountLabel}` : ''}`}
                  actionLabel="Approve"
                  onAction={() => onReviewOfferPromotion(promotion.id, 'approved')}
                  secondaryActionLabel="Reject"
                  onSecondaryAction={() => onReviewOfferPromotion(promotion.id, 'rejected')}
                />
              )) : <EmptyState title="No offer requests" body="All promotion requests are already reviewed." />}
            </SectionCard>
          </View>
        </View>
      ) : null}

      {tab === 'bookings' ? (
        <SectionCard title="All company bookings" subtitle="Admins can track the full marketplace booking flow across every partner company.">
          <View style={styles.filterChipRow}>
            <ChoiceChip label="All" selected={bookingFilter === 'all'} onPress={() => setBookingFilter('all')} />
            <ChoiceChip label="Pending" selected={bookingFilter === 'pending'} onPress={() => setBookingFilter('pending')} />
            <ChoiceChip label="Active" selected={bookingFilter === 'active'} onPress={() => setBookingFilter('active')} />
            <ChoiceChip label="Completed" selected={bookingFilter === 'completed'} onPress={() => setBookingFilter('completed')} />
            <ChoiceChip label="Attention" selected={bookingFilter === 'attention'} onPress={() => setBookingFilter('attention')} />
          </View>
          {wide ? (
            <SortableDataTable
              columns={[
                { key: 'booking', label: 'Booking', sortable: true, render: (booking) => booking.bookingNumber },
                { key: 'company', label: 'Company', sortable: true, render: (booking) => booking.companyName },
                { key: 'aging', label: 'Aging', sortable: true, render: (booking) => {
                  const aging = getBookingAgingInfo(booking);
                  return <TableStatusPill label={aging.label} tone={aging.tone} />;
                } },
                { key: 'total', label: 'Total', sortable: true, render: (booking) => `QAR ${booking.total.toFixed(0)}` },
                { key: 'status', label: 'Status', sortable: true, render: (booking) => <TableStatusPill label={readableBookingStatus(booking.status)} tone={getBookingStatusTone(booking.status)} /> },
                { key: 'risk', label: 'Risk', sortable: true, render: (booking) => {
                  const risk = getBookingRisk(booking);
                  return <TableStatusPill label={risk.label} tone={risk.tone} />;
                } },
              ]}
              rows={sortedBookings}
              sortState={bookingSort}
              onSortChange={setBookingSort}
              keyExtractor={(booking) => booking.id}
              getRowTone={(booking) => getBookingRisk(booking).tone}
              stickyLeadColumns={ultraWide}
              stickyLeadingColumnCount={2}
              filterStorageKey="admin-bookings"
            />
          ) : filteredBookings.length ? filteredBookings.map((booking) => {
            const risk = getBookingRisk(booking);
            return (
              <View key={booking.id} style={styles.stackTight}>
                <OperationalStatusRow title={`${booking.bookingNumber} risk`} detail={risk.detail} statusLabel={risk.label} tone={risk.tone} />
                <BookingCard booking={booking} />
              </View>
            );
          }) : <EmptyState title="No bookings match this filter" body="Adjust the booking filter to review another operational slice." />}
        </SectionCard>
      ) : null}

      {tab === 'settings' ? (
        <View style={[styles.workspaceColumns, wide && styles.workspaceColumnsWide]}>
          <View style={[styles.columnPane, wide && styles.columnPaneWide]}>
            <SectionCard title="Workspace settings" subtitle="Settings now focus on platform controls. Company invitations are managed from the Companies tab.">
              <View style={styles.overviewBadgeRow}>
                <CompactBadge label="Company users" value={String(companyUsers.length)} />
                <CompactBadge label="Admins" value={String(adminUsers.length)} />
              </View>
            </SectionCard>

            <SectionCard title="Company user management" subtitle="Monitor accepted company owner accounts and linked partner workspace access.">
              {companyUsers.length ? companyUsers.map((user) => <InfoRow key={user.id} title={user.fullName} subtitle={`${user.email}${user.companyName ? ` · ${user.companyName}` : ''}`} />) : <EmptyState title="No company users yet" body="Accepted company owner accounts will appear here." />}
            </SectionCard>
          </View>

          <View style={[styles.columnPane, wide && styles.columnPaneWide]}>
            <SectionCard title="Admin accounts" subtitle="Manual admin accounts survive refresh by resolving the role from Cognito session groups and the approved admin email list.">
              {adminUsers.length ? adminUsers.map((user) => <InfoRow key={user.id} title={user.fullName} subtitle={user.email} />) : <EmptyState title="No admin records yet" body="Manual admin sign-in creates the persistent admin user record after authentication." />}
            </SectionCard>

            <SectionCard title="Category launch control" subtitle="Choose exactly which categories stay visible as coming soon and which ones are open for booking.">
              <View style={styles.managementRuleList}>
                {launchCategories.map((entry) => (
                  <View key={`category-setting-${entry.category}`} style={styles.categorySettingRow}>
                    <View style={styles.infoBodyGrow}>
                      <Text style={styles.categorySettingTitle}>{entry.category}</Text>
                      <Text style={styles.categorySettingMeta}>{entry.providerCount} active providers · {entry.isComingSoon ? 'Coming Soon' : 'Live'}</Text>
                    </View>
                    <SecondaryButton
                      label={entry.isComingSoon ? 'Mark live' : 'Mark coming soon'}
                      tone={entry.isComingSoon ? 'contrast' : 'default'}
                      onPress={() => onSaveCategorySetting(entry.category, !entry.isComingSoon)}
                    />
                  </View>
                ))}
              </View>
            </SectionCard>
          </View>
        </View>
      ) : null}

    </>
  );
}

type CompanyWorkspaceProps = {
  wide: boolean;
  tab: 'overview' | 'catalog' | 'offers' | 'schedule' | 'bookings' | 'loyalty' | 'requests';
  onTabChange: (tab: 'overview' | 'catalog' | 'offers' | 'schedule' | 'bookings' | 'loyalty' | 'requests') => void;
  currentCompany: Company | null;
  companySettingsForm: {
    name: string;
    description: string;
    category: string;
    supportEmail: string;
    supportPhone: string;
    accentColor: string;
    logoText: string;
    profileImageUrl: string;
    inviteEmail: string;
    inviteMessage: string;
  };
  onCompanySettingsFormChange: React.Dispatch<React.SetStateAction<{
    name: string;
    description: string;
    category: string;
    supportEmail: string;
    supportPhone: string;
    accentColor: string;
    logoText: string;
    profileImageUrl: string;
    inviteEmail: string;
    inviteMessage: string;
  }>>;
  companyErrors: ValidationMap;
  onSaveSettings: () => void;
  banner: BannerState;
  companyItems: CatalogItem[];
  companyPromotions: OfferPromotion[];
  notifications: AppNotification[];
  auditEvents: AuditEvent[];
  companyBookings: Booking[];
  ratings: Array<{ id: string; companyId: string; score: number }>;
  selectedCatalogItem: CatalogItem | null;
  catalogForm: {
    title: string;
    summary: string;
    description: string;
    category: string;
    price: string;
    durationLabel: string;
    kind: CatalogItem['kind'];
    tags: string;
    isPublished: boolean;
    featured: boolean;
    loyaltyPoints: string;
    imageUrl: string;
    imageHint: string;
  };
  onCatalogFormChange: React.Dispatch<React.SetStateAction<{
    title: string;
    summary: string;
    description: string;
    category: string;
    price: string;
    durationLabel: string;
    kind: CatalogItem['kind'];
    tags: string;
    isPublished: boolean;
    featured: boolean;
    loyaltyPoints: string;
    imageUrl: string;
    imageHint: string;
  }>>;
  catalogErrors: ValidationMap;
  onSelectCatalogItem: (itemId: string | null) => void;
  onSaveCatalog: () => void;
  catalogSubmitting: boolean;
  onPickCatalogImage: () => void;
  onClearCatalogImage: () => void;
  onDeleteCatalogItem: (itemId: string) => Promise<void>;
  onResetCatalog: () => void;
  selectedPromotion: OfferPromotion | null;
  offerForm: {
    catalogItemId: string;
    title: string;
    headline: string;
    badgeText: string;
    discountLabel: string;
    startsAtLabel: string;
    endsAtLabel: string;
    isActive: boolean;
    sortOrder: string;
  };
  onOfferFormChange: React.Dispatch<React.SetStateAction<{
    catalogItemId: string;
    title: string;
    headline: string;
    badgeText: string;
    discountLabel: string;
    startsAtLabel: string;
    endsAtLabel: string;
    isActive: boolean;
    sortOrder: string;
  }>>;
  offerErrors: ValidationMap;
  onSelectPromotion: (promotionId: string | null) => void;
  onSaveOffer: () => void;
  onDeleteOffer: (promotionId: string) => Promise<void>;
  onOpenNotification: (notification: AppNotification) => void;
  onChangeBookingStatus: (bookingId: string, status: BookingStatus) => Promise<void>;
  companyAvailabilitySlots: AvailabilitySlot[];
  scheduleForm: {
    id: string;
    catalogItemId: string;
    dateLabel: string;
    timeLabel: string;
    status: AvailabilitySlot['status'];
    note: string;
  };
  onScheduleFormChange: React.Dispatch<React.SetStateAction<{
    id: string;
    catalogItemId: string;
    dateLabel: string;
    timeLabel: string;
    status: AvailabilitySlot['status'];
    note: string;
  }>>;
  onSaveSchedule: () => void;
  onDeleteSchedule: (slotId: string) => Promise<void>;
  loyaltyForm: {
    title: string;
    description: string;
    pointsPerBooking: string;
    rewardText: string;
    tierRules: string;
    isActive: boolean;
  };
  onLoyaltyFormChange: React.Dispatch<React.SetStateAction<{
    title: string;
    description: string;
    pointsPerBooking: string;
    rewardText: string;
    tierRules: string;
    isActive: boolean;
  }>>;
  loyaltyErrors: ValidationMap;
  onSaveLoyalty: () => void;
  currentProgram: { title: string; rewardText: string; isActive: boolean } | null;
};

function CompanyWorkspace({
  wide,
  tab,
  onTabChange,
  currentCompany,
  companySettingsForm,
  onCompanySettingsFormChange,
  companyErrors,
  onSaveSettings,
  banner,
  companyItems,
  companyPromotions,
  notifications,
  auditEvents,
  companyBookings,
  ratings,
  selectedCatalogItem,
  catalogForm,
  onCatalogFormChange,
  catalogErrors,
  onSelectCatalogItem,
  onSaveCatalog,
  catalogSubmitting,
  onPickCatalogImage,
  onClearCatalogImage,
  onDeleteCatalogItem,
  onResetCatalog,
  selectedPromotion,
  offerForm,
  onOfferFormChange,
  offerErrors,
  onSelectPromotion,
  onSaveOffer,
  onDeleteOffer,
  onOpenNotification,
  onChangeBookingStatus,
  companyAvailabilitySlots,
  scheduleForm,
  onScheduleFormChange,
  onSaveSchedule,
  onDeleteSchedule,
  loyaltyForm,
  onLoyaltyFormChange,
  loyaltyErrors,
  onSaveLoyalty,
  currentProgram,
}: CompanyWorkspaceProps) {
  const ultraWide = useWindowDimensions().width >= 1360;
  const publishedCatalogItems = useMemo(
    () => companyItems.filter((item) => item.approvalStatus === 'approved' && item.isPublished),
    [companyItems],
  );
  const [companyTrendWindow, setCompanyTrendWindow] = useState<7 | 30 | 90>(30);
  const [companyTrendFocus, setCompanyTrendFocus] = useState<'activity' | 'bookings' | 'publishing'>('activity');
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'approved' | 'pending' | 'draft' | 'attention'>('all');
  const [offerFilter, setOfferFilter] = useState<'all' | 'active' | 'paused' | 'attention'>('all');
  const [companyBookingFilter, setCompanyBookingFilter] = useState<'all' | 'pending' | 'active' | 'completed' | 'attention'>('all');
  const [companyCatalogSort, setCompanyCatalogSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'risk', direction: 'desc' });
  const [companyOfferSort, setCompanyOfferSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'risk', direction: 'desc' });
  const [companyBookingSort, setCompanyBookingSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'risk', direction: 'desc' });
  const unreadNotifications = notifications.filter((entry) => !entry.isRead);
  const pendingBookings = companyBookings.filter((entry) => entry.status === 'pending');
  const activePromotions = companyPromotions.filter((entry) => entry.isActive);
  const approvedItems = companyItems.filter((entry) => entry.approvalStatus === 'approved').length;
  const pendingItems = companyItems.filter((entry) => entry.approvalStatus === 'pending').length;
  const draftItems = companyItems.filter((entry) => entry.approvalStatus === 'draft').length;
  const currentAccent = currentCompany?.accentColor?.trim() || colors.primary;
  const companyRevenue = companyBookings.reduce((total, booking) => total + booking.total, 0);
  const completedBookings = companyBookings.filter((booking) => booking.status === 'completed').length;
  const companyRatings = ratings.filter((entry) => entry.companyId === currentCompany?.id);
  const averageCompanyRating = averageScore(companyRatings);
  const companyAuditEvents = auditEvents.filter((event) => event.companyId === currentCompany?.id).slice(0, 6);
  const companyAllAuditEvents = getRecentAuditEvents(auditEvents.filter((event) => event.companyId === currentCompany?.id), companyTrendWindow);
  const companyActivityTrend = buildTrendSeries(companyAllAuditEvents, (event) => (event.status === 'error' ? 0 : 1));
  const companyBookingTrend = buildTrendSeries(
    companyAllAuditEvents.filter((event) => event.entityType === 'booking' && event.action === 'placeBooking'),
    () => 1,
  );
  const companyPublishingTrend = buildTrendSeries(
    companyAllAuditEvents.filter((event) => event.entityType === 'catalogItem' || event.entityType === 'promotion'),
    () => 1,
  );
  const companyRisks = [
    {
      id: 'booking-risk',
      title: 'Bookings waiting',
      detail: `${pendingBookings.length} bookings still need first action from the company team.`,
      statusLabel: pendingBookings.length ? 'Needs operational follow-up' : 'Backlog is clear',
      tone: pendingBookings.length > 2 ? 'warning' as const : 'success' as const,
    },
    {
      id: 'catalog-risk',
      title: 'Catalog gaps',
      detail: `${companyItems.filter((item) => !item.imageUrl).length} listings have no image and ${draftItems} remain in draft.`,
      statusLabel: companyItems.length ? `${formatPercentValue(approvedItems, companyItems.length)} live` : 'No listings yet',
      tone: companyItems.filter((item) => !item.imageUrl).length || (draftItems + pendingItems) > approvedItems ? 'warning' as const : 'info' as const,
    },
    {
      id: 'offer-risk',
      title: 'Offer hygiene',
      detail: `${companyPromotions.filter((promotion) => !promotion.discountLabel || !promotion.endsAtLabel).length} promotions are missing discount or end-date detail.`,
      statusLabel: `${activePromotions.length} active offers`,
      tone: companyPromotions.filter((promotion) => !promotion.discountLabel || !promotion.endsAtLabel).length ? 'warning' as const : 'success' as const,
    },
  ];
  const filteredCompanyItems = useMemo(() => {
    if (catalogFilter === 'approved') {
      return companyItems.filter((entry) => entry.approvalStatus === 'approved');
    }

    if (catalogFilter === 'pending') {
      return companyItems.filter((entry) => entry.approvalStatus === 'pending');
    }

    if (catalogFilter === 'draft') {
      return companyItems.filter((entry) => entry.approvalStatus === 'draft' || !entry.isPublished);
    }

    if (catalogFilter === 'attention') {
      return companyItems.filter((entry) => {
        const risk = getCatalogRisk(entry, true);
        return risk.tone === 'warning' || risk.tone === 'error';
      });
    }

    return companyItems;
  }, [catalogFilter, companyItems]);
  const filteredPromotions = companyPromotions.filter((promotion) => {
    const risk = getPromotionRisk(promotion);
    if (offerFilter === 'active') return promotion.isActive;
    if (offerFilter === 'paused') return !promotion.isActive;
    if (offerFilter === 'attention') return risk.tone === 'warning' || risk.tone === 'error';
    return true;
  });
  const filteredCompanyBookings = companyBookings.filter((booking) => {
    const risk = getBookingRisk(booking);
    if (companyBookingFilter === 'pending') return booking.status === 'pending';
    if (companyBookingFilter === 'active') return ['approved', 'scheduled', 'enRoute', 'inProgress'].includes(booking.status);
    if (companyBookingFilter === 'completed') return booking.status === 'completed';
    if (companyBookingFilter === 'attention') return risk.tone === 'warning' || risk.tone === 'error';
    return true;
  });
  const sortedCompanyItems = sortRows(filteredCompanyItems, companyCatalogSort, {
    title: (item) => item.title,
    kind: (item) => item.kind,
    price: (item) => item.price,
    status: (item) => (item.approvalStatus === 'approved' ? 3 : item.approvalStatus === 'pending' ? 2 : item.approvalStatus === 'rejected' ? 1 : 0),
    risk: (item) => severityWeight(getCatalogRisk(item, true).tone),
  });
  const sortedCompanyPromotions = sortRows(filteredPromotions, companyOfferSort, {
    title: (promotion) => promotion.title,
    item: (promotion) => promotion.catalogItemTitle,
    status: (promotion) => (promotion.isActive ? 1 : 0),
    ending: (promotion) => parseFlexibleDate(promotion.endsAtLabel)?.getTime() ?? Number.MAX_SAFE_INTEGER,
    risk: (promotion) => severityWeight(getPromotionRisk(promotion).tone),
  });
  const sortedCompanyBookings = sortRows(filteredCompanyBookings, companyBookingSort, {
    booking: (booking) => booking.bookingNumber,
    customer: (booking) => booking.customerName,
    schedule: (booking) => parseFlexibleDate(booking.scheduleDate)?.getTime() ?? Number.MAX_SAFE_INTEGER,
    aging: (booking) => getBookingAgingInfo(booking).sortValue,
    total: (booking) => booking.total,
    status: (booking) => booking.status,
    risk: (booking) => severityWeight(getBookingRisk(booking).tone),
  });
  const companyRequestTimeline = useMemo(() => {
    const catalogEntries = companyItems.map((item) => ({
      id: `catalog-${item.id}`,
      type: item.kind === 'service' ? 'Service request' : 'Product request',
      title: item.title,
      status: item.approvalStatus,
      published: item.isPublished,
      submittedAt: labelFromId(item.id),
      reviewedAt: item.approvedAtLabel,
      reviewer: item.approvedByEmail,
      detail: `${item.category} · QAR ${item.price.toFixed(0)}`,
    }));

    const offerEntries = companyPromotions.map((promotion) => ({
      id: `offer-${promotion.id}`,
      type: 'Offer request',
      title: promotion.title,
      status: promotion.approvalStatus,
      published: promotion.isActive,
      submittedAt: labelFromId(promotion.id),
      reviewedAt: promotion.approvedAtLabel,
      reviewer: promotion.approvedByEmail,
      detail: `${promotion.catalogItemTitle}${promotion.discountLabel ? ` · ${promotion.discountLabel}` : ''}`,
    }));

    return [...catalogEntries, ...offerEntries].sort((left, right) => timestampFromId(right.id) - timestampFromId(left.id));
  }, [companyItems, companyPromotions]);
  const companyTrendDetails = getTrendInsight(companyTrendFocus, companyActivityTrend, companyBookingTrend, companyPublishingTrend, companyTrendWindow);

  return (
    <>
      {banner ? <StatusBanner tone={banner.tone} text={banner.text} /> : null}

      {tab === 'overview' ? (
        <>
          <LinearGradient colors={[currentAccent, '#113B60', '#0E7A8A']} style={styles.workspaceShowcase}>
            <View style={styles.workspaceShowcaseTopRow}>
              <View style={styles.workspaceShowcaseTextWrap}>
                <Text style={styles.workspaceShowcaseEyebrow}>Company workspace</Text>
                <Text style={styles.workspaceShowcaseTitle}>{currentCompany?.name ?? 'Company workspace'} is ready to operate like a premium mobile dashboard.</Text>
                <Text style={styles.workspaceShowcaseBody}>
                  Keep bookings moving, push offers faster, and keep your brand details close without burying the revenue actions.
                </Text>
              </View>
              <View style={styles.workspaceShowcaseGlow} />
            </View>

            <View style={styles.workspaceShowcaseBadgeRow}>
              <ShowcaseBadge label="Pending bookings" value={String(pendingBookings.length)} />
              <ShowcaseBadge label="Approved live" value={String(approvedItems)} />
              <ShowcaseBadge label="Unread alerts" value={String(unreadNotifications.length)} />
              <ShowcaseBadge label="Loyalty" value={currentProgram?.isActive ? 'Live' : 'Paused'} />
            </View>

            <View style={styles.workspaceActionDeck}>
              <WorkspaceActionTile
                eyebrow="Catalog"
                title="Ship listings"
                body="Create or update products and services with clear mobile controls."
                onPress={() => onTabChange('catalog')}
              />
              <WorkspaceActionTile
                eyebrow="Offers"
                title="Run promotions"
                body="Launch campaigns that stay separate from your base catalog records."
                onPress={() => onTabChange('offers')}
              />
              <WorkspaceActionTile
                eyebrow="Fulfilment"
                title="Handle bookings"
                body="Move jobs through the status flow without leaving the workspace."
                onPress={() => onTabChange('bookings')}
              />
            </View>
          </LinearGradient>

          <View style={[styles.metricGrid, wide && styles.metricGridWide]}>
            <MetricCard label="Catalog items" value={String(companyItems.length)} />
            <MetricCard label="Approved live" value={String(approvedItems)} />
            <MetricCard label="Bookings" value={String(companyBookings.length)} />
            <MetricCard label="Ratings" value={String(ratings.filter((entry) => entry.companyId === currentCompany?.id).length)} />
            <MetricCard label="Live offers" value={String(activePromotions.length)} />
            <MetricCard label="GMV" value={formatMetricValue(companyRevenue)} />
            <MetricCard label="Fulfilment" value={formatPercentValue(completedBookings, companyBookings.length)} />
            <MetricCard label="Avg rating" value={averageCompanyRating ? averageCompanyRating.toFixed(1) : '0.0'} />
            <MetricCard label="Draft share" value={formatPercentValue(draftItems, companyItems.length)} />
          </View>

          <View style={[styles.workspaceColumns, wide && styles.workspaceColumnsWide]}>
            <View style={[styles.columnPane, wide && styles.columnPaneWide]}>
              <SectionCard title={currentCompany?.name ?? 'Company workspace'} subtitle="A SaaS-grade company dashboard should highlight revenue, fulfilment pressure, and listing quality before anyone touches the forms.">
                <View style={styles.statusRail}>
                  <OperationalStatusRow title="Revenue lane" detail={`${formatMetricValue(companyRevenue)} from ${companyBookings.length} bookings`} statusLabel={companyBookings.length ? `${Math.round(companyRevenue / companyBookings.length)} avg order` : 'No orders yet'} tone={companyRevenue > 0 ? 'success' : 'info'} />
                  <OperationalStatusRow title="Fulfilment lane" detail={`${pendingBookings.length} pending bookings, ${completedBookings} completed, ${unreadNotifications.length} unread alerts`} statusLabel={`${formatPercentValue(completedBookings, companyBookings.length)} delivered`} tone={pendingBookings.length > 2 ? 'warning' : 'success'} />
                  <OperationalStatusRow title="Publishing lane" detail={`${approvedItems} approved items, ${pendingItems} pending approval, ${draftItems} drafts, ${activePromotions.length} live offers`} statusLabel={currentProgram?.isActive ? 'Loyalty live' : 'Loyalty paused'} tone={(draftItems + pendingItems) > approvedItems && companyItems.length > 0 ? 'warning' : 'info'} />
                </View>
                <View style={styles.rowGap}>
                  <SecondaryButton label="Catalog" onPress={() => onTabChange('catalog')} />
                  <SecondaryButton label="Offers" onPress={() => onTabChange('offers')} />
                  <SecondaryButton label="Bookings" onPress={() => onTabChange('bookings')} />
                </View>
              </SectionCard>

              <SectionCard title="Audit trail" subtitle="Publishing, booking, and loyalty changes are logged so the company team can review operational history in one place.">
                {companyAuditEvents.length ? companyAuditEvents.map((event) => (
                  <AuditEventRow key={event.id} event={event} />
                )) : <EmptyState title="No audit history yet" body="Audit activity will appear here after the first catalog, offer, booking, or loyalty action." />}
              </SectionCard>

              <SectionCard title="Trend monitor" subtitle="These compact trend bars show whether bookings and publishing actions are accelerating or stalling.">
                <View style={styles.filterChipRow}>
                  <ChoiceChip label="7D" selected={companyTrendWindow === 7} onPress={() => setCompanyTrendWindow(7)} />
                  <ChoiceChip label="30D" selected={companyTrendWindow === 30} onPress={() => setCompanyTrendWindow(30)} />
                  <ChoiceChip label="90D" selected={companyTrendWindow === 90} onPress={() => setCompanyTrendWindow(90)} />
                </View>
                <MiniTrendCard title="Workspace activity" subtitle="All tracked company actions across recent days." points={companyActivityTrend} tone="info" selected={companyTrendFocus === 'activity'} onPress={() => setCompanyTrendFocus('activity')} />
                <MiniTrendCard title="Booking intake" subtitle="Recent booking creation trend for this company." points={companyBookingTrend} tone="success" selected={companyTrendFocus === 'bookings'} onPress={() => setCompanyTrendFocus('bookings')} />
                <MiniTrendCard title="Publishing activity" subtitle="Catalog and offer updates across recent days." points={companyPublishingTrend} tone="warning" selected={companyTrendFocus === 'publishing'} onPress={() => setCompanyTrendFocus('publishing')} />
                <TrendDrilldownCard title={companyTrendDetails.title} description={companyTrendDetails.description} highlight={companyTrendDetails.highlight} footer={companyTrendDetails.footer} points={companyTrendFocus === 'activity' ? companyActivityTrend : companyTrendFocus === 'bookings' ? companyBookingTrend : companyPublishingTrend} />
              </SectionCard>

              <SectionCard title="Recent workspace activity" subtitle="Use recent activity to respond faster to bookings, publishing changes, and reviews.">
                {notifications.length ? notifications.slice(0, 6).map((notification) => (
                  <NotificationRow key={notification.id} notification={notification} onOpen={() => onOpenNotification(notification)} />
                )) : <EmptyState title="No activity yet" body="Notifications will appear here when customers book, rate, or respond to your offers." />}
              </SectionCard>
            </View>

            <View style={[styles.columnPane, wide && styles.columnPaneWide]}>
              <SectionCard title="Operational standards" subtitle="These status checks make the workspace feel closer to a production SaaS console than a simple CRUD screen.">
                <OperationalStatusRow title="Response queue" detail={`${pendingBookings.length} bookings are still waiting for first action from the company team.`} statusLabel={pendingBookings.length ? 'Needs attention' : 'Under control'} tone={pendingBookings.length > 2 ? 'warning' : 'success'} />
                <OperationalStatusRow title="Catalog readiness" detail={`${approvedItems} items are live, ${pendingItems} are waiting approval, and ${draftItems} remain in draft.`} statusLabel={companyItems.length ? formatPercentValue(approvedItems, companyItems.length) : '0% live'} tone={approvedItems === 0 && companyItems.length > 0 ? 'warning' : 'info'} />
                <OperationalStatusRow title="Customer trust" detail={`${companyRatings.length} reviews collected and ${activePromotions.length} active offers supporting acquisition.`} statusLabel={averageCompanyRating ? `${averageCompanyRating.toFixed(1)} / 5 rating` : 'No ratings yet'} tone={averageCompanyRating >= 4 ? 'success' : averageCompanyRating >= 3 ? 'info' : 'warning'} />
                <OperationalStatusRow title="Loyalty readiness" detail={currentProgram ? `${currentProgram.title} rewards customers with ${currentProgram.rewardText || 'configured benefits'}.` : 'No loyalty program is configured for this company yet.'} statusLabel={currentProgram?.isActive ? 'Program active' : 'Program paused'} tone={currentProgram?.isActive ? 'success' : 'warning'} />
                {companyRisks.map((risk) => (
                  <OperationalStatusRow key={risk.id} title={risk.title} detail={risk.detail} statusLabel={risk.statusLabel} tone={risk.tone} />
                ))}
              </SectionCard>

              <SectionCard title="Workspace profile" subtitle="Support, branding, and contact settings still live here, but they no longer crowd the top of the dashboard.">
                {currentCompany ? (
                  <>
                    <FormField label="Company name" value={companySettingsForm.name} onChangeText={(value) => onCompanySettingsFormChange((current) => ({ ...current, name: value }))} error={companyErrors.name} />
                    <FormField label="Description" value={companySettingsForm.description} onChangeText={(value) => onCompanySettingsFormChange((current) => ({ ...current, description: value }))} error={companyErrors.description} multiline />
                    <SelectField label="Company category" value={companySettingsForm.category} options={APP_CATEGORY_OPTIONS} placeholder="Choose a category" error={companyErrors.category} onSelect={(value) => onCompanySettingsFormChange((current) => ({ ...current, category: value }))} />
                    <View style={styles.rowGap}>
                      <FormField label="Support email" value={companySettingsForm.supportEmail} onChangeText={(value) => onCompanySettingsFormChange((current) => ({ ...current, supportEmail: value }))} error={companyErrors.supportEmail} />
                      <FormField label="Support phone" value={companySettingsForm.supportPhone} onChangeText={(value) => onCompanySettingsFormChange((current) => ({ ...current, supportPhone: value }))} error={companyErrors.supportPhone} />
                    </View>
                    <View style={styles.rowGap}>
                      <FormField label="Accent color" value={companySettingsForm.accentColor} onChangeText={(value) => onCompanySettingsFormChange((current) => ({ ...current, accentColor: value }))} error={companyErrors.accentColor} />
                      <FormField label="Logo text" value={companySettingsForm.logoText} onChangeText={(value) => onCompanySettingsFormChange((current) => ({ ...current, logoText: value }))} error={companyErrors.logoText} />
                    </View>
                    <PrimaryButton label="Save workspace changes" onPress={onSaveSettings} />
                  </>
                ) : (
                  <EmptyState title="No company linked" body="Use the invited company owner email to open a company workspace." />
                )}
              </SectionCard>
            </View>
          </View>
        </>
      ) : null}

      {tab === 'catalog' ? (
        wide ? (
          <View style={[styles.workspaceColumns, styles.workspaceColumnsWide]}>
            <View style={[styles.columnPane, styles.columnPaneWide]}>
              <SectionCard title="Catalog studio" subtitle="Build listings with a clearer publishing flow, stronger visibility states, and a more premium editing surface.">
                <View style={styles.overviewBadgeRow}>
                  <CompactBadge label="Items" value={String(companyItems.length)} />
                  <CompactBadge label="Approved" value={String(approvedItems)} />
                  <CompactBadge label="Draft focus" value={selectedCatalogItem ? 'Editing' : 'New'} />
                </View>
              </SectionCard>

              <SectionCard title={selectedCatalogItem ? 'Edit catalog item' : 'Publish catalog item'} subtitle="Validation now blocks incomplete listings before they reach the marketplace.">
                <View style={styles.rowGap}>
                  <FormField label="Title" value={catalogForm.title} onChangeText={(value) => onCatalogFormChange((current) => ({ ...current, title: value }))} error={catalogErrors.title} />
                  <SelectField label="Category" value={catalogForm.category} options={APP_CATEGORY_OPTIONS} placeholder="Choose a category" error={catalogErrors.category} onSelect={(value) => onCatalogFormChange((current) => ({ ...current, category: value }))} />
                </View>
                <FormField label="Summary" value={catalogForm.summary} onChangeText={(value) => onCatalogFormChange((current) => ({ ...current, summary: value }))} error={catalogErrors.summary} />
                <FormField label="Description" value={catalogForm.description} onChangeText={(value) => onCatalogFormChange((current) => ({ ...current, description: value }))} error={catalogErrors.description} multiline />
                <View style={styles.rowGap}>
                  <FormField label="Price" value={catalogForm.price} onChangeText={(value) => onCatalogFormChange((current) => ({ ...current, price: value }))} error={catalogErrors.price} />
                  <FormField label="Duration" value={catalogForm.durationLabel} onChangeText={(value) => onCatalogFormChange((current) => ({ ...current, durationLabel: value }))} error={catalogErrors.durationLabel} />
                </View>
                <View style={styles.rowGap}>
                  <FormField label="Tags" value={catalogForm.tags} onChangeText={(value) => onCatalogFormChange((current) => ({ ...current, tags: value }))} placeholder="eco, premium" />
                  <FormField label="Loyalty points" value={catalogForm.loyaltyPoints} onChangeText={(value) => onCatalogFormChange((current) => ({ ...current, loyaltyPoints: value }))} error={catalogErrors.loyaltyPoints} />
                </View>
                <View style={styles.catalogUploadPanel}>
                  {catalogForm.imageUrl ? (
                    <Image source={{ uri: catalogForm.imageUrl }} style={styles.catalogUploadPreviewImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.catalogUploadPlaceholder}>
                      <MaterialCommunityIcons name="image-outline" size={34} color="#12385E" />
                      <Text style={styles.catalogUploadPlaceholderTitle}>Upload a real storefront image</Text>
                      <Text style={styles.catalogUploadPlaceholderBody}>Use product or service photography so the catalog feels closer to a customer-facing marketplace.</Text>
                    </View>
                  )}
                  <View style={styles.catalogUploadActions}>
                    <SecondaryButton label={catalogForm.imageUrl ? 'Replace image' : 'Upload image'} tone="contrast" onPress={onPickCatalogImage} />
                    {catalogForm.imageUrl ? <SecondaryButton label="Remove image" onPress={onClearCatalogImage} /> : null}
                  </View>
                </View>
                <FormField label="Image hint" value={catalogForm.imageHint} onChangeText={(value) => onCatalogFormChange((current) => ({ ...current, imageHint: value }))} />
                <View style={styles.toggleRow}>
                  <ChoiceChip label="Service" selected={catalogForm.kind === 'service'} onPress={() => onCatalogFormChange((current) => ({ ...current, kind: 'service' }))} />
                  <ChoiceChip label="Product" selected={catalogForm.kind === 'product'} onPress={() => onCatalogFormChange((current) => ({ ...current, kind: 'product' }))} />
                  <ChoiceChip label="Submit for approval" selected={catalogForm.isPublished} onPress={() => onCatalogFormChange((current) => ({ ...current, isPublished: !current.isPublished }))} />
                </View>
                {catalogErrors.kind ? <FieldError text={catalogErrors.kind} /> : null}
                {catalogErrors.imageUrl ? <FieldError text={catalogErrors.imageUrl} /> : null}
                <SecondaryButton label={selectedCatalogItem ? 'Save item changes' : 'Submit item'} tone="contrast" onPress={onSaveCatalog} loading={catalogSubmitting} disabled={catalogSubmitting} />
                <Text style={styles.catalogSubmitHint}>{catalogForm.isPublished ? 'Submitted items stay hidden until admin approval.' : 'Draft items stay private until you submit them for approval.'}</Text>
                {selectedCatalogItem ? (
                  <View style={styles.rowGap}>
                    <SecondaryButton label="Cancel editing" onPress={onResetCatalog} />
                    <SecondaryButton label="Delete item" tone="danger" onPress={() => onDeleteCatalogItem(selectedCatalogItem.id)} />
                  </View>
                ) : null}
              </SectionCard>
            </View>

            <View style={[styles.columnPane, styles.columnPaneWide]}>
              <SectionCard title="Current catalog" subtitle="Only this company's items appear in this operational view.">
                <View style={styles.catalogFilterRow}>
                  <CatalogFilterChip label="All" count={companyItems.length} selected={catalogFilter === 'all'} onPress={() => setCatalogFilter('all')} />
                  <CatalogFilterChip label="Approved" count={approvedItems} selected={catalogFilter === 'approved'} onPress={() => setCatalogFilter('approved')} />
                  <CatalogFilterChip label="Pending" count={pendingItems} selected={catalogFilter === 'pending'} onPress={() => setCatalogFilter('pending')} />
                  <CatalogFilterChip label="Draft" count={draftItems} selected={catalogFilter === 'draft'} onPress={() => setCatalogFilter('draft')} />
                  <CatalogFilterChip label="Attention" count={companyItems.filter((item) => {
                    const risk = getCatalogRisk(item, true);
                    return risk.tone === 'warning' || risk.tone === 'error';
                  }).length} selected={catalogFilter === 'attention'} onPress={() => setCatalogFilter('attention')} />
                </View>

                {wide ? (
                  <SortableDataTable
                    columns={[
                      { key: 'title', label: 'Listing', sortable: true, render: (item) => item.title },
                      { key: 'kind', label: 'Kind', sortable: true, render: (item) => item.kind === 'service' ? 'Service' : 'Product' },
                      { key: 'price', label: 'Price', sortable: true, render: (item) => `QAR ${item.price.toFixed(0)}` },
                      { key: 'status', label: 'State', sortable: true, render: (item) => <TableStatusPill label={getCatalogApprovalLabel(item)} tone={getCatalogApprovalTone(item)} /> },
                      { key: 'risk', label: 'Risk', sortable: true, render: (item) => {
                        const risk = getCatalogRisk(item, true);
                        return <TableStatusPill label={risk.label} tone={risk.tone} />;
                      } },
                    ]}
                    rows={sortedCompanyItems}
                    sortState={companyCatalogSort}
                    onSortChange={setCompanyCatalogSort}
                    keyExtractor={(item) => item.id}
                    getRowTone={(item) => getCatalogRisk(item, true).tone}
                    filterStorageKey="company-catalog"
                    renderActions={(item) => (
                      <View style={styles.tableActionWrap}>
                        <InlineActionButton label="Edit" onPress={() => onSelectCatalogItem(item.id)} />
                        <InlineActionButton label="Delete" onPress={() => onDeleteCatalogItem(item.id)} tone="danger" />
                      </View>
                    )}
                  />
                ) : filteredCompanyItems.length ? filteredCompanyItems.map((item, index) => {
                  const risk = getCatalogRisk(item, true);
                  return (
                    <View key={item.id} style={styles.stackTight}>
                      <OperationalStatusRow title={`${item.title} risk`} detail={risk.detail} statusLabel={risk.label} tone={risk.tone} />
                      <CompanyCatalogCard
                        item={item}
                        index={index}
                        onAction={() => onSelectCatalogItem(item.id)}
                        onSecondaryAction={() => onDeleteCatalogItem(item.id)}
                      />
                    </View>
                  );
                }) : <EmptyState title="No items in this filter" body={catalogFilter === 'draft' ? 'Every current listing is already submitted or approved.' : catalogFilter === 'approved' ? 'No approved listings yet.' : catalogFilter === 'pending' ? 'No items are waiting for admin review.' : catalogFilter === 'attention' ? 'No catalog risks are currently flagged.' : 'The marketplace remains empty until this company submits something here.'} />}
              </SectionCard>
            </View>
          </View>
        ) : (
          <View style={styles.columnPane}>
            <SectionCard title="Catalog studio" subtitle="Build listings with a clearer publishing flow, stronger visibility states, and a more premium editing surface.">
              <View style={styles.overviewBadgeRow}>
                <CompactBadge label="Items" value={String(companyItems.length)} />
                <CompactBadge label="Approved" value={String(approvedItems)} />
                <CompactBadge label="Draft focus" value={selectedCatalogItem ? 'Editing' : 'New'} />
              </View>
            </SectionCard>

            <SectionCard title={selectedCatalogItem ? 'Edit catalog item' : 'Publish catalog item'} subtitle="Validation now blocks incomplete listings before they reach the marketplace.">
              <View style={styles.rowGap}>
                <FormField label="Title" value={catalogForm.title} onChangeText={(value) => onCatalogFormChange((current) => ({ ...current, title: value }))} error={catalogErrors.title} />
                <SelectField label="Category" value={catalogForm.category} options={APP_CATEGORY_OPTIONS} placeholder="Choose a category" error={catalogErrors.category} onSelect={(value) => onCatalogFormChange((current) => ({ ...current, category: value }))} />
              </View>
              <FormField label="Summary" value={catalogForm.summary} onChangeText={(value) => onCatalogFormChange((current) => ({ ...current, summary: value }))} error={catalogErrors.summary} />
              <FormField label="Description" value={catalogForm.description} onChangeText={(value) => onCatalogFormChange((current) => ({ ...current, description: value }))} error={catalogErrors.description} multiline />
              <View style={styles.rowGap}>
                <FormField label="Price" value={catalogForm.price} onChangeText={(value) => onCatalogFormChange((current) => ({ ...current, price: value }))} error={catalogErrors.price} />
                <FormField label="Duration" value={catalogForm.durationLabel} onChangeText={(value) => onCatalogFormChange((current) => ({ ...current, durationLabel: value }))} error={catalogErrors.durationLabel} />
              </View>
              <View style={styles.rowGap}>
                <FormField label="Tags" value={catalogForm.tags} onChangeText={(value) => onCatalogFormChange((current) => ({ ...current, tags: value }))} placeholder="eco, premium" />
                <FormField label="Loyalty points" value={catalogForm.loyaltyPoints} onChangeText={(value) => onCatalogFormChange((current) => ({ ...current, loyaltyPoints: value }))} error={catalogErrors.loyaltyPoints} />
              </View>
              <View style={styles.catalogUploadPanel}>
                {catalogForm.imageUrl ? (
                  <Image source={{ uri: catalogForm.imageUrl }} style={styles.catalogUploadPreviewImage} resizeMode="cover" />
                ) : (
                  <View style={styles.catalogUploadPlaceholder}>
                    <MaterialCommunityIcons name="image-outline" size={34} color="#12385E" />
                    <Text style={styles.catalogUploadPlaceholderTitle}>Upload a real storefront image</Text>
                    <Text style={styles.catalogUploadPlaceholderBody}>Use product or service photography so the catalog feels closer to a customer-facing marketplace.</Text>
                  </View>
                )}
                <View style={styles.catalogUploadActions}>
                  <SecondaryButton label={catalogForm.imageUrl ? 'Replace image' : 'Upload image'} tone="contrast" onPress={onPickCatalogImage} />
                  {catalogForm.imageUrl ? <SecondaryButton label="Remove image" onPress={onClearCatalogImage} /> : null}
                </View>
              </View>
              <FormField label="Image hint" value={catalogForm.imageHint} onChangeText={(value) => onCatalogFormChange((current) => ({ ...current, imageHint: value }))} />
              <View style={styles.toggleRow}>
                <ChoiceChip label="Service" selected={catalogForm.kind === 'service'} onPress={() => onCatalogFormChange((current) => ({ ...current, kind: 'service' }))} />
                <ChoiceChip label="Product" selected={catalogForm.kind === 'product'} onPress={() => onCatalogFormChange((current) => ({ ...current, kind: 'product' }))} />
                <ChoiceChip label="Submit for approval" selected={catalogForm.isPublished} onPress={() => onCatalogFormChange((current) => ({ ...current, isPublished: !current.isPublished }))} />
              </View>
              {catalogErrors.kind ? <FieldError text={catalogErrors.kind} /> : null}
              {catalogErrors.imageUrl ? <FieldError text={catalogErrors.imageUrl} /> : null}
              <SecondaryButton label={selectedCatalogItem ? 'Save item changes' : 'Submit item'} tone="contrast" onPress={onSaveCatalog} loading={catalogSubmitting} disabled={catalogSubmitting} />
              <Text style={styles.catalogSubmitHint}>{catalogForm.isPublished ? 'Submitted items stay hidden until admin approval.' : 'Draft items stay private until you submit them for approval.'}</Text>
              {selectedCatalogItem ? (
                <View style={styles.rowGap}>
                  <SecondaryButton label="Cancel editing" onPress={onResetCatalog} />
                  <SecondaryButton label="Delete item" tone="danger" onPress={() => onDeleteCatalogItem(selectedCatalogItem.id)} />
                </View>
              ) : null}
            </SectionCard>

            <SectionCard title="Current catalog" subtitle="Only this company's items appear in this operational view.">
              <View style={styles.catalogFilterRow}>
                <CatalogFilterChip label="All" count={companyItems.length} selected={catalogFilter === 'all'} onPress={() => setCatalogFilter('all')} />
                <CatalogFilterChip label="Approved" count={approvedItems} selected={catalogFilter === 'approved'} onPress={() => setCatalogFilter('approved')} />
                <CatalogFilterChip label="Pending" count={pendingItems} selected={catalogFilter === 'pending'} onPress={() => setCatalogFilter('pending')} />
                <CatalogFilterChip label="Draft" count={draftItems} selected={catalogFilter === 'draft'} onPress={() => setCatalogFilter('draft')} />
                <CatalogFilterChip label="Attention" count={companyItems.filter((item) => {
                  const risk = getCatalogRisk(item, true);
                  return risk.tone === 'warning' || risk.tone === 'error';
                }).length} selected={catalogFilter === 'attention'} onPress={() => setCatalogFilter('attention')} />
              </View>

              {filteredCompanyItems.length ? filteredCompanyItems.map((item, index) => {
                const risk = getCatalogRisk(item, true);
                return (
                  <View key={item.id} style={styles.stackTight}>
                    <OperationalStatusRow title={`${item.title} risk`} detail={risk.detail} statusLabel={risk.label} tone={risk.tone} />
                    <CompanyCatalogCard
                      item={item}
                      index={index}
                      onAction={() => onSelectCatalogItem(item.id)}
                      onSecondaryAction={() => onDeleteCatalogItem(item.id)}
                    />
                  </View>
                );
              }) : <EmptyState title="No items in this filter" body={catalogFilter === 'draft' ? 'Every current listing is already submitted or approved.' : catalogFilter === 'approved' ? 'No approved listings yet.' : catalogFilter === 'pending' ? 'No items are waiting for admin review.' : catalogFilter === 'attention' ? 'No catalog risks are currently flagged.' : 'The marketplace remains empty until this company submits something here.'} />}
            </SectionCard>
          </View>
        )
      ) : null}

      {tab === 'offers' ? (
        wide ? (
          <View style={[styles.workspaceColumns, styles.workspaceColumnsWide]}>
            <View style={[styles.columnPane, styles.columnPaneWide]}>
              <SectionCard title={selectedPromotion ? 'Edit promotion' : 'Create promotion'} subtitle="Promotions are separate records linked to published catalog items, so offers do not depend on catalog flags anymore.">
                <Text style={styles.fieldLabel}>Linked item</Text>
                <View style={styles.toggleRow}>
                  {publishedCatalogItems.map((item) => (
                    <ChoiceChip key={item.id} label={item.title} selected={offerForm.catalogItemId === item.id} onPress={() => onOfferFormChange((current) => ({ ...current, catalogItemId: item.id }))} />
                  ))}
                </View>
                {!publishedCatalogItems.length ? <Text style={styles.helperText}>Publish and approve at least one catalog item before creating offers.</Text> : null}
                {offerErrors.catalogItemId ? <FieldError text={offerErrors.catalogItemId} /> : null}
                <FormField label="Promotion title" value={offerForm.title} onChangeText={(value) => onOfferFormChange((current) => ({ ...current, title: value }))} error={offerErrors.title} />
                <FormField label="Headline" value={offerForm.headline} onChangeText={(value) => onOfferFormChange((current) => ({ ...current, headline: value }))} error={offerErrors.headline} multiline />
                <View style={styles.rowGap}>
                  <FormField label="Badge text" value={offerForm.badgeText} onChangeText={(value) => onOfferFormChange((current) => ({ ...current, badgeText: value }))} />
                  <FormField label="Discount label" value={offerForm.discountLabel} onChangeText={(value) => onOfferFormChange((current) => ({ ...current, discountLabel: value }))} />
                </View>
                <View style={styles.rowGap}>
                  <FormField label="Starts" value={offerForm.startsAtLabel} onChangeText={(value) => onOfferFormChange((current) => ({ ...current, startsAtLabel: value }))} />
                  <FormField label="Ends" value={offerForm.endsAtLabel} onChangeText={(value) => onOfferFormChange((current) => ({ ...current, endsAtLabel: value }))} />
                </View>
                <View style={styles.rowGap}>
                  <FormField label="Sort order" value={offerForm.sortOrder} onChangeText={(value) => onOfferFormChange((current) => ({ ...current, sortOrder: value }))} error={offerErrors.sortOrder} />
                </View>
                <View style={styles.toggleRow}>
                  <ChoiceChip label="Active" selected={offerForm.isActive} onPress={() => onOfferFormChange((current) => ({ ...current, isActive: true }))} />
                  <ChoiceChip label="Paused" selected={!offerForm.isActive} onPress={() => onOfferFormChange((current) => ({ ...current, isActive: false }))} />
                </View>
                <PrimaryButton label={selectedPromotion ? 'Save promotion changes' : 'Save promotion'} onPress={onSaveOffer} />
                {selectedPromotion ? (
                  <View style={styles.rowGap}>
                    <SecondaryButton label="Cancel editing" onPress={() => onSelectPromotion(null)} />
                    <SecondaryButton label="Delete promotion" tone="danger" onPress={() => onDeleteOffer(selectedPromotion.id)} />
                  </View>
                ) : null}
              </SectionCard>
            </View>

            <View style={[styles.columnPane, styles.columnPaneWide]}>
              <SectionCard title="Current promotions" subtitle="These are the offers customers will see highlighted on the marketplace home screen.">
                <View style={styles.filterChipRow}>
                  <ChoiceChip label="All" selected={offerFilter === 'all'} onPress={() => setOfferFilter('all')} />
                  <ChoiceChip label="Active" selected={offerFilter === 'active'} onPress={() => setOfferFilter('active')} />
                  <ChoiceChip label="Paused" selected={offerFilter === 'paused'} onPress={() => setOfferFilter('paused')} />
                  <ChoiceChip label="Attention" selected={offerFilter === 'attention'} onPress={() => setOfferFilter('attention')} />
                </View>
                {wide ? (
                  <SortableDataTable
                    columns={[
                      { key: 'title', label: 'Promotion', sortable: true, render: (promotion) => promotion.title },
                      { key: 'item', label: 'Linked item', sortable: true, render: (promotion) => promotion.catalogItemTitle },
                      { key: 'velocity', label: 'Velocity', render: (promotion) => <MiniSparkline values={buildPromotionVelocitySparkline(auditEvents, promotion)} tone={getPromotionRisk(promotion).tone} /> },
                      { key: 'status', label: 'State', sortable: true, render: (promotion) => <TableStatusPill label={promotion.isActive ? 'Active' : 'Paused'} tone={getPromotionStateTone(promotion.isActive)} /> },
                      { key: 'ending', label: 'Countdown', sortable: true, render: (promotion) => {
                        const countdown = getCountdownInfo(promotion.endsAtLabel);
                        return <TableStatusPill label={countdown.label} tone={countdown.tone} />;
                      } },
                      { key: 'risk', label: 'Risk', sortable: true, render: (promotion) => {
                        const risk = getPromotionRisk(promotion);
                        return <TableStatusPill label={risk.label} tone={risk.tone} />;
                      } },
                    ]}
                    rows={sortedCompanyPromotions}
                    sortState={companyOfferSort}
                    onSortChange={setCompanyOfferSort}
                    keyExtractor={(promotion) => promotion.id}
                    getRowTone={(promotion) => getPromotionRisk(promotion).tone}
                    stickyLeadColumns={ultraWide}
                    stickyLeadingColumnCount={2}
                    filterStorageKey="company-promotions"
                    renderActions={(promotion) => (
                      <View style={styles.tableActionWrap}>
                        <InlineActionButton label="Edit" onPress={() => onSelectPromotion(promotion.id)} />
                        <InlineActionButton label="Delete" onPress={() => onDeleteOffer(promotion.id)} tone="danger" />
                      </View>
                    )}
                  />
                ) : filteredPromotions.length ? filteredPromotions.map((promotion) => {
                  const risk = getPromotionRisk(promotion);
                  return (
                    <View key={promotion.id} style={styles.stackTight}>
                      <OperationalStatusRow title={`${promotion.title} risk`} detail={risk.detail} statusLabel={risk.label} tone={risk.tone} />
                      <InfoRow
                        title={`${promotion.title} · ${promotion.catalogItemTitle}`}
                        subtitle={`${promotion.isActive ? 'Active' : 'Paused'}${promotion.discountLabel ? ` · ${promotion.discountLabel}` : ''}${promotion.badgeText ? ` · ${promotion.badgeText}` : ''}`}
                        actionLabel="Edit"
                        onAction={() => onSelectPromotion(promotion.id)}
                        secondaryActionLabel="Delete"
                        onSecondaryAction={() => onDeleteOffer(promotion.id)}
                      />
                    </View>
                  );
                }) : <EmptyState title="No promotions match this filter" body="Adjust the offer filter to review another promotion segment." />}
              </SectionCard>
            </View>
          </View>
        ) : (
          <View style={styles.columnPane}>
            <SectionCard title={selectedPromotion ? 'Edit promotion' : 'Create promotion'} subtitle="Promotions are separate records linked to published catalog items, so offers do not depend on catalog flags anymore.">
              <Text style={styles.fieldLabel}>Linked item</Text>
              <View style={styles.toggleRow}>
                {publishedCatalogItems.map((item) => (
                  <ChoiceChip key={item.id} label={item.title} selected={offerForm.catalogItemId === item.id} onPress={() => onOfferFormChange((current) => ({ ...current, catalogItemId: item.id }))} />
                ))}
              </View>
              {!publishedCatalogItems.length ? <Text style={styles.helperText}>Publish and approve at least one catalog item before creating offers.</Text> : null}
              {offerErrors.catalogItemId ? <FieldError text={offerErrors.catalogItemId} /> : null}
              <FormField label="Promotion title" value={offerForm.title} onChangeText={(value) => onOfferFormChange((current) => ({ ...current, title: value }))} error={offerErrors.title} />
              <FormField label="Headline" value={offerForm.headline} onChangeText={(value) => onOfferFormChange((current) => ({ ...current, headline: value }))} error={offerErrors.headline} multiline />
              <View style={styles.rowGap}>
                <FormField label="Badge text" value={offerForm.badgeText} onChangeText={(value) => onOfferFormChange((current) => ({ ...current, badgeText: value }))} />
                <FormField label="Discount label" value={offerForm.discountLabel} onChangeText={(value) => onOfferFormChange((current) => ({ ...current, discountLabel: value }))} />
              </View>
              <View style={styles.rowGap}>
                <FormField label="Starts" value={offerForm.startsAtLabel} onChangeText={(value) => onOfferFormChange((current) => ({ ...current, startsAtLabel: value }))} />
                <FormField label="Ends" value={offerForm.endsAtLabel} onChangeText={(value) => onOfferFormChange((current) => ({ ...current, endsAtLabel: value }))} />
              </View>
              <View style={styles.rowGap}>
                <FormField label="Sort order" value={offerForm.sortOrder} onChangeText={(value) => onOfferFormChange((current) => ({ ...current, sortOrder: value }))} error={offerErrors.sortOrder} />
              </View>
              <View style={styles.toggleRow}>
                <ChoiceChip label="Active" selected={offerForm.isActive} onPress={() => onOfferFormChange((current) => ({ ...current, isActive: true }))} />
                <ChoiceChip label="Paused" selected={!offerForm.isActive} onPress={() => onOfferFormChange((current) => ({ ...current, isActive: false }))} />
              </View>
              <PrimaryButton label={selectedPromotion ? 'Save promotion changes' : 'Save promotion'} onPress={onSaveOffer} />
              {selectedPromotion ? (
                <View style={styles.rowGap}>
                  <SecondaryButton label="Cancel editing" onPress={() => onSelectPromotion(null)} />
                  <SecondaryButton label="Delete promotion" tone="danger" onPress={() => onDeleteOffer(selectedPromotion.id)} />
                </View>
              ) : null}
            </SectionCard>

            <SectionCard title="Current promotions" subtitle="These are the offers customers will see highlighted on the marketplace home screen.">
              <View style={styles.filterChipRow}>
                <ChoiceChip label="All" selected={offerFilter === 'all'} onPress={() => setOfferFilter('all')} />
                <ChoiceChip label="Active" selected={offerFilter === 'active'} onPress={() => setOfferFilter('active')} />
                <ChoiceChip label="Paused" selected={offerFilter === 'paused'} onPress={() => setOfferFilter('paused')} />
                <ChoiceChip label="Attention" selected={offerFilter === 'attention'} onPress={() => setOfferFilter('attention')} />
              </View>
              {filteredPromotions.length ? filteredPromotions.map((promotion) => {
                const risk = getPromotionRisk(promotion);
                return (
                  <View key={promotion.id} style={styles.stackTight}>
                    <OperationalStatusRow title={`${promotion.title} risk`} detail={risk.detail} statusLabel={risk.label} tone={risk.tone} />
                    <InfoRow
                      title={`${promotion.title} · ${promotion.catalogItemTitle}`}
                      subtitle={`${promotion.isActive ? 'Active' : 'Paused'}${promotion.discountLabel ? ` · ${promotion.discountLabel}` : ''}${promotion.badgeText ? ` · ${promotion.badgeText}` : ''}`}
                      actionLabel="Edit"
                      onAction={() => onSelectPromotion(promotion.id)}
                      secondaryActionLabel="Delete"
                      onSecondaryAction={() => onDeleteOffer(promotion.id)}
                    />
                  </View>
                );
              }) : <EmptyState title="No promotions match this filter" body="Adjust the offer filter to review another promotion segment." />}
            </SectionCard>
          </View>
        )
      ) : null}

      {tab === 'schedule' ? (
        <View style={[styles.workspaceColumns, wide && styles.workspaceColumnsWide]}>
          <View style={[styles.columnPane, wide && styles.columnPaneWide]}>
            <SectionCard title={scheduleForm.id ? 'Edit schedule slot' : 'Add schedule slot'} subtitle="Select a published service or product first, then add available times so booking slots stay tied to live listings.">
              <Text style={styles.fieldLabel}>Linked published item</Text>
              <View style={styles.toggleRow}>
                {publishedCatalogItems.map((item) => (
                  <ChoiceChip
                    key={`schedule-item-${item.id}`}
                    label={item.title}
                    selected={scheduleForm.catalogItemId === item.id}
                    onPress={() => onScheduleFormChange((current) => ({ ...current, catalogItemId: item.id }))}
                  />
                ))}
              </View>
              {!publishedCatalogItems.length ? <Text style={styles.helperText}>Publish and approve at least one catalog item before adding schedule slots.</Text> : null}
              <View style={styles.rowGap}>
                <FormField label="Date" value={scheduleForm.dateLabel} onChangeText={(value) => onScheduleFormChange((current) => ({ ...current, dateLabel: value }))} />
                <FormField label="Time" value={scheduleForm.timeLabel} onChangeText={(value) => onScheduleFormChange((current) => ({ ...current, timeLabel: value }))} />
              </View>
              <FormField label="Note" value={scheduleForm.note} onChangeText={(value) => onScheduleFormChange((current) => ({ ...current, note: value }))} placeholder="Optional note or unavailable reason" />
              <View style={styles.toggleRow}>
                <ChoiceChip label="Available" selected={scheduleForm.status === 'available'} onPress={() => onScheduleFormChange((current) => ({ ...current, status: 'available' }))} />
                <ChoiceChip label="Blocked" selected={scheduleForm.status === 'blocked'} onPress={() => onScheduleFormChange((current) => ({ ...current, status: 'blocked' }))} />
                <ChoiceChip label="Booked" selected={scheduleForm.status === 'booked'} onPress={() => onScheduleFormChange((current) => ({ ...current, status: 'booked' }))} />
              </View>
              <View style={styles.rowGap}>
                <PrimaryButton label={scheduleForm.id ? 'Save slot' : 'Add slot'} onPress={onSaveSchedule} />
                {scheduleForm.id ? <SecondaryButton label="Clear editing" onPress={() => onScheduleFormChange({ id: '', catalogItemId: publishedCatalogItems[0]?.id ?? '', dateLabel: 'Tomorrow', timeLabel: '10:00 AM', status: 'available', note: '' })} /> : null}
              </View>
            </SectionCard>
          </View>
          <View style={[styles.columnPane, wide && styles.columnPaneWide]}>
            <SectionCard title="Current schedule" subtitle="Booked slots are automatically closed after checkout so no other customer can reserve the same time.">
              {companyAvailabilitySlots.length ? companyAvailabilitySlots.map((slot) => (
                <InfoRow
                  key={slot.id}
                  title={`${slot.dateLabel} · ${slot.timeLabel}`}
                  subtitle={`${slot.status.toUpperCase()}${slot.note ? ` · ${slot.note}` : ''}`}
                  actionLabel="Edit"
                  onAction={() => onScheduleFormChange({ id: slot.id, catalogItemId: publishedCatalogItems.find((item) => slot.note.includes(item.title))?.id ?? publishedCatalogItems[0]?.id ?? '', dateLabel: slot.dateLabel, timeLabel: slot.timeLabel, status: slot.status, note: slot.note })}
                  secondaryActionLabel="Delete"
                  onSecondaryAction={() => onDeleteSchedule(slot.id)}
                />
              )) : <EmptyState title="No schedule yet" body="Add available dates and time slots so customers can book real availability." />}
            </SectionCard>
          </View>
        </View>
      ) : null}

      {tab === 'bookings' ? (
        <SectionCard title="Company bookings" subtitle="Status controls are kept inside the company workspace so admins do not need to manage fulfilment.">
          <View style={styles.filterChipRow}>
            <ChoiceChip label="All" selected={companyBookingFilter === 'all'} onPress={() => setCompanyBookingFilter('all')} />
            <ChoiceChip label="Pending" selected={companyBookingFilter === 'pending'} onPress={() => setCompanyBookingFilter('pending')} />
            <ChoiceChip label="Active" selected={companyBookingFilter === 'active'} onPress={() => setCompanyBookingFilter('active')} />
            <ChoiceChip label="Completed" selected={companyBookingFilter === 'completed'} onPress={() => setCompanyBookingFilter('completed')} />
            <ChoiceChip label="Attention" selected={companyBookingFilter === 'attention'} onPress={() => setCompanyBookingFilter('attention')} />
          </View>
          {wide ? (
            <SortableDataTable
              columns={[
                { key: 'booking', label: 'Booking', sortable: true, render: (booking) => booking.bookingNumber },
                { key: 'customer', label: 'Customer', sortable: true, render: (booking) => booking.customerName },
                { key: 'velocity', label: 'Velocity', render: (booking) => <MiniSparkline values={buildBookingStatusVelocitySparkline(auditEvents, booking.id)} tone={getBookingRisk(booking).tone} /> },
                { key: 'schedule', label: 'Schedule', sortable: true, render: (booking) => `${booking.scheduleDate} · ${booking.scheduleTime}` },
                { key: 'aging', label: 'Aging', sortable: true, render: (booking) => {
                  const aging = getBookingAgingInfo(booking);
                  return <TableStatusPill label={aging.label} tone={aging.tone} />;
                } },
                { key: 'total', label: 'Total', sortable: true, render: (booking) => `QAR ${booking.total.toFixed(0)}` },
                { key: 'status', label: 'Status', sortable: true, render: (booking) => <TableStatusPill label={readableBookingStatus(booking.status)} tone={getBookingStatusTone(booking.status)} /> },
                { key: 'risk', label: 'Risk', sortable: true, render: (booking) => {
                  const risk = getBookingRisk(booking);
                  return <TableStatusPill label={risk.label} tone={risk.tone} />;
                } },
              ]}
              rows={sortedCompanyBookings}
              sortState={companyBookingSort}
              onSortChange={setCompanyBookingSort}
              keyExtractor={(booking) => booking.id}
              getRowTone={(booking) => getBookingRisk(booking).tone}
              stickyLeadColumns={ultraWide}
              stickyLeadingColumnCount={1}
              filterStorageKey="company-bookings"
              renderActions={(booking) => (
                <View style={styles.tableStatusActionWrap}>
                  {(['approved', 'scheduled', 'enRoute', 'inProgress', 'completed'] as BookingStatus[]).map((status) => (
                    <InlineActionButton key={status} label={readableBookingStatus(status)} onPress={() => onChangeBookingStatus(booking.id, status)} tone={booking.status === status ? 'neutral' : 'default'} />
                  ))}
                </View>
              )}
            />
          ) : filteredCompanyBookings.length ? filteredCompanyBookings.map((booking) => {
            const risk = getBookingRisk(booking);
            return (
              <View key={booking.id} style={styles.bookingWrap}>
                <OperationalStatusRow title={`${booking.bookingNumber} risk`} detail={risk.detail} statusLabel={risk.label} tone={risk.tone} />
                <BookingCard booking={booking} />
                <View style={styles.statusActions}>
                  {(['approved', 'scheduled', 'enRoute', 'inProgress', 'completed'] as BookingStatus[]).map((status) => (
                    <ChoiceChip key={status} label={readableBookingStatus(status)} selected={booking.status === status} onPress={() => onChangeBookingStatus(booking.id, status)} />
                  ))}
                </View>
              </View>
            );
          }) : <EmptyState title="No bookings match this filter" body="Adjust the booking filter to review a different fulfilment slice." />}
        </SectionCard>
      ) : null}

      {tab === 'loyalty' ? (
        <SectionCard title="Company loyalty" subtitle="Rewards are scoped to this company and validated before saving.">
          {currentProgram ? <StatusBanner tone={currentProgram.isActive ? 'info' : 'error'} text={`${currentProgram.title} is ${currentProgram.isActive ? 'active' : 'paused'}${currentProgram.rewardText ? ` · ${currentProgram.rewardText}` : ''}.`} /> : null}
          <FormField label="Program title" value={loyaltyForm.title} onChangeText={(value) => onLoyaltyFormChange((current) => ({ ...current, title: value }))} error={loyaltyErrors.title} />
          <FormField label="Description" value={loyaltyForm.description} onChangeText={(value) => onLoyaltyFormChange((current) => ({ ...current, description: value }))} error={loyaltyErrors.description} multiline />
          <View style={styles.rowGap}>
            <FormField label="Points per booking" value={loyaltyForm.pointsPerBooking} onChangeText={(value) => onLoyaltyFormChange((current) => ({ ...current, pointsPerBooking: value }))} error={loyaltyErrors.pointsPerBooking} />
            <FormField label="Reward text" value={loyaltyForm.rewardText} onChangeText={(value) => onLoyaltyFormChange((current) => ({ ...current, rewardText: value }))} error={loyaltyErrors.rewardText} />
          </View>
          <FormField label="Tier rules" value={loyaltyForm.tierRules} onChangeText={(value) => onLoyaltyFormChange((current) => ({ ...current, tierRules: value }))} error={loyaltyErrors.tierRules} placeholder="Bronze: 50 pts, Gold: 200 pts" />
          <View style={styles.toggleRow}>
            <ChoiceChip label="Active" selected={loyaltyForm.isActive} onPress={() => onLoyaltyFormChange((current) => ({ ...current, isActive: true }))} />
            <ChoiceChip label="Paused" selected={!loyaltyForm.isActive} onPress={() => onLoyaltyFormChange((current) => ({ ...current, isActive: false }))} />
          </View>
          <PrimaryButton label="Save company loyalty" onPress={onSaveLoyalty} />
        </SectionCard>
      ) : null}

      {tab === 'requests' ? (
        <SectionCard title="Request timeline" subtitle="Track every catalog and offer submission from request creation to admin decision.">
          <View style={styles.overviewBadgeRow}>
            <CompactBadge label="Total" value={String(companyRequestTimeline.length)} />
            <CompactBadge label="Pending" value={String(companyRequestTimeline.filter((entry) => entry.status === 'pending').length)} />
            <CompactBadge label="Approved" value={String(companyRequestTimeline.filter((entry) => entry.status === 'approved').length)} />
            <CompactBadge label="Rejected" value={String(companyRequestTimeline.filter((entry) => entry.status === 'rejected').length)} />
          </View>

          {companyRequestTimeline.length ? companyRequestTimeline.map((entry) => (
            <View key={entry.id} style={styles.auditRow}>
              <View style={styles.auditHeaderRow}>
                <Text style={styles.infoTitle}>{entry.title}</Text>
                <TableStatusPill
                  label={entry.status === 'approved' ? 'Approved' : entry.status === 'pending' ? 'Pending' : entry.status === 'rejected' ? 'Rejected' : 'Draft'}
                  tone={entry.status === 'approved' ? 'success' : entry.status === 'pending' ? 'warning' : entry.status === 'rejected' ? 'error' : 'info'}
                />
              </View>
              <Text style={styles.infoSubtitle}>{entry.type} · {entry.detail}</Text>
              <Text style={styles.helperText}>Submitted: {entry.submittedAt}</Text>
              <Text style={styles.helperText}>
                {entry.status === 'pending'
                  ? 'Awaiting admin decision'
                  : `Reviewed: ${entry.reviewedAt ?? 'Unknown'}${entry.reviewer ? ` · by ${entry.reviewer}` : ''}`}
              </Text>
              <Text style={styles.helperText}>{entry.published ? 'Visible to customers' : 'Hidden from customers'}</Text>
            </View>
          )) : <EmptyState title="No requests yet" body="Create a catalog item or offer to start the approval timeline." />}
        </SectionCard>
      ) : null}
    </>
  );
}

type CustomerWorkspaceProps = {
  wide: boolean;
  tab: 'home' | 'browse' | 'explore' | 'orders' | 'profile' | 'notifications';
  onTabChange: (tab: 'home' | 'browse' | 'explore' | 'orders' | 'profile' | 'notifications') => void;
  authUser: { email: string } | null;
  currentUserRole: string;
  companies: Company[];
  categorySettings: AppCategorySetting[];
  marketplaceItems: CatalogItem[];
  availabilitySlots: AvailabilitySlot[];
  featuredOffers: Array<{ promotion: OfferPromotion; item: CatalogItem }>;
  ratings: Array<{ id: string; bookingId: string; companyId: string; itemId: string; customerEmail: string; score: number; review: string; createdAtLabel: string }>;
  notifications: AppNotification[];
  bookingComposer: {
    itemId: string;
    companyId: string;
    slotId: string;
    scheduleDate: string;
    scheduleTime: string;
    addressId: string;
    notes: string;
    paymentMethod: PaymentMethod;
  };
  onBookingComposerChange: React.Dispatch<React.SetStateAction<{
    itemId: string;
    companyId: string;
    slotId: string;
    scheduleDate: string;
    scheduleTime: string;
    addressId: string;
    notes: string;
    paymentMethod: PaymentMethod;
  }>>;
  bookingErrors: ValidationMap;
  onSelectItem: (item: CatalogItem) => void;
  onPlaceBooking: () => void;
  customerBookings: Booking[];
  ratingDrafts: Record<string, { score: string; review: string }>;
  onRatingDraftChange: (bookingId: string, nextDraft: { score: string; review: string }) => void;
  ratingErrors: Record<string, string>;
  onSubmitRating: (bookingId: string) => void;
  authMode: 'signin' | 'signup';
  onAuthModeChange: (mode: 'signin' | 'signup') => void;
  signInForm: { email: string; password: string };
  onSignInFormChange: React.Dispatch<React.SetStateAction<{ email: string; password: string }>>;
  signUpForm: { fullName: string; email: string; password: string; phone: string };
  onSignUpFormChange: React.Dispatch<React.SetStateAction<{ fullName: string; email: string; password: string; phone: string }>>;
  authErrors: ValidationMap;
  confirmCode: string;
  onConfirmCodeChange: (value: string) => void;
  needsConfirmation: boolean;
  signInChallenge: 'none' | 'newPasswordRequired';
  newPassword: string;
  onNewPasswordChange: (value: string) => void;
  onAuthAction: () => void;
  onConfirmCode: () => void;
  onCompleteNewPassword: () => void;
  onOpenNotification: (notification: AppNotification) => void;
  authBusy: boolean;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  customerSearchQuery: string;
  onCustomerSearchQueryChange: (value: string) => void;
  customerSortMode: CustomerSortMode;
  onCustomerSortModeChange: (value: CustomerSortMode) => void;
  selectedCustomerCategory: string | null;
  onSelectCustomerCategory: (value: string | null) => void;
  profileForm: UserProfile;
  onProfileFormChange: React.Dispatch<React.SetStateAction<UserProfile>>;
  profileErrors: ValidationMap;
  onSaveProfile: () => void;
  addressForm: Address;
  onAddressFormChange: React.Dispatch<React.SetStateAction<Address>>;
  addressErrors: ValidationMap;
  onSaveAddress: () => void;
  onSignOut: () => Promise<void>;
  banner: BannerState;
};

function CustomerWorkspace({
  wide,
  tab,
  onTabChange,
  authUser,
  currentUserRole,
  companies,
  categorySettings,
  marketplaceItems,
  availabilitySlots,
  featuredOffers,
  ratings,
  notifications,
  bookingComposer,
  onBookingComposerChange,
  bookingErrors,
  onSelectItem,
  onPlaceBooking,
  customerBookings,
  ratingDrafts,
  onRatingDraftChange,
  ratingErrors,
  onSubmitRating,
  authMode,
  onAuthModeChange,
  signInForm,
  onSignInFormChange,
  signUpForm,
  onSignUpFormChange,
  authErrors,
  confirmCode,
  onConfirmCodeChange,
  needsConfirmation,
  signInChallenge,
  newPassword,
  onNewPasswordChange,
  onAuthAction,
  onConfirmCode,
  onCompleteNewPassword,
  onOpenNotification,
  authBusy,
  darkMode,
  onToggleDarkMode,
  customerSearchQuery,
  onCustomerSearchQueryChange,
  customerSortMode,
  onCustomerSortModeChange,
  selectedCustomerCategory,
  onSelectCustomerCategory,
  profileForm,
  onProfileFormChange,
  profileErrors,
  onSaveProfile,
  addressForm,
  onAddressFormChange,
  addressErrors,
  onSaveAddress,
  onSignOut,
  banner,
}: CustomerWorkspaceProps) {
  const customerWidth = useWindowDimensions().width;
  const homeCarouselRef = useRef<ScrollView | null>(null);
  const homeCarouselIndexRef = useRef(0);
  const homeCarouselScrollX = useRef(new Animated.Value(0)).current;
  const carouselDotValues = useRef(HOME_CAROUSEL_IMAGES.map((_, index) => new Animated.Value(index === 0 ? 1 : 0))).current;
  const [activeBrowseGroupKey, setActiveBrowseGroupKey] = useState<string>(CATEGORY_GROUPS[0]?.key ?? 'home-services');
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [providerDetailOpen, setProviderDetailOpen] = useState(false);
  const [homeCarouselPage, setHomeCarouselPage] = useState(0);
  const [promoStartIndex, setPromoStartIndex] = useState(0);
  const promoRowFade = useRef(new Animated.Value(1)).current;
  const normalizedCustomerSearch = customerSearchQuery.trim().toLowerCase();
  const normalizedSelectedCategory = selectedCustomerCategory?.trim() || null;
  const categorySettingMap = useMemo(() => new Map(categorySettings.map((entry) => [entry.category, entry.isComingSoon])), [categorySettings]);
  const comingSoonCategories = useMemo(
    () => new Set(APP_CATEGORY_OPTIONS.filter((category) => categorySettingMap.get(category) ?? DEFAULT_COMING_SOON_CATEGORIES.has(category))),
    [categorySettingMap],
  );
  const selectedCategoryComingSoon = normalizedSelectedCategory ? comingSoonCategories.has(normalizedSelectedCategory) : false;
  const activeCompanies = useMemo(() => companies.filter((company) => company.isActive), [companies]);
  const allCategories = useMemo(
    () => Array.from(new Set([...APP_CATEGORY_OPTIONS, ...companies.map((company) => company.category).filter(Boolean), ...marketplaceItems.map((item) => item.category).filter(Boolean)])).sort((a, b) => a.localeCompare(b)),
    [companies, marketplaceItems],
  );
  const itemRatingMeta = useMemo(() => {
    const next: Record<string, { count: number; average: number }> = {};

    ratings.forEach((rating) => {
      const current = next[rating.itemId] ?? { count: 0, average: 0 };
      const nextCount = current.count + 1;
      next[rating.itemId] = {
        count: nextCount,
        average: ((current.average * current.count) + rating.score) / nextCount,
      };
    });

    return next;
  }, [ratings]);
  const promotedItemIds = useMemo(() => new Set(featuredOffers.map((entry) => entry.item.id)), [featuredOffers]);
  const groupedCategoryCards = useMemo(
    () =>
      CATEGORY_GROUPS.map((group) => {
        const categories = group.categories.filter((category) => allCategories.includes(category));
        const listingsCount = activeCompanies.filter((company) => {
          const companyItems = marketplaceItems.filter((item) => item.companyId === company.id);
          return [company.category, ...companyItems.map((item) => item.category)].some((category) => categories.includes(category));
        }).length;
        return {
          ...group,
          categories,
          listingsCount,
        };
      }).filter((group) => group.categories.length),
    [activeCompanies, allCategories, marketplaceItems],
  );
  const newestRank = (item: CatalogItem, index: number) => {
    const match = item.id.match(/(\d{10,})$/);
    return match ? Number(match[1]) : marketplaceItems.length - index;
  };
  const popularityScore = (item: CatalogItem) => {
    const rating = itemRatingMeta[item.id] ?? { count: 0, average: 0 };
    return (promotedItemIds.has(item.id) ? 16 : 0) + (item.featured ? 10 : 0) + (rating.average * 3) + (rating.count * 2);
  };
  const sortItems = (left: { item: CatalogItem; index: number }, right: { item: CatalogItem; index: number }) => {
    if (customerSortMode === 'priceLow') {
      return left.item.price - right.item.price || newestRank(right.item, right.index) - newestRank(left.item, left.index);
    }

    if (customerSortMode === 'priceHigh') {
      return right.item.price - left.item.price || newestRank(right.item, right.index) - newestRank(left.item, left.index);
    }

    if (customerSortMode === 'newest') {
      return newestRank(right.item, right.index) - newestRank(left.item, left.index);
    }

    return popularityScore(right.item) - popularityScore(left.item) || newestRank(right.item, right.index) - newestRank(left.item, left.index);
  };
  const filteredMarketplaceItems = marketplaceItems
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      const matchesCategory = !normalizedSelectedCategory || item.category === normalizedSelectedCategory;
      const matchesSearch = !normalizedCustomerSearch || [item.title, item.summary, item.companyName, item.category]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedCustomerSearch));
      return matchesCategory && matchesSearch;
    })
    .sort(sortItems)
    .map(({ item }) => item);
  const filteredCompanies = activeCompanies.filter((company) => {
    if (selectedCategoryComingSoon) {
      return false;
    }
    const companyItems = marketplaceItems.filter((item) => item.companyId === company.id);
    const companyCategories = new Set([company.category, ...companyItems.map((item) => item.category)].filter(Boolean));
    const matchesCategory = !normalizedSelectedCategory || companyCategories.has(normalizedSelectedCategory);
    const matchesSearch = !normalizedCustomerSearch || [company.name, company.description, company.category, ...Array.from(companyCategories)]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(normalizedCustomerSearch));
    return matchesCategory && matchesSearch;
  });
  const homeCompanies = filteredCompanies.slice(0, 8);
  const selectedProvider = useMemo(
    () => filteredCompanies.find((company) => company.id === (selectedProviderId || bookingComposer.companyId)) ?? activeCompanies.find((company) => company.id === (selectedProviderId || bookingComposer.companyId)) ?? null,
    [activeCompanies, bookingComposer.companyId, filteredCompanies, selectedProviderId],
  );
  const selectedProviderServices = useMemo(
    () => selectedProvider ? marketplaceItems.filter((item) => item.companyId === selectedProvider.id && item.isPublished) : [],
    [marketplaceItems, selectedProvider],
  );
  const selectedProviderSlots = useMemo(
    () => selectedProvider ? availabilitySlots.filter((slot) => slot.companyId === selectedProvider.id).sort((left, right) => `${left.dateLabel} ${left.timeLabel}`.localeCompare(`${right.dateLabel} ${right.timeLabel}`)) : [],
    [availabilitySlots, selectedProvider],
  );
  const availableSelectedProviderSlots = selectedProviderSlots.filter((slot) => slot.status === 'available');
  const availableSelectedProviderSlotsByDate = useMemo(() => {
    const groups = new Map<string, AvailabilitySlot[]>();
    availableSelectedProviderSlots.forEach((slot) => {
      const current = groups.get(slot.dateLabel) ?? [];
      current.push(slot);
      groups.set(slot.dateLabel, current);
    });

    return Array.from(groups.entries()).map(([dateLabel, slots]) => ({ dateLabel, slots }));
  }, [availableSelectedProviderSlots]);
  const selectedProviderRatings = useMemo(
    () => selectedProvider ? ratings.filter((entry) => entry.companyId === selectedProvider.id) : [],
    [ratings, selectedProvider],
  );
  const selectedProviderAverageRating = averageScore(selectedProviderRatings);
  const customerItems = filteredMarketplaceItems.slice(0, 6);
  const featuredItems = featuredOffers.slice(0, 3);
  const categories = allCategories.slice(0, 10);
  const searchPreviewItems = filteredMarketplaceItems.slice(0, 6);
  const carouselEntries = HOME_CAROUSEL_IMAGES.map((imageUrl, index) => ({
    imageUrl,
    title: allCategories[index] ?? APP_CATEGORY_OPTIONS[index] ?? 'Featured category',
    subtitle: index % 2 === 0 ? 'Discover standout listings across the marketplace.' : 'Preview premium inventory and services before you search deeper.',
  }));
  const liveEntries = (featuredOffers.length ? featuredOffers : marketplaceItems.slice(0, 8).map((item) => ({ item, promotion: undefined }))).slice(0, 8);
  const homePromoCards = liveEntries.length
    ? liveEntries.map(({ item, promotion }, index) => ({
        id: item.id,
        title: item.title,
        subtitle: promotion?.headline?.trim() || item.category,
        badge: promotion?.badgeText?.trim() || item.category,
        priceLabel: promotion?.discountLabel?.trim() || (item.price > 0 ? `QAR ${item.price}` : 'Book now'),
        imageUrl: item.imageUrl || HOME_CAROUSEL_IMAGES[index % HOME_CAROUSEL_IMAGES.length],
        companyName: item.companyName,
        item,
      }))
    : HOME_CAROUSEL_IMAGES.concat(HOME_CAROUSEL_IMAGES).slice(0, 6).map((imageUrl, index) => {
        const fallbackCategory = allCategories[index % Math.max(allCategories.length, 1)] || APP_CATEGORY_OPTIONS[index % APP_CATEGORY_OPTIONS.length] || 'AC Services';
        const fallbackTitle = index % 2 === 0 ? 'Foam Deep Cleaning' : 'Washing Machine Service';
        const fallbackDiscount = index % 2 === 0 ? 'QAR 15 OFF*' : '30 DAY WARRANTY';
        return {
          id: `fallback-offer-${index}`,
          title: fallbackTitle,
          subtitle: fallbackCategory,
          badge: index % 3 === 1 ? 'NEW' : fallbackCategory,
          priceLabel: fallbackDiscount,
          imageUrl,
          companyName: fallbackCategory,
          item: marketplaceItems[0] ?? {
            id: `fallback-item-${index}`,
            companyId: '',
            companyName: fallbackCategory,
            title: fallbackTitle,
            summary: 'Featured offer',
            category: fallbackCategory,
            kind: 'service' as const,
            price: 0,
            imageUrl,
            imageHint: 'Featured offer',
            durationLabel: '3 Hours',
            featured: true,
            isPublished: true,
            isApproved: true,
            approvalStatus: 'approved' as const,
            createdAtLabel: 'Today',
            updatedAtLabel: 'Today',
          },
        };
      });
  const rotatingPromoCards = useMemo(() => {
    if (!homePromoCards.length) {
      return [];
    }

    const visibleCount = Math.min(3, homePromoCards.length);
    return Array.from({ length: visibleCount }, (_, offset) => homePromoCards[(promoStartIndex + offset) % homePromoCards.length]);
  }, [homePromoCards, promoStartIndex]);
  const homeGridCategories = allCategories.slice(0, 12);
  const liveCompanyCount = activeCompanies.length;
  const marketplaceCounts = {
    listings: marketplaceItems.length,
    services: marketplaceItems.filter((item) => item.kind === 'service').length,
    products: marketplaceItems.filter((item) => item.kind === 'product').length,
  };
  const activeBrowseGroup = groupedCategoryCards.find((group) => (normalizedSelectedCategory ? group.categories.includes(normalizedSelectedCategory) : group.key === activeBrowseGroupKey)) ?? groupedCategoryCards[0] ?? null;
  const activeLandingItems = activeBrowseGroup
    ? marketplaceItems
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => activeBrowseGroup.categories.includes(item.category))
      .sort(sortItems)
      .map(({ item }) => item)
      .slice(0, 6)
    : [];
  const activeLandingBannerImage = activeBrowseGroup
    ? HOME_CAROUSEL_IMAGES[Math.max(groupedCategoryCards.findIndex((group) => group.key === activeBrowseGroup.key), 0) % HOME_CAROUSEL_IMAGES.length]
    : HOME_CAROUSEL_IMAGES[0];
  const activeFilterSummary = [
    normalizedSelectedCategory,
    normalizedCustomerSearch ? `"${customerSearchQuery.trim()}"` : null,
    customerSortMode === 'popular'
      ? 'Popular'
      : customerSortMode === 'newest'
        ? 'Newest'
        : customerSortMode === 'priceLow'
          ? 'Price: Low to High'
          : 'Price: High to Low',
  ].filter(Boolean).join(' · ');
  const carouselCardWidth = Math.max(Math.min(customerWidth - 74, wide ? 620 : 540), 270);
  const carouselItemWidth = carouselCardWidth + 12;
  const carouselDotDuration = Platform.OS === 'ios' ? 280 : 360;
  const carouselAutoAdvanceMs = Platform.OS === 'ios' ? 3400 : 4200;
  const roundedCustomerWidth = Math.round(customerWidth);
  const isIphone1314Class = Platform.OS === 'ios' && roundedCustomerWidth >= 390 && roundedCustomerWidth <= 393;
  const isIphone15ProMaxClass = Platform.OS === 'ios' && roundedCustomerWidth >= 428 && roundedCustomerWidth <= 430;
  const isIOSPhone = Platform.OS === 'ios' && customerWidth < 500;
  const homeUsableWidth = Math.max(customerWidth - (Platform.OS === 'ios' ? 8 : 14), 320);
  const promoCardGap = isIphone15ProMaxClass ? 10 : 8;
  const promoCardWidth = Math.floor((homeUsableWidth - (promoCardGap * 2)) / 3);
  const promoCardHeight = isIphone15ProMaxClass ? 166 : isIphone1314Class ? 154 : 158;
  const activeOfferShowcase = homePromoCards[promoStartIndex % Math.max(homePromoCards.length, 1)] ?? null;
  const homeDeviceTuning = {
    homeScreenGap: isIphone15ProMaxClass ? 16 : isIphone1314Class ? 14 : 18,
    heroMinHeight: isIphone15ProMaxClass ? 228 : isIphone1314Class ? 210 : Platform.OS === 'ios' ? 216 : 198,
    heroTextPaddingHorizontal: isIphone15ProMaxClass ? 20 : 18,
    heroTextPaddingVertical: isIphone15ProMaxClass ? 14 : 12,
    heroTitleSize: isIphone15ProMaxClass ? 44 : isIphone1314Class ? 38 : Platform.OS === 'ios' ? 40 : 34,
    heroTitleLineHeight: isIphone15ProMaxClass ? 48 : isIphone1314Class ? 42 : Platform.OS === 'ios' ? 44 : 38,
    heroSubtitleSize: isIphone15ProMaxClass ? 16 : 15,
    heroSubtitleLineHeight: isIphone15ProMaxClass ? 21 : 20,
    promoStripGap: isIphone15ProMaxClass ? 10 : 8,
    promoTitleSize: isIphone15ProMaxClass ? 19 : 18,
    promoTitleLineHeight: isIphone15ProMaxClass ? 22 : 21,
    promoPriceSize: isIphone15ProMaxClass ? 20 : 18,
    promoPriceLineHeight: isIphone15ProMaxClass ? 23 : 21,
    serviceGridRowGap: isIphone15ProMaxClass ? 14 : 12,
    serviceTileGap: isIphone15ProMaxClass ? 7 : 6,
    serviceIconSize: isIphone15ProMaxClass ? 52 : isIphone1314Class ? 48 : 48,
    serviceLabelSize: isIphone15ProMaxClass ? 15 : 14,
    serviceLabelLineHeight: isIphone15ProMaxClass ? 17 : 16,
  };

  useEffect(() => {
    if (!normalizedSelectedCategory) {
      return;
    }

    const group = groupedCategoryCards.find((entry) => entry.categories.includes(normalizedSelectedCategory));
    if (group) {
      setActiveBrowseGroupKey(group.key);
    }
  }, [groupedCategoryCards, normalizedSelectedCategory]);

  useEffect(() => {
    if (bookingComposer.companyId) {
      setSelectedProviderId(bookingComposer.companyId);
    }
  }, [bookingComposer.companyId]);

  useEffect(() => {
    if (!selectedProviderId) {
      return;
    }
    const stillExists = activeCompanies.some((company) => company.id === selectedProviderId);
    if (!stillExists) {
      setSelectedProviderId(null);
      setProviderDetailOpen(false);
    }
  }, [activeCompanies, selectedProviderId]);

  const openProviderDetails = (companyId: string) => {
    setSelectedProviderId(companyId);
    setProviderDetailOpen(true);
  };

  useEffect(() => {
    carouselDotValues.forEach((value, index) => {
      Animated.timing(value, {
        toValue: index === homeCarouselPage ? 1 : 0,
        duration: carouselDotDuration,
        useNativeDriver: false,
      }).start();
    });
  }, [carouselDotDuration, carouselDotValues, homeCarouselPage]);

  useEffect(() => {
    if (tab !== 'home' || carouselEntries.length < 2) {
      return;
    }

    const intervalId = setInterval(() => {
      const nextIndex = (homeCarouselIndexRef.current + 1) % carouselEntries.length;
      homeCarouselRef.current?.scrollTo({ x: nextIndex * carouselItemWidth, animated: true });
      homeCarouselIndexRef.current = nextIndex;
      setHomeCarouselPage(nextIndex);
    }, carouselAutoAdvanceMs);

    return () => clearInterval(intervalId);
  }, [tab, carouselAutoAdvanceMs, carouselEntries.length, carouselItemWidth]);

  useEffect(() => {
    if (tab !== 'home' || homePromoCards.length <= 3) {
      promoRowFade.setValue(1);
      return;
    }

    const intervalId = setInterval(() => {
      Animated.timing(promoRowFade, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        setPromoStartIndex((current) => (current + 1) % homePromoCards.length);
        Animated.timing(promoRowFade, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }).start();
      });
    }, 3800);

    return () => clearInterval(intervalId);
  }, [homePromoCards.length, promoRowFade, tab]);
  const customerTheme = {
    canvas: darkMode ? styles.customerCanvasDark : undefined,
    card: darkMode ? styles.customerSectionDark : undefined,
    title: darkMode ? styles.customerTitleDark : undefined,
    subtitle: darkMode ? styles.customerSubtitleDark : undefined,
    body: darkMode ? styles.customerBodyDark : undefined,
    empty: darkMode ? styles.customerEmptyDark : undefined,
    inputTheme: darkMode ? 'dark' : 'light',
    navWrap: darkMode ? styles.bottomNavDark : undefined,
    navItem: darkMode ? styles.bottomNavItemDark : undefined,
    navText: darkMode ? styles.bottomNavTextDark : undefined,
    metaCard: darkMode ? styles.customerMetaCardDark : undefined,
    bookingCard: darkMode ? styles.customerBookingCardDark : undefined,
    verificationCard: darkMode ? styles.customerVerificationDark : undefined,
  } as const;

  return (
    <View style={[styles.customerWorkspace, customerTheme.canvas]}>
      {banner ? <StatusBanner tone={banner.tone} text={banner.text} /> : null}

      {tab === 'home' ? (
        <ScrollView style={styles.customerTabScroll} contentContainerStyle={styles.customerTabScrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={[styles.customerHomeScreen, { gap: homeDeviceTuning.homeScreenGap }]}>
            <Pressable style={[styles.customerHomeHeroCard, { minHeight: homeDeviceTuning.heroMinHeight }]} onPress={() => onTabChange('explore')}>
              <Image source={{ uri: HOME_CAROUSEL_IMAGES[0] }} style={styles.customerHomeHeroImageFull} resizeMode="cover" />
              <LinearGradient
                colors={['rgba(249, 251, 255, 0.95)', 'rgba(249, 251, 255, 0.6)', 'rgba(249, 251, 255, 0.08)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0.25 }}
                style={[styles.customerHomeHeroCardGradient, { minHeight: homeDeviceTuning.heroMinHeight }]}
              >
                <View style={[styles.customerHomeHeroTextBlock, { width: isIphone15ProMaxClass ? '56%' : '58%', paddingHorizontal: homeDeviceTuning.heroTextPaddingHorizontal, paddingVertical: homeDeviceTuning.heroTextPaddingVertical }]}>
                  <Text style={[styles.customerHomeHeroTitle, { fontSize: homeDeviceTuning.heroTitleSize, lineHeight: homeDeviceTuning.heroTitleLineHeight }]}>Get your AC ready for summer</Text>
                  <Text style={[styles.customerHomeHeroSubtitle, { fontSize: homeDeviceTuning.heroSubtitleSize, lineHeight: homeDeviceTuning.heroSubtitleLineHeight }]}>QAR 15 off first order*</Text>
                </View>
              </LinearGradient>
            </Pressable>

            <Animated.View style={[styles.customerHomePromoStrip, { gap: promoCardGap, opacity: promoRowFade }]}>
              {rotatingPromoCards.map((promo, index) => (
                <Pressable
                  key={`${promo.id}-${index}`}
                  style={[styles.customerHomePromoCard, { width: promoCardWidth, height: promoCardHeight }]}
                  onPress={() => {
                    onSelectItem(promo.item);
                    onTabChange('explore');
                  }}
                >
                  <Image source={{ uri: promo.imageUrl }} style={styles.customerHomePromoImage} resizeMode="cover" />
                  <LinearGradient colors={['rgba(8, 19, 58, 0.03)', 'rgba(8, 19, 58, 0.72)']} style={styles.customerHomePromoOverlay}>
                    <View style={[styles.customerHomePromoTagWrap, /new/i.test(promo.badge || '') && styles.customerHomePromoTagWrapNew]}>
                      <Text style={[styles.customerHomePromoTag, /new/i.test(promo.badge || '') && styles.customerHomePromoTagNew]}>{promo.badge || `Offer ${index + 1}`}</Text>
                    </View>
                    <Text style={[styles.customerHomePromoTitle, { fontSize: homeDeviceTuning.promoTitleSize, lineHeight: homeDeviceTuning.promoTitleLineHeight }]} numberOfLines={2}>{promo.title}</Text>
                    <Text style={styles.customerHomePromoSubtitle} numberOfLines={1}>{promo.companyName || promo.subtitle}</Text>
                    <Text style={[styles.customerHomePromoPrice, { fontSize: homeDeviceTuning.promoPriceSize, lineHeight: homeDeviceTuning.promoPriceLineHeight }]}>{promo.priceLabel}</Text>
                  </LinearGradient>
                </Pressable>
              ))}
            </Animated.View>

            <View style={[styles.customerHomeServicesGrid, { rowGap: homeDeviceTuning.serviceGridRowGap }]}>
              {homeGridCategories.map((category) => (
                <Pressable
                  key={`home-grid-${category}`}
                  style={[styles.customerHomeServiceTile, { gap: homeDeviceTuning.serviceTileGap }]}
                  onPress={() => {
                    onSelectCustomerCategory(category);
                    onCustomerSearchQueryChange('');
                    onTabChange('explore');
                  }}
                >
                  <View style={styles.customerHomeServiceIconCard}>
                    <FontAwesome5 name={premiumHomeIconForCategory(category)} size={Math.max(22, Math.round(homeDeviceTuning.serviceIconSize * 0.5))} color={colors.primary} solid />
                  </View>
                  <Text style={[styles.customerHomeServiceLabel, { fontSize: homeDeviceTuning.serviceLabelSize, lineHeight: homeDeviceTuning.serviceLabelLineHeight }]} numberOfLines={2}>{category}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.customerHomeDualCardsRow}>
              <Pressable style={styles.customerHomeDualCard} onPress={() => onTabChange('explore')}>
                <LinearGradient colors={['#ECEFF5', '#DEE6F4']} style={styles.customerHomeDualCardGradient}>
                  <View style={styles.infoBodyGrow}>
                    <Text style={styles.customerHomeDualCardTitle}>Luxury Laundry</Text>
                    <Text style={styles.customerHomeDualCardSubtitle}>Premium care for your garments</Text>
                  </View>
                  <FontAwesome5 name="tshirt" size={28} color="#2E4A8E" solid />
                </LinearGradient>
              </Pressable>

              <Pressable style={styles.customerHomeDualCard} onPress={() => onTabChange('explore')}>
                <LinearGradient colors={['#EAF0F8', '#DCE7F5']} style={styles.customerHomeDualCardGradient}>
                  <View style={styles.infoBodyGrow}>
                    <Text style={styles.customerHomeDualCardBadge}>New Launch</Text>
                    <Text style={styles.customerHomeDualCardTitle}>Baby Laundry</Text>
                  </View>
                  <FontAwesome5 name="baby" size={28} color="#3E68BE" solid />
                </LinearGradient>
              </Pressable>
            </View>

            <Text style={styles.customerHomeSectionHeading}>Offers & discounts</Text>
            <Pressable style={styles.customerHomeOfferCard} onPress={() => onTabChange('explore')}>
              <Image source={{ uri: activeOfferShowcase?.imageUrl || HOME_CAROUSEL_IMAGES[1] }} style={styles.customerHomeOfferCardImage} resizeMode="cover" />
              <LinearGradient colors={['rgba(255,255,255,0.96)', 'rgba(255,255,255,0.78)', 'rgba(255,255,255,0.26)']} style={styles.customerHomeOfferCardOverlay}>
                <View style={styles.customerHomeOfferBadgeWrap}>
                  <Text style={styles.customerHomeOfferBadge}>NEW</Text>
                </View>
                <Text style={styles.customerHomeOfferTitle}>{activeOfferShowcase?.title || 'Washing machine service'}</Text>
                <Text style={styles.customerHomeOfferSubtitle}>Service available for all major brands</Text>
                <Pressable style={styles.customerHomeOfferButton} onPress={() => onTabChange('explore')}>
                  <Text style={styles.customerHomeOfferButtonText}>Know More</Text>
                </Pressable>
              </LinearGradient>
            </Pressable>

            <View style={styles.customerHomeDotsRow}>
              <View style={[styles.customerHomeDot, styles.customerHomeDotActive]} />
              <View style={styles.customerHomeDot} />
            </View>

            <Text style={styles.customerHomeSectionHeading}>Make it your own</Text>
            <LinearGradient colors={['#3751E8', '#2E46D7']} style={styles.customerHomeCustomizeCard}>
              <View style={styles.customerHomeCustomizeBody}>
                <Text style={styles.customerHomeCustomizeTitle}>Customize your experience</Text>
                <Text style={styles.customerHomeCustomizeSubtitle}>Tailor Jahzeen to your preference and discover better providers faster.</Text>
                <Pressable style={styles.customerHomeCustomizeButton} onPress={() => onTabChange('explore')}>
                  <Text style={styles.customerHomeCustomizeButtonText}>Explore</Text>
                </Pressable>
              </View>
              <View style={styles.customerHomeCustomizeArt}>
                <FontAwesome5 name="sliders-h" size={72} color="#DCE6FF" solid />
              </View>
            </LinearGradient>
          </View>
        </ScrollView>
      ) : null}

      {tab === 'browse' ? (
        <ScrollView style={styles.customerTabScroll} contentContainerStyle={styles.customerTabScrollContent} showsVerticalScrollIndicator={false}>
          <SectionCard
            title="Browse categories"
            subtitle="Structured marketplace categories optimized for company-first discovery."
            cardStyle={customerTheme.card}
            titleStyle={customerTheme.title}
            subtitleStyle={customerTheme.subtitle}
          >
            <View style={styles.customerBrowseStatsRow}>
              <View style={styles.customerBrowseStatCard}>
                <Text style={styles.customerBrowseStatValue}>{marketplaceCounts.listings}</Text>
                <Text style={styles.customerBrowseStatLabel}>Total listings</Text>
              </View>
              <View style={styles.customerBrowseStatCard}>
                <Text style={styles.customerBrowseStatValue}>{marketplaceCounts.services}</Text>
                <Text style={styles.customerBrowseStatLabel}>Services</Text>
              </View>
              <View style={styles.customerBrowseStatCard}>
                <Text style={styles.customerBrowseStatValue}>{marketplaceCounts.products}</Text>
                <Text style={styles.customerBrowseStatLabel}>Products</Text>
              </View>
            </View>

            {activeBrowseGroup ? (
              <Pressable style={styles.customerLandingHero} onPress={() => onTabChange('explore')}>
                <Image source={{ uri: activeLandingBannerImage }} style={styles.customerLandingHeroImage} resizeMode="cover" />
                <LinearGradient colors={['rgba(17,24,33,0.08)', 'rgba(17,24,33,0.72)']} style={styles.customerLandingHeroOverlay}>
                  <View style={styles.customerLandingHeroTopRow}>
                    <View style={styles.customerLandingHeroIconWrap}>
                      <MaterialCommunityIcons name={activeBrowseGroup.icon as any} size={22} color="#FFFFFF" />
                    </View>
                    <Text style={styles.customerLandingHeroBadge}>{activeBrowseGroup.listingsCount} live providers</Text>
                  </View>
                  <View style={styles.customerLandingHeroBody}>
                    <Text style={styles.customerLandingHeroTitle}>{activeBrowseGroup.title}</Text>
                    <Text style={styles.customerLandingHeroSubtitle}>
                      Discover premium {activeBrowseGroup.title.toLowerCase()} listings with faster navigation, cleaner categories, and smarter filters.
                    </Text>
                  </View>
                </LinearGradient>
              </Pressable>
            ) : null}

            {activeBrowseGroup ? (
              <View style={styles.customerBrowseSectionBlock}>
                <View style={styles.customerHomeSectionHeaderCompact}>
                  <Text style={styles.customerHomeSectionTitle}>Subcategories</Text>
                  <Text style={styles.customerHomeSectionMeta}>{activeBrowseGroup.categories.length} options</Text>
                </View>
                <View style={styles.customerBrowseChipRow}>
                  {activeBrowseGroup.categories.map((category) => {
                    const isComingSoon = comingSoonCategories.has(category);
                    return (
                      <Pressable
                        key={`landing-${category}`}
                        style={[
                          styles.customerBrowseChip,
                          normalizedSelectedCategory === category && styles.customerBrowseChipActive,
                          isComingSoon && styles.customerBrowseChipDisabled,
                        ]}
                        onPress={isComingSoon ? undefined : () => {
                          onSelectCustomerCategory(category);
                          onTabChange('explore');
                        }}
                      >
                        <Text
                          style={[
                            styles.customerBrowseChipText,
                            normalizedSelectedCategory === category && styles.customerBrowseChipTextActive,
                            isComingSoon && styles.customerBrowseChipDisabledText,
                          ]}
                        >
                          {isComingSoon ? `${category} · Soon` : category}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {activeLandingItems.length ? (
              <View style={styles.customerBrowseSectionBlock}>
                <View style={styles.customerHomeSectionHeaderCompact}>
                  <Text style={styles.customerHomeSectionTitle}>Featured in this category</Text>
                  <Pressable onPress={() => onTabChange('explore')}>
                    <Text style={styles.customerHomeSearchLink}>Open listing feed</Text>
                  </Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.customerHomeLotRow}>
                  {activeLandingItems.map((item) => (
                    <CustomerHomeLotCard
                      key={`landing-item-${item.id}`}
                      item={item}
                      onPress={() => {
                        onSelectItem(item);
                        onTabChange('explore');
                      }}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.customerBrowseSectionBlock}>
              <View style={styles.customerHomeSectionHeaderCompact}>
                <Text style={styles.customerHomeSectionTitle}>All marketplace groups</Text>
                <Text style={styles.customerHomeSectionMeta}>{groupedCategoryCards.length} hubs</Text>
              </View>
              <View style={styles.customerBrowseGroupStack}>
                {groupedCategoryCards.map((group) => (
                  <Pressable key={group.key} style={styles.customerBrowseGroupCard} onPress={() => setActiveBrowseGroupKey(group.key)}>
                    <View style={styles.customerBrowseGroupHeader}>
                      <View style={styles.customerBrowseGroupTitleWrap}>
                        <View style={styles.customerBrowseGroupIcon}>
                          <MaterialCommunityIcons name={group.icon as any} size={22} color="#12385E" />
                        </View>
                        <Text style={styles.customerBrowseGroupTitle}>{group.title}</Text>
                      </View>
                      <Text style={styles.customerBrowseGroupCount}>{group.listingsCount} providers</Text>
                    </View>
                    <View style={styles.customerBrowseChipRow}>
                      {group.categories.map((category) => {
                        const isComingSoon = comingSoonCategories.has(category);
                        return (
                          <Pressable
                            key={`${group.key}-${category}`}
                            style={[
                              styles.customerBrowseChip,
                              normalizedSelectedCategory === category && styles.customerBrowseChipActive,
                              isComingSoon && styles.customerBrowseChipDisabled,
                            ]}
                            onPress={isComingSoon ? undefined : () => {
                              onSelectCustomerCategory(category);
                              setActiveBrowseGroupKey(group.key);
                              onTabChange('explore');
                            }}
                          >
                            <Text
                              style={[
                                styles.customerBrowseChipText,
                                normalizedSelectedCategory === category && styles.customerBrowseChipTextActive,
                                isComingSoon && styles.customerBrowseChipDisabledText,
                              ]}
                            >
                              {isComingSoon ? `${category} · Soon` : category}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          </SectionCard>
        </ScrollView>
      ) : null}

      {tab === 'explore' ? (
        <ScrollView style={styles.customerTabScroll} contentContainerStyle={styles.customerTabScrollContent} showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]} keyboardShouldPersistTaps="handled">
          <View style={styles.customerExploreStickyHeader}>
            <View style={styles.customerExploreStickySearchBar}>
              <MaterialCommunityIcons name="magnify" size={22} color="#12385E" />
              <TextInput
                value={customerSearchQuery}
                onChangeText={onCustomerSearchQueryChange}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                placeholder="Search companies or services"
                placeholderTextColor="#8A8F98"
                style={styles.customerExploreStickySearchInput}
              />
              {customerSearchQuery ? (
                <Pressable style={styles.customerExploreSearchClearButton} onPress={() => onCustomerSearchQueryChange('')}>
                  <MaterialCommunityIcons name="close-circle-outline" size={18} color="#5B7A90" />
                </Pressable>
              ) : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.customerExploreSortRow}>
              {([
                { key: 'popular', label: 'Popular' },
                { key: 'newest', label: 'Newest' },
                { key: 'priceLow', label: 'Price ↑' },
                { key: 'priceHigh', label: 'Price ↓' },
              ] as Array<{ key: CustomerSortMode; label: string }>).map((option) => (
                <Pressable
                  key={option.key}
                  style={[
                    styles.customerExploreSortChip,
                    customerSortMode === option.key && styles.customerExploreSortChipActive,
                  ]}
                  onPress={() => onCustomerSortModeChange(option.key)}
                >
                  <Text
                    style={[
                      styles.customerExploreSortChipText,
                      customerSortMode === option.key && styles.customerExploreSortChipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.customerExploreFilterBar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.customerExploreFilterRow}>
                {allCategories.map((category) => (
                  <Pressable
                    key={`explore-${category}`}
                    style={[
                      styles.customerExploreFilterChip,
                      normalizedSelectedCategory === category && styles.customerExploreFilterChipActive,
                    ]}
                    onPress={() => onSelectCustomerCategory(normalizedSelectedCategory === category ? null : category)}
                  >
                    <Text
                      style={[
                        styles.customerExploreFilterChipText,
                        normalizedSelectedCategory === category && styles.customerExploreFilterChipTextActive,
                      ]}
                    >
                      {category}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              {(normalizedSelectedCategory || normalizedCustomerSearch) ? (
                <Pressable
                  style={styles.customerExploreResetButton}
                  onPress={() => {
                    onSelectCustomerCategory(null);
                    onCustomerSearchQueryChange('');
                  }}
                >
                  <Text style={styles.customerExploreResetButtonText}>Clear filters</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <SectionCard title="Explore companies" subtitle={activeFilterSummary || 'Browse active companies by service category.'} cardStyle={customerTheme.card} titleStyle={customerTheme.title} subtitleStyle={customerTheme.subtitle}>
            {selectedCategoryComingSoon ? (
              <EmptyState title="Coming Soon" body={`${normalizedSelectedCategory} will appear in the app before launch, but booking is not open yet.`} cardStyle={customerTheme.empty} titleStyle={customerTheme.title} bodyStyle={customerTheme.subtitle} />
            ) : null}
            {filteredCompanies.length ? (
              <View style={[styles.catalogGrid, wide && styles.catalogGridWide]}>
                {filteredCompanies.map((company) => (
                  <CustomerCompanyCard key={`explore-company-${company.id}`} company={company} variant="compact" onPress={() => openProviderDetails(company.id)} />
                ))}
              </View>
            ) : (
              <EmptyState title="No companies match" body={selectedCategoryComingSoon ? 'This category is visible in the marketplace but booking will open later.' : 'Try another search or clear the selected category to see more companies.'} cardStyle={customerTheme.empty} titleStyle={customerTheme.title} bodyStyle={customerTheme.subtitle} />
            )}
          </SectionCard>

          {bookingComposer.itemId ? (
            <SectionCard title="Booking composer" subtitle={authUser ? 'Customer flow: provider → service → time slot → payment → confirmation.' : 'Guests can prepare an order here, then sign in from Profile to complete it.'} cardStyle={customerTheme.card} titleStyle={customerTheme.title} subtitleStyle={customerTheme.subtitle}>
              <View style={styles.rowGap}>
                <FormField label="Date" value={bookingComposer.scheduleDate} onChangeText={(value) => onBookingComposerChange((current) => ({ ...current, scheduleDate: value }))} error={bookingErrors.scheduleDate} theme={customerTheme.inputTheme} />
                <FormField label="Time" value={bookingComposer.scheduleTime} onChangeText={(value) => onBookingComposerChange((current) => ({ ...current, scheduleTime: value }))} error={bookingErrors.scheduleTime} theme={customerTheme.inputTheme} />
              </View>
              <FormField label="Notes" value={bookingComposer.notes} onChangeText={(value) => onBookingComposerChange((current) => ({ ...current, notes: value }))} multiline theme={customerTheme.inputTheme} />
              {bookingErrors.slotId ? <FieldError text={bookingErrors.slotId} /> : null}
              <View style={styles.toggleRow}>
                <ChoiceChip label="Card" selected={bookingComposer.paymentMethod === 'card'} onPress={() => onBookingComposerChange((current) => ({ ...current, paymentMethod: 'card' }))} />
                <ChoiceChip label="Cash" selected={bookingComposer.paymentMethod === 'cash'} onPress={() => onBookingComposerChange((current) => ({ ...current, paymentMethod: 'cash' }))} />
                <ChoiceChip label="Apple Pay" selected={bookingComposer.paymentMethod === 'applePay'} onPress={() => onBookingComposerChange((current) => ({ ...current, paymentMethod: 'applePay' }))} />
              </View>
              {bookingErrors.auth ? <FieldError text={bookingErrors.auth} /> : null}
              <PrimaryButton label={authUser ? 'Place booking' : 'Open profile to login'} onPress={authUser ? onPlaceBooking : () => onTabChange('profile')} />
            </SectionCard>
          ) : null}
        </ScrollView>
      ) : null}

      <ProviderDetailsModal
        visible={providerDetailOpen && !!selectedProvider}
        provider={selectedProvider}
        averageRating={selectedProviderAverageRating}
        ratingCount={selectedProviderRatings.length}
        services={selectedProviderServices}
        slotGroups={availableSelectedProviderSlotsByDate}
        selectedItemId={bookingComposer.itemId}
        selectedSlotId={bookingComposer.slotId}
        onClose={() => setProviderDetailOpen(false)}
        onSelectService={(item) => onSelectItem(item)}
        onSelectSlot={(slot) => {
          if (!selectedProvider) {
            return;
          }
          onBookingComposerChange((current) => ({ ...current, companyId: selectedProvider.id, slotId: slot.id, scheduleDate: slot.dateLabel, scheduleTime: slot.timeLabel }));
        }}
      />

      {tab === 'orders' ? (
        <ScrollView style={styles.customerTabScroll} contentContainerStyle={styles.customerTabScrollContent} showsVerticalScrollIndicator={false}>
        <SectionCard title="My orders" subtitle="Signed-in customers can track bookings and submit ratings after completion." cardStyle={customerTheme.card} titleStyle={customerTheme.title} subtitleStyle={customerTheme.subtitle}>
          {authUser ? (
            customerBookings.length ? customerBookings.map((booking) => (
              <View key={booking.id} style={styles.bookingWrap}>
                <BookingCard booking={booking} darkMode={darkMode} />
                {booking.status === 'completed' && !booking.ratingSubmitted ? (
                  <View style={[styles.ratingCard, customerTheme.bookingCard]}>
                    <FormField
                      label="Score"
                      value={ratingDrafts[booking.id]?.score ?? ''}
                      onChangeText={(value) =>
                        onRatingDraftChange(booking.id, {
                          score: value,
                          review: ratingDrafts[booking.id]?.review ?? '',
                        })
                      }
                      placeholder="1-5"
                      error={ratingErrors[booking.id]}
                      theme={customerTheme.inputTheme}
                    />
                    <FormField
                      label="Review"
                      value={ratingDrafts[booking.id]?.review ?? ''}
                      onChangeText={(value) =>
                        onRatingDraftChange(booking.id, {
                          score: ratingDrafts[booking.id]?.score ?? '',
                          review: value,
                        })
                      }
                      multiline
                      theme={customerTheme.inputTheme}
                    />
                    <PrimaryButton label="Submit rating" onPress={() => onSubmitRating(booking.id)} />
                  </View>
                ) : null}
              </View>
            )) : <EmptyState title="No bookings yet" body="Place a booking from Explore after a company publishes services or products." cardStyle={customerTheme.empty} titleStyle={customerTheme.title} bodyStyle={customerTheme.subtitle} />
          ) : (
            <EmptyState title="Sign in required" body="Open the Profile tab to sign in, then your orders and ratings will appear here." cardStyle={customerTheme.empty} titleStyle={customerTheme.title} bodyStyle={customerTheme.subtitle} />
          )}
        </SectionCard>
        </ScrollView>
      ) : null}

      {tab === 'notifications' ? (
        <ScrollView style={styles.customerTabScroll} contentContainerStyle={styles.customerTabScrollContent} showsVerticalScrollIndicator={false}>
        <SectionCard title="Notification center" subtitle="Unread and read updates from bookings, offers, and account activity live here." cardStyle={customerTheme.card} titleStyle={customerTheme.title} subtitleStyle={customerTheme.subtitle}>
          {authUser ? (
            notifications.length ? notifications.map((notification) => (
              <NotificationRow key={notification.id} notification={notification} onOpen={() => onOpenNotification(notification)} darkMode={darkMode} />
            )) : <EmptyState title="No notifications yet" body="When bookings move, promotions go live, or your account needs attention, updates will appear here." cardStyle={customerTheme.empty} titleStyle={customerTheme.title} bodyStyle={customerTheme.subtitle} />
          ) : (
            <EmptyState title="Sign in required" body="Notifications are available after you sign in to your customer account." cardStyle={customerTheme.empty} titleStyle={customerTheme.title} bodyStyle={customerTheme.subtitle} />
          )}
        </SectionCard>
        </ScrollView>
      ) : null}

      {tab === 'profile' ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
          <ScrollView style={styles.customerTabScroll} contentContainerStyle={styles.customerTabScrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={[styles.workspaceColumns, wide && styles.workspaceColumnsWide]}>
              <View style={[styles.columnPane, wide && styles.columnPaneWide]}>
                <SectionCard
                  title="Profile"
                  subtitle={authUser ? `Signed in as ${currentUserRole}` : 'Guest mode is active. Browse freely and edit local preferences.'}
                  cardStyle={customerTheme.card}
                  titleStyle={customerTheme.title}
                  subtitleStyle={customerTheme.subtitle}
                >
                  <View style={[styles.darkModeCard, customerTheme.metaCard]}>
                    <View style={styles.infoBodyGrow}>
                      <Text style={[styles.infoTitle, customerTheme.title]}>Appearance</Text>
                      <Text style={[styles.helperText, customerTheme.subtitle]}>Dark mode is available from the profile tab and only affects the customer experience.</Text>
                    </View>
                    <ChoiceChip label={darkMode ? 'Dark mode on' : 'Dark mode off'} selected={darkMode} onPress={onToggleDarkMode} />
                  </View>

                  {!authUser ? (
                    <View style={[styles.verificationCard, customerTheme.verificationCard]}>
                      <Text style={[styles.verificationTitle, customerTheme.title]}>Guest browsing enabled</Text>
                      <Text style={[styles.helperText, customerTheme.subtitle]}>
                        Login has been removed from this screen. Customers can open the app and start browsing directly from Home.
                      </Text>
                    </View>
                  ) : null}

                  <FormField label="Full name" value={profileForm.fullName} onChangeText={(value) => onProfileFormChange((current) => ({ ...current, fullName: value }))} error={profileErrors.fullName} theme={customerTheme.inputTheme} />
                  <FormField label="Email" value={profileForm.email} onChangeText={(value) => onProfileFormChange((current) => ({ ...current, email: value }))} error={profileErrors.email} theme={customerTheme.inputTheme} />
                  <FormField label="Phone" value={profileForm.phone} onChangeText={(value) => onProfileFormChange((current) => ({ ...current, phone: value }))} error={profileErrors.phone} theme={customerTheme.inputTheme} />
                  <View style={styles.toggleRow}>
                    <ChoiceChip label="Card" selected={profileForm.defaultPaymentMethod === 'card'} onPress={() => onProfileFormChange((current) => ({ ...current, defaultPaymentMethod: 'card' }))} />
                    <ChoiceChip label="Cash" selected={profileForm.defaultPaymentMethod === 'cash'} onPress={() => onProfileFormChange((current) => ({ ...current, defaultPaymentMethod: 'cash' }))} />
                    <ChoiceChip label="Apple Pay" selected={profileForm.defaultPaymentMethod === 'applePay'} onPress={() => onProfileFormChange((current) => ({ ...current, defaultPaymentMethod: 'applePay' }))} />
                  </View>
                  {authUser ? <PrimaryButton label="Save profile" onPress={onSaveProfile} /> : null}
                </SectionCard>
              </View>

              <View style={[styles.columnPane, wide && styles.columnPaneWide]}>
                <SectionCard title="Default address" subtitle="Used as the default destination for future bookings." cardStyle={customerTheme.card} titleStyle={customerTheme.title} subtitleStyle={customerTheme.subtitle}>
                  <View style={styles.rowGap}>
                    <FormField label="Label" value={addressForm.label} onChangeText={(value) => onAddressFormChange((current) => ({ ...current, label: value }))} error={addressErrors.label} theme={customerTheme.inputTheme} />
                    <FormField label="Area" value={addressForm.area} onChangeText={(value) => onAddressFormChange((current) => ({ ...current, area: value }))} error={addressErrors.area} theme={customerTheme.inputTheme} />
                  </View>
                  <View style={styles.rowGap}>
                    <FormField label="Street" value={addressForm.street} onChangeText={(value) => onAddressFormChange((current) => ({ ...current, street: value }))} error={addressErrors.street} theme={customerTheme.inputTheme} />
                    <FormField label="Building" value={addressForm.building} onChangeText={(value) => onAddressFormChange((current) => ({ ...current, building: value }))} error={addressErrors.building} theme={customerTheme.inputTheme} />
                  </View>
                  <View style={styles.rowGap}>
                    <FormField label="Unit" value={addressForm.unitNumber} onChangeText={(value) => onAddressFormChange((current) => ({ ...current, unitNumber: value }))} theme={customerTheme.inputTheme} />
                    <FormField label="Phone" value={addressForm.contactPhone} onChangeText={(value) => onAddressFormChange((current) => ({ ...current, contactPhone: value }))} error={addressErrors.contactPhone} theme={customerTheme.inputTheme} />
                  </View>
                  {authUser ? <PrimaryButton label="Save address" onPress={onSaveAddress} /> : null}
                  {authUser ? <SecondaryButton label={authBusy ? 'Signing out...' : 'Sign out'} onPress={() => onSignOut()} loading={authBusy} disabled={authBusy} /> : null}
                </SectionCard>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : null}
    </View>
  );
}

type OperationalTone = 'success' | 'info' | 'warning' | 'error';

function iconForCategory(category: string): any {
  const normalized = category.toLowerCase();
  if (normalized.includes('ac')) return 'air-conditioner';
  if (normalized.includes('car') && normalized.includes('wash')) return 'car-wash';
  if (normalized.includes('car') && normalized.includes('service')) return 'car-cog';
  if (normalized.includes('car') && normalized.includes('winch')) return 'tow-truck';
  if (normalized.includes('car')) return 'car';
  if (normalized.includes('wash')) return 'water-opacity';
  if (normalized.includes('clean')) return 'spray-bottle';
  if (normalized.includes('pest') || normalized.includes('exterminator')) return 'bug-check-outline';
  if (normalized.includes('water') && normalized.includes('tank')) return 'water-tank';
  if (normalized.includes('water')) return 'water-percent';
  if (normalized.includes('moving') || normalized.includes('furniture') || normalized.includes('house')) return 'truck-cargo-container';
  if (normalized.includes('sofa') || normalized.includes('furniture')) return 'sofa-single-outline';
  if (normalized.includes('vacuum')) return 'vacuum-outline';
  return 'home-outline';
}

function premiumHomeIconForCategory(category: string): keyof typeof FontAwesome5.glyphMap {
  const normalized = category.toLowerCase();
  if (normalized.includes('ac')) return 'snowflake';
  if (normalized.includes('car') && normalized.includes('wash')) return 'car-side';
  if (normalized.includes('car') && normalized.includes('service')) return 'tools';
  if (normalized.includes('car') && normalized.includes('winch')) return 'truck-pickup';
  if (normalized.includes('moving')) return 'dolly';
  if (normalized.includes('furniture')) return 'couch';
  if (normalized.includes('deep') || normalized.includes('home cleaning') || normalized.includes('clean')) return 'spray-can';
  if (normalized.includes('pest') || normalized.includes('exterminator')) return 'shield-virus';
  if (normalized.includes('water') && normalized.includes('tank')) return 'faucet';
  if (normalized.includes('water')) return 'tint';
  return 'concierge-bell';
}

function formatMetricValue(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function formatPercentValue(value: number, total: number) {
  if (!total) {
    return '0%';
  }

  return formatPercent((value / total) * 100);
}

function averageScore(entries: Array<{ score: number }>) {
  if (!entries.length) {
    return 0;
  }

  const total = entries.reduce((sum, entry) => sum + entry.score, 0);
  return total / entries.length;
}

function severityWeight(tone: OperationalTone) {
  if (tone === 'error') return 4;
  if (tone === 'warning') return 3;
  if (tone === 'info') return 2;
  return 1;
}

function toNumericMetric(value: string) {
  const parsed = Number(value.replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDayLabel(label: string) {
  const parsed = Date.parse(label);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseFlexibleDate(label: string) {
  const trimmed = label.trim();
  const now = new Date();
  if (!trimmed) {
    return null;
  }
  if (/^today$/i.test(trimmed)) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (/^tomorrow$/i.test(trimmed)) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  }
  if (/^yesterday$/i.test(trimmed)) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  }

  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed);
  }

  return null;
}

function timestampFromId(id: string) {
  const match = id.match(/(\d{10,})$/);
  if (!match) {
    return 0;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : 0;
}

function labelFromId(id: string) {
  const stamp = timestampFromId(id);
  if (!stamp) {
    return 'Recently submitted';
  }
  return new Date(stamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function daysBetween(target: Date, base = new Date()) {
  const normalizedTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const normalizedBase = new Date(base.getFullYear(), base.getMonth(), base.getDate()).getTime();
  return Math.round((normalizedTarget - normalizedBase) / 86400000);
}

function getRecentAuditEvents(events: AuditEvent[], days: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);
  return events.filter((event) => {
    const parsed = parseFlexibleDate(event.createdAtLabel);
    return parsed ? parsed >= cutoff : true;
  });
}

function buildTrendSeries(events: AuditEvent[], resolveValue: (event: AuditEvent) => number, maxPoints = 6) {
  const grouped = new Map<string, number>();
  [...events]
    .sort((left, right) => parseDayLabel(left.createdAtLabel) - parseDayLabel(right.createdAtLabel))
    .forEach((event) => {
      const current = grouped.get(event.createdAtLabel) ?? 0;
      grouped.set(event.createdAtLabel, current + resolveValue(event));
    });

  const points = Array.from(grouped.entries()).slice(-maxPoints).map(([label, value]) => ({
    label: label.split(' ').slice(0, 2).join(' '),
    value,
  }));

  return points.length ? points : [{ label: 'No data', value: 0 }];
}

function sortRows<T>(rows: T[], sortState: { key: string; direction: 'asc' | 'desc' }, accessors: Record<string, (row: T) => string | number>) {
  const accessor = accessors[sortState.key];
  if (!accessor) {
    return rows;
  }

  return [...rows].sort((left, right) => {
    const leftValue = accessor(left);
    const rightValue = accessor(right);
    const result = typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : String(leftValue).localeCompare(String(rightValue));
    return sortState.direction === 'asc' ? result : -result;
  });
}

function toneLabel(tone: OperationalTone) {
  if (tone === 'success') return 'Stable';
  if (tone === 'warning') return 'Watch';
  if (tone === 'error') return 'Critical';
  return 'Tracking';
}

function getBookingStatusTone(status: BookingStatus): OperationalTone {
  if (status === 'completed') return 'success';
  if (status === 'cancelled') return 'error';
  if (status === 'pending') return 'warning';
  return 'info';
}

function getPromotionStateTone(isActive: boolean): OperationalTone {
  return isActive ? 'success' : 'info';
}

function getInvitationDeliveryTone(status: CompanyInvitation['emailDeliveryStatus']): OperationalTone {
  if (status === 'failed') return 'error';
  if (status === 'pending') return 'warning';
  return 'success';
}

function getCountdownInfo(label: string) {
  const target = parseFlexibleDate(label);
  if (!target) {
    return { sortValue: Number.MAX_SAFE_INTEGER, label: 'No end date', tone: 'info' as const };
  }

  const days = daysBetween(target);
  if (days < 0) {
    return { sortValue: days, label: `${Math.abs(days)}d overdue`, tone: 'error' as const };
  }
  if (days === 0) {
    return { sortValue: days, label: 'Ends today', tone: 'warning' as const };
  }
  if (days <= 7) {
    return { sortValue: days, label: `${days}d left`, tone: 'warning' as const };
  }

  return { sortValue: days, label: `${days}d left`, tone: 'success' as const };
}

function getBookingAgingInfo(booking: Booking) {
  const target = parseFlexibleDate(booking.scheduleDate);
  if (!target) {
    return { sortValue: Number.MAX_SAFE_INTEGER, label: 'Undated', tone: 'info' as const };
  }

  const days = daysBetween(target);
  if (days < 0) {
    return { sortValue: Math.abs(days), label: `${Math.abs(days)}d overdue`, tone: booking.status === 'completed' ? 'success' as const : 'error' as const };
  }
  if (days === 0) {
    return { sortValue: 0, label: 'Today', tone: booking.status === 'completed' ? 'success' as const : 'warning' as const };
  }
  if (days <= 3) {
    return { sortValue: days, label: `${days}d out`, tone: 'warning' as const };
  }

  return { sortValue: days, label: `${days}d out`, tone: 'info' as const };
}

function dayKeyFromLabel(label: string) {
  const parsed = parseFlexibleDate(label);
  if (!parsed) {
    return null;
  }
  const year = parsed.getFullYear();
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
  const day = `${parsed.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildSeriesFromDateLabels(labels: string[], maxPoints = 6) {
  const grouped = new Map<string, number>();
  labels.forEach((label) => {
    const key = dayKeyFromLabel(label);
    if (!key) {
      return;
    }
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  });

  const ordered = Array.from(grouped.entries())
    .sort((left, right) => Date.parse(left[0]) - Date.parse(right[0]))
    .slice(-maxPoints)
    .map(([, count]) => count);

  return ordered.length ? ordered : [0];
}

function buildCompanyBookingSparkline(bookings: Booking[], companyId: string, maxPoints = 6) {
  return buildSeriesFromDateLabels(bookings.filter((booking) => booking.companyId === companyId).map((booking) => booking.scheduleDate), maxPoints);
}

function buildPromotionVelocitySparkline(auditEvents: AuditEvent[], promotion: OfferPromotion, maxPoints = 6) {
  const labels = auditEvents
    .filter((event) => event.entityType === 'promotion' && (event.entityId === promotion.id || event.companyId === promotion.companyId))
    .map((event) => event.createdAtLabel);

  return buildSeriesFromDateLabels(labels, maxPoints);
}

function buildBookingStatusVelocitySparkline(auditEvents: AuditEvent[], bookingId: string, maxPoints = 6) {
  const labels = auditEvents
    .filter((event) => event.entityType === 'booking' && event.entityId === bookingId)
    .map((event) => event.createdAtLabel);

  return buildSeriesFromDateLabels(labels, maxPoints);
}

function getTrendInsight(
  focus: 'activity' | 'bookings' | 'revenue' | 'publishing',
  activityTrend: Array<{ label: string; value: number }>,
  secondaryTrend: Array<{ label: string; value: number }>,
  tertiaryTrend: Array<{ label: string; value: number }>,
  days: number,
) {
  const source = focus === 'activity' ? activityTrend : focus === 'bookings' ? secondaryTrend : tertiaryTrend;
  const total = source.reduce((sum, point) => sum + point.value, 0);
  const latest = source[source.length - 1]?.value ?? 0;
  const earliest = source[0]?.value ?? 0;
  const delta = latest - earliest;
  return {
    title: `${focus.charAt(0).toUpperCase() + focus.slice(1)} drill-down`,
    description: `Viewing the last ${days} days. This panel makes the selected trend easier to compare against the current operating window.`,
    highlight: `${Math.round(total)} total tracked value · ${delta >= 0 ? '+' : ''}${Math.round(delta)} change from first visible point`,
    footer: `Latest point: ${Math.round(latest)} · Earliest point: ${Math.round(earliest)}`,
  };
}

function summarizeTrendPoints(points: Array<{ label: string; value: number }>) {
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const average = points.length ? total / points.length : 0;
  const peak = points.reduce((current, point) => (point.value > current.value ? point : current), points[0] ?? { label: 'No data', value: 0 });
  const latest = points[points.length - 1] ?? { label: 'No data', value: 0 };
  return { average, peak, latest };
}

function getCatalogApprovalLabel(item: CatalogItem) {
  if (item.approvalStatus === 'approved') return 'Approved live';
  if (item.approvalStatus === 'pending') return 'Pending approval';
  if (item.approvalStatus === 'rejected') return 'Rejected';
  return 'Draft';
}

function getCatalogApprovalTone(item: CatalogItem): 'success' | 'warning' | 'error' | 'info' {
  if (item.approvalStatus === 'approved') return 'success';
  if (item.approvalStatus === 'pending') return 'warning';
  if (item.approvalStatus === 'rejected') return 'error';
  return 'info';
}

function getCatalogRisk(item: CatalogItem, companyIsActive: boolean) {
  if (!companyIsActive) {
    return { tone: 'error' as const, label: 'Company paused', detail: 'This listing belongs to a paused company, so storefront visibility is at risk.' };
  }
  if (!item.imageUrl) {
    return { tone: 'warning' as const, label: 'Image missing', detail: 'This listing is missing a storefront image and will underperform visually.' };
  }
  if (item.approvalStatus === 'pending') {
    return { tone: 'warning' as const, label: 'Awaiting approval', detail: 'This listing is waiting for admin approval before it can appear to customers.' };
  }
  if (item.approvalStatus === 'rejected') {
    return { tone: 'error' as const, label: 'Rejected', detail: 'This listing was rejected. Update it and resubmit for approval.' };
  }
  if (!item.isPublished || item.approvalStatus === 'draft') {
    return { tone: 'info' as const, label: 'Draft', detail: 'This listing is still private and needs publishing before customers can discover it.' };
  }
  return { tone: 'success' as const, label: 'Approved live', detail: 'This listing is approved and visible in the marketplace.' };
}

function getPromotionRisk(promotion: OfferPromotion) {
  const endsAt = parseFlexibleDate(promotion.endsAtLabel);
  const daysUntilEnd = endsAt ? daysBetween(endsAt) : null;
  if (promotion.isActive && daysUntilEnd !== null && daysUntilEnd < 0) {
    return { tone: 'error' as const, label: 'Expired live offer', detail: 'This promotion appears to have passed its end date while still marked active.' };
  }
  if (!promotion.isActive) {
    return { tone: 'info' as const, label: 'Paused', detail: 'This promotion is saved but not currently driving marketplace demand.' };
  }
  if (promotion.isActive && daysUntilEnd !== null && daysUntilEnd <= 7) {
    return { tone: 'warning' as const, label: 'Ending soon', detail: 'This active promotion is nearing its end date and should be reviewed or extended.' };
  }
  if (!promotion.discountLabel || !promotion.endsAtLabel) {
    return { tone: 'warning' as const, label: 'Missing details', detail: 'This live promotion is missing commercial clarity such as discount or end date.' };
  }
  return { tone: 'success' as const, label: 'Campaign ready', detail: 'This promotion is active and has the key details customers expect.' };
}

function getBookingRisk(booking: Booking) {
  const scheduledDate = parseFlexibleDate(booking.scheduleDate);
  const scheduledDelta = scheduledDate ? daysBetween(scheduledDate) : null;
  if (booking.status === 'cancelled') {
    return { tone: 'error' as const, label: 'Cancelled', detail: 'This booking dropped out of the fulfilment flow and may need review.' };
  }
  if (booking.status === 'pending' && scheduledDelta !== null && scheduledDelta < 0) {
    return { tone: 'error' as const, label: 'Stale pending', detail: 'This booking is still pending even though its scheduled date has already passed.' };
  }
  if (booking.status === 'pending') {
    return { tone: 'warning' as const, label: 'Awaiting action', detail: 'This booking has not received the first company response yet.' };
  }
  if (scheduledDelta !== null && scheduledDelta <= 0 && booking.status !== 'completed') {
    return { tone: 'warning' as const, label: 'Date risk', detail: 'This booking is near or past its scheduled date and should remain closely monitored.' };
  }
  if (booking.status === 'completed') {
    return { tone: 'success' as const, label: 'Delivered', detail: 'This booking completed successfully and is no longer at operational risk.' };
  }
  return { tone: 'info' as const, label: 'In progress', detail: 'This booking is moving through fulfilment and should stay visible until completion.' };
}

function buildCompanyOperationalSnapshot(
  company: Company,
  bookings: Booking[],
  catalogItems: CatalogItem[],
  offerPromotions: OfferPromotion[],
  notifications: AppNotification[],
  invitations: CompanyInvitation[],
  ratings: Array<{ companyId: string; score: number }>,
  auditEvents: AuditEvent[],
) {
  const companyBookings = bookings.filter((entry) => entry.companyId === company.id);
  const pendingBookings = companyBookings.filter((entry) => entry.status === 'pending').length;
  const stalePendingBookings = companyBookings.filter((entry) => getBookingRisk(entry).label === 'Stale pending').length;
  const publishedItems = catalogItems.filter((entry) => entry.companyId === company.id && entry.approvalStatus === 'approved').length;
  const activePromotions = offerPromotions.filter((entry) => entry.companyId === company.id && entry.isActive).length;
  const expiringPromotions = offerPromotions.filter((entry) => entry.companyId === company.id).filter((entry) => getPromotionRisk(entry).label === 'Ending soon' || getPromotionRisk(entry).label === 'Expired live offer').length;
  const unreadAlerts = notifications.filter((entry) => entry.companyId === company.id && !entry.isRead).length;
  const pendingInvitation = invitations.find((entry) => entry.companyId === company.id && entry.status === 'pending');
  const companyRatings = ratings.filter((entry) => entry.companyId === company.id);
  const companyAverageRating = averageScore(companyRatings);
  const lowRatingRisk = companyRatings.length >= 3 && companyAverageRating < 4;
  const companyRecentEvents = auditEvents.filter((event) => event.companyId === company.id).slice(0, 8);
  const recentErrors = companyRecentEvents.filter((event) => event.status === 'error').length;

  let tone: OperationalTone = 'success';
  if (!company.isActive || pendingBookings > 3 || stalePendingBookings > 0 || expiringPromotions > 0 || lowRatingRisk || recentErrors > 0 || (pendingInvitation && pendingInvitation.emailDeliveryStatus !== 'sent')) {
    tone = 'warning';
  }
  if ((!company.isActive && pendingBookings > 0) || stalePendingBookings > 1 || (companyRatings.length >= 3 && companyAverageRating < 3.5)) {
    tone = 'error';
  }

  const riskLabel = stalePendingBookings
    ? `${stalePendingBookings} stale pending`
    : lowRatingRisk
      ? `${companyAverageRating.toFixed(1)} / 5 rating`
      : expiringPromotions
        ? `${expiringPromotions} offers near expiry`
        : pendingInvitation
          ? pendingInvitation.emailDeliveryStatus === 'sent' ? 'Invite delivered' : 'Invite issue'
          : `${companyAverageRating ? `${companyAverageRating.toFixed(1)} / 5 rating` : 'No reviews yet'}`;

  return {
    id: company.id,
    title: company.name,
    detail: `${company.isActive ? 'Active' : 'Paused'} · ${publishedItems} live items · ${activePromotions} active promotions · ${pendingBookings} pending bookings${stalePendingBookings ? ` · ${stalePendingBookings} stale` : ''}`,
    statusLabel: `${riskLabel}${unreadAlerts ? ` · ${unreadAlerts} alerts` : ''}`,
    tone,
  };
}

function OperationalStatusRow({
  title,
  detail,
  statusLabel,
  tone,
  actionLabel,
  onPress,
}: {
  title: string;
  detail: string;
  statusLabel: string;
  tone: OperationalTone;
  actionLabel?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.operationalRow}>
      <View style={styles.infoBodyGrow}>
        <View style={styles.operationalTitleRow}>
          <Text style={styles.infoTitle}>{title}</Text>
          <View style={[styles.operationalToneBadge, tone === 'success' && styles.operationalToneBadgeSuccess, tone === 'info' && styles.operationalToneBadgeInfo, tone === 'warning' && styles.operationalToneBadgeWarning, tone === 'error' && styles.operationalToneBadgeError]}>
            <Text style={[styles.operationalToneBadgeText, tone === 'success' && styles.operationalToneBadgeTextSuccess, tone === 'info' && styles.operationalToneBadgeTextInfo, tone === 'warning' && styles.operationalToneBadgeTextWarning, tone === 'error' && styles.operationalToneBadgeTextError]}>{toneLabel(tone)}</Text>
          </View>
        </View>
        <Text style={styles.infoSubtitle}>{detail}</Text>
        <Text style={styles.operationalMetaText}>{statusLabel}</Text>
      </View>
      {actionLabel && onPress ? <SecondaryButton label={actionLabel} onPress={onPress} /> : null}
    </View>
  );
}

function AuditEventRow({ event }: { event: AuditEvent }) {
  return (
    <View style={styles.auditRow}>
      <View style={styles.auditHeaderRow}>
        <Text style={styles.infoTitle}>{event.summary}</Text>
        <View style={[styles.operationalToneBadge, event.status === 'success' && styles.operationalToneBadgeSuccess, event.status === 'info' && styles.operationalToneBadgeInfo, event.status === 'warning' && styles.operationalToneBadgeWarning, event.status === 'error' && styles.operationalToneBadgeError]}>
          <Text style={[styles.operationalToneBadgeText, event.status === 'success' && styles.operationalToneBadgeTextSuccess, event.status === 'info' && styles.operationalToneBadgeTextInfo, event.status === 'warning' && styles.operationalToneBadgeTextWarning, event.status === 'error' && styles.operationalToneBadgeTextError]}>{event.action}</Text>
        </View>
      </View>
      <Text style={styles.infoSubtitle}>{event.actorEmail} · {event.createdAtLabel}</Text>
      {event.metadata.length ? (
        <View style={styles.auditTagRow}>
          {event.metadata.slice(0, 4).map((entry) => (
            <View key={`${event.id}-${entry}`} style={styles.auditTag}>
              <Text style={styles.auditTagText}>{entry}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function MiniTrendCard({
  title,
  subtitle,
  points,
  tone,
  format = 'number',
  selected = false,
  onPress,
}: {
  title: string;
  subtitle: string;
  points: Array<{ label: string; value: number }>;
  tone: OperationalTone;
  format?: 'number' | 'currency';
  selected?: boolean;
  onPress?: () => void;
}) {
  const maxValue = Math.max(...points.map((point) => point.value), 1);

  return (
    <Pressable style={[styles.trendCard, selected && styles.trendCardSelected]} onPress={onPress}>
      <View style={styles.trendCardHeader}>
        <View style={styles.infoBodyGrow}>
          <Text style={styles.infoTitle}>{title}</Text>
          <Text style={styles.infoSubtitle}>{subtitle}</Text>
        </View>
        <View style={[styles.operationalToneBadge, tone === 'success' && styles.operationalToneBadgeSuccess, tone === 'info' && styles.operationalToneBadgeInfo, tone === 'warning' && styles.operationalToneBadgeWarning, tone === 'error' && styles.operationalToneBadgeError]}>
          <Text style={[styles.operationalToneBadgeText, tone === 'success' && styles.operationalToneBadgeTextSuccess, tone === 'info' && styles.operationalToneBadgeTextInfo, tone === 'warning' && styles.operationalToneBadgeTextWarning, tone === 'error' && styles.operationalToneBadgeTextError]}>Trend</Text>
        </View>
      </View>
      <View style={styles.trendBarsRow}>
        {points.map((point) => (
          <View key={`${title}-${point.label}`} style={styles.trendBarColumn}>
            <Text style={styles.trendBarValue}>{format === 'currency' ? formatMetricValue(point.value) : Math.round(point.value)}</Text>
            <View style={styles.trendBarTrack}>
              <View
                style={[
                  styles.trendBarFill,
                  tone === 'success' && styles.trendBarFillSuccess,
                  tone === 'info' && styles.trendBarFillInfo,
                  tone === 'warning' && styles.trendBarFillWarning,
                  tone === 'error' && styles.trendBarFillError,
                  { height: `${Math.max((point.value / maxValue) * 100, point.value > 0 ? 16 : 4)}%` },
                ]}
              />
            </View>
            <Text style={styles.trendBarLabel}>{point.label}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

function TrendDrilldownCard({
  title,
  description,
  highlight,
  footer,
  points,
  format = 'number',
}: {
  title: string;
  description: string;
  highlight: string;
  footer: string;
  points: Array<{ label: string; value: number }>;
  format?: 'number' | 'currency';
}) {
  const summary = summarizeTrendPoints(points);
  const formatPoint = (value: number) => format === 'currency' ? formatMetricValue(value) : `${Math.round(value)}`;

  return (
    <View style={styles.trendDrilldownCard}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoSubtitle}>{description}</Text>
      <Text style={styles.trendDrilldownHighlight}>{highlight}</Text>
      <View style={styles.trendAnnotationRow}>
        <View style={styles.trendAnnotationChip}>
          <Text style={styles.trendAnnotationLabel}>Peak</Text>
          <Text style={styles.trendAnnotationValue}>{formatPoint(summary.peak.value)}</Text>
          <Text style={styles.trendAnnotationHint}>{summary.peak.label}</Text>
        </View>
        <View style={styles.trendAnnotationChip}>
          <Text style={styles.trendAnnotationLabel}>Average</Text>
          <Text style={styles.trendAnnotationValue}>{formatPoint(summary.average)}</Text>
          <Text style={styles.trendAnnotationHint}>Visible window</Text>
        </View>
        <View style={styles.trendAnnotationChip}>
          <Text style={styles.trendAnnotationLabel}>Latest</Text>
          <Text style={styles.trendAnnotationValue}>{formatPoint(summary.latest.value)}</Text>
          <Text style={styles.trendAnnotationHint}>{summary.latest.label}</Text>
        </View>
      </View>
      <View style={styles.trendTooltipCard}>
        <Text style={styles.trendTooltipTitle}>Reading tip</Text>
        <Text style={styles.trendTooltipBody}>Use the peak chip to spot the busiest day, the average to judge baseline demand, and the latest point to see whether the current run-rate is improving or cooling off.</Text>
      </View>
      <Text style={styles.trendDrilldownFooter}>{footer}</Text>
    </View>
  );
}

function TableStatusPill({ label, tone }: { label: string; tone: OperationalTone }) {
  return (
    <View style={[
      styles.tablePill,
      tone === 'success' && styles.tablePillSuccess,
      tone === 'info' && styles.tablePillInfo,
      tone === 'warning' && styles.tablePillWarning,
      tone === 'error' && styles.tablePillError,
    ]}>
      <Text style={[
        styles.tablePillText,
        tone === 'success' && styles.tablePillTextSuccess,
        tone === 'info' && styles.tablePillTextInfo,
        tone === 'warning' && styles.tablePillTextWarning,
        tone === 'error' && styles.tablePillTextError,
      ]}>{label}</Text>
    </View>
  );
}

function MiniSparkline({ values, tone = 'info' }: { values: number[]; tone?: OperationalTone }) {
  const maxValue = Math.max(...values, 1);
  return (
    <View style={styles.sparklineRow}>
      {values.map((value, index) => (
        <View key={`spark-${index}`} style={styles.sparklineTrack}>
          <View
            style={[
              styles.sparklineFill,
              tone === 'success' && styles.sparklineFillSuccess,
              tone === 'info' && styles.sparklineFillInfo,
              tone === 'warning' && styles.sparklineFillWarning,
              tone === 'error' && styles.sparklineFillError,
              { height: `${Math.max((value / maxValue) * 100, value > 0 ? 18 : 8)}%` },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

function CustomerHomeBannerCard({
  imageUrl,
  title,
  subtitle,
  index,
  scrollX,
  itemWidth,
  width,
  onPress,
}: {
  imageUrl: string;
  title: string;
  subtitle: string;
  index: number;
  scrollX: Animated.Value;
  itemWidth: number;
  width: number;
  onPress: () => void;
}) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const inputRange = [(index - 1) * itemWidth, index * itemWidth, (index + 1) * itemWidth];
  const cardScale = scrollX.interpolate({ inputRange, outputRange: [0.96, 1, 0.96], extrapolate: 'clamp' });
  const imageShiftX = scrollX.interpolate({ inputRange, outputRange: [-18, 0, 18], extrapolate: 'clamp' });
  const cardOpacity = scrollX.interpolate({ inputRange, outputRange: [0.82, 1, 0.82], extrapolate: 'clamp' });

  const animatePress = (toValue: number) => {
    Animated.spring(pressScale, {
      toValue,
      useNativeDriver: true,
      friction: 7,
      tension: 150,
    }).start();
  };

  return (
    <Pressable
      style={[styles.customerHomeBannerCard, { width }]}
      onPress={onPress}
      onPressIn={() => animatePress(0.975)}
      onPressOut={() => animatePress(1)}
    >
      <Animated.View style={{ flex: 1, opacity: cardOpacity, transform: [{ scale: Animated.multiply(cardScale, pressScale) }] }}>
        <Animated.Image source={{ uri: imageUrl }} style={[styles.customerHomeBannerImage, { transform: [{ translateX: imageShiftX }] }]} resizeMode="cover" />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.16)', 'rgba(0,0,0,0.82)']} style={styles.customerHomeBannerOverlay}>
          <View style={styles.customerHomeBannerTopRow}>
            <View style={styles.customerHomeBannerSponsorPill}>
              <Text style={styles.customerHomeBannerSponsorText}>Featured</Text>
            </View>
            <Text style={styles.customerHomeBannerCompany}>Abdalla Picks</Text>
          </View>
          <View style={styles.customerHomeBannerBody}>
            <Text style={styles.customerHomeBannerTitle} numberOfLines={2}>{title}</Text>
            <Text style={styles.customerHomeBannerMeta} numberOfLines={2}>{subtitle}</Text>
            <View style={styles.customerHomeBannerFooter}>
              <Text style={styles.customerHomeBannerPrice}>Explore</Text>
              <View style={styles.customerHomeBannerCta}>
                <Text style={styles.customerHomeBannerCtaText}>open</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

function CustomerHomeLotCard({ item, promotion, onPress }: { item: CatalogItem; promotion?: OfferPromotion; onPress: () => void }) {
  const countdown = promotion?.endsAtLabel ? getCountdownInfo(promotion.endsAtLabel).label : item.durationLabel || item.category;
  const pressScale = useRef(new Animated.Value(1)).current;

  const animatePress = (toValue: number) => {
    Animated.spring(pressScale, {
      toValue,
      useNativeDriver: true,
      friction: 7,
      tension: 150,
    }).start();
  };

  return (
    <Pressable style={styles.customerHomeLotCard} onPress={onPress} onPressIn={() => animatePress(0.98)} onPressOut={() => animatePress(1)}>
      <Animated.View style={{ transform: [{ scale: pressScale }] }}>
        <View style={styles.customerHomeLotImageWrap}>
          {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.customerHomeLotImage} resizeMode="cover" /> : null}
        </View>
        <Text style={styles.customerHomeLotTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.customerHomeLotMetaRow}>
          <MaterialCommunityIcons name="clock-outline" size={16} color="#12385E" />
          <Text style={styles.customerHomeLotMetaText}>{countdown}</Text>
        </View>
        <View style={styles.customerHomeLotMetaRow}>
          <MaterialCommunityIcons name="office-building-outline" size={14} color="#8E98A3" />
          <Text style={styles.customerHomeLotMetaText}>{item.companyName}</Text>
        </View>
        <Text style={styles.customerHomeLotPrice}>QAR {item.price.toFixed(0)}</Text>
      </Animated.View>
    </Pressable>
  );
}

function SelectField({
  label,
  value,
  options,
  placeholder,
  error,
  onSelect,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  error?: string;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable style={[styles.selectFieldButton, error && styles.inputError]} onPress={() => setOpen(true)}>
        <Text style={[styles.selectFieldText, !value && styles.selectFieldPlaceholder]}>{value || placeholder || 'Select an option'}</Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      {error ? <FieldError text={error} /> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.selectFieldOverlay}>
          <Pressable style={styles.selectFieldBackdrop} onPress={() => setOpen(false)} />
          <View style={styles.selectFieldSheet}>
            <Text style={styles.selectFieldSheetTitle}>{label}</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.selectFieldSheetList}>
              {options.map((option) => (
                <Pressable
                  key={option}
                  style={styles.selectFieldOption}
                  onPress={() => {
                    onSelect(option);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.selectFieldOptionText}>{option}</Text>
                  {value === option ? <MaterialCommunityIcons name="check" size={20} color="#12385E" /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SortableDataTable<T>({
  columns,
  rows,
  sortState,
  onSortChange,
  keyExtractor,
  renderActions,
  getRowTone,
  maxHeight = 440,
  stickyLeadingColumnCount = 0,
  stickyLeadColumns = false,
  filterStorageKey,
}: {
  columns: Array<{ key: string; label: string; sortable?: boolean; render: (row: T) => React.ReactNode }>;
  rows: T[];
  sortState: { key: string; direction: 'asc' | 'desc' };
  onSortChange: React.Dispatch<React.SetStateAction<{ key: string; direction: 'asc' | 'desc' }>>;
  keyExtractor: (row: T) => string;
  renderActions?: (row: T) => React.ReactNode;
  getRowTone?: (row: T) => OperationalTone | undefined;
  maxHeight?: number;
  stickyLeadingColumnCount?: number;
  stickyLeadColumns?: boolean;
  filterStorageKey?: string;
}) {
  const [toneQuickFilter, setToneQuickFilter] = useState<'all' | 'error' | 'warning' | 'success'>(
    filterStorageKey ? (tableToneFilterMemory[filterStorageKey] ?? 'all') : 'all',
  );

  useEffect(() => {
    let cancelled = false;
    if (!filterStorageKey) {
      return () => {
        cancelled = true;
      };
    }

    AsyncStorage.getItem(`${TABLE_TONE_FILTER_STORAGE_PREFIX}${filterStorageKey}`)
      .then((storedValue) => {
        if (cancelled || !storedValue) {
          return;
        }
        if (storedValue === 'all' || storedValue === 'error' || storedValue === 'warning' || storedValue === 'success') {
          tableToneFilterMemory[filterStorageKey] = storedValue;
          setToneQuickFilter(storedValue);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [filterStorageKey]);

  useEffect(() => {
    if (!filterStorageKey) {
      return;
    }

    setToneQuickFilter(tableToneFilterMemory[filterStorageKey] ?? 'all');
  }, [filterStorageKey]);

  useEffect(() => {
    if (!filterStorageKey) {
      return;
    }

    tableToneFilterMemory[filterStorageKey] = toneQuickFilter;
    AsyncStorage.setItem(`${TABLE_TONE_FILTER_STORAGE_PREFIX}${filterStorageKey}`, toneQuickFilter).catch(() => undefined);
  }, [filterStorageKey, toneQuickFilter]);
  const visibleRows = useMemo(() => {
    if (!getRowTone || toneQuickFilter === 'all') {
      return rows;
    }
    return rows.filter((row) => getRowTone(row) === toneQuickFilter);
  }, [rows, getRowTone, toneQuickFilter]);

  const criticalCount = useMemo(() => getRowTone ? rows.filter((row) => getRowTone(row) === 'error').length : 0, [rows, getRowTone]);
  const watchCount = useMemo(() => getRowTone ? rows.filter((row) => getRowTone(row) === 'warning').length : 0, [rows, getRowTone]);
  const stableCount = useMemo(() => getRowTone ? rows.filter((row) => getRowTone(row) === 'success').length : 0, [rows, getRowTone]);

  return (
    <View style={styles.dataTableWrap}>
      {getRowTone ? (
        <View style={styles.dataTableQuickFilterRow}>
          <ChoiceChip label={`All (${rows.length})`} selected={toneQuickFilter === 'all'} onPress={() => setToneQuickFilter('all')} />
          <ChoiceChip label={`Critical (${criticalCount})`} selected={toneQuickFilter === 'error'} onPress={() => setToneQuickFilter('error')} />
          <ChoiceChip label={`Watch (${watchCount})`} selected={toneQuickFilter === 'warning'} onPress={() => setToneQuickFilter('warning')} />
          <ChoiceChip label={`Stable (${stableCount})`} selected={toneQuickFilter === 'success'} onPress={() => setToneQuickFilter('success')} />
        </View>
      ) : null}
      <ScrollView style={[styles.dataTableScroll, { maxHeight }]} nestedScrollEnabled stickyHeaderIndices={[0]} showsVerticalScrollIndicator={false}>
        <View style={styles.dataTableHeader}>
          {columns.map((column, columnIndex) => (
            <Pressable
              key={column.key}
              style={[
                styles.dataTableHeaderCell,
                column.sortable && styles.dataTableHeaderCellSortable,
                stickyLeadColumns && columnIndex < stickyLeadingColumnCount && styles.dataTableStickyLeadHeaderCell,
              ]}
              onPress={() => {
                if (!column.sortable) return;
                onSortChange((current) => ({
                  key: column.key,
                  direction: current.key === column.key && current.direction === 'asc' ? 'desc' : 'asc',
                }));
              }}
            >
              <Text style={styles.dataTableHeaderText}>{column.label}</Text>
              {column.sortable && sortState.key === column.key ? <Text style={styles.dataTableSortText}>{sortState.direction === 'asc' ? '↑' : '↓'}</Text> : null}
            </Pressable>
          ))}
          {renderActions ? <View style={styles.dataTableActionHeader}><Text style={styles.dataTableHeaderText}>Actions</Text></View> : null}
        </View>
        {visibleRows.map((row, index) => {
          const rowTone = getRowTone?.(row);
          return (
            <View
              key={keyExtractor(row)}
              style={[
                styles.dataTableRow,
                index % 2 === 1 && styles.dataTableRowAlt,
                rowTone === 'warning' && styles.dataTableRowWarning,
                rowTone === 'error' && styles.dataTableRowError,
                rowTone === 'success' && styles.dataTableRowSuccess,
              ]}
            >
              {columns.map((column, columnIndex) => {
                const content = column.render(row);
                return (
                  <View
                    key={`${keyExtractor(row)}-${column.key}`}
                    style={[
                      styles.dataTableCell,
                      stickyLeadColumns && columnIndex < stickyLeadingColumnCount && styles.dataTableStickyLeadCell,
                    ]}
                  >
                    {typeof content === 'string' || typeof content === 'number' ? (
                      <Text style={styles.dataTableCellText}>{content}</Text>
                    ) : (
                      content
                    )}
                  </View>
                );
              })}
              {renderActions ? <View style={styles.dataTableActionCell}>{renderActions(row)}</View> : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function emptyAddress(): Address {
  return {
    id: '',
    label: 'Home',
    area: '',
    street: '',
    building: '',
    unitNumber: '',
    instructions: '',
    contactName: '',
    contactPhone: '',
    isDefault: true,
  };
}

function parseCommaList(value: string) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function normalizePhoneE164(value: string) {
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

function generateEphemeralPassword() {
  const nonce = Math.random().toString(36).slice(2, 10);
  return `Jhz!${Date.now()}${nonce}A1`;
}

function isHexColor(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value.trim());
}

function validateCompanyDraft(draft: {
  name: string;
  description: string;
  category: string;
  supportEmail: string;
  supportPhone: string;
  accentColor: string;
  logoText: string;
  profileImageUrl: string;
  inviteEmail?: string;
  inviteMessage?: string;
}, requireInvitation = false) {
  const errors: ValidationMap = {};
  if (!draft.name.trim()) errors.name = 'Company name is required.';
  if (!draft.description.trim()) errors.description = 'Description is required.';
  if (!draft.category.trim()) errors.category = 'Company category is required.';
  if (draft.category.trim() && !APP_CATEGORY_OPTIONS.includes(draft.category.trim())) errors.category = 'Choose a category from the application list.';
  if (!isEmail(draft.supportEmail)) errors.supportEmail = 'Use a valid support email.';
  if (!draft.supportPhone.trim()) errors.supportPhone = 'Support phone is required.';
  if (!isHexColor(draft.accentColor)) errors.accentColor = 'Use a hex color like #0F7B45.';
  if (!draft.logoText.trim()) errors.logoText = 'Logo text is required.';
  if (!draft.profileImageUrl.trim()) errors.profileImageUrl = 'Company profile image is required.';
  if (requireInvitation && !isEmail(draft.inviteEmail ?? '')) errors.inviteEmail = 'Use a valid invitation email.';
  return errors;
}

function validateCatalogDraft(draft: {
  title: string;
  summary: string;
  description: string;
  category: string;
  price: string;
  durationLabel: string;
  loyaltyPoints: string;
  kind: CatalogItem['kind'];
  imageUrl: string;
}) {
  const errors: ValidationMap = {};
  if (!draft.title.trim()) errors.title = 'Title is required.';
  if (!draft.summary.trim()) errors.summary = 'Summary is required.';
  if (!draft.description.trim()) errors.description = 'Description is required.';
  if (!draft.category.trim()) errors.category = 'Category is required.';
  if (draft.category.trim() && !APP_CATEGORY_OPTIONS.includes(draft.category.trim())) errors.category = 'Choose a category from the application list.';
  if (!['service', 'product'].includes(draft.kind)) errors.kind = 'Select whether this listing is a service or product.';
  if (!draft.durationLabel.trim()) errors.durationLabel = 'Duration is required.';
  if (!draft.imageUrl.trim()) errors.imageUrl = 'Upload an image before submitting for approval.';
  if (!draft.price.trim() || Number.isNaN(Number(draft.price)) || Number(draft.price) < 0) errors.price = 'Price must be a valid positive number.';
  if (!draft.loyaltyPoints.trim() || Number.isNaN(Number(draft.loyaltyPoints)) || Number(draft.loyaltyPoints) < 0) errors.loyaltyPoints = 'Loyalty points must be zero or more.';
  return errors;
}

function validateOfferDraft(draft: {
  catalogItemId: string;
  title: string;
  headline: string;
  sortOrder: string;
}) {
  const errors: ValidationMap = {};
  if (!draft.catalogItemId) errors.catalogItemId = 'Select a published catalog item.';
  if (!draft.title.trim()) errors.title = 'Promotion title is required.';
  if (!draft.headline.trim()) errors.headline = 'Headline is required.';
  if (!draft.sortOrder.trim() || Number.isNaN(Number(draft.sortOrder))) errors.sortOrder = 'Sort order must be a valid number.';
  return errors;
}

function validateLoyaltyDraft(draft: { title: string; description: string; pointsPerBooking: string; rewardText: string; tierRules: string }) {
  const errors: ValidationMap = {};
  if (!draft.title.trim()) errors.title = 'Program title is required.';
  if (!draft.description.trim()) errors.description = 'Description is required.';
  if (!draft.rewardText.trim()) errors.rewardText = 'Reward text is required.';
  if (!draft.tierRules.trim()) errors.tierRules = 'Add at least one tier rule.';
  if (!draft.pointsPerBooking.trim() || Number.isNaN(Number(draft.pointsPerBooking)) || Number(draft.pointsPerBooking) < 0) errors.pointsPerBooking = 'Points per booking must be zero or more.';
  return errors;
}

function validateSignInDraft(draft: { email: string; password: string }) {
  const errors: ValidationMap = {};
  if (!isEmail(draft.email)) errors.email = 'Use a valid email address.';
  if (!draft.password.trim()) errors.password = 'Password is required.';
  return errors;
}

function validateSignUpDraft(draft: { fullName: string; email: string; password: string; phone: string }) {
  const errors: ValidationMap = {};
  if (!draft.fullName.trim()) errors.fullName = 'Full name is required.';
  if (!isEmail(draft.email)) errors.email = 'Use a valid email address.';
  if (!draft.phone.trim()) errors.phone = 'Phone number is required.';
  if (draft.password.trim().length < 8) errors.password = 'Password must be at least 8 characters.';
  return errors;
}

function validateProfileDraft(draft: UserProfile) {
  const errors: ValidationMap = {};
  if (!draft.fullName.trim()) errors.fullName = 'Full name is required.';
  if (!isEmail(draft.email)) errors.email = 'Use a valid email address.';
  if (!draft.phone.trim()) errors.phone = 'Phone number is required.';
  return errors;
}

function validateAddressDraft(draft: Address) {
  const errors: ValidationMap = {};
  if (!draft.label.trim()) errors.label = 'Address label is required.';
  if (!draft.area.trim()) errors.area = 'Area is required.';
  if (!draft.street.trim()) errors.street = 'Street is required.';
  if (!draft.building.trim()) errors.building = 'Building is required.';
  if (!draft.contactPhone.trim()) errors.contactPhone = 'Contact phone is required.';
  return errors;
}

function validateBookingDraft(
  draft: { itemId: string; slotId?: string; scheduleDate: string; scheduleTime: string; addressId: string },
  authUser: { email: string } | null,
  addresses: Address[],
) {
  const errors: ValidationMap = {};
  if (!authUser) errors.auth = 'Sign in to place a booking.';
  if (!draft.itemId) errors.itemId = 'Choose an item first.';
  if (!draft.slotId) errors.slotId = 'Choose an available time slot first.';
  if (!draft.scheduleDate.trim()) errors.scheduleDate = 'Booking date is required.';
  if (!draft.scheduleTime.trim()) errors.scheduleTime = 'Booking time is required.';
  if (!draft.addressId || !addresses.find((entry) => entry.id === draft.addressId)) errors.addressId = 'Save a default address before booking.';
  return errors;
}

function validateRatingDraft(draft: { score: string; review: string }) {
  const numericScore = Number(draft.score);
  if (!draft.score.trim() || Number.isNaN(numericScore) || numericScore < 1 || numericScore > 5) {
    return 'Score must be between 1 and 5.';
  }
  return '';
}

function SegmentControl({ items, selectedKey, onChange }: { items: Array<{ key: string; label: string }>; selectedKey: string; onChange: (value: string) => void }) {
  return (
    <View style={styles.segmentWrap}>
      {items.map((item) => (
        <Pressable key={item.key} style={[styles.segmentItem, item.key === selectedKey && styles.segmentItemActive]} onPress={() => onChange(item.key)}>
          <Text style={[styles.segmentText, item.key === selectedKey && styles.segmentTextActive]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function AdminBottomNav({ selectedKey, onChange }: { selectedKey: 'overview' | 'companies' | 'publishing' | 'inbox' | 'bookings' | 'settings'; onChange: (value: string) => void }) {
  const tabs = [
    { key: 'overview', label: 'Overview', icon: 'view-dashboard-outline', activeIcon: 'view-dashboard' },
    { key: 'companies', label: 'Companies', icon: 'domain', activeIcon: 'domain' },
    { key: 'publishing', label: 'Publishing', icon: 'publish', activeIcon: 'publish' },
    { key: 'inbox', label: 'Inbox', icon: 'inbox-outline', activeIcon: 'inbox' },
    { key: 'bookings', label: 'Bookings', icon: 'clipboard-list-outline', activeIcon: 'clipboard-list' },
    { key: 'settings', label: 'Settings', icon: 'cog-outline', activeIcon: 'cog' },
  ] as const;

  return (
    <View style={styles.adminBottomNavWrap}>
      <View style={styles.adminBottomNav}>
        {tabs.map((tab) => {
          const isActive = selectedKey === tab.key;
          return (
            <Pressable key={tab.key} style={styles.adminBottomNavItem} onPress={() => onChange(tab.key)}>
              <View style={[styles.adminBottomNavIconShell, isActive && styles.adminBottomNavIconShellActive]}>
                <MaterialCommunityIcons name={(isActive ? tab.activeIcon : tab.icon) as any} size={Platform.OS === 'ios' ? 16 : 14} color={isActive ? '#0F7B45' : '#5C7181'} />
              </View>
              <Text style={[styles.adminBottomNavLabel, isActive && styles.adminBottomNavLabelActive]} numberOfLines={1}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function CompanyBottomNav({ selectedKey, onChange }: { selectedKey: 'overview' | 'catalog' | 'offers' | 'schedule' | 'bookings' | 'loyalty' | 'requests'; onChange: (value: string) => void }) {
  const tabs = [
    { key: 'overview', label: 'Home', icon: 'view-dashboard-outline', activeIcon: 'view-dashboard' },
    { key: 'catalog', label: 'Catalog', icon: 'shape-outline', activeIcon: 'shape' },
    { key: 'offers', label: 'Offers', icon: 'sale-outline', activeIcon: 'sale' },
    { key: 'schedule', label: 'Slots', icon: 'calendar-clock', activeIcon: 'calendar-clock' },
    { key: 'bookings', label: 'Jobs', icon: 'clipboard-list-outline', activeIcon: 'clipboard-list' },
    { key: 'loyalty', label: 'Rewards', icon: 'gift-outline', activeIcon: 'gift' },
    { key: 'requests', label: 'Requests', icon: 'inbox-outline', activeIcon: 'inbox' },
  ] as const;

  return (
    <View style={styles.adminBottomNavWrap}>
      <View style={styles.adminBottomNav}>
        {tabs.map((tab) => {
          const isActive = selectedKey === tab.key;
          return (
            <Pressable key={tab.key} style={styles.adminBottomNavItem} onPress={() => onChange(tab.key)}>
              <View style={[styles.adminBottomNavIconShell, isActive && styles.adminBottomNavIconShellActive]}>
                <MaterialCommunityIcons name={(isActive ? tab.activeIcon : tab.icon) as any} size={Platform.OS === 'ios' ? 16 : 14} color={isActive ? '#0F7B45' : '#5C7181'} />
              </View>
              <Text style={[styles.adminBottomNavLabel, isActive && styles.adminBottomNavLabelActive]} numberOfLines={1}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function GlobalLoadingOverlay({ visible, message }: { visible: boolean; message: string }) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.globalLoadingOverlay}>
      <View style={styles.globalLoadingCard}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.globalLoadingText}>{message}</Text>
      </View>
    </View>
  );
}

function SectionCard({ title, subtitle, children, cardStyle, titleStyle, subtitleStyle, bodyStyle }: { title: string; subtitle: string; children: React.ReactNode; cardStyle?: object; titleStyle?: object; subtitleStyle?: object; bodyStyle?: object }) {
  return (
    <View style={[styles.sectionCard, cardStyle]}>
      <Text style={[styles.sectionTitle, titleStyle]}>{title}</Text>
      <Text style={[styles.sectionSubtitle, subtitleStyle]}>{subtitle}</Text>
      <View style={[styles.sectionBody, bodyStyle]}>{children}</View>
    </View>
  );
}

function ShowcaseBadge({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.workspaceShowcaseBadge}>
      <Text style={styles.workspaceShowcaseBadgeValue}>{value}</Text>
      <Text style={styles.workspaceShowcaseBadgeLabel}>{label}</Text>
    </View>
  );
}

function CompactBadge({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.compactBadge}>
      <Text style={styles.compactBadgeValue}>{value}</Text>
      <Text style={styles.compactBadgeLabel}>{label}</Text>
    </View>
  );
}

function CatalogFilterChip({ label, count, selected, onPress }: { label: string; count: number; selected: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.catalogFilterChip, selected && styles.catalogFilterChipActive]} onPress={onPress}>
      <Text style={[styles.catalogFilterChipText, selected && styles.catalogFilterChipTextActive]}>{label}</Text>
      <View style={[styles.catalogFilterChipCount, selected && styles.catalogFilterChipCountActive]}>
        <Text style={[styles.catalogFilterChipCountText, selected && styles.catalogFilterChipCountTextActive]}>{count}</Text>
      </View>
    </Pressable>
  );
}

function WorkspaceActionTile({ eyebrow, title, body, onPress }: { eyebrow: string; title: string; body: string; onPress: () => void }) {
  return (
    <Pressable style={styles.workspaceActionTile} onPress={onPress}>
      <Text style={styles.workspaceActionEyebrow}>{eyebrow}</Text>
      <Text style={styles.workspaceActionTitle}>{title}</Text>
      <Text style={styles.workspaceActionBody}>{body}</Text>
      <View style={styles.workspaceActionFooter}>
        <Text style={styles.workspaceActionFooterText}>Open</Text>
        <MaterialCommunityIcons name="arrow-right" size={18} color="#12385E" />
      </View>
    </Pressable>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  secureTextEntry,
  error,
  theme = 'light',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  secureTextEntry?: boolean;
  error?: string;
  theme?: 'light' | 'dark';
}) {
  const isEmail = label.toLowerCase().includes('email');
  const isPhone = label.toLowerCase().includes('phone');
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, theme === 'dark' && styles.fieldLabelDark]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme === 'dark' ? '#728190' : '#90A0A6'}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        autoCorrect={multiline ? true : false}
        autoCapitalize={isEmail || secureTextEntry ? 'none' : multiline ? 'sentences' : 'words'}
        keyboardType={isEmail ? 'email-address' : isPhone ? 'phone-pad' : 'default'}
        returnKeyType={multiline ? 'default' : 'done'}
        style={[styles.input, theme === 'dark' && styles.inputDark, multiline && styles.inputMultiline, error && styles.inputError]}
      />
      {error ? <FieldError text={error} /> : null}
    </View>
  );
}

function FieldError({ text }: { text: string }) {
  return <Text style={styles.fieldError}>{text}</Text>;
}

function StatusBanner({ tone, text }: { tone: BannerTone; text: string }) {
  return (
    <View
      style={[
        styles.statusBanner,
        tone === 'success' && styles.statusBannerSuccess,
        tone === 'error' && styles.statusBannerError,
        tone === 'info' && styles.statusBannerInfo,
      ]}
    >
      <Text
        style={[
          styles.statusBannerText,
          tone === 'success' && styles.statusBannerTextSuccess,
          tone === 'error' && styles.statusBannerTextError,
          tone === 'info' && styles.statusBannerTextInfo,
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

function OperationPopup({ visible, tone, text, onClose }: { visible: boolean; tone: BannerTone; text: string; onClose: () => void }) {
  const isSuccess = tone === 'success';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.operationPopupBackdrop} onPress={onClose}>
        <Pressable style={styles.operationPopupCard} onPress={() => undefined}>
          <View style={[styles.operationPopupIconWrap, isSuccess ? styles.operationPopupIconSuccess : styles.operationPopupIconError]}>
            <MaterialCommunityIcons name={isSuccess ? "check-circle" : "close-circle"} size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.operationPopupTitle}>{isSuccess ? 'Success' : 'Action failed'}</Text>
          <Text style={styles.operationPopupBody}>{text}</Text>
          <SecondaryButton label="Done" tone="contrast" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ProviderDetailsModal({
  visible,
  provider,
  averageRating,
  ratingCount,
  services,
  slotGroups,
  selectedItemId,
  selectedSlotId,
  onClose,
  onSelectService,
  onSelectSlot,
}: {
  visible: boolean;
  provider: Company | null;
  averageRating: number;
  ratingCount: number;
  services: CatalogItem[];
  slotGroups: Array<{ dateLabel: string; slots: AvailabilitySlot[] }>;
  selectedItemId: string;
  selectedSlotId: string;
  onClose: () => void;
  onSelectService: (item: CatalogItem) => void;
  onSelectSlot: (slot: AvailabilitySlot) => void;
}) {
  if (!provider) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.providerModalBackdrop} onPress={onClose}>
        <Pressable style={styles.providerModalSheet} onPress={() => undefined}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.providerModalContent}>
            <View style={styles.providerModalHero}>
              {provider.profileImageUrl ? <Image source={{ uri: provider.profileImageUrl }} style={styles.providerModalHeroImage} resizeMode="cover" /> : null}
              <LinearGradient colors={['rgba(15,42,26,0.08)', 'rgba(15,42,26,0.82)']} style={styles.providerModalHeroOverlay}>
                <View style={styles.providerModalHeroTopRow}>
                  <View style={styles.providerModalBadge}>
                    <Text style={styles.providerModalBadgeText}>{provider.category}</Text>
                  </View>
                  <Pressable style={styles.providerModalCloseButton} onPress={onClose}>
                    <MaterialCommunityIcons name="close" size={18} color="#FFFFFF" />
                  </Pressable>
                </View>
                <View style={styles.providerModalHeroBody}>
                  <Text style={styles.providerModalTitle}>{provider.name}</Text>
                  <Text style={styles.providerModalSubtitle}>{averageRating ? `${averageRating.toFixed(1)} / 5` : 'No ratings yet'} · {ratingCount} reviews</Text>
                </View>
              </LinearGradient>
            </View>

            <Text style={styles.customerProviderDetailDescription}>{provider.description}</Text>

            <View style={styles.customerProviderSection}>
              <Text style={styles.customerProviderSectionTitle}>1. Select service</Text>
              <View style={styles.customerProviderServiceStack}>
                {services.length ? services.map((item) => (
                  <Pressable
                    key={`provider-service-${item.id}`}
                    style={[styles.customerProviderServiceCard, selectedItemId === item.id && styles.customerProviderServiceCardActive]}
                    onPress={() => onSelectService(item)}
                  >
                    <View style={styles.rowBetween}>
                      <View style={styles.infoBodyGrow}>
                        <Text style={styles.customerProviderServiceTitle}>{item.title}</Text>
                        <Text style={styles.customerProviderServiceMeta}>{item.summary}</Text>
                      </View>
                      <Text style={styles.customerProviderServicePrice}>QAR {item.price.toFixed(0)}</Text>
                    </View>
                  </Pressable>
                )) : <EmptyState title="No services yet" body="This provider has no published services yet." />}
              </View>
            </View>

            <View style={styles.customerProviderSection}>
              <Text style={styles.customerProviderSectionTitle}>2. Choose date and time</Text>
              <View style={styles.providerSlotDateGroupStack}>
                {slotGroups.length ? slotGroups.map((group) => (
                  <View key={`slot-group-${group.dateLabel}`} style={styles.providerSlotDateGroupCard}>
                    <View style={styles.providerSlotDateHeader}>
                      <MaterialCommunityIcons name="calendar-outline" size={18} color="#12385E" />
                      <Text style={styles.providerSlotDateHeaderText}>{group.dateLabel}</Text>
                    </View>
                    <View style={styles.customerProviderSlotWrap}>
                      {group.slots.map((slot) => (
                        <Pressable
                          key={`slot-${slot.id}`}
                          style={[styles.customerProviderSlotChip, selectedSlotId === slot.id && styles.customerProviderSlotChipActive]}
                          onPress={() => onSelectSlot(slot)}
                        >
                          <Text style={[styles.customerProviderSlotChipText, selectedSlotId === slot.id && styles.customerProviderSlotChipTextActive]}>{slot.timeLabel}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )) : <EmptyState title="No available slots" body="This provider has not published available booking times yet." />}
              </View>
            </View>

            <View style={styles.customerProviderSection}>
              <Text style={styles.customerProviderSectionTitle}>3. Payment and confirmation</Text>
              <Text style={styles.customerProviderPaymentHint}>Close this sheet after selecting a service and slot, then finish payment below. Once booked, the selected slot closes automatically.</Text>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ManagementRule({ text }: { text: string }) {
  return (
    <View style={styles.managementRuleRow}>
      <View style={styles.managementRuleDot} />
      <Text style={styles.managementRuleText}>{text}</Text>
    </View>
  );
}

function PrimaryButton({ label, onPress, loading = false, disabled = false }: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean }) {
  return (
    <Pressable style={[styles.primaryButton, (loading || disabled) && styles.buttonDisabled]} onPress={onPress} disabled={loading || disabled}>
      {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{label}</Text>}
    </Pressable>
  );
}

function SecondaryButton({ label, onPress, loading = false, disabled = false, tone = 'default' }: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean; tone?: 'default' | 'danger' | 'contrast' }) {
  return (
    <Pressable
      style={[
        styles.secondaryButton,
        tone === 'danger' && styles.secondaryButtonDanger,
        tone === 'contrast' && styles.secondaryButtonContrast,
        (loading || disabled) && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={loading || disabled}
    >
      {loading ? (
        <ActivityIndicator color={tone === 'contrast' ? '#FFFFFF' : tone === 'danger' ? '#FFFFFF' : colors.primary} />
      ) : (
        <Text
          style={[
            styles.secondaryButtonText,
            tone === 'danger' && styles.secondaryButtonTextDanger,
            tone === 'contrast' && styles.secondaryButtonTextContrast,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

function InlineActionButton({ label, onPress, tone = 'default' }: { label: string; onPress: () => void; tone?: 'default' | 'danger' | 'neutral' }) {
  return (
    <Pressable style={[styles.inlineAction, tone === 'danger' && styles.inlineActionDanger, tone === 'neutral' && styles.inlineActionNeutral]} onPress={onPress}>
      <Text style={[styles.inlineActionText, tone === 'danger' && styles.inlineActionTextDanger, tone === 'neutral' && styles.inlineActionTextNeutral]}>{label}</Text>
    </Pressable>
  );
}

function ChoiceChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.choiceChip, selected && styles.choiceChipActive]} onPress={onPress}>
      <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function EmptyState({ title, body, cardStyle, titleStyle, bodyStyle }: { title: string; body: string; cardStyle?: object; titleStyle?: object; bodyStyle?: object }) {
  return (
    <View style={[styles.emptyState, cardStyle]}>
      <Text style={[styles.emptyTitle, titleStyle]}>{title}</Text>
      <Text style={[styles.emptyBody, bodyStyle]}>{body}</Text>
    </View>
  );
}

function CustomerMetricCard({ label, value, darkMode }: { label: string; value: string; darkMode: boolean }) {
  return (
    <View style={[styles.metricCard, darkMode && styles.customerMetaCardDark]}>
      <Text style={[styles.metricValue, darkMode && styles.customerTitleDark]}>{value}</Text>
      <Text style={[styles.metricLabel, darkMode && styles.customerSubtitleDark]}>{label}</Text>
    </View>
  );
}

function CustomerCompanyCard({ company, onPress, variant = 'featured' }: { company: Company; onPress: () => void; variant?: 'featured' | 'compact' }) {
  const companyMonogram = company.name.trim().charAt(0).toUpperCase() || 'A';
  const isCompact = variant === 'compact';
  const responseMinutes = 10 + ((company.id.length + company.name.length) % 21);
  const pressScale = useRef(new Animated.Value(1)).current;

  const animatePress = (toValue: number) => {
    Animated.spring(pressScale, {
      toValue,
      useNativeDriver: true,
      friction: 7,
      tension: 150,
    }).start();
  };

  return (
    <Pressable
      style={[
        styles.companyDiscoveryCard,
        isCompact && styles.companyDiscoveryCardCompact,
        company.isActive && styles.companyDiscoveryCardActive,
      ]}
      onPress={onPress}
      onPressIn={() => animatePress(0.985)}
      onPressOut={() => animatePress(1)}
    >
      <Animated.View style={{ transform: [{ scale: pressScale }] }}>
        <View style={[styles.companyDiscoveryCover, isCompact && styles.companyDiscoveryCoverCompact]}>
          {company.profileImageUrl ? <Image source={{ uri: company.profileImageUrl }} style={styles.companyDiscoveryCoverImage} resizeMode="cover" /> : null}
          {!company.profileImageUrl ? (
            <View style={[styles.companyDiscoveryFallbackBadge, isCompact && styles.companyDiscoveryFallbackBadgeCompact]}>
              <Text style={[styles.companyDiscoveryFallbackBadgeText, isCompact && styles.companyDiscoveryFallbackBadgeTextCompact]}>{companyMonogram}</Text>
            </View>
          ) : null}
          <LinearGradient colors={['rgba(7, 29, 17, 0.03)', 'rgba(7, 29, 17, 0.88)']} style={[styles.companyDiscoveryCoverOverlay, isCompact && styles.companyDiscoveryCoverOverlayCompact]}>
            <View style={styles.companyDiscoveryCoverTopRow}>
              <View style={[styles.companyDiscoveryCategoryPill, isCompact && styles.companyDiscoveryCategoryPillCompact]}>
                <Text style={[styles.companyDiscoveryCategoryPillText, isCompact && styles.companyDiscoveryCategoryPillTextCompact]}>{company.category || 'Company'}</Text>
              </View>
              <View style={[styles.companyDiscoveryStatePill, company.isActive ? styles.companyDiscoveryStatePillActive : styles.companyDiscoveryStatePillPaused]}>
                <Text style={styles.companyDiscoveryStatePillText}>{company.isActive ? 'Active' : 'Paused'}</Text>
              </View>
            </View>
            <Text style={[styles.companyDiscoverySupportText, isCompact && styles.companyDiscoverySupportTextCompact]} numberOfLines={1}>{company.supportPhone || company.supportEmail}</Text>
          </LinearGradient>
        </View>

        <View style={[styles.companyDiscoveryBody, isCompact && styles.companyDiscoveryBodyCompact]}>
          <Text style={[styles.companyDiscoveryTitle, isCompact && styles.companyDiscoveryTitleCompact]} numberOfLines={1}>{company.name}</Text>
          <Text style={[styles.companyDiscoveryDescription, isCompact && styles.companyDiscoveryDescriptionCompact]} numberOfLines={2}>{company.description}</Text>
          <View style={styles.companyDiscoveryMetaRow}>
            <View style={styles.companyDiscoveryMetaChip}>
              <MaterialCommunityIcons name="map-marker-outline" size={12} color="#2D5D3F" />
              <Text style={styles.companyDiscoveryMetaChipText}>Qatar</Text>
            </View>
            <View style={styles.companyDiscoveryMetaChip}>
              <MaterialCommunityIcons name="clock-outline" size={12} color="#2D5D3F" />
              <Text style={styles.companyDiscoveryMetaChipText}>~{responseMinutes} min</Text>
            </View>
          </View>
        </View>

        <View style={[styles.companyDiscoveryFooterRow, isCompact && styles.companyDiscoveryFooterRowCompact]}>
          <View style={styles.companyDiscoveryCategoryMetaPill}>
            <Text style={styles.companyDiscoveryCategoryMetaText}>{company.category}</Text>
          </View>
          <View style={styles.companyDiscoveryCtaPill}>
            <Text style={styles.companyDiscoveryCtaText}>Open</Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function CustomerOfferCard({ item, darkMode, ctaLabel, onPress }: { item: CatalogItem; darkMode: boolean; ctaLabel: string; onPress: () => void }) {
  return (
    <Pressable style={[styles.marketplaceCard, darkMode && styles.marketplaceCardDark]} onPress={onPress}>
      <View style={[styles.marketplaceVisual, darkMode && styles.marketplaceVisualDark]}>
        {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.marketplaceVisualImage} resizeMode="cover" /> : null}
        <View style={styles.marketplaceVisualOverlay} />
        <View style={styles.marketplaceVisualTopRow}>
          <Text style={styles.marketplaceEyebrow}>{item.companyName}</Text>
          <View style={[styles.marketplaceKindBadge, darkMode && styles.marketplaceKindBadgeDark]}>
            <Text style={[styles.marketplaceKindText, darkMode && styles.marketplaceKindTextDark]}>{item.kind === 'service' ? 'Service' : 'Product'}</Text>
          </View>
        </View>
        <Text style={[styles.marketplaceHint, darkMode && styles.marketplaceHintDark]}>{item.imageHint || item.category || 'Premium home service'}</Text>
      </View>
      <View style={styles.marketplaceBody}>
        <Text style={[styles.marketplaceTitle, darkMode && styles.marketplaceTitleDark]}>{item.title}</Text>
        <Text style={[styles.marketplaceSummary, darkMode && styles.customerSubtitleDark]} numberOfLines={3}>{item.summary}</Text>
      </View>
      <View style={styles.marketplaceFooterRow}>
        <View>
          <Text style={[styles.priceText, darkMode && styles.marketplaceTitleDark]}>QAR {item.price.toFixed(0)}</Text>
          <Text style={[styles.metaText, darkMode && styles.customerSubtitleDark]}>{item.durationLabel || item.category}</Text>
        </View>
        <View style={[styles.marketplaceCtaPill, darkMode && styles.marketplaceCtaPillDark]}>
          <Text style={styles.marketplaceCtaText}>{ctaLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function BottomNavBar({ items, selectedKey, onChange, containerStyle, itemStyle, textStyle, darkMode }: { items: Array<{ key: string; label: string; icon: string; activeIcon?: string }>; selectedKey: string; onChange: (value: string) => void; containerStyle?: object; itemStyle?: object; textStyle?: object; darkMode: boolean }) {
  return (
    <View style={[styles.bottomNav, containerStyle, styles.bottomNavPremium]}>
      {items.map((item) => {
        const isActive = item.key === selectedKey;
        const isCenter = item.key === 'home';
        return (
          <Pressable
            key={item.key}
            style={[styles.bottomNavItem, itemStyle, isCenter && styles.bottomNavItemCenter, isActive && styles.bottomNavItemActive]}
            onPress={() => onChange(item.key)}
          >
            {isCenter ? (
              <LinearGradient
                colors={darkMode ? ['#1AA65F', '#0F7B45'] : ['#1ECB72', '#0F7B45']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.bottomNavHomeOrb, darkMode && styles.bottomNavHomeOrbDark]}
              >
                <View style={styles.bottomNavHomeOrbInner}>
                  <MaterialCommunityIcons
                    name={(isActive ? (item.activeIcon || item.icon) : item.icon) as any}
                    size={Platform.OS === 'ios' ? 24 : 28}
                    color="#FFFFFF"
                  />
                </View>
              </LinearGradient>
            ) : (
              <View style={[styles.bottomNavIconShell, darkMode && styles.bottomNavIconShellDark, isActive && styles.bottomNavIconShellActive]}>
                <MaterialCommunityIcons
                  name={(isActive ? (item.activeIcon || item.icon) : item.icon) as any}
                  size={Platform.OS === 'ios' ? 18 : 20}
                  color={isActive ? colors.primary : darkMode ? '#91A5B3' : '#5C7181'}
                />
              </View>
            )}
            <Text style={[styles.bottomNavText, textStyle, darkMode && styles.bottomNavTextDark, isActive && styles.bottomNavTextActive, isCenter && styles.bottomNavTextCenter]} numberOfLines={1}>
              {item.label}
            </Text>
            {isActive && !isCenter ? <View style={styles.bottomNavIconDot} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function PremiumHeader({
  logoText,
  darkMode,
  locationText,
  notificationCount,
  onSearchPress,
  onNotificationPress,
  onProfilePress,
}: {
  logoText: string;
  darkMode: boolean;
  locationText: string;
  notificationCount: number;
  onSearchPress: () => void;
  onNotificationPress: () => void;
  onProfilePress: () => void;
}) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchText, setSearchText] = useState('');
  const bg = darkMode ? '#0F1B27' : '#FFFFFF';
  const borderColor = darkMode ? '#1E2F40' : '#EAF0F5';
  const iconColor = darkMode ? '#D0E0EC' : '#12385E';
  return (
    <View style={[phStyles.container, { backgroundColor: bg, borderColor }]}>
      <View style={phStyles.locationBlock}>
        <Text style={[phStyles.locationLabel, darkMode && phStyles.locationLabelDark]}>Location to</Text>
        <View style={phStyles.locationValueRow}>
          <Text style={[phStyles.locationValue, darkMode && phStyles.locationValueDark]} numberOfLines={1}>{locationText}</Text>
          <MaterialCommunityIcons name="chevron-down" size={18} color={darkMode ? '#9DB8CC' : '#7A8FA3'} />
        </View>
      </View>
      <Pressable style={[phStyles.addButton, darkMode && phStyles.addButtonDark]} onPress={onProfilePress}>
        <MaterialCommunityIcons name="wallet-outline" size={20} color={colors.primary} />
        <Text style={phStyles.addButtonText}>Add</Text>
      </Pressable>
      <Pressable style={[phStyles.quickActionButton, darkMode && phStyles.iconBtnDark]} onPress={onNotificationPress}>
        <MaterialCommunityIcons name="bell-outline" size={20} color={iconColor} />
        {notificationCount > 0 ? (
          <View style={phStyles.badge}>
            <Text style={phStyles.badgeText}>{notificationCount > 9 ? '9+' : notificationCount}</Text>
          </View>
        ) : null}
      </Pressable>
      <Pressable style={[phStyles.quickActionButton, phStyles.profileBtn]} onPress={onSearchPress}>
        <MaterialCommunityIcons name="magnify" size={20} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const phStyles = StyleSheet.create({
  container: {
    width: PAGE_OUTER_WIDTH,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'ios' ? 14 : 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 9,
    gap: 8,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  locationBlock: {
    flex: 1,
    gap: 2,
  },
  locationLabel: {
    fontSize: 13,
    color: '#9AA8B8',
    fontWeight: '600',
  },
  locationLabelDark: {
    color: '#7890A6',
  },
  locationValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationValue: {
    flex: 1,
    fontSize: Platform.OS === 'ios' ? 18 : 16,
    color: '#10263C',
    fontWeight: '800',
  },
  locationValueDark: {
    color: '#E1EDF7',
  },
  addButton: {
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE8E2',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addButtonDark: {
    backgroundColor: '#16283A',
    borderColor: '#2A3E53',
  },
  addButtonText: {
    color: '#142437',
    fontSize: 15,
    fontWeight: '700',
  },
  quickActionButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F3F7FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'ios' ? 8 : 6,
  },
  logoImage: {
    width: Platform.OS === 'ios' ? 36 : 34,
    height: Platform.OS === 'ios' ? 36 : 34,
    borderRadius: 10,
  },
  logoTextStack: {
    gap: 1,
  },
  logoTextAr: {
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    fontWeight: '900',
    lineHeight: Platform.OS === 'ios' ? 20 : 18,
  },
  logoTextEn: {
    fontSize: Platform.OS === 'ios' ? 10 : 9,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  logoMark: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'ios' ? 10 : 8,
    backgroundColor: '#F3F7FB',
    borderRadius: Platform.OS === 'ios' ? 14 : 12,
    paddingHorizontal: Platform.OS === 'ios' ? 14 : 12,
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  searchBarFocused: {
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
  },
  searchBarDark: {
    backgroundColor: '#1A2839',
  },
  searchPlaceholder: {
    fontSize: Platform.OS === 'ios' ? 15 : 14,
    color: '#8EA3B8',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: Platform.OS === 'ios' ? 10 : 8,
    alignItems: 'center',
  },
  iconBtn: {
    width: Platform.OS === 'ios' ? 40 : 38,
    height: Platform.OS === 'ios' ? 40 : 38,
    borderRadius: Platform.OS === 'ios' ? 14 : 12,
    backgroundColor: '#F3F7FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnDark: {
    backgroundColor: '#1A2839',
  },
  profileBtn: {
    backgroundColor: colors.primary,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F25F4C',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'ios' ? 10 : 9,
    fontWeight: '800',
  },
});

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function CompanyCard({ company, actionLabel, onAction, secondaryActionLabel, onSecondaryAction }: { company: Company; actionLabel?: string; onAction?: () => void; secondaryActionLabel?: string; onSecondaryAction?: () => void }) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoBodyGrow}>
        <Text style={styles.infoTitle}>{company.name}</Text>
        <Text style={styles.infoSubtitle}>{company.category} · {company.supportEmail} · {company.createdAtLabel} · {company.isActive ? 'Active' : 'Paused'}</Text>
      </View>
      <View style={styles.inlineActionGroup}>
        {actionLabel && onAction ? (
          <InlineActionButton label={actionLabel} onPress={onAction} />
        ) : null}
        {secondaryActionLabel && onSecondaryAction ? (
          <InlineActionButton label={secondaryActionLabel} onPress={onSecondaryAction} tone={secondaryActionLabel === 'Pause' ? 'neutral' : 'default'} />
        ) : null}
      </View>
    </View>
  );
}

function CatalogCard({ item, actionLabel, onAction, secondaryActionLabel, onSecondaryAction }: { item: CatalogItem; actionLabel?: string; onAction?: () => void; secondaryActionLabel?: string; onSecondaryAction?: () => void }) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoBodyGrow}>
        <Text style={styles.infoTitle}>{item.title}</Text>
        <Text style={styles.infoSubtitle}>{item.companyName} · {item.category} · QAR {item.price.toFixed(0)} · {getCatalogApprovalLabel(item)}</Text>
        <Text style={styles.helperText}>{item.summary}</Text>
        <Text style={styles.helperText}>{item.description}</Text>
        <Text style={styles.helperText}>Type: {item.kind === 'service' ? 'Service' : 'Product'} · Duration: {item.durationLabel || 'N/A'} · Points: {item.loyaltyPoints}</Text>
        <Text style={styles.helperText}>Tags: {item.tags.length ? item.tags.join(', ') : 'None'}</Text>
        <Text style={styles.helperText}>Visibility: {item.isPublished ? 'Submitted for publishing' : 'Draft'} · Featured: {item.featured ? 'Yes' : 'No'}</Text>
        {item.imageHint ? <Text style={styles.helperText}>Image hint: {item.imageHint}</Text> : null}
        {item.approvedByEmail ? <Text style={styles.helperText}>Reviewed by: {item.approvedByEmail}</Text> : null}
      </View>
      <View style={styles.inlineActionGroup}>
        {actionLabel && onAction ? (
          <InlineActionButton label={actionLabel} onPress={onAction} />
        ) : null}
        {secondaryActionLabel && onSecondaryAction ? (
          <InlineActionButton label={secondaryActionLabel} onPress={onSecondaryAction} tone="danger" />
        ) : null}
      </View>
    </View>
  );
}

function CompanyCatalogCard({ item, index, onAction, onSecondaryAction }: { item: CatalogItem; index: number; onAction?: () => void; onSecondaryAction?: () => void }) {
  const stateLabel = getCatalogApprovalLabel(item);
  const stateHint = item.approvalStatus === 'approved'
    ? 'Customers can discover and book this listing right now.'
    : item.approvalStatus === 'pending'
      ? 'Waiting for admin approval before customer visibility.'
      : item.approvalStatus === 'rejected'
        ? 'Update details and submit again for another review.'
        : 'Complete the details and submit when the listing is ready.';
  const gradientColors: [string, string, string] = item.approvalStatus === 'approved'
    ? ['#D9EEFF', '#EEF8FF', '#FFFFFF']
    : item.approvalStatus === 'pending'
      ? ['#FFF4DD', '#FFF8ED', '#FFFFFF']
      : item.approvalStatus === 'rejected'
        ? ['#FFE2DD', '#FFF1ED', '#FFFFFF']
        : ['#E9EFEA', '#F6FAF7', '#FFFFFF'];
  const entrance = useRef(new Animated.Value(0)).current;
  const monogram = (item.companyName || item.title || 'J').trim().charAt(0).toUpperCase();
  const illustrationIcon = item.kind === 'service' ? 'sparkles-outline' : 'cube-outline';

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 420,
      delay: index * 70,
      useNativeDriver: true,
    }).start();
  }, [entrance, index]);

  const animatedStyle = {
    opacity: entrance,
    transform: [
      {
        translateY: entrance.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0],
        }),
      },
      {
        scale: entrance.interpolate({
          inputRange: [0, 1],
          outputRange: [0.98, 1],
        }),
      },
    ],
  };

  return (
    <Animated.View style={[styles.companyCatalogCard, animatedStyle]}>
      <Pressable style={({ pressed }) => [styles.companyCatalogCardPressable, pressed && styles.companyCatalogCardPressablePressed]} onPress={onAction} disabled={!onAction}>
        <LinearGradient colors={gradientColors} style={styles.companyCatalogCardVisual}>
          <View style={[styles.companyCatalogCardAura, item.isPublished ? styles.companyCatalogCardAuraPublished : styles.companyCatalogCardAuraDraft]} />
          <View style={[styles.companyCatalogCardAccentLine, item.isPublished ? styles.companyCatalogCardAccentLinePublished : styles.companyCatalogCardAccentLineDraft]} />
          <View style={styles.companyCatalogCardTopRow}>
            <View style={[styles.companyCatalogCardStatePill, item.isPublished ? styles.companyCatalogCardStatePillPublished : styles.companyCatalogCardStatePillDraft]}>
              <Text style={styles.companyCatalogCardStateText}>{item.isPublished ? 'Published' : 'Draft'}</Text>
            </View>
            <View style={[styles.companyCatalogCardKindPill, item.kind === 'product' && styles.companyCatalogCardKindPillProduct]}>
              <Text style={styles.companyCatalogCardKindText}>{item.kind === 'service' ? 'Service' : 'Product'}</Text>
            </View>
          </View>
          <View style={styles.companyCatalogVisualHero}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.companyCatalogPhotoThumb} resizeMode="cover" />
            ) : (
              <View style={[styles.companyCatalogIllustrationBadge, item.isPublished ? styles.companyCatalogIllustrationBadgePublished : styles.companyCatalogIllustrationBadgeDraft]}>
                <Text style={styles.companyCatalogIllustrationBadgeText}>{monogram}</Text>
              </View>
            )}
            <View style={styles.companyCatalogIllustrationPanel}>
              <View style={[styles.companyCatalogIllustrationOrb, item.isPublished ? styles.companyCatalogIllustrationOrbPublished : styles.companyCatalogIllustrationOrbDraft]}>
                <MaterialCommunityIcons name={illustrationIcon as any} size={28} color={item.isPublished ? colors.primary : '#B56A17'} />
              </View>
              <View style={styles.companyCatalogIllustrationTextWrap}>
                <Text style={styles.companyCatalogIllustrationTitle}>{item.companyName || 'Abdalla partner'}</Text>
                <Text style={styles.companyCatalogIllustrationSubtitle}>{item.imageHint || 'Branded catalog presentation'}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.companyCatalogCardCategory}>{item.category || 'Marketplace listing'}</Text>
          <Text style={styles.companyCatalogCardHint}>{item.imageHint || item.durationLabel || 'Optimized for premium discovery'}</Text>
          <Text style={styles.companyCatalogCardStateHeadline}>{stateLabel}</Text>
          <Text style={styles.companyCatalogCardStateBody}>{stateHint}</Text>
        </LinearGradient>

        <View style={styles.companyCatalogCardBody}>
          <View style={styles.companyCatalogCardTitleRow}>
            <Text style={styles.companyCatalogCardTitle}>{item.title}</Text>
            {onAction ? (
              <View style={styles.companyCatalogCardTapPill}>
                <Text style={styles.companyCatalogCardTapPillText}>Tap to edit</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.companyCatalogCardSummary} numberOfLines={3}>{item.summary}</Text>

          <View style={styles.companyCatalogMetaRow}>
            <CompactBadge label="Price" value={`QAR ${item.price.toFixed(0)}`} />
            <CompactBadge label="Duration" value={item.durationLabel || 'Custom'} />
            <CompactBadge label="Points" value={String(item.loyaltyPoints)} />
          </View>

          <View style={styles.companyCatalogSignalRow}>
            <View style={styles.companyCatalogSignalCard}>
              <Text style={styles.companyCatalogSignalLabel}>Visibility</Text>
              <Text style={styles.companyCatalogSignalValue}>{item.isPublished ? 'Customer-facing' : 'Internal only'}</Text>
            </View>
            <View style={styles.companyCatalogSignalCard}>
              <Text style={styles.companyCatalogSignalLabel}>Experience</Text>
              <Text style={styles.companyCatalogSignalValue}>{item.kind === 'service' ? 'Scheduled service' : 'Shoppable product'}</Text>
            </View>
          </View>
        </View>
      </Pressable>

      <View style={styles.companyCatalogActionRow}>
        {onAction ? <SecondaryButton label="Edit item" tone="contrast" onPress={onAction} /> : null}
        {onSecondaryAction ? <SecondaryButton label="Delete" tone="danger" onPress={onSecondaryAction} /> : null}
      </View>
    </Animated.View>
  );
}

function BookingCard({ booking, darkMode = false }: { booking: Booking; darkMode?: boolean }) {
  return (
    <View style={[styles.bookingCard, darkMode && styles.customerBookingCardDark]}>
      <View style={styles.rowBetween}>
        <View style={styles.infoBodyGrow}>
          <Text style={[styles.infoTitle, darkMode && styles.customerTitleDark]}>{booking.itemTitle}</Text>
          <Text style={[styles.infoSubtitle, darkMode && styles.customerSubtitleDark]}>{booking.companyName} · {booking.bookingNumber}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{readableBookingStatus(booking.status)}</Text>
        </View>
      </View>
      <Text style={[styles.helperText, darkMode && styles.customerSubtitleDark]}>{booking.scheduleDate} · {booking.scheduleTime}</Text>
      <Text style={[styles.helperText, darkMode && styles.customerSubtitleDark]}>{booking.addressLine}</Text>
      <Text style={[styles.helperText, darkMode && styles.customerSubtitleDark]}>QAR {booking.total.toFixed(0)} · {booking.paymentMethod}</Text>
    </View>
  );
}

function InfoRow({ title, subtitle, actionLabel, onAction, secondaryActionLabel, onSecondaryAction }: { title: string; subtitle: string; actionLabel?: string; onAction?: () => void; secondaryActionLabel?: string; onSecondaryAction?: () => void }) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoBodyGrow}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.inlineActionGroup}>
        {actionLabel && onAction ? (
          <InlineActionButton label={actionLabel} onPress={onAction} />
        ) : null}
        {secondaryActionLabel && onSecondaryAction ? (
          <InlineActionButton
            label={secondaryActionLabel}
            onPress={onSecondaryAction}
            tone={/revoke|delete|remove/i.test(secondaryActionLabel) ? 'danger' : secondaryActionLabel === 'Pause' ? 'neutral' : 'default'}
          />
        ) : null}
      </View>
    </View>
  );
}

function NotificationRow({ notification, onOpen, darkMode = false }: { notification: AppNotification; onOpen: () => void; darkMode?: boolean }) {
  return (
    <Pressable style={[styles.notificationRow, darkMode && styles.notificationRowDark]} onPress={onOpen}>
      <View style={styles.notificationBodyWrap}>
        <View style={styles.notificationTitleRow}>
          {!notification.isRead ? <View style={styles.notificationUnreadDot} /> : null}
          <Text style={[styles.infoTitle, darkMode && styles.customerTitleDark]}>{notification.title}</Text>
        </View>
        <Text style={[styles.helperText, darkMode && styles.customerSubtitleDark]}>{notification.body}</Text>
        <Text style={[styles.notificationMeta, darkMode && styles.customerSubtitleDark]}>{`${notification.createdAtLabel} · ${notification.kind}`}</Text>
      </View>
      <View style={[styles.marketplaceCtaPill, darkMode && styles.marketplaceCtaPillDark]}>
        <Text style={styles.marketplaceCtaText}>{notification.isRead ? 'Open' : 'Read'}</Text>
      </View>
    </Pressable>
  );
}

function RoleBadge({ role }: { role: AppRole }) {
  return (
    <View style={styles.roleBadge}>
      <Text style={styles.roleBadgeText}>{role.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flexFill: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  globalLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(9, 17, 26, 0.28)',
  },
  globalLoadingCard: {
    minWidth: 200,
    maxWidth: '88%',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D7E9DB',
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 10,
    alignItems: 'center',
    shadowColor: '#103A23',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  globalLoadingText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  scrollFlex: {
    flex: 1,
  },
  screenContent: {
    width: PAGE_CONTENT_WIDTH,
    alignSelf: Platform.OS === 'ios' ? 'stretch' : 'center',
    paddingHorizontal: Platform.OS === 'ios' ? 4 : 10,
    paddingTop: Platform.OS === 'ios' ? 20 : 18,
    gap: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 28,
  },
  customerShellSafeAreaDark: {
    backgroundColor: '#0E151D',
  },
  customerShell: {
    flex: 1,
    backgroundColor: colors.background,
  },
  customerShellDark: {
    backgroundColor: '#0E151D',
  },
  customerHeaderPlain: {
    marginHorizontal: Platform.OS === 'ios' ? 4 : 18,
    marginTop: 12,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  customerHeaderPlainHome: {
    marginBottom: 10,
  },
  customerHeaderCenteredBrand: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  customerHeaderBrandLogo: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  customerHeaderCenteredTitle: {
    color: colors.text,
    fontSize: Platform.OS === 'ios' ? 21 : 20,
    fontWeight: '800',
    letterSpacing: Platform.OS === 'ios' ? 0.35 : 0.2,
  },
  customerHeaderCenteredTitleDark: {
    color: '#F7F8FA',
  },
  customerHeaderCard: {
    marginHorizontal: Platform.OS === 'ios' ? 4 : 18,
    marginTop: 12,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: '#FFF8EF',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  customerHeaderCardDark: {
    borderColor: '#273341',
  },
  customerHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  customerLogoWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customerLogoImage: {
    width: 46,
    height: 46,
    borderRadius: 14,
  },
  customerHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customerHeaderIconButton: {
    width: Platform.OS === 'ios' ? 44 : 42,
    height: Platform.OS === 'ios' ? 44 : 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFFBF',
    borderWidth: 1,
    borderColor: '#EADCC4',
    position: 'relative',
  },
  customerHeaderIconButtonDark: {
    backgroundColor: '#203142',
    borderColor: '#324456',
  },
  customerHeaderIconBadge: {
    position: 'absolute',
    top: -4,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  customerHeaderIconBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  customerHeaderStatusDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  customerBrandLockup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  customerBrandMonogram: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  customerBrandMonogramDark: {
    backgroundColor: '#1D74C9',
  },
  customerBrandMonogramText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  customerHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  customerHeaderBrand: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  customerHeaderBrandDark: {
    color: '#8FC3FF',
  },
  customerHeaderMiniTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: colors.text,
  },
  customerHeaderTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: colors.text,
  },
  customerHeaderSubtitle: {
    color: colors.muted,
    lineHeight: 21,
  },
  customerHeaderBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#E6EFF8',
  },
  customerHeaderBadgeDark: {
    backgroundColor: '#1D2A37',
  },
  customerHeaderBadgeText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 12,
  },
  customerHeaderBadgeTextDark: {
    color: '#F5F7FA',
  },
  customerHeaderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  customerHeaderSearchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#FFFFFFC0',
    borderWidth: 1,
    borderColor: '#E9DCC3',
  },
  customerHeaderSearchPillDark: {
    backgroundColor: '#203142',
    borderColor: '#324456',
  },
  customerHeaderMetaText: {
    flex: 1,
    color: colors.muted,
    fontWeight: '600',
  },
  customerHeaderChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  customerHeaderChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFF9F0',
    borderWidth: 1,
    borderColor: '#F0DEC0',
  },
  customerHeaderChipDark: {
    backgroundColor: '#203142',
    borderColor: '#324456',
  },
  customerHeaderChipText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  customerHeaderChipTextDark: {
    color: '#DCE3E9',
  },
  customerHeaderStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  customerHeaderStatCard: {
    flex: 1,
    minHeight: 74,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: '#FFFFFFA8',
    borderWidth: 1,
    borderColor: '#E9DCC3',
    gap: 4,
  },
  customerHeaderStatCardDark: {
    backgroundColor: '#203142',
    borderColor: '#324456',
  },
  customerHeaderStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  customerHeaderStatLabel: {
    color: colors.muted,
    fontWeight: '600',
  },
  customerHeaderMessage: {
    color: colors.primary,
    fontWeight: '700',
  },
  customerHeaderMessageDark: {
    color: '#8FC3FF',
  },
  customerScroll: {
    flex: 1,
  },
  customerScrollContent: {
    paddingHorizontal: Platform.OS === 'ios' ? 4 : 18,
    paddingBottom: 140,
    gap: 16,
  },
  customerWorkspaceHost: {
    flex: 1,
    minHeight: 0,
    width: PAGE_OUTER_WIDTH,
    alignSelf: Platform.OS === 'ios' ? 'stretch' : 'center',
    paddingHorizontal: Platform.OS === 'ios' ? 2 : 8,
  },
  customerWorkspace: {
    flex: 1,
    gap: 16,
  },
  customerTabScroll: {
    flex: 1,
  },
  customerTabScrollContent: {
    paddingHorizontal: Platform.OS === 'ios' ? 4 : 6,
    paddingBottom: Platform.OS === 'ios' ? 108 : 140,
    gap: 16,
  },
  customerCategoryDrawerOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  customerCategoryDrawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(18, 25, 33, 0.28)',
  },
  customerCategoryDrawer: {
    width: '84%',
    maxWidth: 340,
    paddingHorizontal: 18,
    paddingVertical: 22,
    backgroundColor: '#FFF8EF',
    borderLeftWidth: 1,
    borderLeftColor: '#E6D8BF',
    gap: 14,
    shadowColor: '#17252F',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: -4, height: 0 },
    elevation: 12,
  },
  customerCategoryDrawerTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  customerCategorySearchWrap: {
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1D7C6',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customerCategorySearchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 0,
  },
  customerCategoryDrawerList: {
    gap: 10,
    paddingBottom: 12,
  },
  customerCategoryDrawerRow: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6DDCF',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  customerCategoryDrawerRowText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  customerHomeScreen: {
    gap: 22,
  },
  customerHomeHeroCard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D6E2DC',
    minHeight: Platform.OS === 'ios' ? 246 : 208,
    backgroundColor: '#E9EEF1',
  },
  customerHomeHeroImageFull: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  customerHomeHeroCardGradient: {
    minHeight: Platform.OS === 'ios' ? 246 : 208,
    justifyContent: 'center',
  },
  customerHomeHeroTextBlock: {
    marginLeft: 0,
    paddingHorizontal: Platform.OS === 'ios' ? 20 : 14,
    paddingVertical: Platform.OS === 'ios' ? 15 : 14,
    justifyContent: 'center',
    gap: 8,
  },
  customerHomeHeroTitle: {
    color: '#22407A',
    fontSize: Platform.OS === 'ios' ? 46 : 36,
    lineHeight: Platform.OS === 'ios' ? 50 : 40,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: Platform.OS === 'ios' ? -1 : 0,
  },
  customerHomeHeroSubtitle: {
    color: '#344A5C',
    fontSize: Platform.OS === 'ios' ? 16 : 15,
    lineHeight: Platform.OS === 'ios' ? 21 : 20,
    fontWeight: '600',
    marginTop: Platform.OS === 'ios' ? -1 : 0,
  },
  customerHomePromoStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    paddingRight: 2,
    marginTop: Platform.OS === 'ios' ? 0 : 0,
  },
  customerHomePromoCard: {
    width: 170,
    height: 202,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D3DFD8',
    backgroundColor: '#EAF2EA',
    shadowColor: '#0D2B44',
    shadowOpacity: Platform.OS === 'ios' ? 0.12 : 0.06,
    shadowRadius: Platform.OS === 'ios' ? 8 : 4,
    shadowOffset: { width: 0, height: Platform.OS === 'ios' ? 4 : 2 },
    elevation: Platform.OS === 'ios' ? 0 : 2,
  },
  customerHomePromoImage: {
    width: '100%',
    height: '100%',
  },
  customerHomePromoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: 'rgba(6, 24, 45, 0.36)',
  },
  customerHomePromoTagWrap: {
    alignSelf: 'flex-start',
    backgroundColor: '#0E1A55',
    borderRadius: 7,
    minWidth: 92,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  customerHomePromoTagWrapNew: {
    minWidth: 70,
  },
  customerHomePromoTag: {
    color: '#F4F7FF',
    fontSize: 10.5,
    fontWeight: '800',
    textTransform: 'none',
    letterSpacing: 0.2,
  },
  customerHomePromoTagNew: {
    color: '#91E442',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  customerHomePromoTitle: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'ios' ? 18 : 17,
    lineHeight: Platform.OS === 'ios' ? 21 : 20,
    fontWeight: '900',
  },
  customerHomePromoSubtitle: {
    color: '#F2F7FA',
    fontSize: 12,
    fontWeight: '700',
  },
  customerHomePromoPrice: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'ios' ? 18 : 17,
    lineHeight: Platform.OS === 'ios' ? 21 : 20,
    fontWeight: '900',
  },
  customerHomeServicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    rowGap: 14,
  },
  customerHomeServiceTile: {
    flexBasis: '31.2%',
    minWidth: '31.2%',
    maxWidth: '31.2%',
    alignItems: 'center',
    gap: 7,
  },
  customerHomeServiceIconCard: {
    width: '100%',
    aspectRatio: 1.02,
    borderRadius: 10,
    backgroundColor: '#EDF0F4',
    borderWidth: 1,
    borderColor: '#E5E8ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerHomeServiceLabel: {
    width: '100%',
    color: '#162638',
    fontSize: Platform.OS === 'ios' ? 14 : 13,
    lineHeight: Platform.OS === 'ios' ? 18 : 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  customerHomeDualCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  customerHomeDualCard: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E1E6EE',
  },
  customerHomeDualCardGradient: {
    minHeight: 90,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customerHomeDualCardBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#D9E6FF',
    color: '#3A62B4',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  customerHomeDualCardTitle: {
    color: '#17263A',
    fontSize: 15,
    fontWeight: '800',
  },
  customerHomeDualCardSubtitle: {
    color: '#4A5F77',
    fontSize: 12,
    fontWeight: '600',
  },
  customerHomeSectionHeading: {
    color: '#141F2E',
    fontSize: Platform.OS === 'ios' ? 40 : 24,
    lineHeight: Platform.OS === 'ios' ? 44 : 28,
    fontWeight: '900',
    marginTop: 2,
  },
  customerHomeOfferCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DADFE9',
    minHeight: 220,
    backgroundColor: '#F2F5FB',
  },
  customerHomeOfferCardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  customerHomeOfferCardOverlay: {
    minHeight: 220,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  customerHomeOfferBadgeWrap: {
    alignSelf: 'flex-start',
    backgroundColor: '#2B4CE4',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  customerHomeOfferBadge: {
    color: '#A8F253',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  customerHomeOfferTitle: {
    color: '#101A2B',
    fontSize: Platform.OS === 'ios' ? 28 : 24,
    lineHeight: Platform.OS === 'ios' ? 32 : 28,
    fontWeight: '900',
  },
  customerHomeOfferSubtitle: {
    color: '#31445F',
    fontSize: 14,
    fontWeight: '600',
  },
  customerHomeOfferButton: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#9FB0C9',
    backgroundColor: '#FFFFFFEE',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  customerHomeOfferButtonText: {
    color: '#2C4ECE',
    fontSize: 16,
    fontWeight: '800',
  },
  customerHomeDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  customerHomeDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#DDE2EB',
  },
  customerHomeDotActive: {
    backgroundColor: '#4160EA',
  },
  customerHomeCustomizeCard: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  customerHomeCustomizeBody: {
    flex: 1,
    gap: 10,
  },
  customerHomeCustomizeTitle: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'ios' ? 22 : 20,
    lineHeight: Platform.OS === 'ios' ? 28 : 24,
    fontWeight: '900',
  },
  customerHomeCustomizeSubtitle: {
    color: '#E6EEFF',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },
  customerHomeCustomizeButton: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  customerHomeCustomizeButtonText: {
    color: '#3451DD',
    fontSize: 16,
    fontWeight: '800',
  },
  customerHomeCustomizeArt: {
    width: 102,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerHomeCarouselHeader: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: Platform.OS === 'ios' ? 24 : 22,
    overflow: 'hidden',
    gap: 14,
    minHeight: Platform.OS === 'ios' ? 220 : 200,
    backgroundColor: '#0B1724',
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  customerHomeHeroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  customerHomeHeroOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: Platform.OS === 'ios' ? 14 : 12,
    paddingHorizontal: Platform.OS === 'ios' ? 20 : 18,
    paddingVertical: Platform.OS === 'ios' ? 20 : 18,
  },
  customerHomeSplashHero: {
    gap: 10,
  },
  customerHomeSplashEyebrow: {
    color: '#D7E7F5',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  customerHomeSplashTitle: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'ios' ? 31 : 29,
    fontWeight: '900',
    lineHeight: Platform.OS === 'ios' ? 40 : 37,
    letterSpacing: Platform.OS === 'ios' ? 0.25 : 0.1,
  },
  customerHomeLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 10,
  },
  customerHomeBrandLogo: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFFFFF66',
  },
  customerHomeBrandName: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'ios' ? 20 : 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  customerHomeLocationRow: {
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: '#FFFFFF1A',
    borderWidth: 1,
    borderColor: '#FFFFFF2A',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  customerHomeLocationLabel: {
    color: '#D7E7F5',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  customerHomeLocationValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  customerHomeQuickRow: {
    flexDirection: 'row',
    gap: Platform.OS === 'ios' ? 12 : 10,
    marginTop: Platform.OS === 'ios' ? 8 : 6,
  },
  customerHomeQuickCard: {
    flex: 1,
    minHeight: 82,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9E4EE',
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  customerHomeQuickIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EDF3F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerHomeQuickLabel: {
    color: '#183149',
    fontSize: 12,
    fontWeight: '700',
  },
  customerHomeSplashSubtitle: {
    color: '#E7EEF6',
    fontSize: Platform.OS === 'ios' ? 15 : 14,
    fontWeight: '700',
    lineHeight: Platform.OS === 'ios' ? 22 : 21,
  },
  customerHomePromoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  customerHomePromoPill: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#FFFFFF1A',
    borderWidth: 1,
    borderColor: '#FFFFFF2A',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  customerHomePromoPillLabel: {
    color: '#D7E7F5',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  customerHomePromoPillValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  customerHomeCarouselEyebrow: {
    color: '#7A8791',
    fontSize: 14,
    fontWeight: '600',
  },
  customerHomePaidBadge: {
    color: '#7F8792',
    fontSize: 14,
    fontWeight: '600',
  },
  customerHomeCarouselRow: {
    gap: 14,
    paddingLeft: Platform.OS === 'ios' ? 4 : 18,
    paddingRight: Platform.OS === 'ios' ? 4 : 18,
  },
  customerCarouselDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: -2,
    marginHorizontal: Platform.OS === 'ios' ? 4 : 18,
  },
  customerCarouselDot: {
    height: 8,
    borderRadius: 999,
  },
  customerHomeBannerCard: {
    height: 194,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#DDEBDF',
    borderWidth: 1,
    borderColor: '#C8E0CE',
    shadowColor: '#0F6C3D',
    shadowOpacity: Platform.OS === 'ios' ? 0.16 : 0.1,
    shadowRadius: Platform.OS === 'ios' ? 14 : 10,
    shadowOffset: { width: 0, height: Platform.OS === 'ios' ? 8 : 6 },
    elevation: Platform.OS === 'ios' ? 0 : 4,
  },
  customerHomeBannerImage: {
    ...StyleSheet.absoluteFillObject,
  },
  customerHomeBannerOverlay: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  customerHomeBannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  customerHomeBannerSponsorPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF24',
    borderWidth: 1,
    borderColor: '#FFFFFF40',
  },
  customerHomeBannerSponsorText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  customerHomeBannerCompany: {
    color: '#E8ECF1',
    fontSize: 13,
    fontWeight: '700',
  },
  customerHomeBannerBody: {
    gap: 8,
  },
  customerHomeBannerTitle: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'ios' ? 28 : 26,
    lineHeight: Platform.OS === 'ios' ? 34 : 31,
    fontWeight: '900',
  },
  customerHomeBannerMeta: {
    color: '#D6DBE2',
    fontSize: 13,
    fontWeight: '600',
  },
  customerHomeBannerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  customerHomeBannerPrice: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  customerHomeBannerCta: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  customerHomeBannerCtaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  customerHomeSearchBar: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#FFFCF8',
    borderWidth: 1,
    borderColor: '#D9E5DC',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  customerHomeSearchSection: {
    gap: 10,
    paddingHorizontal: Platform.OS === 'ios' ? 4 : 18,
  },
  customerHomeSearchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 0,
  },
  customerHomeSearchClearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF4EF',
  },
  customerHomeSearchMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 2,
  },
  customerHomeSearchMetaText: {
    flex: 1,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  customerHomeSearchLink: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  customerHomeSearchText: {
    color: '#B9BEC7',
    fontSize: 18,
    fontWeight: '500',
  },
  customerHomeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: Platform.OS === 'ios' ? 4 : 18,
  },
  customerHomeSectionHeaderCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  customerHomeSectionTitle: {
    color: colors.text,
    fontSize: Platform.OS === 'ios' ? 30 : 28,
    fontWeight: '800',
    letterSpacing: Platform.OS === 'ios' ? 0.15 : 0,
  },
  customerHomeSectionSubtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  customerHomeSectionMeta: {
    color: '#50626F',
    fontSize: 15,
    fontWeight: '600',
  },
  customerHomeLotRow: {
    gap: 16,
    paddingRight: Platform.OS === 'ios' ? 4 : 18,
  },
  customerHomeLotCard: {
    width: 248,
    gap: 10,
  },
  customerHomeLotImageWrap: {
    height: 226,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#E9DFD1',
    borderWidth: 1,
    borderColor: '#DDD0BC',
  },
  customerHomeLotImage: {
    width: '100%',
    height: '100%',
  },
  customerHomeLotTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '500',
  },
  customerHomeLotMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerHomeLotMetaText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '500',
  },
  customerHomeLotPrice: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  customerHomePrimaryCta: {
    minHeight: 62,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: '#FFFFFF20',
  },
  customerHomePrimaryCtaText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  customerHomeSectionBlock: {
    gap: 16,
    marginHorizontal: Platform.OS === 'ios' ? 2 : 14,
    paddingTop: 14,
    paddingBottom: 16,
    paddingHorizontal: Platform.OS === 'ios' ? 8 : 14,
    borderRadius: Platform.OS === 'ios' ? 0 : 28,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#FFFFFF',
    borderWidth: Platform.OS === 'ios' ? 0 : 1,
    borderColor: Platform.OS === 'ios' ? 'transparent' : '#DCEBDD',
    shadowColor: '#0F7B45',
    shadowOpacity: Platform.OS === 'ios' ? 0 : 0.04,
    shadowRadius: Platform.OS === 'ios' ? 0 : 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: Platform.OS === 'ios' ? 0 : 2,
  },
  customerHomeCategoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  customerHomeCategoryChip: {
    minWidth: '47%',
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#0F7B45',
    shadowOpacity: Platform.OS === 'ios' ? 0.12 : 0.06,
    shadowRadius: Platform.OS === 'ios' ? 12 : 6,
    shadowOffset: { width: 0, height: 5 },
    elevation: Platform.OS === 'ios' ? 0 : 2,
  },
  customerHomeCategoryChipGradient: {
    minHeight: 104,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 22,
    gap: 8,
  },
  customerHomeCategoryChipTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  customerHomeCategoryChipDisabled: {
    opacity: 0.6,
  },
  customerHomeCategoryChipLeading: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#EAF8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerHomeCategoryChipLeadingDisabled: {
    backgroundColor: '#EEF1EF',
  },
  customerHomeCategoryChipText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
  },
  customerHomeCategoryChipCaption: {
    color: '#5D7466',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  customerHomeCategoryChipTrailing: {
    minWidth: 16,
    alignItems: 'flex-end',
  },
  customerHomeCategoryChipSoonText: {
    color: '#8B5A12',
    fontSize: 11,
    fontWeight: '800',
  },
  customerHomeCategoryChipDisabledText: {
    color: '#9E9E9E',
  },
  customerHomeActiveFilterChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#E6F0FA',
    borderWidth: 1,
    borderColor: '#B8D1EA',
  },
  customerHomeActiveFilterChipText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  customerHomeStatsPanel: {
    flexDirection: 'row',
    gap: 12,
  },
  customerHomeStatCard: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: '#FFF8EF',
    borderWidth: 1,
    borderColor: '#E3D6C1',
    gap: 6,
  },
  customerHomeStatValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  customerHomeStatLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  customerHomeEmptyCard: {
    backgroundColor: '#FFF8EF',
    borderColor: '#E3D6C1',
  },
  customerCategoryHubRow: {
    gap: 14,
    paddingRight: Platform.OS === 'ios' ? 0 : 18,
  },
  customerCategoryHubCard: {
    width: 246,
    minHeight: 144,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6E8DB',
    overflow: 'hidden',
    shadowColor: '#0F7B45',
    shadowOpacity: Platform.OS === 'ios' ? 0.14 : 0.08,
    shadowRadius: Platform.OS === 'ios' ? 16 : 8,
    shadowOffset: { width: 0, height: 7 },
    elevation: Platform.OS === 'ios' ? 0 : 4,
  },
  customerCategoryHubCardGradient: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 15,
    gap: 10,
  },
  customerCategoryHubTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  customerCategoryHubIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF8F0',
  },
  customerCategoryHubCount: {
    color: '#2D7E53',
    fontSize: 12,
    fontWeight: '800',
  },
  customerCategoryHubTitle: {
    color: colors.text,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
  },
  customerCategoryHubMeta: {
    color: '#607667',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  customerCategoryHubFooter: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customerCategoryHubFooterText: {
    color: '#2D7E53',
    fontSize: 12,
    fontWeight: '800',
  },
  customerCategoryComingSoonText: {
    color: '#8B5A12',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  customerBrowseStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  customerBrowseStatCard: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFF8EF',
    borderWidth: 1,
    borderColor: '#E4D7C4',
    gap: 4,
  },
  customerBrowseStatValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  customerBrowseStatLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  customerLandingHero: {
    height: 210,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DFCDAF',
    backgroundColor: '#E7DDCF',
  },
  customerLandingHeroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  customerLandingHeroOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 18,
  },
  customerLandingHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  customerLandingHeroIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF2A',
    borderWidth: 1,
    borderColor: '#FFFFFF45',
  },
  customerLandingHeroBadge: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  customerLandingHeroBody: {
    gap: 8,
  },
  customerLandingHeroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
  },
  customerLandingHeroSubtitle: {
    color: '#EDF2F7',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },
  customerBrowseSectionBlock: {
    gap: 14,
  },
  customerBrowseGroupStack: {
    gap: 12,
  },
  customerBrowseGroupCard: {
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FFFCF8',
    borderWidth: 1,
    borderColor: '#E8DEC9',
    gap: 12,
  },
  customerBrowseGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  customerBrowseGroupTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customerBrowseGroupIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF1F8',
  },
  customerBrowseGroupTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  customerBrowseGroupCount: {
    color: '#617173',
    fontSize: 12,
    fontWeight: '800',
  },
  customerBrowseChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  customerBrowseChip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4DDCF',
  },
  customerBrowseChipActive: {
    backgroundColor: '#EAF6EE',
    borderColor: '#B7DBC5',
  },
  customerBrowseChipDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#D8D8D8',
    opacity: 0.55,
  },
  customerBrowseChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  customerBrowseChipTextActive: {
    color: colors.primary,
  },
  customerBrowseChipDisabledText: {
    color: '#9E9E9E',
  },
  customerExploreStickyHeader: {
    marginHorizontal: Platform.OS === 'ios' ? 2 : -18,
    paddingHorizontal: Platform.OS === 'ios' ? 4 : 18,
    paddingTop: 2,
    paddingBottom: 12,
    gap: 10,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#E7DCCB',
  },
  customerExploreStickySearchBar: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#FFF8EF',
    borderWidth: 1,
    borderColor: '#E3D6C1',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customerExploreStickySearchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 0,
  },
  customerExploreSearchClearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3EBDD',
  },
  customerExploreSortRow: {
    gap: 8,
    paddingRight: 10,
  },
  customerExploreSortChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3D7C5',
  },
  customerExploreSortChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  customerExploreSortChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  customerExploreSortChipTextActive: {
    color: '#FFFFFF',
  },
  customerExploreFilterBar: {
    gap: 10,
  },
  customerExploreFilterRow: {
    gap: 8,
    paddingRight: 10,
  },
  customerExploreFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFF8EF',
    borderWidth: 1,
    borderColor: '#E3D7C5',
  },
  customerExploreFilterChipActive: {
    backgroundColor: '#E6F0FA',
    borderColor: '#B8D1EA',
  },
  customerExploreFilterChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  customerExploreFilterChipTextActive: {
    color: colors.primary,
  },
  customerExploreResetButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FCEFEA',
    borderWidth: 1,
    borderColor: '#F2C8BE',
  },
  customerExploreResetButtonText: {
    color: '#A33E31',
    fontSize: 12,
    fontWeight: '700',
  },
  customerProviderDetailCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#FBFEFB',
    borderWidth: 1,
    borderColor: '#D8E8DC',
    gap: 14,
    marginBottom: 14,
  },
  customerProviderDetailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  customerProviderDetailTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  customerProviderDetailSubtitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  customerProviderDetailDescription: {
    color: '#4D6256',
    lineHeight: 21,
  },
  customerProviderSection: {
    gap: 10,
  },
  customerProviderSectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  customerProviderServiceStack: {
    gap: 10,
  },
  customerProviderServiceCard: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE7DF',
  },
  customerProviderServiceCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#F2FAF4',
  },
  customerProviderServiceTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  customerProviderServiceMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  customerProviderServicePrice: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '900',
  },
  customerProviderSlotWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  customerProviderSlotChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE7DF',
  },
  customerProviderSlotChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  customerProviderSlotChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  customerProviderSlotChipTextActive: {
    color: '#FFFFFF',
  },
  customerProviderPaymentHint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  categorySettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EFE8',
  },
  categorySettingTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  categorySettingMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  providerModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 20, 13, 0.42)',
    justifyContent: 'flex-end',
  },
  providerModalSheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#F8FCF8',
    overflow: 'hidden',
  },
  providerModalContent: {
    padding: 18,
    gap: 16,
    paddingBottom: 28,
  },
  providerModalHero: {
    minHeight: 240,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#E5EFE6',
  },
  providerModalHeroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  providerModalHeroOverlay: {
    flex: 1,
    padding: 18,
    justifyContent: 'space-between',
  },
  providerModalHeroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  providerModalBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  providerModalBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  providerModalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerModalHeroBody: {
    gap: 6,
  },
  providerModalTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
  },
  providerModalSubtitle: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 13,
    fontWeight: '700',
  },
  providerSlotDateGroupStack: {
    gap: 10,
  },
  providerSlotDateGroupCard: {
    borderRadius: 18,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE7DF',
    gap: 10,
  },
  providerSlotDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  providerSlotDateHeaderText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  customerCanvasDark: {
    backgroundColor: '#111922',
    borderRadius: 24,
    padding: 16,
  },
  heroCard: {
    borderRadius: Platform.OS === 'ios' ? 26 : 24,
    padding: Platform.OS === 'ios' ? 18 : 22,
    gap: Platform.OS === 'ios' ? 14 : 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  workspaceUtilityRow: {
    minWidth: 170,
    alignItems: 'flex-end',
    gap: 10,
  },
  heroTextWrap: {
    flex: 1,
    gap: 4,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  brandTagline: {
    fontSize: 14,
    color: colors.muted,
  },
  heroTitle: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '800',
    color: colors.text,
  },
  heroBody: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.muted,
  },
  messageText: {
    color: colors.primary,
    fontWeight: '600',
  },
  roleBadge: {
    backgroundColor: '#FFFFFFA8',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  roleBadgeText: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 12,
  },
  segmentWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  segmentItem: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  segmentItemActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentText: {
    color: colors.text,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  adminBottomNavWrap: {
    width: PAGE_OUTER_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'ios' ? 2 : 6,
    paddingVertical: Platform.OS === 'ios' ? 2 : 1,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: '#D7E9DB',
  },
  adminBottomNav: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: Platform.OS === 'ios' ? 4 : 6,
    paddingVertical: Platform.OS === 'ios' ? 4 : 2,
    backgroundColor: '#FFFFFFE8',
    borderWidth: 1,
    borderColor: '#D7E9DB',
    shadowColor: '#0E7B45',
    shadowOpacity: Platform.OS === 'ios' ? 0.12 : 0.08,
    shadowRadius: Platform.OS === 'ios' ? 14 : 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: Platform.OS === 'ios' ? 0 : 5,
  },
  adminBottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Platform.OS === 'ios' ? 2 : 1,
    minHeight: Platform.OS === 'ios' ? 42 : 38,
  },
  adminBottomNavIconShell: {
    width: Platform.OS === 'ios' ? 26 : 24,
    height: Platform.OS === 'ios' ? 26 : 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F8F4',
    borderWidth: 1,
    borderColor: '#DBEADF',
  },
  adminBottomNavIconShellActive: {
    backgroundColor: '#EAF8F0',
    borderColor: '#B7DBC5',
  },
  adminBottomNavLabel: {
    color: '#5C7181',
    fontSize: Platform.OS === 'ios' ? 8.5 : 8,
    fontWeight: '700',
    textAlign: 'center',
  },
  adminBottomNavLabelActive: {
    color: '#0F7B45',
    fontWeight: '800',
  },
  workspaceColumns: {
    gap: 16,
  },
  workspaceColumnsWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  columnPane: {
    gap: 16,
    width: '100%',
  },
  columnPaneWide: {
    flex: 1,
    width: undefined,
  },
  sectionCard: {
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.surface,
    borderRadius: Platform.OS === 'ios' ? 0 : 24,
    padding: Platform.OS === 'ios' ? 0 : 20,
    borderWidth: Platform.OS === 'ios' ? 0 : 1,
    borderColor: Platform.OS === 'ios' ? 'transparent' : colors.border,
    gap: Platform.OS === 'ios' ? 14 : 12,
    shadowColor: '#1A3651',
    shadowOpacity: Platform.OS === 'ios' ? 0 : 0.06,
    shadowRadius: Platform.OS === 'ios' ? 0 : 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: Platform.OS === 'ios' ? 0 : 3,
  },
  sectionTitle: {
    fontSize: Platform.OS === 'ios' ? 22 : 20,
    fontWeight: '800',
    color: colors.text,
  },
  sectionSubtitle: {
    color: colors.muted,
    lineHeight: Platform.OS === 'ios' ? 22 : 21,
    fontSize: Platform.OS === 'ios' ? 15 : 14,
  },
  sectionBody: {
    gap: Platform.OS === 'ios' ? 14 : 12,
  },
  fieldWrap: {
    flex: 1,
    minWidth: 150,
    gap: Platform.OS === 'ios' ? 8 : 6,
  },
  fieldLabel: {
    fontWeight: '700',
    color: colors.text,
    fontSize: Platform.OS === 'ios' ? 16 : 15,
  },
  fieldLabelDark: {
    color: '#F2F4F7',
  },
  input: {
    backgroundColor: '#FAF8F2',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Platform.OS === 'ios' ? 18 : 16,
    paddingHorizontal: Platform.OS === 'ios' ? 16 : 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    color: colors.text,
    fontSize: Platform.OS === 'ios' ? 16 : 15,
  },
  selectFieldButton: {
    minHeight: Platform.OS === 'ios' ? 50 : 48,
    backgroundColor: '#FAF8F2',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Platform.OS === 'ios' ? 18 : 16,
    paddingHorizontal: Platform.OS === 'ios' ? 16 : 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Platform.OS === 'ios' ? 12 : 10,
  },
  selectFieldText: {
    flex: 1,
    color: colors.text,
    fontSize: Platform.OS === 'ios' ? 16 : 15,
  },
  selectFieldPlaceholder: {
    color: colors.muted,
  },
  selectFieldOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 24, 33, 0.24)',
  },
  selectFieldBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  selectFieldSheet: {
    maxHeight: '72%',
    borderTopLeftRadius: Platform.OS === 'ios' ? 32 : 28,
    borderTopRightRadius: Platform.OS === 'ios' ? 32 : 28,
    backgroundColor: '#FFF8EF',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2D5C1',
    paddingHorizontal: Platform.OS === 'ios' ? 20 : 18,
    paddingTop: Platform.OS === 'ios' ? 20 : 18,
    paddingBottom: Platform.OS === 'ios' ? 28 : 24,
    gap: Platform.OS === 'ios' ? 16 : 14,
  },
  selectFieldSheetTitle: {
    color: colors.text,
    fontSize: Platform.OS === 'ios' ? 22 : 20,
    fontWeight: '700',
  },
  selectFieldSheetList: {
    gap: Platform.OS === 'ios' ? 12 : 10,
    paddingBottom: 8,
  },
  selectFieldOption: {
    minHeight: Platform.OS === 'ios' ? 54 : 52,
    borderRadius: Platform.OS === 'ios' ? 20 : 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2D7C7',
    paddingHorizontal: Platform.OS === 'ios' ? 18 : 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Platform.OS === 'ios' ? 12 : 10,
  },
  selectFieldOptionText: {
    flex: 1,
    color: colors.text,
    fontSize: Platform.OS === 'ios' ? 16 : 15,
    fontWeight: '600',
  },
  inputError: {
    borderColor: colors.accent,
  },
  inputDark: {
    backgroundColor: '#1A2430',
    borderColor: '#2E3B49',
    color: '#F7F9FB',
  },
  inputMultiline: {
    minHeight: Platform.OS === 'ios' ? 108 : 96,
    textAlignVertical: 'top',
  },
  fieldError: {
    color: colors.accent,
    fontSize: Platform.OS === 'ios' ? 13 : 12,
    fontWeight: '600',
  },
  statusBanner: {
    borderRadius: Platform.OS === 'ios' ? 20 : 18,
    paddingHorizontal: Platform.OS === 'ios' ? 18 : 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
  },
  statusBannerSuccess: {
    backgroundColor: colors.successSurface,
  },
  statusBannerError: {
    backgroundColor: colors.errorSurface,
  },
  statusBannerInfo: {
    backgroundColor: colors.infoSurface,
  },
  statusBannerText: {
    fontWeight: '700',
    fontSize: Platform.OS === 'ios' ? 16 : 15,
  },
  statusBannerTextSuccess: {
    color: colors.success,
  },
  statusBannerTextError: {
    color: colors.accent,
  },
  statusBannerTextInfo: {
    color: colors.primary,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: Platform.OS === 'ios' ? 18 : 16,
    paddingVertical: Platform.OS === 'ios' ? 16 : 14,
    alignItems: 'center',
    minHeight: Platform.OS === 'ios' ? 54 : 52,
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: Platform.OS === 'ios' ? 17 : 16,
  },
  secondaryButton: {
    backgroundColor: '#F4F8FC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C8DCEE',
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    flex: 1,
    minHeight: 52,
    minWidth: 138,
    justifyContent: 'center',
  },
  secondaryButtonDanger: {
    backgroundColor: '#F25F4C',
    borderColor: '#F25F4C',
  },
  secondaryButtonContrast: {
    backgroundColor: '#12385E',
    borderColor: '#12385E',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: '800',
  },
  secondaryButtonTextDanger: {
    color: '#FFFFFF',
  },
  secondaryButtonTextContrast: {
    color: '#FFFFFF',
  },
  rowGap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F1EEE6',
  },
  choiceChipActive: {
    backgroundColor: colors.accent,
  },
  choiceChipText: {
    color: colors.text,
    fontWeight: '700',
  },
  choiceChipTextActive: {
    color: '#FFFFFF',
  },
  emptyState: {
    padding: 18,
    backgroundColor: '#FAF8F2',
    borderRadius: 18,
    gap: 6,
  },
  emptyTitle: {
    fontWeight: '800',
    color: colors.text,
    fontSize: 16,
  },
  emptyBody: {
    color: colors.muted,
    lineHeight: 21,
  },
  metricGrid: {
    gap: 12,
  },
  metricGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metricCard: {
    backgroundColor: '#FFFCF8',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E7DCCB',
    minWidth: 150,
    gap: 4,
    shadowColor: '#11385C',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
  },
  metricLabel: {
    color: colors.muted,
  },
  infoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E9E0D0',
    backgroundColor: '#FBF8F2',
  },
  infoBodyGrow: {
    flex: 1,
    minWidth: 180,
    gap: 4,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  infoSubtitle: {
    color: colors.muted,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8E0D3',
    backgroundColor: '#FBF8F3',
  },
  notificationRowDark: {
    borderBottomColor: '#2D3A48',
  },
  notificationBodyWrap: {
    flex: 1,
    gap: 6,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationUnreadDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  notificationMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  helperText: {
    color: colors.muted,
    lineHeight: 20,
  },
  inlineAction: {
    minHeight: 42,
    minWidth: 92,
    backgroundColor: '#EAF3FB',
    borderWidth: 1,
    borderColor: '#C6DBEF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineActionDanger: {
    backgroundColor: '#F25F4C',
    borderColor: '#F25F4C',
  },
  inlineActionNeutral: {
    backgroundColor: '#F8E6C9',
    borderColor: '#EBC98D',
  },
  inlineActionGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  inlineActionText: {
    color: colors.primary,
    fontWeight: '700',
  },
  inlineActionTextDanger: {
    color: '#FFFFFF',
  },
  inlineActionTextNeutral: {
    color: '#8B5A12',
  },
  workspaceShowcase: {
    borderRadius: 30,
    padding: Platform.OS === 'ios' ? 18 : 22,
    gap: 18,
    overflow: 'hidden',
    shadowColor: '#12385E',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  workspaceShowcaseTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
  },
  workspaceShowcaseTextWrap: {
    flex: 1,
    gap: 8,
  },
  workspaceShowcaseEyebrow: {
    color: '#D2E8FF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '800',
    fontSize: 12,
  },
  workspaceShowcaseTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  workspaceShowcaseBody: {
    color: '#E3F0FC',
    lineHeight: 22,
    fontSize: 15,
  },
  workspaceShowcaseGlow: {
    width: 74,
    height: 74,
    borderRadius: 26,
    backgroundColor: '#FFFFFF22',
    borderWidth: 1,
    borderColor: '#FFFFFF22',
  },
  workspaceShowcaseBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  workspaceShowcaseBadge: {
    minWidth: 120,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: '#FFFFFF1A',
    borderWidth: 1,
    borderColor: '#FFFFFF24',
    gap: 2,
  },
  workspaceShowcaseBadgeValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  workspaceShowcaseBadgeLabel: {
    color: '#D7E8F8',
    fontSize: 12,
    fontWeight: '700',
  },
  workspaceActionDeck: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Platform.OS === 'ios' ? 10 : 12,
  },
  workspaceActionTile: {
    flex: 1,
    minWidth: 190,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: Platform.OS === 'ios' ? 12 : 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#D8E7F5',
  },
  workspaceActionEyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  workspaceActionTitle: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
  workspaceActionBody: {
    color: colors.muted,
    lineHeight: 20,
  },
  workspaceActionFooter: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  workspaceActionFooterText: {
    color: colors.primary,
    fontWeight: '800',
  },
  overviewBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  compactBadge: {
    minWidth: 104,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: '#F6F9FC',
    borderWidth: 1,
    borderColor: '#DAE7F2',
    gap: 2,
  },
  compactBadgeValue: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  compactBadgeLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  companyCatalogCard: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFE7EF',
    shadowColor: '#12385E',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    gap: 0,
  },
  companyCatalogCardPressable: {
    backgroundColor: '#FFFFFF',
  },
  companyCatalogCardPressablePressed: {
    opacity: 0.96,
    transform: [{ scale: 0.988 }],
  },
  companyCatalogCardVisual: {
    padding: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E4EDF5',
    position: 'relative',
    overflow: 'hidden',
  },
  companyCatalogCardAura: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    top: -70,
    right: -50,
  },
  companyCatalogCardAuraPublished: {
    backgroundColor: '#9FD1FF55',
  },
  companyCatalogCardAuraDraft: {
    backgroundColor: '#FFD6A555',
  },
  companyCatalogCardAccentLine: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 0,
    height: 4,
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
  },
  companyCatalogCardAccentLinePublished: {
    backgroundColor: '#2B86D1',
  },
  companyCatalogCardAccentLineDraft: {
    backgroundColor: '#D99233',
  },
  companyCatalogCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  companyCatalogVisualHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  companyCatalogIllustrationBadge: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  companyCatalogIllustrationBadgePublished: {
    backgroundColor: '#12385E',
    borderColor: '#12385E',
  },
  companyCatalogIllustrationBadgeDraft: {
    backgroundColor: '#B56A17',
    borderColor: '#B56A17',
  },
  companyCatalogIllustrationBadgeText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  companyCatalogPhotoThumb: {
    width: 58,
    height: 58,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DCE8F3',
    backgroundColor: '#FFFFFF',
  },
  companyCatalogIllustrationPanel: {
    flex: 1,
    minHeight: 72,
    borderRadius: 22,
    backgroundColor: '#FFFFFFBB',
    borderWidth: 1,
    borderColor: '#DCE8F3',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  companyCatalogIllustrationOrb: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyCatalogIllustrationOrbPublished: {
    backgroundColor: '#DDEEFE',
  },
  companyCatalogIllustrationOrbDraft: {
    backgroundColor: '#FEE8CC',
  },
  companyCatalogIllustrationTextWrap: {
    flex: 1,
    gap: 2,
  },
  companyCatalogIllustrationTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 14,
  },
  companyCatalogIllustrationSubtitle: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  companyCatalogCardStatePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  companyCatalogCardStatePillPublished: {
    backgroundColor: '#12385E',
  },
  companyCatalogCardStatePillDraft: {
    backgroundColor: '#A96516',
  },
  companyCatalogCardStateText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  companyCatalogCardKindPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#DDEEFE',
  },
  companyCatalogCardKindPillProduct: {
    backgroundColor: '#FDE6D8',
  },
  companyCatalogCardKindText: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 12,
  },
  companyCatalogCardCategory: {
    color: colors.primary,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontSize: 12,
  },
  companyCatalogCardHint: {
    color: colors.muted,
    lineHeight: 20,
  },
  companyCatalogCardStateHeadline: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    marginTop: 8,
  },
  companyCatalogCardStateBody: {
    color: colors.muted,
    lineHeight: 20,
  },
  companyCatalogCardBody: {
    padding: 16,
    gap: 14,
  },
  companyCatalogCardTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  companyCatalogCardTitle: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
    flex: 1,
    minWidth: 180,
  },
  companyCatalogCardTapPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#EDF4FB',
    borderWidth: 1,
    borderColor: '#D7E7F6',
  },
  companyCatalogCardTapPillText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 12,
  },
  companyCatalogCardSummary: {
    color: colors.muted,
    lineHeight: 21,
  },
  companyCatalogMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  companyCatalogActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 2,
  },
  companyCatalogSignalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  companyCatalogSignalCard: {
    flex: 1,
    minWidth: 150,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: '#F7FAFD',
    borderWidth: 1,
    borderColor: '#DFEAF4',
    gap: 4,
  },
  companyCatalogSignalLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  companyCatalogSignalValue: {
    color: colors.text,
    fontWeight: '800',
    lineHeight: 20,
  },
  catalogUploadPanel: {
    gap: 12,
    padding: 14,
    borderRadius: 22,
    backgroundColor: '#F8FBFE',
    borderWidth: 1,
    borderColor: '#DAE7F2',
  },
  catalogUploadPreviewImage: {
    width: '100%',
    height: 180,
    borderRadius: 18,
    backgroundColor: '#E8EEF4',
  },
  catalogUploadPlaceholder: {
    minHeight: 160,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D5E2ED',
    borderStyle: 'dashed',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    gap: 8,
  },
  catalogUploadPlaceholderTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 16,
    textAlign: 'center',
  },
  catalogUploadPlaceholderBody: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  catalogUploadActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  catalogSubmitHint: {
    color: colors.muted,
    lineHeight: 20,
    fontWeight: '600',
  },
  managementRuleList: {
    gap: 12,
  },
  managementRuleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  managementRuleDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  managementRuleText: {
    flex: 1,
    color: colors.text,
    lineHeight: 21,
    fontWeight: '600',
  },
  operationPopupBackdrop: {
    flex: 1,
    backgroundColor: '#17252F66',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  operationPopupCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    padding: 24,
    alignItems: 'center',
    gap: 14,
    shadowColor: '#12385E',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  operationPopupIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  operationPopupIconSuccess: {
    backgroundColor: colors.success,
  },
  operationPopupIconError: {
    backgroundColor: '#D64545',
  },
  operationPopupTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  operationPopupBody: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  catalogFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  catalogFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F6F9FC',
    borderWidth: 1,
    borderColor: '#DAE7F2',
  },
  catalogFilterChipActive: {
    backgroundColor: '#12385E',
    borderColor: '#12385E',
  },
  catalogFilterChipText: {
    color: colors.text,
    fontWeight: '800',
  },
  catalogFilterChipTextActive: {
    color: '#FFFFFF',
  },
  catalogFilterChipCount: {
    minWidth: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    backgroundColor: '#E4EDF5',
  },
  catalogFilterChipCountActive: {
    backgroundColor: '#FFFFFF22',
  },
  catalogFilterChipCountText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  catalogFilterChipCountTextActive: {
    color: '#FFFFFF',
  },
  catalogGrid: {
    gap: 12,
  },
  catalogGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  marketplaceCard: {
    backgroundColor: '#FFFCF6',
    borderRadius: 22,
    padding: Platform.OS === 'ios' ? 10 : 14,
    borderWidth: 1,
    borderColor: '#E8DDCB',
    gap: 12,
    minWidth: 240,
    flexGrow: 1,
    shadowColor: '#B08C51',
    shadowOpacity: Platform.OS === 'ios' ? 0.11 : 0.08,
    shadowRadius: Platform.OS === 'ios' ? 18 : 12,
    shadowOffset: { width: 0, height: Platform.OS === 'ios' ? 9 : 7 },
    elevation: Platform.OS === 'ios' ? 0 : 3,
  },
  marketplaceCardDark: {
    backgroundColor: '#1B2430',
    borderColor: '#2D3A48',
  },
  companyDiscoveryCard: {
    backgroundColor: '#FFFCF8',
    borderRadius: 22,
    padding: Platform.OS === 'ios' ? 8 : 12,
    borderWidth: 1,
    borderColor: '#DCE8DF',
    gap: 10,
    minWidth: 246,
    flexGrow: 1,
    shadowColor: '#1F5A36',
    shadowOpacity: Platform.OS === 'ios' ? 0.14 : 0.09,
    shadowRadius: Platform.OS === 'ios' ? 18 : 12,
    shadowOffset: { width: 0, height: Platform.OS === 'ios' ? 10 : 7 },
    elevation: Platform.OS === 'ios' ? 0 : 4,
  },
  companyDiscoveryCardCompact: {
    minWidth: 208,
    padding: 10,
    borderRadius: 18,
    gap: 8,
  },
  companyDiscoveryCardActive: {
    borderColor: '#9FD2AF',
    shadowColor: '#0F7B45',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  companyDiscoveryCardPressed: {
    transform: [{ scale: 0.992 }],
  },
  companyDiscoveryCover: {
    minHeight: 164,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#D9ECDD',
  },
  companyDiscoveryCoverCompact: {
    minHeight: 128,
    borderRadius: 14,
  },
  companyDiscoveryCoverImage: {
    ...StyleSheet.absoluteFillObject,
  },
  companyDiscoveryFallbackBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F7B45',
    position: 'absolute',
    top: 14,
    left: 14,
    zIndex: 2,
  },
  companyDiscoveryFallbackBadgeCompact: {
    width: 42,
    height: 42,
    borderRadius: 12,
    top: 10,
    left: 10,
  },
  companyDiscoveryFallbackBadgeText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  companyDiscoveryFallbackBadgeTextCompact: {
    fontSize: 22,
  },
  companyDiscoveryCoverOverlay: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  companyDiscoveryCoverOverlayCompact: {
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  companyDiscoveryCoverTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  companyDiscoveryCategoryPill: {
    maxWidth: '72%',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFFD9',
  },
  companyDiscoveryCategoryPillCompact: {
    maxWidth: '70%',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  companyDiscoveryCategoryPillText: {
    color: '#12492A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
  companyDiscoveryCategoryPillTextCompact: {
    fontSize: 9,
    letterSpacing: 0.25,
  },
  companyDiscoveryStatePill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  companyDiscoveryStatePillActive: {
    backgroundColor: '#0F7B45',
  },
  companyDiscoveryStatePillPaused: {
    backgroundColor: '#8A3A2B',
  },
  companyDiscoveryStatePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.25,
    textTransform: 'uppercase',
  },
  companyDiscoverySupportText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  companyDiscoverySupportTextCompact: {
    fontSize: 11,
  },
  companyDiscoveryBody: {
    gap: 4,
    paddingHorizontal: 2,
  },
  companyDiscoveryBodyCompact: {
    gap: 3,
    paddingHorizontal: 1,
  },
  companyDiscoveryTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
    color: colors.text,
  },
  companyDiscoveryTitleCompact: {
    fontSize: 16,
    lineHeight: 20,
  },
  companyDiscoveryDescription: {
    color: '#4A5E52',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  companyDiscoveryDescriptionCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
  companyDiscoveryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 3,
  },
  companyDiscoveryMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#ECF5EE',
    borderWidth: 1,
    borderColor: '#D2E5D8',
  },
  companyDiscoveryMetaChipText: {
    color: '#2D5D3F',
    fontSize: 10,
    fontWeight: '700',
  },
  companyDiscoveryFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  companyDiscoveryFooterRowCompact: {
    gap: 6,
  },
  companyDiscoveryCategoryMetaPill: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#EEF5EF',
    borderWidth: 1,
    borderColor: '#D1E4D5',
  },
  companyDiscoveryCategoryMetaText: {
    color: '#2E5B3F',
    fontSize: 11,
    fontWeight: '700',
  },
  companyDiscoveryCtaPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  companyDiscoveryCtaText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.25,
    textTransform: 'uppercase',
  },
  marketplaceVisual: {
    minHeight: 120,
    borderRadius: 18,
    padding: 14,
    justifyContent: 'space-between',
    backgroundColor: '#F7E6C9',
    overflow: 'hidden',
  },
  marketplaceVisualDark: {
    backgroundColor: '#223243',
  },
  marketplaceVisualTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    zIndex: 2,
  },
  marketplaceVisualImage: {
    ...StyleSheet.absoluteFillObject,
  },
  marketplaceVisualOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#11385C33',
  },
  marketplaceEyebrow: {
    color: colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 12,
  },
  marketplaceKindBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFFB8',
  },
  marketplaceKindBadgeDark: {
    backgroundColor: '#172431',
  },
  marketplaceKindText: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 11,
  },
  marketplaceKindTextDark: {
    color: '#DCE3E9',
  },
  marketplaceHint: {
    color: '#7A5B2B',
    fontWeight: '700',
    fontSize: 13,
  },
  marketplaceHintDark: {
    color: '#B7C5D1',
  },
  marketplaceBody: {
    gap: 6,
  },
  marketplaceTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  marketplaceTitleDark: {
    color: '#F5F7FA',
  },
  marketplaceSummary: {
    color: colors.muted,
    lineHeight: 20,
  },
  marketplaceFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  marketplaceCtaPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  marketplaceCtaPillDark: {
    backgroundColor: '#1D74C9',
  },
  marketplaceCtaText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  priceText: {
    fontWeight: '800',
    color: colors.text,
  },
  metaText: {
    color: colors.muted,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  bookingWrap: {
    gap: 10,
  },
  bookingCard: {
    backgroundColor: '#FBFAF5',
    borderRadius: 18,
    padding: Platform.OS === 'ios' ? 12 : 16,
    gap: Platform.OS === 'ios' ? 4 : 6,
  },
  statusBadge: {
    backgroundColor: colors.paleBlue,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  statusActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratingCard: {
    gap: Platform.OS === 'ios' ? 8 : 10,
    backgroundColor: '#FAF8F2',
    borderRadius: 18,
    padding: Platform.OS === 'ios' ? 12 : 14,
  },
  offerAdminCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  offerAdminActions: {
    minWidth: 150,
    alignItems: 'flex-end',
    gap: 8,
  },
  customerBookingCardDark: {
    backgroundColor: '#1B2632',
    borderWidth: 1,
    borderColor: '#2D3A48',
  },
  homeHeroPanel: {
    gap: 14,
    borderRadius: 20,
    backgroundColor: '#FBF2E3',
    padding: 18,
  },
  customerHeroEyebrow: {
    color: colors.primary,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontSize: 12,
  },
  homeHeroTitle: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '800',
    color: colors.text,
  },
  homeHeroBody: {
    color: colors.muted,
    lineHeight: 22,
  },
  customerHeroActionRow: {
    maxWidth: 220,
  },
  darkModeCard: {
    borderRadius: 18,
    padding: Platform.OS === 'ios' ? 12 : 14,
    backgroundColor: '#F7F4EC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customerSectionDark: {
    backgroundColor: '#16202B',
    borderColor: '#273341',
  },
  customerMetaCardDark: {
    backgroundColor: '#1D2A37',
    borderColor: '#2D3A48',
  },
  customerTitleDark: {
    color: '#F5F7FA',
  },
  customerSubtitleDark: {
    color: '#AFBCC8',
  },
  customerBodyDark: {
    color: '#DCE3E9',
  },
  customerEmptyDark: {
    backgroundColor: '#1B2632',
  },
  bottomNav: {
    flexDirection: 'row',
    gap: 2,
    backgroundColor: 'transparent',
    borderRadius: 999,
    paddingHorizontal: Platform.OS === 'ios' ? 2 : 8,
    paddingVertical: Platform.OS === 'ios' ? 1 : 6,
    borderWidth: 0,
    borderColor: 'transparent',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  bottomNavPremium: {
    backgroundColor: '#FFFFFFE6',
    borderWidth: 1,
    borderColor: '#D7E9DB',
    shadowColor: '#0E7B45',
    shadowOpacity: Platform.OS === 'ios' ? 0.09 : 0.08,
    shadowRadius: Platform.OS === 'ios' ? 12 : 10,
    shadowOffset: { width: 0, height: Platform.OS === 'ios' ? 5 : 8 },
    elevation: Platform.OS === 'ios' ? 0 : 6,
  },
  bottomNavDark: {
    backgroundColor: '#101B25E8',
    borderColor: '#1E2F3D',
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Platform.OS === 'ios' ? 1 : 4,
    paddingHorizontal: 4,
    borderRadius: 999,
    gap: Platform.OS === 'ios' ? 2 : 5,
  },
  bottomNavItemCenter: {
    flex: 1.1,
    transform: [{ translateY: Platform.OS === 'ios' ? -3 : -9 }],
  },
  bottomNavHomeOrb: {
    width: Platform.OS === 'ios' ? 44 : 60,
    height: Platform.OS === 'ios' ? 44 : 60,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F4FFF8',
    shadowColor: '#0F7B45',
    shadowOpacity: Platform.OS === 'ios' ? 0.28 : 0.16,
    shadowRadius: Platform.OS === 'ios' ? 16 : 8,
    shadowOffset: { width: 0, height: 7 },
    elevation: Platform.OS === 'ios' ? 0 : 8,
  },
  bottomNavHomeOrbDark: {
    shadowColor: '#34D07D',
  },
  bottomNavHomeOrbInner: {
    width: Platform.OS === 'ios' ? 34 : 48,
    height: Platform.OS === 'ios' ? 34 : 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF18',
  },
  bottomNavIconShell: {
    width: Platform.OS === 'ios' ? 30 : 38,
    height: Platform.OS === 'ios' ? 30 : 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4FAF6',
    borderWidth: 1,
    borderColor: '#D9EBDD',
  },
  bottomNavIconShellDark: {
    backgroundColor: '#17222D',
    borderColor: '#273744',
  },
  bottomNavIconShellActive: {
    backgroundColor: '#EAF8F0',
    borderColor: '#B7DBC5',
  },
  bottomNavIconShellActiveDark: {
    backgroundColor: '#0F2A1E',
    borderColor: '#1D4C39',
  },
  bottomNavIconDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 3,
  },
  bottomNavIconDotActive: {
    backgroundColor: '#1ECB72',
  },
  bottomNavItemDark: {
    backgroundColor: '#1D2A37',
  },
  bottomNavItemActive: {
    backgroundColor: 'transparent',
  },
  bottomNavText: {
    color: colors.muted,
    fontWeight: '700',
    fontSize: Platform.OS === 'ios' ? 9 : 11,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  bottomNavTextDark: {
    color: '#C8D3DC',
  },
  bottomNavTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  bottomNavTextCenter: {
    color: '#0F7B45',
    fontWeight: '800',
  },
  customerBottomDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Platform.OS === 'ios' ? -12 : 0,
    paddingHorizontal: Platform.OS === 'ios' ? 0 : 8,
    paddingTop: 0,
    paddingBottom: Platform.OS === 'ios' ? 0 : 4,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderTopColor: 'transparent',
  },
  customerBottomDockDark: {
    backgroundColor: 'transparent',
    borderTopColor: 'transparent',
  },
  onboardingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  onboardingOverlayGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'ios' ? 14 : 18,
    paddingTop: Platform.OS === 'ios' ? 22 : 18,
    paddingBottom: Platform.OS === 'ios' ? 116 : 120,
  },
  onboardingCardWrap: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '88%',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#D3E4F8',
    backgroundColor: '#F8FCFF',
    paddingHorizontal: Platform.OS === 'ios' ? 16 : 18,
    paddingVertical: Platform.OS === 'ios' ? 16 : 18,
    gap: 12,
    shadowColor: '#081A3D',
    shadowOpacity: Platform.OS === 'ios' ? 0.2 : 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  onboardingCardScroll: {
    width: '100%',
  },
  onboardingCardScrollContent: {
    gap: 12,
    paddingBottom: 4,
  },
  onboardingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  onboardingIconMark: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D4F93',
  },
  onboardingEyebrow: {
    color: '#2D5EA3',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  onboardingTitle: {
    color: '#102A4C',
    fontSize: Platform.OS === 'ios' ? 22 : 21,
    lineHeight: Platform.OS === 'ios' ? 26 : 25,
    fontWeight: '900',
  },
  onboardingBody: {
    color: '#38536F',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  onboardingSectionStack: {
    gap: 10,
  },
  onboardingVerificationCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D7E7F7',
    backgroundColor: '#F4F9FF',
    padding: 10,
    gap: 8,
  },
  onboardingActionStack: {
    gap: 10,
  },
  onboardingHintCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D6E5F6',
    backgroundColor: '#EEF5FD',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  onboardingHintTitle: {
    color: '#103057',
    fontSize: 14,
    fontWeight: '800',
  },
  onboardingHintBody: {
    color: '#3A5675',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  onboardingGpsMeta: {
    color: '#244A76',
    fontSize: 12,
    fontWeight: '700',
  },
  onboardingMapFrame: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D6E5F6',
    minHeight: 220,
    backgroundColor: '#EAF2FA',
  },
  onboardingMapView: {
    width: '100%',
    height: 220,
  },
  verificationCard: {
    gap: Platform.OS === 'ios' ? 8 : 10,
    borderRadius: 18,
    backgroundColor: '#F7F9FC',
    padding: Platform.OS === 'ios' ? 12 : 14,
  },
  customerVerificationDark: {
    backgroundColor: '#1B2632',
    borderWidth: 1,
    borderColor: '#2D3A48',
  },
  verificationTitle: {
    color: colors.text,
    fontWeight: '800',
  },
  statusRail: {
    gap: 12,
  },
  operationalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#F8FBFE',
    borderWidth: 1,
    borderColor: '#DAE7F2',
  },
  operationalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 4,
  },
  operationalToneBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  operationalToneBadgeSuccess: {
    backgroundColor: '#E8F6EE',
    borderColor: '#B9E4CA',
  },
  operationalToneBadgeInfo: {
    backgroundColor: '#EEF5FB',
    borderColor: '#CFE0EF',
  },
  operationalToneBadgeWarning: {
    backgroundColor: '#FFF4E6',
    borderColor: '#F2C98D',
  },
  operationalToneBadgeError: {
    backgroundColor: '#FDEBE7',
    borderColor: '#F6C2B8',
  },
  operationalToneBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  operationalToneBadgeTextSuccess: {
    color: colors.success,
  },
  operationalToneBadgeTextInfo: {
    color: colors.primary,
  },
  operationalToneBadgeTextWarning: {
    color: '#A35B00',
  },
  operationalToneBadgeTextError: {
    color: colors.accent,
  },
  operationalMetaText: {
    marginTop: 6,
    color: colors.primary,
    fontWeight: '700',
  },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  stackTight: {
    gap: 10,
  },
  auditRow: {
    gap: 8,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#FCFDFE',
    borderWidth: 1,
    borderColor: '#E1EBF3',
  },
  auditHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  auditTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  auditTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EFF4F9',
  },
  auditTagText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  trendCard: {
    gap: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#F9FBFD',
    borderWidth: 1,
    borderColor: '#DFE8F1',
  },
  trendCardSelected: {
    borderColor: '#0F3D69',
    backgroundColor: '#F1F7FD',
  },
  trendCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  trendBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    minHeight: 120,
  },
  trendBarColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  trendBarValue: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  trendBarTrack: {
    width: '100%',
    maxWidth: 28,
    height: 72,
    borderRadius: 999,
    backgroundColor: '#E7EEF5',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  trendBarFill: {
    width: '100%',
    minHeight: 4,
    borderRadius: 999,
  },
  trendBarFillSuccess: {
    backgroundColor: colors.success,
  },
  trendBarFillInfo: {
    backgroundColor: colors.primary,
  },
  trendBarFillWarning: {
    backgroundColor: '#D99233',
  },
  trendBarFillError: {
    backgroundColor: colors.accent,
  },
  trendBarLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  trendDrilldownCard: {
    gap: 10,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#F5F9FC',
    borderWidth: 1,
    borderColor: '#D8E6F1',
  },
  trendDrilldownHighlight: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  trendDrilldownFooter: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  dataTableWrap: {
    borderWidth: 1,
    borderColor: '#DFE8F1',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FBFCFE',
  },
  dataTableQuickFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#DFE8F1',
    backgroundColor: '#F6FAFE',
  },
  dataTableScroll: {
    maxHeight: 440,
  },
  dataTableHeader: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#EEF4FA',
    borderBottomWidth: 1,
    borderBottomColor: '#DFE8F1',
    zIndex: 2,
  },
  dataTableHeaderCell: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dataTableHeaderCellSortable: {
    backgroundColor: 'transparent',
  },
  dataTableStickyLeadHeaderCell: {
    backgroundColor: '#EAF2FA',
    borderRightWidth: 1,
    borderRightColor: '#D7E4F0',
    zIndex: 3,
    shadowColor: '#0E3A63',
    shadowOffset: { width: 3, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  dataTableHeaderText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  dataTableSortText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  dataTableActionHeader: {
    width: 300,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  dataTableRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EEF4',
  },
  dataTableRowAlt: {
    backgroundColor: '#F9FBFD',
  },
  dataTableRowWarning: {
    backgroundColor: '#FFF9EF',
  },
  dataTableRowError: {
    backgroundColor: '#FFF2EF',
  },
  dataTableRowSuccess: {
    backgroundColor: '#F4FBF7',
  },
  dataTableCell: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  dataTableStickyLeadCell: {
    backgroundColor: '#F8FBFF',
    borderRightWidth: 1,
    borderRightColor: '#E1EAF2',
    shadowColor: '#0E3A63',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  dataTableCellText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  dataTableActionCell: {
    width: 300,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  tableActionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  tableStatusActionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    flexWrap: 'wrap',
  },
  tablePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  tablePillSuccess: {
    backgroundColor: '#EAF7F0',
    borderColor: '#BFE4CE',
  },
  tablePillInfo: {
    backgroundColor: '#EEF5FB',
    borderColor: '#CFE0EF',
  },
  tablePillWarning: {
    backgroundColor: '#FFF4E6',
    borderColor: '#F2C98D',
  },
  tablePillError: {
    backgroundColor: '#FDEBE7',
    borderColor: '#F6C2B8',
  },
  tablePillText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tablePillTextSuccess: {
    color: colors.success,
  },
  tablePillTextInfo: {
    color: colors.primary,
  },
  tablePillTextWarning: {
    color: '#A35B00',
  },
  tablePillTextError: {
    color: colors.accent,
  },
  sparklineRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 26,
    minWidth: 64,
  },
  sparklineTrack: {
    flex: 1,
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#E7EEF5',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  sparklineFill: {
    width: '100%',
    minHeight: 2,
    borderRadius: 999,
  },
  sparklineFillSuccess: {
    backgroundColor: colors.success,
  },
  sparklineFillInfo: {
    backgroundColor: colors.primary,
  },
  sparklineFillWarning: {
    backgroundColor: '#D99233',
  },
  sparklineFillError: {
    backgroundColor: colors.accent,
  },
  trendAnnotationRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  trendAnnotationChip: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1EAF2',
    gap: 4,
  },
  trendAnnotationLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  trendAnnotationValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  trendAnnotationHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  trendTooltipCard: {
    gap: 4,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1EAF2',
  },
  trendTooltipTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  trendTooltipBody: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  busyIndicator: {
    marginTop: 8,
  },
});




