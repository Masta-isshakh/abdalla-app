import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  Image,
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { readableBookingStatus, useAppState } from '../context/AppContext';
import {
  Address,
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

const Stack = createNativeStackNavigator<RootStackParamList>();

const colors = {
  background: '#F6F4EE',
  surface: '#FFFFFF',
  text: '#17252F',
  muted: '#66757A',
  border: '#DED7C8',
  primary: '#145DA0',
  accent: '#F25F4C',
  hero: '#F7E8D0',
  paleBlue: '#DCECF9',
  success: '#0F7B45',
  successSurface: '#E8F6EE',
  errorSurface: '#FDEBE7',
  infoSurface: '#EEF5FB',
};

const tableToneFilterMemory: Record<string, 'all' | 'error' | 'warning' | 'success'> = {};
const TABLE_TONE_FILTER_STORAGE_PREFIX = 'jahzeen-table-tone-filter:';
const CUSTOMER_FILTER_STORAGE_PREFIX = 'jahzeen-customer-filters:';
const APP_CATEGORY_OPTIONS = [
  'Commercial Properties for Sale',
  'Commercial Properties for Rent',
  'Residential Properties for Rent',
  'Lands',
  'Residential Properties for Sale',
  'Furniture',
  'Cars',
  'Motorcycles',
  'Car Rentals',
  'Offshore Tools',
  'Spare Parts',
  'Heavy Equipment',
  'Pest Control',
  'Home Cleaning',
  'Maintenance',
  'Beauty Services',
  'Appliances',
  'Electronics',
];
const CATEGORY_GROUPS: Array<{ key: string; title: string; icon: keyof typeof Ionicons.glyphMap; categories: string[] }> = [
  {
    key: 'real-estate',
    title: 'Real Estate',
    icon: 'business-outline',
    categories: [
      'Residential Properties for Sale',
      'Residential Properties for Rent',
      'Commercial Properties for Sale',
      'Commercial Properties for Rent',
      'Lands',
    ],
  },
  {
    key: 'vehicles',
    title: 'Vehicles',
    icon: 'car-sport-outline',
    categories: ['Cars', 'Motorcycles', 'Car Rentals', 'Spare Parts', 'Heavy Equipment', 'Offshore Tools'],
  },
  {
    key: 'services',
    title: 'Services',
    icon: 'construct-outline',
    categories: ['Pest Control', 'Home Cleaning', 'Maintenance', 'Beauty Services'],
  },
  {
    key: 'electronics',
    title: 'Electronics',
    icon: 'hardware-chip-outline',
    categories: ['Electronics', 'Appliances'],
  },
  {
    key: 'home-living',
    title: 'Home & Living',
    icon: 'bed-outline',
    categories: ['Furniture'],
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
  const [customerCategoryMenuOpen, setCustomerCategoryMenuOpen] = useState(false);
  const [customerCategoryQuery, setCustomerCategoryQuery] = useState('');
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
    placeBooking,
    profile,
    ratings,
    resendCompanyInvitation,
    revokeInvitation,
    saveAddress,
    saveCatalogItem,
    saveLoyaltyProgram,
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
    markNotificationRead,
  } = useAppState();

  const [adminTab, setAdminTab] = useState<'overview' | 'companies' | 'publishing' | 'bookings' | 'settings'>('overview');
  const [companyTab, setCompanyTab] = useState<'overview' | 'catalog' | 'offers' | 'bookings' | 'loyalty'>('overview');
  const [customerTab, setCustomerTab] = useState<'home' | 'browse' | 'explore' | 'orders' | 'profile' | 'notifications'>('home');
  const [customerDarkMode, setCustomerDarkMode] = useState(false);
  const [customerSortMode, setCustomerSortMode] = useState<CustomerSortMode>('popular');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const [signInForm, setSignInForm] = useState({ email: '', password: '' });
  const [signUpForm, setSignUpForm] = useState({ fullName: '', email: '', password: '', phone: '' });
  const [confirmCode, setConfirmCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [profileForm, setProfileForm] = useState<UserProfile>(profile);
  const [addressForm, setAddressForm] = useState<Address>(addresses[0] ?? emptyAddress());
  const [bookingComposer, setBookingComposer] = useState({
    itemId: '',
    companyId: '',
    scheduleDate: 'Today',
    scheduleTime: '6:00 PM',
    addressId: addresses[0]?.id ?? '',
    notes: '',
    paymentMethod: profile.defaultPaymentMethod as PaymentMethod,
  });

  const [companyForm, setCompanyForm] = useState({
    name: '',
    description: '',
    supportEmail: '',
    supportPhone: '',
    accentColor: '#145DA0',
    logoText: '',
  });
  const [inviteForm, setInviteForm] = useState({ companyName: '', email: '', message: '' });
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
  const [companySettingsForm, setCompanySettingsForm] = useState({
    name: '',
    description: '',
    supportEmail: '',
    supportPhone: '',
    accentColor: '#145DA0',
    logoText: '',
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

  const [selectedAdminCompanyId, setSelectedAdminCompanyId] = useState<string | null>(null);
  const [selectedCatalogItemId, setSelectedCatalogItemId] = useState<string | null>(null);
  const [selectedPromotionId, setSelectedPromotionId] = useState<string | null>(null);
  const [catalogSubmitting, setCatalogSubmitting] = useState(false);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [operationPopup, setOperationPopup] = useState<{ tone: BannerTone; text: string } | null>(null);

  const [companyFormErrors, setCompanyFormErrors] = useState<ValidationMap>({});
  const [inviteFormErrors, setInviteFormErrors] = useState<ValidationMap>({});
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
        supportEmail: selectedAdminCompany.supportEmail,
        supportPhone: selectedAdminCompany.supportPhone,
        accentColor: selectedAdminCompany.accentColor,
        logoText: selectedAdminCompany.logoText,
      });
      return;
    }

    setCompanyForm({
      name: '',
      description: '',
      supportEmail: '',
      supportPhone: '',
      accentColor: '#145DA0',
      logoText: '',
    });
  }, [selectedAdminCompany]);

  useEffect(() => {
    if (currentCompany) {
      setCompanySettingsForm({
        name: currentCompany.name,
        description: currentCompany.description,
        supportEmail: currentCompany.supportEmail,
        supportPhone: currentCompany.supportPhone,
        accentColor: currentCompany.accentColor,
        logoText: currentCompany.logoText,
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
      catalogItemId: companyItems[0]?.id ?? '',
      title: '',
      headline: '',
      badgeText: '',
      discountLabel: '',
      startsAtLabel: '',
      endsAtLabel: '',
      isActive: true,
      sortOrder: '0',
    });
  }, [companyItems, selectedPromotion]);

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
    { key: 'home', label: 'Home', icon: 'home-outline' },
    { key: 'browse', label: 'Browse', icon: 'grid-outline' },
    { key: 'explore', label: 'Explore', icon: 'search-outline' },
    { key: 'orders', label: 'Orders', icon: 'receipt-outline' },
    { key: 'profile', label: 'Profile', icon: 'person-outline' },
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
  const visibleCustomerCategories = APP_CATEGORY_OPTIONS.filter((category) => category.toLowerCase().includes(customerCategoryQuery.trim().toLowerCase()));

  const activeWorkspaceLabel =
    activeRole === 'admin'
      ? 'Admin control center'
      : activeRole === 'company'
        ? 'Company operations workspace'
        : activeRole === 'customer'
          ? 'Customer account workspace'
          : 'Public marketplace access';

  function resetAdminDrafts() {
    setSelectedAdminCompanyId(null);
    setCompanyFormErrors({});
    setCompanyForm({
      name: '',
      description: '',
      supportEmail: '',
      supportPhone: '',
      accentColor: '#145DA0',
      logoText: '',
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
      isPublished: true,
      featured: false,
      loyaltyPoints: '10',
      imageUrl: '',
      imageHint: '',
    });
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
    const errors = validateCompanyDraft(companyForm);
    setCompanyFormErrors(errors);
    if (Object.keys(errors).length) {
      setAdminBanner({ tone: 'error', text: 'Fix the company form errors before saving.' });
      return;
    }

    try {
      if (selectedAdminCompany) {
        await updateCompany(selectedAdminCompany.id, companyForm);
        setAdminBanner({ tone: 'success', text: 'Company changes saved.' });
      } else {
        await createCompany(companyForm);
        setAdminBanner({ tone: 'success', text: 'Company workspace created.' });
        resetAdminDrafts();
      }
    } catch (error) {
      setAdminBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to save company.' });
    }
  }

  async function handleInvitationSend() {
    const errors = validateInvitationDraft(inviteForm);
    setInviteFormErrors(errors);
    if (Object.keys(errors).length) {
      setAdminBanner({ tone: 'error', text: 'Fix the invitation details before sending.' });
      return;
    }

    setInviteSubmitting(true);
    try {
      await inviteCompany(inviteForm);
      setInviteForm({ companyName: '', email: '', message: '' });
      setInviteFormErrors({});
      setAdminBanner({ tone: 'success', text: 'Company invitation sent with username and temporary password.' });
    } catch (error) {
      setAdminBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to send invitation.' });
    } finally {
      setInviteSubmitting(false);
    }
  }

  async function handleInvitationResend(invitation: CompanyInvitation) {
    try {
      await resendCompanyInvitation(invitation.id);
      setAdminBanner({ tone: 'success', text: `Invitation re-sent to ${invitation.email}.` });
    } catch (error) {
      setAdminBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to resend invitation.' });
    }
  }

  async function handleInvitationRevoke(invitation: CompanyInvitation) {
    try {
      await revokeInvitation(invitation.id);
      setAdminBanner({ tone: 'info', text: `Invitation revoked for ${invitation.email}.` });
    } catch (error) {
      setAdminBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to revoke invitation.' });
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

    try {
      await updateCompany(currentCompany.id, companySettingsForm);
      setCompanyBanner({ tone: 'success', text: 'Workspace settings updated.' });
    } catch (error) {
      setCompanyBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to update company workspace.' });
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
        text: selectedCatalogItem
          ? 'Catalog item updated. Customers can now see the latest version.'
          : catalogForm.isPublished
            ? 'Catalog item published and visible to customers.'
            : 'Catalog item saved as a draft.',
      });
      resetCatalogDrafts();
    } catch (error) {
      setCompanyBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to save catalog item.' });
    } finally {
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
      setCompanyBanner({ tone: 'success', text: selectedPromotion ? 'Promotion updated.' : 'Promotion saved.' });
    } catch (error) {
      setCompanyBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to save promotion.' });
    }
  }

  async function handleOfferDelete(promotionId: string) {
    try {
      await deleteOfferPromotion(promotionId);
      if (selectedPromotionId === promotionId) {
        setSelectedPromotionId(null);
      }
      setCompanyBanner({ tone: 'info', text: 'Promotion removed.' });
    } catch (error) {
      setCompanyBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to delete promotion.' });
    }
  }

  async function handleAuthAction() {
    const errors = authMode === 'signin' ? validateSignInDraft(signInForm) : validateSignUpDraft(signUpForm);
    setAuthErrors(errors);
    if (Object.keys(errors).length) {
      setCustomerBanner({ tone: 'error', text: 'Fix the account form before continuing.' });
      return;
    }

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
    }
  }

  async function handleCompleteNewPassword() {
    const trimmedPassword = newPassword.trim();
    if (trimmedPassword.length < 8) {
      setAuthErrors((current) => ({ ...current, newPassword: 'New password must be at least 8 characters.' }));
      setCustomerBanner({ tone: 'error', text: 'Enter a valid new password to complete sign-in.' });
      return;
    }

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
    }
  }

  async function handleSignOut() {
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
    }
  }

  async function handleNotificationOpen(notification: AppNotification) {
    if (!notification.isRead) {
      await markNotificationRead(notification.id);
    }

    if (activeRole === 'admin') {
      setAdminTab((['overview', 'companies', 'publishing', 'bookings', 'settings'] as const).includes(notification.destinationTab as any)
        ? (notification.destinationTab as 'overview' | 'companies' | 'publishing' | 'bookings' | 'settings')
        : 'overview');
      return;
    }

    if (activeRole === 'company') {
      setCompanyTab((['overview', 'catalog', 'offers', 'bookings', 'loyalty'] as const).includes(notification.destinationTab as any)
        ? (notification.destinationTab as 'overview' | 'catalog' | 'offers' | 'bookings' | 'loyalty')
        : 'overview');
      return;
    }

    setCustomerTab((['home', 'browse', 'explore', 'orders', 'profile', 'notifications'] as const).includes(notification.destinationTab as any)
      ? (notification.destinationTab as 'home' | 'browse' | 'explore' | 'orders' | 'profile' | 'notifications')
      : 'notifications');
  }

  function handleNotificationPress() {
    if (!customerNotifications.length) {
      setCustomerBanner({ tone: 'info', text: authUser ? 'No new notifications right now.' : 'Sign in to receive booking updates and personal notifications.' });
      return;
    }

    setCustomerTab('notifications');
  }

  async function handleConfirmCode() {
    const trimmedCode = confirmCode.trim();
    if (!trimmedCode) {
      setAuthErrors((current) => ({ ...current, confirmCode: 'Verification code is required.' }));
      setCustomerBanner({ tone: 'error', text: 'Enter the email verification code first.' });
      return;
    }

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
    }
  }

  async function handleProfileSave() {
    const errors = validateProfileDraft(profileForm);
    setProfileErrors(errors);
    if (Object.keys(errors).length) {
      setCustomerBanner({ tone: 'error', text: 'Fix the profile details before saving.' });
      return;
    }

    try {
      await saveProfile(profileForm);
      setCustomerBanner({ tone: 'success', text: 'Profile saved.' });
    } catch (error) {
      setCustomerBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to save profile.' });
    }
  }

  async function handleAddressSave() {
    const errors = validateAddressDraft(addressForm);
    setAddressErrors(errors);
    if (Object.keys(errors).length) {
      setCustomerBanner({ tone: 'error', text: 'Fix the address fields before saving.' });
      return;
    }

    try {
      await saveAddress({ ...addressForm, isDefault: true });
      setCustomerBanner({ tone: 'success', text: 'Default address saved.' });
    } catch (error) {
      setCustomerBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to save address.' });
    }
  }

  async function handleBookingPlace() {
    const errors = validateBookingDraft(bookingComposer, authUser, addresses);
    setBookingErrors(errors);
    if (Object.keys(errors).length) {
      setCustomerBanner({ tone: 'error', text: authUser ? 'Fix the booking details before placing the order.' : 'Open Profile and sign in before placing a booking.' });
      if (!authUser) {
        setCustomerTab('profile');
      }
      return;
    }

    try {
      await placeBooking(bookingComposer);
      setBookingComposer((current) => ({ ...current, itemId: '', companyId: '', notes: '' }));
      setBookingErrors({});
      setCustomerTab('orders');
      setCustomerBanner({ tone: 'success', text: 'Booking placed successfully.' });
    } catch (error) {
      Alert.alert('Booking failed', error instanceof Error ? error.message : 'Unable to place booking.');
      setCustomerBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to place booking.' });
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
        <View style={[styles.customerShell, customerDarkMode && styles.customerShellDark]}>
          <View style={[styles.customerHeaderPlain, customerTab === 'home' && styles.customerHeaderPlainHome]}>
            <Pressable style={[styles.customerHeaderIconButton, customerDarkMode && styles.customerHeaderIconButtonDark]} onPress={() => setCustomerCategoryMenuOpen(true)}>
              <Ionicons name="menu-outline" size={22} color={customerDarkMode ? '#F5F7FA' : colors.text} />
            </Pressable>

            <Pressable style={styles.customerHeaderCenteredBrand} onPress={() => setCustomerTab('home')}>
              <Text style={[styles.customerHeaderCenteredTitle, customerDarkMode && styles.customerHeaderCenteredTitleDark]}>Jahzeen</Text>
            </Pressable>

            <View style={styles.customerHeaderActions}>
              <Pressable style={[styles.customerHeaderIconButton, customerDarkMode && styles.customerHeaderIconButtonDark]} onPress={() => setCustomerTab('explore')}>
                <Ionicons name="search-outline" size={20} color={customerDarkMode ? '#F5F7FA' : colors.text} />
              </Pressable>

              <Pressable style={[styles.customerHeaderIconButton, customerDarkMode && styles.customerHeaderIconButtonDark]} onPress={handleNotificationPress}>
                <Ionicons name="notifications-outline" size={20} color={customerDarkMode ? '#F5F7FA' : colors.text} />
                {customerNotificationCount ? (
                  <View style={styles.customerHeaderIconBadge}>
                    <Text style={styles.customerHeaderIconBadgeText}>{Math.min(customerNotificationCount, 99)}</Text>
                  </View>
                ) : null}
              </Pressable>
            </View>
          </View>

          <View style={styles.customerWorkspaceHost}>
            <CustomerWorkspace
              wide={wide}
              tab={customerTab}
              onTabChange={setCustomerTab}
              authUser={authUser}
              currentUserRole={currentUserRecord?.role ?? 'customer'}
              marketplaceItems={marketplaceItems}
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

          <View style={[styles.customerBottomDock, customerDarkMode && styles.customerBottomDockDark]}>
            <BottomNavBar
              items={customerTabs}
              selectedKey={customerTab}
              onChange={(value) => setCustomerTab(value as 'home' | 'browse' | 'explore' | 'orders' | 'profile')}
              containerStyle={customerDarkMode ? styles.bottomNavDark : undefined}
              itemStyle={customerDarkMode ? styles.bottomNavItemDark : undefined}
              textStyle={customerDarkMode ? styles.bottomNavTextDark : undefined}
              darkMode={customerDarkMode}
            />
          </View>

          <OperationPopup visible={!!operationPopup} tone={operationPopup?.tone ?? 'success'} text={operationPopup?.text ?? ''} onClose={() => setOperationPopup(null)} />

          <Modal visible={customerCategoryMenuOpen} transparent animationType="slide" onRequestClose={() => setCustomerCategoryMenuOpen(false)}>
            <View style={styles.customerCategoryDrawerOverlay}>
              <Pressable style={styles.customerCategoryDrawerBackdrop} onPress={() => setCustomerCategoryMenuOpen(false)} />
              <View style={styles.customerCategoryDrawer}>
                <Text style={styles.customerCategoryDrawerTitle}>Categories</Text>
                <View style={styles.customerCategorySearchWrap}>
                  <TextInput
                    value={customerCategoryQuery}
                    onChangeText={setCustomerCategoryQuery}
                    placeholder="Search categories"
                    placeholderTextColor="#8A8F98"
                    style={styles.customerCategorySearchInput}
                  />
                  <Ionicons name="search-outline" size={22} color="#D5D8DE" />
                </View>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.customerCategoryDrawerList}>
                  {visibleCustomerCategories.map((category) => (
                    <Pressable
                      key={category}
                      style={styles.customerCategoryDrawerRow}
                      onPress={() => {
                        setSelectedCustomerCategory(category);
                        setCustomerSearchQuery('');
                        setCustomerCategoryMenuOpen(false);
                        setCustomerTab('explore');
                      }}
                    >
                      <Text style={styles.customerCategoryDrawerRowText}>{category}</Text>
                      <Ionicons name="chevron-forward-outline" size={20} color="#D7DADF" />
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[colors.hero, '#FFF8EF']} style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextWrap}>
              <Text style={styles.brandName}>Jahzeen</Text>
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
        </LinearGradient>

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
            invitations={invitations}
            form={companyForm}
            onFormChange={setCompanyForm}
            formErrors={companyFormErrors}
            selectedCompany={selectedAdminCompany}
            onSelectCompany={setSelectedAdminCompanyId}
            onSaveCompany={handleCompanySave}
            onResetCompany={resetAdminDrafts}
            onDeleteCompany={deleteCompany}
            onToggleCompany={setCompanyActive}
            inviteForm={inviteForm}
            onInviteFormChange={setInviteForm}
            inviteErrors={inviteFormErrors}
            inviteSubmitting={inviteSubmitting}
            onInvite={handleInvitationSend}
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
            loyaltyForm={loyaltyForm}
            onLoyaltyFormChange={setLoyaltyForm}
            loyaltyErrors={loyaltyFormErrors}
            onSaveLoyalty={handleLoyaltySave}
            currentProgram={currentCompanyProgram}
          />
        ) : null}

        {busy ? <ActivityIndicator color={colors.primary} style={styles.busyIndicator} /> : null}
      </ScrollView>
      <OperationPopup visible={!!operationPopup} tone={operationPopup?.tone ?? 'success'} text={operationPopup?.text ?? ''} onClose={() => setOperationPopup(null)} />
    </SafeAreaView>
  );
}

type AdminWorkspaceProps = {
  wide: boolean;
  tab: 'overview' | 'companies' | 'publishing' | 'bookings' | 'settings';
  onTabChange: (tab: 'overview' | 'companies' | 'publishing' | 'bookings' | 'settings') => void;
  metrics: Array<{ label: string; value: string }>;
  bookings: Booking[];
  catalogItems: CatalogItem[];
  offerPromotions: OfferPromotion[];
  notifications: AppNotification[];
  auditEvents: AuditEvent[];
  ratings: Array<{ id: string; companyId: string; score: number }>;
  users: Array<{ id: string; fullName: string; role: string; email: string; companyName?: string }>;
  companies: Company[];
  invitations: CompanyInvitation[];
  form: {
    name: string;
    description: string;
    supportEmail: string;
    supportPhone: string;
    accentColor: string;
    logoText: string;
  };
  onFormChange: React.Dispatch<React.SetStateAction<{
    name: string;
    description: string;
    supportEmail: string;
    supportPhone: string;
    accentColor: string;
    logoText: string;
  }>>;
  formErrors: ValidationMap;
  selectedCompany: Company | null;
  onSelectCompany: (companyId: string | null) => void;
  onSaveCompany: () => void;
  onResetCompany: () => void;
  onDeleteCompany: (companyId: string) => Promise<void>;
  onToggleCompany: (companyId: string, isActive: boolean) => Promise<void>;
  inviteForm: { companyName: string; email: string; message: string };
  onInviteFormChange: React.Dispatch<React.SetStateAction<{ companyName: string; email: string; message: string }>>;
  inviteErrors: ValidationMap;
  inviteSubmitting: boolean;
  onInvite: () => void;
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
  invitations,
  form,
  onFormChange,
  formErrors,
  selectedCompany,
  onSelectCompany,
  onSaveCompany,
  onResetCompany,
  onDeleteCompany,
  onToggleCompany,
  inviteForm,
  onInviteFormChange,
  inviteErrors,
  inviteSubmitting,
  onInvite,
  onResendInvitation,
  onRevokeInvitation,
  onOpenNotification,
  banner,
}: AdminWorkspaceProps) {
  const ultraWide = useWindowDimensions().width >= 1360;
  const [adminTrendWindow, setAdminTrendWindow] = useState<7 | 30 | 90>(30);
  const [adminTrendFocus, setAdminTrendFocus] = useState<'activity' | 'bookings' | 'revenue'>('activity');
  const [companyStatusFilter, setCompanyStatusFilter] = useState<'all' | 'active' | 'paused' | 'attention'>('all');
  const [publishingFilter, setPublishingFilter] = useState<'all' | 'service' | 'product' | 'attention'>('all');
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
  const publishedCatalogCount = catalogItems.filter((item) => item.isPublished).length;
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

  return (
    <>
      <SegmentControl
        items={[
          { key: 'overview', label: 'Overview' },
          { key: 'companies', label: 'Companies' },
          { key: 'publishing', label: 'Publishing' },
          { key: 'bookings', label: 'Bookings' },
          { key: 'settings', label: 'Settings' },
        ]}
        selectedKey={tab}
        onChange={(value) => onTabChange(value as 'overview' | 'companies' | 'publishing' | 'bookings' | 'settings')}
      />
      {banner ? <StatusBanner tone={banner.tone} text={banner.text} /> : null}

      {tab === 'overview' ? (
        <>
          <LinearGradient colors={['#12385E', '#1D5F97', '#2F84C8']} style={styles.workspaceShowcase}>
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
                title="Invites and access"
                body="Send owner invitations and resolve account readiness from settings."
                onPress={() => onTabChange('settings')}
              />
            </View>
          </LinearGradient>

          <View style={[styles.metricGrid, wide && styles.metricGridWide]}>
            {metrics.map((metric) => (
              <MetricCard key={metric.label} label={metric.label} value={metric.value} />
            ))}
            <MetricCard label="Catalog live" value={String(publishedCatalogCount)} />
            <MetricCard label="Action needed" value={String(pendingInvitations.length + pausedCompanies.length)} />
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

            <SectionCard title="Management rules" subtitle="Company creation now happens through invitations in Settings. This page is dedicated to operational management only.">
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
            <SectionCard title="Published by companies" subtitle="Admins can inspect all products and services companies have pushed live to customers.">
              <View style={styles.filterChipRow}>
                <ChoiceChip label="All" selected={publishingFilter === 'all'} onPress={() => setPublishingFilter('all')} />
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
                      actionLabel="Open company"
                      onAction={() => onSelectCompany(item.companyId)}
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
            <SectionCard title="Access command" subtitle="Keep owner invitations, activation status, and partner account follow-up in one place.">
              <View style={styles.overviewBadgeRow}>
                <CompactBadge label="Pending" value={String(pendingInvitations.length)} />
                <CompactBadge label="Company users" value={String(companyUsers.length)} />
                <CompactBadge label="Admins" value={String(adminUsers.length)} />
              </View>
            </SectionCard>

            <SectionCard title="Invite company owner" subtitle="Admins can invite and manage partner access directly from settings.">
              <View style={styles.rowGap}>
                <FormField label="Company name" value={inviteForm.companyName} onChangeText={(value) => onInviteFormChange((current) => ({ ...current, companyName: value }))} error={inviteErrors.companyName} />
                <FormField label="Invite email" value={inviteForm.email} onChangeText={(value) => onInviteFormChange((current) => ({ ...current, email: value }))} error={inviteErrors.email} />
              </View>
              <FormField label="Message" value={inviteForm.message} onChangeText={(value) => onInviteFormChange((current) => ({ ...current, message: value }))} multiline />
              <Text style={styles.helperText}>Sending the invitation creates the company auth user, assigns the `company` role, and emails the username plus a temporary password.</Text>
              <PrimaryButton label="Send invitation" onPress={onInvite} loading={inviteSubmitting} disabled={inviteSubmitting} />
            </SectionCard>

            <SectionCard title="Company user management" subtitle="Invite company owners, monitor pending activations, and manage every partner account from one admin page.">
              {companyUsers.length ? companyUsers.map((user) => <InfoRow key={user.id} title={user.fullName} subtitle={`${user.email}${user.companyName ? ` · ${user.companyName}` : ''}`} />) : <EmptyState title="No company users yet" body="Send a company invitation first, then accepted company accounts will appear here." />}
            </SectionCard>

            <SectionCard title="Pending company invitations" subtitle="These accounts are not active company users until the invitation is accepted and the user confirms sign-up.">
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
              )) : <EmptyState title="No pending invitations" body="Every saved invitation is either accepted, revoked, or waiting for the next send." />}
            </SectionCard>
          </View>

          <View style={[styles.columnPane, wide && styles.columnPaneWide]}>
            <SectionCard title="Admin accounts" subtitle="Manual admin accounts survive refresh by resolving the role from Cognito session groups and the approved admin email list.">
              {adminUsers.length ? adminUsers.map((user) => <InfoRow key={user.id} title={user.fullName} subtitle={user.email} />) : <EmptyState title="No admin records yet" body="Manual admin sign-in creates the persistent admin user record after authentication." />}
            </SectionCard>
          </View>
        </View>
      ) : null}
    </>
  );
}

type CompanyWorkspaceProps = {
  wide: boolean;
  tab: 'overview' | 'catalog' | 'offers' | 'bookings' | 'loyalty';
  onTabChange: (tab: 'overview' | 'catalog' | 'offers' | 'bookings' | 'loyalty') => void;
  currentCompany: Company | null;
  companySettingsForm: {
    name: string;
    description: string;
    supportEmail: string;
    supportPhone: string;
    accentColor: string;
    logoText: string;
  };
  onCompanySettingsFormChange: React.Dispatch<React.SetStateAction<{
    name: string;
    description: string;
    supportEmail: string;
    supportPhone: string;
    accentColor: string;
    logoText: string;
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
  loyaltyForm,
  onLoyaltyFormChange,
  loyaltyErrors,
  onSaveLoyalty,
  currentProgram,
}: CompanyWorkspaceProps) {
  const ultraWide = useWindowDimensions().width >= 1360;
  const [companyTrendWindow, setCompanyTrendWindow] = useState<7 | 30 | 90>(30);
  const [companyTrendFocus, setCompanyTrendFocus] = useState<'activity' | 'bookings' | 'publishing'>('activity');
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'published' | 'draft' | 'attention'>('all');
  const [offerFilter, setOfferFilter] = useState<'all' | 'active' | 'paused' | 'attention'>('all');
  const [companyBookingFilter, setCompanyBookingFilter] = useState<'all' | 'pending' | 'active' | 'completed' | 'attention'>('all');
  const [companyCatalogSort, setCompanyCatalogSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'risk', direction: 'desc' });
  const [companyOfferSort, setCompanyOfferSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'risk', direction: 'desc' });
  const [companyBookingSort, setCompanyBookingSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'risk', direction: 'desc' });
  const unreadNotifications = notifications.filter((entry) => !entry.isRead);
  const pendingBookings = companyBookings.filter((entry) => entry.status === 'pending');
  const activePromotions = companyPromotions.filter((entry) => entry.isActive);
  const publishedItems = companyItems.filter((entry) => entry.isPublished).length;
  const draftItems = companyItems.length - publishedItems;
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
      statusLabel: companyItems.length ? `${formatPercentValue(publishedItems, companyItems.length)} live` : 'No listings yet',
      tone: companyItems.filter((item) => !item.imageUrl).length || draftItems > publishedItems ? 'warning' as const : 'info' as const,
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
    if (catalogFilter === 'published') {
      return companyItems.filter((entry) => entry.isPublished);
    }

    if (catalogFilter === 'draft') {
      return companyItems.filter((entry) => !entry.isPublished);
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
    status: (item) => (item.isPublished ? 1 : 0),
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
  const companyTrendDetails = getTrendInsight(companyTrendFocus, companyActivityTrend, companyBookingTrend, companyPublishingTrend, companyTrendWindow);

  return (
    <>
      <SegmentControl
        items={[
          { key: 'overview', label: 'Overview' },
          { key: 'catalog', label: 'Catalog' },
          { key: 'offers', label: 'Offers' },
          { key: 'bookings', label: 'Bookings' },
          { key: 'loyalty', label: 'Loyalty' },
        ]}
        selectedKey={tab}
        onChange={(value) => onTabChange(value as 'overview' | 'catalog' | 'offers' | 'bookings' | 'loyalty')}
      />
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
              <ShowcaseBadge label="Published" value={String(publishedItems)} />
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
            <MetricCard label="Published" value={String(publishedItems)} />
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
                  <OperationalStatusRow title="Publishing lane" detail={`${publishedItems} published items, ${draftItems} drafts, ${activePromotions.length} live offers`} statusLabel={currentProgram?.isActive ? 'Loyalty live' : 'Loyalty paused'} tone={draftItems > publishedItems && companyItems.length > 0 ? 'warning' : 'info'} />
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
                <OperationalStatusRow title="Catalog readiness" detail={`${publishedItems} items are live and ${draftItems} remain in draft.`} statusLabel={companyItems.length ? formatPercentValue(publishedItems, companyItems.length) : '0% live'} tone={publishedItems === 0 && companyItems.length > 0 ? 'warning' : 'info'} />
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
                  <CompactBadge label="Published" value={String(publishedItems)} />
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
                      <Ionicons name="image-outline" size={30} color={colors.primary} />
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
                  <ChoiceChip label="Published" selected={catalogForm.isPublished} onPress={() => onCatalogFormChange((current) => ({ ...current, isPublished: !current.isPublished }))} />
                </View>
                <SecondaryButton label={selectedCatalogItem ? 'Save item changes' : 'Publish catalog item'} tone="contrast" onPress={onSaveCatalog} loading={catalogSubmitting} disabled={catalogSubmitting} />
                <Text style={styles.catalogSubmitHint}>{catalogForm.isPublished ? 'Published items appear immediately in the customer marketplace for active companies.' : 'Draft items stay private until you switch them to published.'}</Text>
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
                  <CatalogFilterChip label="Published" count={publishedItems} selected={catalogFilter === 'published'} onPress={() => setCatalogFilter('published')} />
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
                      { key: 'status', label: 'State', sortable: true, render: (item) => <TableStatusPill label={item.isPublished ? 'Published' : 'Draft'} tone={item.isPublished ? 'success' : 'info'} /> },
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
                }) : <EmptyState title="No items in this filter" body={catalogFilter === 'draft' ? 'Every current listing is already published.' : catalogFilter === 'published' ? 'Publish a listing to make it visible here.' : catalogFilter === 'attention' ? 'No catalog risks are currently flagged.' : 'The marketplace remains empty until this company publishes something here.'} />}
              </SectionCard>
            </View>
          </View>
        ) : (
          <View style={styles.columnPane}>
            <SectionCard title="Catalog studio" subtitle="Build listings with a clearer publishing flow, stronger visibility states, and a more premium editing surface.">
              <View style={styles.overviewBadgeRow}>
                <CompactBadge label="Items" value={String(companyItems.length)} />
                <CompactBadge label="Published" value={String(publishedItems)} />
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
                    <Ionicons name="image-outline" size={30} color={colors.primary} />
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
                <ChoiceChip label="Published" selected={catalogForm.isPublished} onPress={() => onCatalogFormChange((current) => ({ ...current, isPublished: !current.isPublished }))} />
              </View>
              <SecondaryButton label={selectedCatalogItem ? 'Save item changes' : 'Publish catalog item'} tone="contrast" onPress={onSaveCatalog} loading={catalogSubmitting} disabled={catalogSubmitting} />
              <Text style={styles.catalogSubmitHint}>{catalogForm.isPublished ? 'Published items appear immediately in the customer marketplace for active companies.' : 'Draft items stay private until you switch them to published.'}</Text>
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
                <CatalogFilterChip label="Published" count={publishedItems} selected={catalogFilter === 'published'} onPress={() => setCatalogFilter('published')} />
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
              }) : <EmptyState title="No items in this filter" body={catalogFilter === 'draft' ? 'Every current listing is already published.' : catalogFilter === 'published' ? 'Publish a listing to make it visible here.' : catalogFilter === 'attention' ? 'No catalog risks are currently flagged.' : 'The marketplace remains empty until this company publishes something here.'} />}
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
                  {companyItems.filter((item) => item.isPublished).map((item) => (
                    <ChoiceChip key={item.id} label={item.title} selected={offerForm.catalogItemId === item.id} onPress={() => onOfferFormChange((current) => ({ ...current, catalogItemId: item.id }))} />
                  ))}
                </View>
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
                {companyItems.filter((item) => item.isPublished).map((item) => (
                  <ChoiceChip key={item.id} label={item.title} selected={offerForm.catalogItemId === item.id} onPress={() => onOfferFormChange((current) => ({ ...current, catalogItemId: item.id }))} />
                ))}
              </View>
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
    </>
  );
}

type CustomerWorkspaceProps = {
  wide: boolean;
  tab: 'home' | 'browse' | 'explore' | 'orders' | 'profile' | 'notifications';
  onTabChange: (tab: 'home' | 'browse' | 'explore' | 'orders' | 'profile' | 'notifications') => void;
  authUser: { email: string } | null;
  currentUserRole: string;
  marketplaceItems: CatalogItem[];
  featuredOffers: Array<{ promotion: OfferPromotion; item: CatalogItem }>;
  ratings: Array<{ id: string; bookingId: string; companyId: string; itemId: string; customerEmail: string; score: number; review: string; createdAtLabel: string }>;
  notifications: AppNotification[];
  bookingComposer: {
    itemId: string;
    companyId: string;
    scheduleDate: string;
    scheduleTime: string;
    addressId: string;
    notes: string;
    paymentMethod: PaymentMethod;
  };
  onBookingComposerChange: React.Dispatch<React.SetStateAction<{
    itemId: string;
    companyId: string;
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
  marketplaceItems,
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
  const [activeBrowseGroupKey, setActiveBrowseGroupKey] = useState<string>(CATEGORY_GROUPS[0]?.key ?? 'real-estate');
  const normalizedCustomerSearch = customerSearchQuery.trim().toLowerCase();
  const normalizedSelectedCategory = selectedCustomerCategory?.trim() || null;
  const allCategories = useMemo(
    () => Array.from(new Set([...APP_CATEGORY_OPTIONS, ...marketplaceItems.map((item) => item.category).filter(Boolean)])).sort((a, b) => a.localeCompare(b)),
    [marketplaceItems],
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
        const listingsCount = marketplaceItems.filter((item) => categories.includes(item.category)).length;
        return {
          ...group,
          categories,
          listingsCount,
        };
      }).filter((group) => group.categories.length),
    [allCategories, marketplaceItems],
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
  const liveCompanyCount = new Set(marketplaceItems.map((item) => item.companyId)).size;
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

  useEffect(() => {
    if (!normalizedSelectedCategory) {
      return;
    }

    const group = groupedCategoryCards.find((entry) => entry.categories.includes(normalizedSelectedCategory));
    if (group) {
      setActiveBrowseGroupKey(group.key);
    }
  }, [groupedCategoryCards, normalizedSelectedCategory]);
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
        <ScrollView style={styles.customerTabScroll} contentContainerStyle={styles.customerTabScrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.customerHomeScreen}>
          <View style={styles.customerHomeCarouselHeader}>
            <Text style={styles.customerHomeCarouselEyebrow}>Discover the marketplace</Text>
          </View>
          {carouselEntries.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} pagingEnabled snapToInterval={carouselCardWidth + 14} decelerationRate="fast" contentContainerStyle={styles.customerHomeCarouselRow}>
              {carouselEntries.map((entry, index) => (
                <CustomerHomeBannerCard
                  key={`${entry.title}-${index}`}
                  imageUrl={entry.imageUrl}
                  title={entry.title}
                  subtitle={entry.subtitle}
                  width={carouselCardWidth}
                  onPress={() => {
                    onTabChange('explore');
                  }}
                />
              ))}
            </ScrollView>
          ) : (
            <EmptyState title="Marketplace is empty" body="Once companies publish live listings, the home carousel will lead customers into the storefront." cardStyle={styles.customerHomeEmptyCard} titleStyle={styles.customerHomeSectionTitle} bodyStyle={styles.customerHomeSectionSubtitle} />
          )}

          <View style={styles.customerHomeSearchSection}>
            <View style={styles.customerHomeSearchBar}>
              <Ionicons name="search-outline" size={20} color={colors.primary} />
              <TextInput
                value={customerSearchQuery}
                onChangeText={onCustomerSearchQueryChange}
                onSubmitEditing={() => onTabChange('explore')}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                placeholder="Search products and services"
                placeholderTextColor="#8A8F98"
                style={styles.customerHomeSearchInput}
              />
              {customerSearchQuery ? (
                <Pressable style={styles.customerHomeSearchClearButton} onPress={() => onCustomerSearchQueryChange('')}>
                  <Ionicons name="close-outline" size={16} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>
            <View style={styles.customerHomeSearchMetaRow}>
              <Text style={styles.customerHomeSearchMetaText}>
                {normalizedCustomerSearch
                  ? `${filteredMarketplaceItems.length} matching products and services`
                  : 'Search products and services across the marketplace'}
              </Text>
              {normalizedCustomerSearch ? (
                <Pressable onPress={() => onTabChange('explore')}>
                  <Text style={styles.customerHomeSearchLink}>View all</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {normalizedCustomerSearch ? (
            <View style={styles.customerHomeSectionBlock}>
              <View style={styles.customerHomeSectionHeaderCompact}>
                <Text style={styles.customerHomeSectionTitle}>Search results</Text>
                <Text style={styles.customerHomeSectionMeta}>{filteredMarketplaceItems.length} found</Text>
              </View>
              {searchPreviewItems.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.customerHomeLotRow}>
                  {searchPreviewItems.map((item) => (
                    <CustomerHomeLotCard
                      key={`search-${item.id}`}
                      item={item}
                      onPress={() => {
                        onSelectItem(item);
                        onTabChange('explore');
                      }}
                    />
                  ))}
                </ScrollView>
              ) : (
                <EmptyState title="No products or services found" body="Try a different keyword or clear the selected category to widen the search." cardStyle={styles.customerHomeEmptyCard} titleStyle={styles.customerHomeSectionTitle} bodyStyle={styles.customerHomeSectionSubtitle} />
              )}
            </View>
          ) : null}

          <View style={styles.customerHomeSectionBlock}>
            <View style={styles.customerHomeSectionHeaderCompact}>
              <Text style={styles.customerHomeSectionTitle}>Category hubs</Text>
              <Text style={styles.customerHomeSectionMeta}>{allCategories.length} categories</Text>
            </View>
            {groupedCategoryCards.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.customerCategoryHubRow}>
                {groupedCategoryCards.map((group) => (
                  <Pressable
                    key={group.key}
                    style={styles.customerCategoryHubCard}
                    onPress={() => {
                      setActiveBrowseGroupKey(group.key);
                      onSelectCustomerCategory(group.categories[0] ?? null);
                      onTabChange('browse');
                    }}
                  >
                    <View style={styles.customerCategoryHubTopRow}>
                      <View style={styles.customerCategoryHubIconWrap}>
                        <Ionicons name={group.icon} size={18} color={colors.primary} />
                      </View>
                      <Text style={styles.customerCategoryHubCount}>{group.listingsCount} ads</Text>
                    </View>
                    <Text style={styles.customerCategoryHubTitle}>{group.title}</Text>
                    <Text style={styles.customerCategoryHubMeta}>{group.categories.slice(0, 2).join(' · ')}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </View>

          <View style={styles.customerHomeSectionHeader}>
            <View style={styles.infoBodyGrow}>
              <Text style={styles.customerHomeSectionTitle}>Jahzeen Live Picks</Text>
              <Text style={styles.customerHomeSectionSubtitle}>Browse now and discover standout listings from trusted companies.</Text>
            </View>
          </View>

          {liveEntries.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.customerHomeLotRow}>
              {liveEntries.map((entry) => (
                <CustomerHomeLotCard
                  key={entry.item.id}
                  item={entry.item}
                  promotion={entry.promotion}
                  onPress={() => {
                    onSelectItem(entry.item);
                    onTabChange('explore');
                  }}
                />
              ))}
            </ScrollView>
          ) : null}

          <Pressable style={styles.customerHomePrimaryCta} onPress={() => onTabChange('explore')}>
            <Text style={styles.customerHomePrimaryCtaText}>see more lots</Text>
          </Pressable>

          <View style={styles.customerHomeSectionBlock}>
            <View style={styles.customerHomeSectionHeaderCompact}>
              <Text style={styles.customerHomeSectionTitle}>Browse by category</Text>
              <Text style={styles.customerHomeSectionMeta}>{liveCompanyCount} companies live</Text>
            </View>
            {categories.length ? (
              <View style={styles.customerHomeCategoryRow}>
                {categories.map((category) => (
                  <Pressable key={category} style={styles.customerHomeCategoryChip} onPress={() => {
                    onSelectCustomerCategory(category);
                    onCustomerSearchQueryChange('');
                    onTabChange('explore');
                  }}>
                    <Text style={styles.customerHomeCategoryChipText}>{category}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          {selectedCustomerCategory ? (
            <Pressable style={styles.customerHomeActiveFilterChip} onPress={() => onSelectCustomerCategory(null)}>
              <Text style={styles.customerHomeActiveFilterChipText}>{selectedCustomerCategory} · Clear</Text>
            </Pressable>
          ) : null}

          <View style={styles.customerHomeStatsPanel}>
            <View style={styles.customerHomeStatCard}>
              <Text style={styles.customerHomeStatValue}>{liveCompanyCount}</Text>
              <Text style={styles.customerHomeStatLabel}>Live companies</Text>
            </View>
            <View style={styles.customerHomeStatCard}>
              <Text style={styles.customerHomeStatValue}>{marketplaceItems.length}</Text>
              <Text style={styles.customerHomeStatLabel}>Visible listings</Text>
            </View>
            <View style={styles.customerHomeStatCard}>
              <Text style={styles.customerHomeStatValue}>{featuredItems.length || Math.min(3, marketplaceItems.length)}</Text>
              <Text style={styles.customerHomeStatLabel}>Featured now</Text>
            </View>
          </View>
        </View>
        </ScrollView>
      ) : null}

      {tab === 'browse' ? (
        <ScrollView style={styles.customerTabScroll} contentContainerStyle={styles.customerTabScrollContent} showsVerticalScrollIndicator={false}>
          <SectionCard
            title="Browse categories"
            subtitle="Structured marketplace categories inspired by auction apps, refined for Jahzeen."
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
                      <Ionicons name={activeBrowseGroup.icon} size={18} color="#FFFFFF" />
                    </View>
                    <Text style={styles.customerLandingHeroBadge}>{activeBrowseGroup.listingsCount} live ads</Text>
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
                  {activeBrowseGroup.categories.map((category) => (
                    <Pressable
                      key={`landing-${category}`}
                      style={[
                        styles.customerBrowseChip,
                        normalizedSelectedCategory === category && styles.customerBrowseChipActive,
                      ]}
                      onPress={() => {
                        onSelectCustomerCategory(category);
                        onTabChange('explore');
                      }}
                    >
                      <Text
                        style={[
                          styles.customerBrowseChipText,
                          normalizedSelectedCategory === category && styles.customerBrowseChipTextActive,
                        ]}
                      >
                        {category}
                      </Text>
                    </Pressable>
                  ))}
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
                          <Ionicons name={group.icon} size={18} color={colors.primary} />
                        </View>
                        <Text style={styles.customerBrowseGroupTitle}>{group.title}</Text>
                      </View>
                      <Text style={styles.customerBrowseGroupCount}>{group.listingsCount} ads</Text>
                    </View>
                    <View style={styles.customerBrowseChipRow}>
                      {group.categories.map((category) => (
                        <Pressable
                          key={`${group.key}-${category}`}
                          style={[
                            styles.customerBrowseChip,
                            normalizedSelectedCategory === category && styles.customerBrowseChipActive,
                          ]}
                          onPress={() => {
                            onSelectCustomerCategory(category);
                            setActiveBrowseGroupKey(group.key);
                            onTabChange('explore');
                          }}
                        >
                          <Text
                            style={[
                              styles.customerBrowseChipText,
                              normalizedSelectedCategory === category && styles.customerBrowseChipTextActive,
                            ]}
                          >
                            {category}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          </SectionCard>
        </ScrollView>
      ) : null}

      {tab === 'explore' ? (
        <ScrollView style={styles.customerTabScroll} contentContainerStyle={styles.customerTabScrollContent} showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>
          <View style={styles.customerExploreStickyHeader}>
            <View style={styles.customerExploreStickySearchBar}>
              <Ionicons name="search-outline" size={18} color={colors.primary} />
              <TextInput
                value={customerSearchQuery}
                onChangeText={onCustomerSearchQueryChange}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                placeholder="Search products and services"
                placeholderTextColor="#8A8F98"
                style={styles.customerExploreStickySearchInput}
              />
              {customerSearchQuery ? (
                <Pressable style={styles.customerExploreSearchClearButton} onPress={() => onCustomerSearchQueryChange('')}>
                  <Ionicons name="close-outline" size={16} color={colors.muted} />
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

          <SectionCard title="Explore offers" subtitle={activeFilterSummary || 'Browse live products and services without authentication.'} cardStyle={customerTheme.card} titleStyle={customerTheme.title} subtitleStyle={customerTheme.subtitle}>
            {filteredMarketplaceItems.length ? (
              <View style={[styles.catalogGrid, wide && styles.catalogGridWide]}>
                {filteredMarketplaceItems.map((item) => (
                  <CustomerOfferCard key={item.id} item={item} darkMode={darkMode} ctaLabel="Book now" onPress={() => onSelectItem(item)} />
                ))}
              </View>
            ) : (
              <EmptyState title="No results match" body="Try another search or clear the selected category to see more listings." cardStyle={customerTheme.empty} titleStyle={customerTheme.title} bodyStyle={customerTheme.subtitle} />
            )}
          </SectionCard>

          {bookingComposer.itemId ? (
            <SectionCard title="Booking composer" subtitle={authUser ? 'Everything required to place the order is validated before submission.' : 'Guests can prepare an order here, then sign in from Profile to complete it.'} cardStyle={customerTheme.card} titleStyle={customerTheme.title} subtitleStyle={customerTheme.subtitle}>
              <View style={styles.rowGap}>
                <FormField label="Date" value={bookingComposer.scheduleDate} onChangeText={(value) => onBookingComposerChange((current) => ({ ...current, scheduleDate: value }))} error={bookingErrors.scheduleDate} theme={customerTheme.inputTheme} />
                <FormField label="Time" value={bookingComposer.scheduleTime} onChangeText={(value) => onBookingComposerChange((current) => ({ ...current, scheduleTime: value }))} error={bookingErrors.scheduleTime} theme={customerTheme.inputTheme} />
              </View>
              <FormField label="Notes" value={bookingComposer.notes} onChangeText={(value) => onBookingComposerChange((current) => ({ ...current, notes: value }))} multiline theme={customerTheme.inputTheme} />
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
        !authUser ? (
          <ScrollView style={styles.customerTabScroll} contentContainerStyle={styles.customerTabScrollContent} showsVerticalScrollIndicator={false}>
            <SectionCard title="Profile" subtitle="Sign in only when you need to order, track bookings, or save your preferences." cardStyle={customerTheme.card} titleStyle={customerTheme.title} subtitleStyle={customerTheme.subtitle}>
              <View style={[styles.darkModeCard, customerTheme.metaCard]}>
                <View style={styles.infoBodyGrow}>
                  <Text style={[styles.infoTitle, customerTheme.title]}>Appearance</Text>
                  <Text style={[styles.helperText, customerTheme.subtitle]}>Switch between light and dark mode from the profile tab.</Text>
                </View>
                <ChoiceChip label={darkMode ? 'Dark mode on' : 'Dark mode off'} selected={darkMode} onPress={onToggleDarkMode} />
              </View>
            </SectionCard>
            <SectionCard title="Login or create account" subtitle="Customers belong to the customer group after sign-up. Admins are manual accounts and company users only become company users from approved invitations." cardStyle={customerTheme.card} titleStyle={customerTheme.title} subtitleStyle={customerTheme.subtitle}>
            <View style={styles.toggleRow}>
              <ChoiceChip label="Sign in" selected={authMode === 'signin'} onPress={() => onAuthModeChange('signin')} />
              <ChoiceChip label="Sign up" selected={authMode === 'signup'} onPress={() => onAuthModeChange('signup')} />
            </View>
            {authMode === 'signin' ? (
              <>
                <FormField label="Email" value={signInForm.email} onChangeText={(value) => onSignInFormChange((current) => ({ ...current, email: value }))} error={authErrors.email} theme={customerTheme.inputTheme} />
                <FormField label="Password" value={signInForm.password} onChangeText={(value) => onSignInFormChange((current) => ({ ...current, password: value }))} error={authErrors.password} secureTextEntry theme={customerTheme.inputTheme} />
              </>
            ) : (
              <>
                <FormField label="Full name" value={signUpForm.fullName} onChangeText={(value) => onSignUpFormChange((current) => ({ ...current, fullName: value }))} error={authErrors.fullName} theme={customerTheme.inputTheme} />
                <FormField label="Email" value={signUpForm.email} onChangeText={(value) => onSignUpFormChange((current) => ({ ...current, email: value }))} error={authErrors.email} theme={customerTheme.inputTheme} />
                <FormField label="Phone" value={signUpForm.phone} onChangeText={(value) => onSignUpFormChange((current) => ({ ...current, phone: value }))} error={authErrors.phone} theme={customerTheme.inputTheme} />
                <FormField label="Password" value={signUpForm.password} onChangeText={(value) => onSignUpFormChange((current) => ({ ...current, password: value }))} error={authErrors.password} secureTextEntry theme={customerTheme.inputTheme} />
              </>
            )}
            {signInChallenge === 'newPasswordRequired' && authMode === 'signin' ? (
              <View style={[styles.verificationCard, customerTheme.verificationCard]}>
                <Text style={[styles.verificationTitle, customerTheme.title]}>New password required</Text>
                <Text style={[styles.helperText, customerTheme.subtitle]}>This Cognito user was created with a temporary password. Set a new password once, then the account will continue into the correct role workspace.</Text>
                <FormField label="New password" value={newPassword} onChangeText={onNewPasswordChange} error={authErrors.newPassword} secureTextEntry theme={customerTheme.inputTheme} />
                <PrimaryButton label="Set new password" onPress={onCompleteNewPassword} loading={authBusy} disabled={authBusy} />
              </View>
            ) : null}
            <PrimaryButton label={authMode === 'signin' ? 'Sign in' : 'Create account'} onPress={onAuthAction} loading={authBusy} disabled={authBusy || (authMode === 'signin' && signInChallenge === 'newPasswordRequired')} />
            {needsConfirmation ? (
              <View style={[styles.verificationCard, customerTheme.verificationCard]}>
                <Text style={[styles.verificationTitle, customerTheme.title]}>Email verification required</Text>
                <FormField label="Verification code" value={confirmCode} onChangeText={onConfirmCodeChange} error={authErrors.confirmCode} theme={customerTheme.inputTheme} />
                <SecondaryButton label="Confirm email" onPress={onConfirmCode} loading={authBusy} disabled={authBusy} />
              </View>
            ) : null}
            </SectionCard>
          </ScrollView>
        ) : (
          <ScrollView style={styles.customerTabScroll} contentContainerStyle={styles.customerTabScrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.workspaceColumns, wide && styles.workspaceColumnsWide]}>
            <View style={[styles.columnPane, wide && styles.columnPaneWide]}>
              <SectionCard title="Profile" subtitle={`Signed in as ${currentUserRole}`} cardStyle={customerTheme.card} titleStyle={customerTheme.title} subtitleStyle={customerTheme.subtitle}>
                <View style={[styles.darkModeCard, customerTheme.metaCard]}>
                  <View style={styles.infoBodyGrow}>
                    <Text style={[styles.infoTitle, customerTheme.title]}>Appearance</Text>
                    <Text style={[styles.helperText, customerTheme.subtitle]}>Dark mode is available from the profile tab and only affects the customer experience.</Text>
                  </View>
                  <ChoiceChip label={darkMode ? 'Dark mode on' : 'Dark mode off'} selected={darkMode} onPress={onToggleDarkMode} />
                </View>
                <FormField label="Full name" value={profileForm.fullName} onChangeText={(value) => onProfileFormChange((current) => ({ ...current, fullName: value }))} error={profileErrors.fullName} theme={customerTheme.inputTheme} />
                <FormField label="Email" value={profileForm.email} onChangeText={(value) => onProfileFormChange((current) => ({ ...current, email: value }))} error={profileErrors.email} theme={customerTheme.inputTheme} />
                <FormField label="Phone" value={profileForm.phone} onChangeText={(value) => onProfileFormChange((current) => ({ ...current, phone: value }))} error={profileErrors.phone} theme={customerTheme.inputTheme} />
                <View style={styles.toggleRow}>
                  <ChoiceChip label="Card" selected={profileForm.defaultPaymentMethod === 'card'} onPress={() => onProfileFormChange((current) => ({ ...current, defaultPaymentMethod: 'card' }))} />
                  <ChoiceChip label="Cash" selected={profileForm.defaultPaymentMethod === 'cash'} onPress={() => onProfileFormChange((current) => ({ ...current, defaultPaymentMethod: 'cash' }))} />
                  <ChoiceChip label="Apple Pay" selected={profileForm.defaultPaymentMethod === 'applePay'} onPress={() => onProfileFormChange((current) => ({ ...current, defaultPaymentMethod: 'applePay' }))} />
                </View>
                <PrimaryButton label="Save profile" onPress={onSaveProfile} />
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
                <PrimaryButton label="Save address" onPress={onSaveAddress} />
                <SecondaryButton label={authBusy ? 'Signing out...' : 'Sign out'} onPress={() => onSignOut()} loading={authBusy} disabled={authBusy} />
              </SectionCard>
            </View>
          </View>
          </ScrollView>
        )
      ) : null}
    </View>
  );
}

type OperationalTone = 'success' | 'info' | 'warning' | 'error';

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

function getCatalogRisk(item: CatalogItem, companyIsActive: boolean) {
  if (!companyIsActive) {
    return { tone: 'error' as const, label: 'Company paused', detail: 'This listing belongs to a paused company, so storefront visibility is at risk.' };
  }
  if (!item.imageUrl) {
    return { tone: 'warning' as const, label: 'Image missing', detail: 'This listing is missing a storefront image and will underperform visually.' };
  }
  if (!item.isPublished) {
    return { tone: 'info' as const, label: 'Draft', detail: 'This listing is still private and needs publishing before customers can discover it.' };
  }
  return { tone: 'success' as const, label: 'Ready', detail: 'This listing is visually complete and live in the marketplace.' };
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
  const publishedItems = catalogItems.filter((entry) => entry.companyId === company.id && entry.isPublished).length;
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
  width,
  onPress,
}: {
  imageUrl: string;
  title: string;
  subtitle: string;
  width: number;
  onPress: () => void;
}) {

  return (
    <Pressable style={[styles.customerHomeBannerCard, { width }]} onPress={onPress}>
      <Image source={{ uri: imageUrl }} style={styles.customerHomeBannerImage} resizeMode="cover" />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.16)', 'rgba(0,0,0,0.82)']} style={styles.customerHomeBannerOverlay}>
        <View style={styles.customerHomeBannerTopRow}>
          <View style={styles.customerHomeBannerSponsorPill}>
            <Text style={styles.customerHomeBannerSponsorText}>Featured</Text>
          </View>
          <Text style={styles.customerHomeBannerCompany}>Jahzeen Picks</Text>
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
    </Pressable>
  );
}

function CustomerHomeLotCard({ item, promotion, onPress }: { item: CatalogItem; promotion?: OfferPromotion; onPress: () => void }) {
  const countdown = promotion?.endsAtLabel ? getCountdownInfo(promotion.endsAtLabel).label : item.durationLabel || item.category;

  return (
    <Pressable style={styles.customerHomeLotCard} onPress={onPress}>
      <View style={styles.customerHomeLotImageWrap}>
        {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.customerHomeLotImage} resizeMode="cover" /> : null}
      </View>
      <Text style={styles.customerHomeLotTitle} numberOfLines={2}>{item.title}</Text>
      <View style={styles.customerHomeLotMetaRow}>
        <Ionicons name="time-outline" size={14} color={colors.accent} />
        <Text style={styles.customerHomeLotMetaText}>{countdown}</Text>
      </View>
      <View style={styles.customerHomeLotMetaRow}>
        <Ionicons name="business-outline" size={14} color="#8E98A3" />
        <Text style={styles.customerHomeLotMetaText}>{item.companyName}</Text>
      </View>
      <Text style={styles.customerHomeLotPrice}>QAR {item.price.toFixed(0)}</Text>
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
        <Ionicons name="chevron-down-outline" size={18} color={colors.muted} />
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
                  {value === option ? <Ionicons name="checkmark-outline" size={18} color={colors.primary} /> : null}
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

function isHexColor(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value.trim());
}

function validateCompanyDraft(draft: {
  name: string;
  description: string;
  supportEmail: string;
  supportPhone: string;
  accentColor: string;
  logoText: string;
}) {
  const errors: ValidationMap = {};
  if (!draft.name.trim()) errors.name = 'Company name is required.';
  if (!draft.description.trim()) errors.description = 'Description is required.';
  if (!isEmail(draft.supportEmail)) errors.supportEmail = 'Use a valid support email.';
  if (!draft.supportPhone.trim()) errors.supportPhone = 'Support phone is required.';
  if (!isHexColor(draft.accentColor)) errors.accentColor = 'Use a hex color like #145DA0.';
  if (!draft.logoText.trim()) errors.logoText = 'Logo text is required.';
  return errors;
}

function validateInvitationDraft(draft: { companyName: string; email: string }) {
  const errors: ValidationMap = {};
  if (!draft.companyName.trim()) errors.companyName = 'Company name is required.';
  if (!isEmail(draft.email)) errors.email = 'Use a valid invite email.';
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
}) {
  const errors: ValidationMap = {};
  if (!draft.title.trim()) errors.title = 'Title is required.';
  if (!draft.summary.trim()) errors.summary = 'Summary is required.';
  if (!draft.description.trim()) errors.description = 'Description is required.';
  if (!draft.category.trim()) errors.category = 'Category is required.';
  if (draft.category.trim() && !APP_CATEGORY_OPTIONS.includes(draft.category.trim())) errors.category = 'Choose a category from the application list.';
  if (!draft.durationLabel.trim()) errors.durationLabel = 'Duration is required.';
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
  draft: { itemId: string; scheduleDate: string; scheduleTime: string; addressId: string },
  authUser: { email: string } | null,
  addresses: Address[],
) {
  const errors: ValidationMap = {};
  if (!authUser) errors.auth = 'Sign in to place a booking.';
  if (!draft.itemId) errors.itemId = 'Choose an item first.';
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
        <Ionicons name="arrow-forward" size={16} color={colors.primary} />
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
            <Ionicons name={isSuccess ? 'checkmark' : 'close'} size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.operationPopupTitle}>{isSuccess ? 'Success' : 'Action failed'}</Text>
          <Text style={styles.operationPopupBody}>{text}</Text>
          <SecondaryButton label="Done" tone="contrast" onPress={onClose} />
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

function BottomNavBar({ items, selectedKey, onChange, containerStyle, itemStyle, textStyle, darkMode }: { items: Array<{ key: string; label: string; icon: string }>; selectedKey: string; onChange: (value: string) => void; containerStyle?: object; itemStyle?: object; textStyle?: object; darkMode: boolean }) {
  return (
    <View style={[styles.bottomNav, containerStyle]}>
      {items.map((item) => (
        <Pressable key={item.key} style={[styles.bottomNavItem, itemStyle, item.key === selectedKey && styles.bottomNavItemActive]} onPress={() => onChange(item.key)}>
          <Ionicons
            name={item.icon as keyof typeof Ionicons.glyphMap}
            size={18}
            color={item.key === selectedKey ? '#FFFFFF' : darkMode ? '#C8D3DC' : colors.muted}
          />
          <Text style={[styles.bottomNavText, textStyle, item.key === selectedKey && styles.bottomNavTextActive]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

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
        <Text style={styles.infoSubtitle}>{company.supportEmail} · {company.createdAtLabel} · {company.isActive ? 'Active' : 'Paused'}</Text>
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
        <Text style={styles.infoSubtitle}>{item.companyName} · {item.category} · QAR {item.price.toFixed(0)} · {item.isPublished ? 'Published' : 'Draft'}</Text>
        <Text style={styles.helperText}>{item.summary}</Text>
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
  const stateLabel = item.isPublished ? 'Live in marketplace' : 'Draft in studio';
  const stateHint = item.isPublished
    ? 'Customers can discover and book this listing right now.'
    : 'Complete the details and publish when the listing is ready.';
  const gradientColors: [string, string, string] = item.isPublished ? ['#D9EEFF', '#EEF8FF', '#FFFFFF'] : ['#FFF0DD', '#FFF7ED', '#FFFFFF'];
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
                <Ionicons name={illustrationIcon as keyof typeof Ionicons.glyphMap} size={28} color={item.isPublished ? '#145DA0' : '#B56A17'} />
              </View>
              <View style={styles.companyCatalogIllustrationTextWrap}>
                <Text style={styles.companyCatalogIllustrationTitle}>{item.companyName || 'Jahzeen partner'}</Text>
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  screenContent: {
    padding: 18,
    gap: 16,
    paddingBottom: 28,
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
    marginHorizontal: 18,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerHeaderCenteredTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '300',
    letterSpacing: 0.6,
  },
  customerHeaderCenteredTitleDark: {
    color: '#F7F8FA',
  },
  customerHeaderCard: {
    marginHorizontal: 18,
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
    width: 42,
    height: 42,
    borderRadius: 21,
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
    backgroundColor: '#145DA0',
    shadowColor: '#145DA0',
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
    paddingHorizontal: 18,
    paddingBottom: 140,
    gap: 16,
  },
  customerWorkspaceHost: {
    flex: 1,
    minHeight: 0,
  },
  customerWorkspace: {
    flex: 1,
    gap: 16,
  },
  customerTabScroll: {
    flex: 1,
  },
  customerTabScrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 140,
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
    gap: 18,
  },
  customerHomeCarouselHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
    paddingRight: 18,
  },
  customerHomeBannerCard: {
    height: 178,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#E8DED0',
    borderWidth: 1,
    borderColor: '#D8C9AF',
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
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
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
    minHeight: 64,
    borderRadius: 22,
    backgroundColor: '#FFF8EF',
    borderWidth: 1,
    borderColor: '#E3D6C1',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customerHomeSearchSection: {
    gap: 10,
  },
  customerHomeSearchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: '500',
    paddingVertical: 0,
  },
  customerHomeSearchClearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3EBDD',
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
  },
  customerHomeSectionHeaderCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  customerHomeSectionTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '300',
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
    paddingRight: 18,
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
    gap: 14,
    paddingTop: 10,
  },
  customerHomeCategoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  customerHomeCategoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFF8EF',
    borderWidth: 1,
    borderColor: '#DDD0BC',
  },
  customerHomeCategoryChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
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
    gap: 12,
    paddingRight: 18,
  },
  customerCategoryHubCard: {
    width: 236,
    minHeight: 126,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FFF8EF',
    borderWidth: 1,
    borderColor: '#E4D7C4',
    gap: 8,
  },
  customerCategoryHubTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  customerCategoryHubIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E9F1FA',
  },
  customerCategoryHubCount: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  customerCategoryHubTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  customerCategoryHubMeta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
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
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FFFBF5',
    borderWidth: 1,
    borderColor: '#E9DCC8',
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
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E9F1FA',
  },
  customerBrowseGroupTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  customerBrowseGroupCount: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  customerBrowseChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  customerBrowseChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3D8C8',
  },
  customerBrowseChipActive: {
    backgroundColor: '#E6F0FA',
    borderColor: '#B8D1EA',
  },
  customerBrowseChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  customerBrowseChipTextActive: {
    color: colors.primary,
  },
  customerExploreStickyHeader: {
    marginHorizontal: -18,
    paddingHorizontal: 18,
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
  customerCanvasDark: {
    backgroundColor: '#111922',
    borderRadius: 24,
    padding: 16,
  },
  heroCard: {
    borderRadius: 24,
    padding: 22,
    gap: 12,
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
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    shadowColor: '#1A3651',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  sectionSubtitle: {
    color: colors.muted,
    lineHeight: 21,
  },
  sectionBody: {
    gap: 12,
  },
  fieldWrap: {
    flex: 1,
    minWidth: 150,
    gap: 6,
  },
  fieldLabel: {
    fontWeight: '700',
    color: colors.text,
  },
  fieldLabelDark: {
    color: '#F2F4F7',
  },
  input: {
    backgroundColor: '#FAF8F2',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
  },
  selectFieldButton: {
    minHeight: 48,
    backgroundColor: '#FAF8F2',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  selectFieldText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FFF8EF',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2D5C1',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
    gap: 14,
  },
  selectFieldSheetTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  selectFieldSheetList: {
    gap: 10,
    paddingBottom: 8,
  },
  selectFieldOption: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2D7C7',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  selectFieldOptionText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
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
    minHeight: 96,
    textAlignVertical: 'top',
  },
  fieldError: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  statusBanner: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
    shadowColor: '#145DA0',
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
    padding: 22,
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
    gap: 12,
  },
  workspaceActionTile: {
    flex: 1,
    minWidth: 190,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
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
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8DDCB',
    gap: 12,
    minWidth: 240,
    flexGrow: 1,
    shadowColor: '#B08C51',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  marketplaceCardDark: {
    backgroundColor: '#1B2430',
    borderColor: '#2D3A48',
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
    padding: 16,
    gap: 6,
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
    gap: 10,
    backgroundColor: '#FAF8F2',
    borderRadius: 18,
    padding: 14,
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
    padding: 14,
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
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bottomNavDark: {
    backgroundColor: '#16202B',
    borderColor: '#273341',
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    gap: 4,
  },
  bottomNavItemDark: {
    backgroundColor: '#1D2A37',
  },
  bottomNavItemActive: {
    backgroundColor: colors.primary,
  },
  bottomNavText: {
    color: colors.muted,
    fontWeight: '700',
  },
  bottomNavTextDark: {
    color: '#C8D3DC',
  },
  bottomNavTextActive: {
    color: '#FFFFFF',
  },
  customerBottomDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: '#F6F4EEFA',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  customerBottomDockDark: {
    backgroundColor: '#0E151DFA',
    borderTopColor: '#273341',
  },
  verificationCard: {
    gap: 10,
    borderRadius: 18,
    backgroundColor: '#F7F9FC',
    padding: 14,
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