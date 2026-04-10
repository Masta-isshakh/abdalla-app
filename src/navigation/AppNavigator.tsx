import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  Image,
  Alert,
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
  const [customerTab, setCustomerTab] = useState<'home' | 'explore' | 'orders' | 'profile' | 'notifications'>('home');
  const [customerDarkMode, setCustomerDarkMode] = useState(false);
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

  useEffect(() => {
    setProfileForm(profile);
  }, [profile]);

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
  const customerCartCount = authUser ? customerBookings.length : 0;
  const customerNotificationCount = customerNotifications.filter((entry) => !entry.isRead).length;

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
      imageHint: '',
    });
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

    try {
      await inviteCompany(inviteForm);
      setInviteForm({ companyName: '', email: '', message: '' });
      setInviteFormErrors({});
      setAdminBanner({ tone: 'success', text: 'Invitation saved and queued for delivery.' });
    } catch (error) {
      setAdminBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to send invitation.' });
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
      return;
    }

    const errors = validateCatalogDraft(catalogForm);
    setCatalogFormErrors(errors);
    if (Object.keys(errors).length) {
      setCompanyBanner({ tone: 'error', text: 'Fix the catalog fields before saving.' });
      return;
    }

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
        imageHint: catalogForm.imageHint.trim(),
      });
      setCompanyBanner({ tone: 'success', text: selectedCatalogItem ? 'Catalog item updated.' : 'Catalog item saved.' });
      resetCatalogDrafts();
    } catch (error) {
      setCompanyBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to save catalog item.' });
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

    setCustomerTab((['home', 'explore', 'orders', 'profile', 'notifications'] as const).includes(notification.destinationTab as any)
      ? (notification.destinationTab as 'home' | 'explore' | 'orders' | 'profile' | 'notifications')
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
          <View style={styles.customerHeaderPlain}>
            <Pressable onPress={() => setCustomerTab('home')}>
              <Image source={require('../../assets/icon.png')} style={styles.customerLogoImage} resizeMode="contain" />
            </Pressable>

            <View style={styles.customerHeaderActions}>
              <Pressable style={[styles.customerHeaderIconButton, customerDarkMode && styles.customerHeaderIconButtonDark]} onPress={() => setCustomerTab('profile')}>
                <Ionicons name="person-outline" size={20} color={customerDarkMode ? '#F5F7FA' : colors.text} />
              </Pressable>

              <Pressable style={[styles.customerHeaderIconButton, customerDarkMode && styles.customerHeaderIconButtonDark]} onPress={() => setCustomerTab(authUser ? 'orders' : 'profile')}>
                <Ionicons name="cart-outline" size={20} color={customerDarkMode ? '#F5F7FA' : colors.text} />
                {customerCartCount ? (
                  <View style={styles.customerHeaderIconBadge}>
                    <Text style={styles.customerHeaderIconBadgeText}>{Math.min(customerCartCount, 99)}</Text>
                  </View>
                ) : null}
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

          <ScrollView style={styles.customerScroll} contentContainerStyle={styles.customerScrollContent} showsVerticalScrollIndicator={false}>
            <CustomerWorkspace
              wide={wide}
              tab={customerTab}
              onTabChange={setCustomerTab}
              authUser={authUser}
              currentUserRole={currentUserRecord?.role ?? 'customer'}
              marketplaceItems={marketplaceItems}
              featuredOffers={activeMarketplacePromotions}
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
          </ScrollView>

          <View style={[styles.customerBottomDock, customerDarkMode && styles.customerBottomDockDark]}>
            <BottomNavBar
              items={customerTabs}
              selectedKey={customerTab}
              onChange={(value) => setCustomerTab(value as 'home' | 'explore' | 'orders' | 'profile')}
              containerStyle={customerDarkMode ? styles.bottomNavDark : undefined}
              itemStyle={customerDarkMode ? styles.bottomNavItemDark : undefined}
              textStyle={customerDarkMode ? styles.bottomNavTextDark : undefined}
              darkMode={customerDarkMode}
            />
          </View>
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
            companyBookings={companyBookings}
            ratings={ratings}
            selectedCatalogItem={selectedCatalogItem}
            catalogForm={catalogForm}
            onCatalogFormChange={setCatalogForm}
            catalogErrors={catalogFormErrors}
            onSelectCatalogItem={setSelectedCatalogItemId}
            onSaveCatalog={handleCatalogSave}
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
  onInvite,
  onResendInvitation,
  onRevokeInvitation,
  onOpenNotification,
  banner,
}: AdminWorkspaceProps) {
  const adminUsers = users.filter((user) => user.role === 'admin');
  const companyUsers = users.filter((user) => user.role === 'company');
  const customerUsers = users.filter((user) => user.role === 'customer');
  const pendingInvitations = invitations.filter((invitation) => invitation.status === 'pending');
  const unreadNotifications = notifications.filter((entry) => !entry.isRead);
  const pausedCompanies = companies.filter((entry) => !entry.isActive);
  const recentBookings = bookings.slice(0, 4);
  const livePromotions = offerPromotions.filter((promotion) => promotion.isActive).length;
  const publishedCatalogCount = catalogItems.filter((item) => item.isPublished).length;

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
          </View>
          <View style={[styles.workspaceColumns, wide && styles.workspaceColumnsWide]}>
            <View style={styles.columnPane}>
              <SectionCard title="Operations pulse" subtitle="Use the dashboard to spot onboarding blockers, marketplace issues, and unread updates before you dive into forms.">
                <View style={[styles.metricGrid, wide && styles.metricGridWide]}>
                  <MetricCard label="Pending invites" value={String(pendingInvitations.length)} />
                  <MetricCard label="Paused companies" value={String(pausedCompanies.length)} />
                  <MetricCard label="Unread alerts" value={String(unreadNotifications.length)} />
                  <MetricCard label="Live promotions" value={String(livePromotions)} />
                </View>
                <View style={styles.rowGap}>
                  <SecondaryButton label="Review settings" onPress={() => onTabChange('settings')} />
                  <SecondaryButton label="Open bookings" onPress={() => onTabChange('bookings')} />
                </View>
              </SectionCard>

              <SectionCard title="Partner health" subtitle="A quick view of partner readiness, publishing volume, and support posture.">
                {companies.length ? companies.slice(0, 4).map((company) => {
                  const companyCatalogCount = catalogItems.filter((item) => item.companyId === company.id && item.isPublished).length;
                  const companyPromotionCount = offerPromotions.filter((promotion) => promotion.companyId === company.id && promotion.isActive).length;
                  return (
                    <InfoRow
                      key={company.id}
                      title={company.name}
                      subtitle={`${company.isActive ? 'Active' : 'Paused'} · ${companyCatalogCount} published items · ${companyPromotionCount} live promotions`}
                      actionLabel="Open"
                      onAction={() => onSelectCompany(company.id)}
                    />
                  );
                }) : <EmptyState title="No companies yet" body="Create the first partner workspace to start marketplace operations." />}
              </SectionCard>
            </View>

            <View style={styles.columnPane}>
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
          <View style={styles.columnPane}>
            <SectionCard title="Company operations" subtitle="Create and edit partner workspaces with stronger hierarchy, faster scanning, and clearer destructive states.">
              <View style={styles.overviewBadgeRow}>
                <CompactBadge label="Companies" value={String(companies.length)} />
                <CompactBadge label="Paused" value={String(pausedCompanies.length)} />
                <CompactBadge label="Invites" value={String(invitations.length)} />
              </View>
            </SectionCard>

            <SectionCard title={selectedCompany ? 'Edit company' : 'Create company'} subtitle="Provision partner workspaces with stricter validation and cleaner editing states.">
              <FormField label="Company name" value={form.name} onChangeText={(value) => onFormChange((current) => ({ ...current, name: value }))} error={formErrors.name} />
              <FormField label="Description" value={form.description} onChangeText={(value) => onFormChange((current) => ({ ...current, description: value }))} error={formErrors.description} multiline />
              <View style={styles.rowGap}>
                <FormField label="Support email" value={form.supportEmail} onChangeText={(value) => onFormChange((current) => ({ ...current, supportEmail: value }))} error={formErrors.supportEmail} />
                <FormField label="Support phone" value={form.supportPhone} onChangeText={(value) => onFormChange((current) => ({ ...current, supportPhone: value }))} error={formErrors.supportPhone} />
              </View>
              <View style={styles.rowGap}>
                <FormField label="Accent color" value={form.accentColor} onChangeText={(value) => onFormChange((current) => ({ ...current, accentColor: value }))} error={formErrors.accentColor} placeholder="#145DA0" />
                <FormField label="Logo text" value={form.logoText} onChangeText={(value) => onFormChange((current) => ({ ...current, logoText: value }))} error={formErrors.logoText} />
              </View>
              {selectedCompany ? (
                <View style={styles.toggleRow}>
                  <ChoiceChip label={selectedCompany.isActive ? 'Active' : 'Paused'} selected={selectedCompany.isActive} onPress={() => onToggleCompany(selectedCompany.id, !selectedCompany.isActive)} />
                </View>
              ) : null}
              <PrimaryButton label={selectedCompany ? 'Save company changes' : 'Create company'} onPress={onSaveCompany} />
              {selectedCompany ? (
                <View style={styles.rowGap}>
                  <SecondaryButton label="Cancel editing" onPress={onResetCompany} />
                  <SecondaryButton label="Remove company" tone="danger" onPress={() => onDeleteCompany(selectedCompany.id)} />
                </View>
              ) : null}
            </SectionCard>
          </View>

          <View style={styles.columnPane}>
            <SectionCard title="Partner companies" subtitle="Admins can inspect, pause, or reopen any company workspace.">
              {companies.length ? companies.map((company) => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  actionLabel="Edit"
                  onAction={() => onSelectCompany(company.id)}
                  secondaryActionLabel={company.isActive ? 'Pause' : 'Activate'}
                  onSecondaryAction={() => onToggleCompany(company.id, !company.isActive)}
                />
              )) : <EmptyState title="No companies yet" body="Create a company or invite a partner to populate the marketplace." />}
            </SectionCard>

            <SectionCard title="Invitation delivery" subtitle="Track invite acceptance and whether delivery succeeded or failed.">
              {invitations.length ? invitations.map((invitation) => (
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
          <View style={styles.columnPane}>
            <SectionCard title="Published by companies" subtitle="Admins can inspect all products and services companies have pushed live to customers.">
              {catalogItems.length ? catalogItems.map((item) => (
                <CatalogCard
                  key={item.id}
                  item={item}
                  actionLabel="Open company"
                  onAction={() => onSelectCompany(item.companyId)}
                />
              )) : <EmptyState title="No published items yet" body="Company products and services will appear here as soon as a partner publishes them." />}
            </SectionCard>
          </View>

          <View style={styles.columnPane}>
            <SectionCard title="Live promotions" subtitle="Promotions are now their own backend records, separate from the base product and service catalog.">
              {offerPromotions.length ? offerPromotions.map((promotion) => (
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
          {bookings.length ? bookings.map((booking) => <BookingCard key={booking.id} booking={booking} />) : <EmptyState title="No bookings yet" body="Bookings will appear here once customers order published items." />}
        </SectionCard>
      ) : null}

      {tab === 'settings' ? (
        <View style={[styles.workspaceColumns, wide && styles.workspaceColumnsWide]}>
          <View style={styles.columnPane}>
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
              <PrimaryButton label="Send invitation" onPress={onInvite} />
            </SectionCard>

            <SectionCard title="Company user management" subtitle="Invite company owners, monitor pending activations, and manage every partner account from one admin page.">
              {companyUsers.length ? companyUsers.map((user) => <InfoRow key={user.id} title={user.fullName} subtitle={`${user.email}${user.companyName ? ` · ${user.companyName}` : ''}`} />) : <EmptyState title="No company users yet" body="Send a company invitation first, then accepted company accounts will appear here." />}
            </SectionCard>

            <SectionCard title="Pending company invitations" subtitle="These accounts are not active company users until the invitation is accepted and the user confirms sign-up.">
              {pendingInvitations.length ? pendingInvitations.map((invitation) => (
                <InfoRow
                  key={invitation.id}
                  title={`${invitation.companyName} · ${invitation.email}`}
                  subtitle={`Delivery: ${invitation.emailDeliveryStatus}${invitation.emailSentAtLabel ? ` · ${invitation.emailSentAtLabel}` : ''}`}
                  actionLabel="Resend"
                  onAction={() => onResendInvitation(invitation)}
                  secondaryActionLabel="Revoke"
                  onSecondaryAction={() => onRevokeInvitation(invitation)}
                />
              )) : <EmptyState title="No pending invitations" body="Every saved invitation is either accepted, revoked, or waiting for the next send." />}
            </SectionCard>
          </View>

          <View style={styles.columnPane}>
            <SectionCard title="Customer accounts" subtitle="Signed-in customer accounts are separated here so company-user administration stays focused.">
              {customerUsers.length ? customerUsers.map((user) => <InfoRow key={user.id} title={user.fullName} subtitle={user.email} />) : <EmptyState title="No customers yet" body="Customer accounts will appear here after customer sign-up or sign-in." />}
            </SectionCard>

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
  companyBookings: Booking[];
  ratings: Array<{ id: string; companyId: string }>;
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
    imageHint: string;
  }>>;
  catalogErrors: ValidationMap;
  onSelectCatalogItem: (itemId: string | null) => void;
  onSaveCatalog: () => void;
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
  companyBookings,
  ratings,
  selectedCatalogItem,
  catalogForm,
  onCatalogFormChange,
  catalogErrors,
  onSelectCatalogItem,
  onSaveCatalog,
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
  const unreadNotifications = notifications.filter((entry) => !entry.isRead);
  const pendingBookings = companyBookings.filter((entry) => entry.status === 'pending');
  const activePromotions = companyPromotions.filter((entry) => entry.isActive);
  const publishedItems = companyItems.filter((entry) => entry.isPublished).length;
  const currentAccent = currentCompany?.accentColor?.trim() || colors.primary;

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
          </View>

          <View style={[styles.workspaceColumns, wide && styles.workspaceColumnsWide]}>
            <View style={styles.columnPane}>
              <SectionCard title={currentCompany?.name ?? 'Company workspace'} subtitle="A polished operations view should surface bookings, promotions, and unread activity before editing settings.">
                <View style={[styles.metricGrid, wide && styles.metricGridWide]}>
                  <MetricCard label="Pending bookings" value={String(pendingBookings.length)} />
                  <MetricCard label="Active offers" value={String(activePromotions.length)} />
                  <MetricCard label="Unread alerts" value={String(unreadNotifications.length)} />
                  <MetricCard label="Loyalty" value={currentProgram?.isActive ? 'Live' : 'Paused'} />
                </View>
                <View style={styles.rowGap}>
                  <SecondaryButton label="Catalog" onPress={() => onTabChange('catalog')} />
                  <SecondaryButton label="Offers" onPress={() => onTabChange('offers')} />
                  <SecondaryButton label="Bookings" onPress={() => onTabChange('bookings')} />
                </View>
              </SectionCard>

              <SectionCard title="Recent workspace activity" subtitle="Use recent activity to respond faster to bookings, publishing changes, and reviews.">
                {notifications.length ? notifications.slice(0, 6).map((notification) => (
                  <NotificationRow key={notification.id} notification={notification} onOpen={() => onOpenNotification(notification)} />
                )) : <EmptyState title="No activity yet" body="Notifications will appear here when customers book, rate, or respond to your offers." />}
              </SectionCard>
            </View>

            <View style={styles.columnPane}>
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
        <View style={[styles.workspaceColumns, wide && styles.workspaceColumnsWide]}>
          <View style={styles.columnPane}>
            <SectionCard title={selectedCatalogItem ? 'Edit catalog item' : 'Publish catalog item'} subtitle="Validation now blocks incomplete listings before they reach the marketplace.">
              <View style={styles.rowGap}>
                <FormField label="Title" value={catalogForm.title} onChangeText={(value) => onCatalogFormChange((current) => ({ ...current, title: value }))} error={catalogErrors.title} />
                <FormField label="Category" value={catalogForm.category} onChangeText={(value) => onCatalogFormChange((current) => ({ ...current, category: value }))} error={catalogErrors.category} />
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
              <FormField label="Image hint" value={catalogForm.imageHint} onChangeText={(value) => onCatalogFormChange((current) => ({ ...current, imageHint: value }))} />
              <View style={styles.toggleRow}>
                <ChoiceChip label="Service" selected={catalogForm.kind === 'service'} onPress={() => onCatalogFormChange((current) => ({ ...current, kind: 'service' }))} />
                <ChoiceChip label="Product" selected={catalogForm.kind === 'product'} onPress={() => onCatalogFormChange((current) => ({ ...current, kind: 'product' }))} />
                <ChoiceChip label="Published" selected={catalogForm.isPublished} onPress={() => onCatalogFormChange((current) => ({ ...current, isPublished: !current.isPublished }))} />
              </View>
              <PrimaryButton label={selectedCatalogItem ? 'Save item changes' : 'Save item'} onPress={onSaveCatalog} />
              {selectedCatalogItem ? (
                <View style={styles.rowGap}>
                  <SecondaryButton label="Cancel editing" onPress={onResetCatalog} />
                  <SecondaryButton label="Delete item" tone="danger" onPress={() => onDeleteCatalogItem(selectedCatalogItem.id)} />
                </View>
              ) : null}
            </SectionCard>
          </View>

          <View style={styles.columnPane}>
            <SectionCard title="Current catalog" subtitle="Only this company's items appear in this operational view.">
              {companyItems.length ? companyItems.map((item) => (
                <CatalogCard
                  key={item.id}
                  item={item}
                  actionLabel="Edit"
                  onAction={() => onSelectCatalogItem(item.id)}
                  secondaryActionLabel="Delete"
                  onSecondaryAction={() => onDeleteCatalogItem(item.id)}
                />
              )) : <EmptyState title="No catalog items yet" body="The marketplace remains empty until this company publishes something here." />}
            </SectionCard>
          </View>
        </View>
      ) : null}

      {tab === 'offers' ? (
        <View style={[styles.workspaceColumns, wide && styles.workspaceColumnsWide]}>
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
          </View>

          <View style={styles.columnPane}>
            <SectionCard title="Current promotions" subtitle="These are the offers customers will see highlighted on the marketplace home screen.">
              {companyPromotions.length ? companyPromotions.map((promotion) => (
                <InfoRow
                  key={promotion.id}
                  title={`${promotion.title} · ${promotion.catalogItemTitle}`}
                  subtitle={`${promotion.isActive ? 'Active' : 'Paused'}${promotion.discountLabel ? ` · ${promotion.discountLabel}` : ''}${promotion.badgeText ? ` · ${promotion.badgeText}` : ''}`}
                  actionLabel="Edit"
                  onAction={() => onSelectPromotion(promotion.id)}
                  secondaryActionLabel="Delete"
                  onSecondaryAction={() => onDeleteOffer(promotion.id)}
                />
              )) : <EmptyState title="No promotions yet" body="Create a promotion here after publishing a product or service in Catalog." />}
            </SectionCard>
          </View>
        </View>
      ) : null}

      {tab === 'bookings' ? (
        <SectionCard title="Company bookings" subtitle="Status controls are kept inside the company workspace so admins do not need to manage fulfilment.">
          {companyBookings.length ? companyBookings.map((booking) => (
            <View key={booking.id} style={styles.bookingWrap}>
              <BookingCard booking={booking} />
              <View style={styles.statusActions}>
                {(['approved', 'scheduled', 'enRoute', 'inProgress', 'completed'] as BookingStatus[]).map((status) => (
                  <ChoiceChip key={status} label={readableBookingStatus(status)} selected={booking.status === status} onPress={() => onChangeBookingStatus(booking.id, status)} />
                ))}
              </View>
            </View>
          )) : <EmptyState title="No bookings yet" body="Bookings will appear when customers place orders with your published listings." />}
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
  tab: 'home' | 'explore' | 'orders' | 'profile' | 'notifications';
  onTabChange: (tab: 'home' | 'explore' | 'orders' | 'profile' | 'notifications') => void;
  authUser: { email: string } | null;
  currentUserRole: string;
  marketplaceItems: CatalogItem[];
  featuredOffers: Array<{ promotion: OfferPromotion; item: CatalogItem }>;
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
  const customerItems = marketplaceItems.slice(0, 6);
  const featuredItems = featuredOffers.slice(0, 3);
  const displayItems = (featuredItems.length ? featuredItems.map((entry) => entry.item) : customerItems).slice(0, 3);
  const categories = Array.from(new Set(marketplaceItems.map((item) => item.category).filter(Boolean))).slice(0, 6);
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
        <>
          <SectionCard
            title="Professional home services, ready when you are"
            subtitle="Browse trusted companies, compare offers, and book only when you are ready. Guests can explore the full customer experience before signing in."
            cardStyle={customerTheme.card}
            titleStyle={customerTheme.title}
            subtitleStyle={customerTheme.subtitle}
          >
            <View style={[styles.homeHeroPanel, customerTheme.metaCard]}>
              <View style={styles.infoBodyGrow}>
                <Text style={styles.customerHeroEyebrow}>Curated for fast booking</Text>
                <Text style={[styles.homeHeroTitle, customerTheme.title]}>Home cleaning, maintenance, beauty, repairs, and more.</Text>
                <Text style={[styles.homeHeroBody, customerTheme.subtitle]}>Jahzeen keeps the storefront open to guests and keeps fulfilment inside dedicated admin and company groups.</Text>
              </View>
              <View style={styles.customerHeroActionRow}>
                <PrimaryButton label="Explore services" onPress={() => onTabChange('explore')} />
              </View>
            </View>
            <View style={[styles.metricGrid, wide && styles.metricGridWide]}>
              <CustomerMetricCard label="Live companies" value={String(new Set(marketplaceItems.map((item) => item.companyId)).size)} darkMode={darkMode} />
              <CustomerMetricCard label="Visible offers" value={String(marketplaceItems.length)} darkMode={darkMode} />
              <CustomerMetricCard label="Featured picks" value={String(featuredItems.length || Math.min(3, marketplaceItems.length))} darkMode={darkMode} />
            </View>
          </SectionCard>

          <SectionCard
            title="Popular categories"
            subtitle="A professional landing page should help customers scan categories before they commit to an order."
            cardStyle={customerTheme.card}
            titleStyle={customerTheme.title}
            subtitleStyle={customerTheme.subtitle}
          >
            {categories.length ? (
              <View style={styles.toggleRow}>
                {categories.map((category) => (
                  <ChoiceChip key={category} label={category} selected={false} onPress={() => onTabChange('explore')} />
                ))}
              </View>
            ) : (
              <EmptyState title="No categories yet" body="Once companies publish offers, customers will see categories and featured services here." cardStyle={customerTheme.empty} titleStyle={customerTheme.title} bodyStyle={customerTheme.subtitle} />
            )}
          </SectionCard>

          <SectionCard
            title="Featured offers"
            subtitle="Guests can preview real services and products directly from the home page."
            cardStyle={customerTheme.card}
            titleStyle={customerTheme.title}
            subtitleStyle={customerTheme.subtitle}
          >
            {displayItems.length ? (
              <View style={[styles.catalogGrid, wide && styles.catalogGridWide]}>
                {displayItems.map((item) => (
                  <CustomerOfferCard key={item.id} item={item} darkMode={darkMode} ctaLabel="View offer" onPress={() => { onSelectItem(item); onTabChange('explore'); }} />
                ))}
              </View>
            ) : (
              <EmptyState title="Marketplace is empty" body="No company has published items yet. Admins can create partner workspaces and companies can publish from their dashboard." cardStyle={customerTheme.empty} titleStyle={customerTheme.title} bodyStyle={customerTheme.subtitle} />
            )}
          </SectionCard>
        </>
      ) : null}

      {tab === 'explore' ? (
        <>
          <SectionCard title="Explore offers" subtitle="Browse live products and services without authentication." cardStyle={customerTheme.card} titleStyle={customerTheme.title} subtitleStyle={customerTheme.subtitle}>
            {marketplaceItems.length ? (
              <View style={[styles.catalogGrid, wide && styles.catalogGridWide]}>
                {marketplaceItems.map((item) => (
                  <CustomerOfferCard key={item.id} item={item} darkMode={darkMode} ctaLabel="Book now" onPress={() => onSelectItem(item)} />
                ))}
              </View>
            ) : (
              <EmptyState title="Marketplace is empty" body="No company has published items yet. Admins can create partner workspaces and companies can publish from their dashboard." cardStyle={customerTheme.empty} titleStyle={customerTheme.title} bodyStyle={customerTheme.subtitle} />
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
        </>
      ) : null}

      {tab === 'orders' ? (
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
      ) : null}

      {tab === 'notifications' ? (
        <SectionCard title="Notification center" subtitle="Unread and read updates from bookings, offers, and account activity live here." cardStyle={customerTheme.card} titleStyle={customerTheme.title} subtitleStyle={customerTheme.subtitle}>
          {authUser ? (
            notifications.length ? notifications.map((notification) => (
              <NotificationRow key={notification.id} notification={notification} onOpen={() => onOpenNotification(notification)} darkMode={darkMode} />
            )) : <EmptyState title="No notifications yet" body="When bookings move, promotions go live, or your account needs attention, updates will appear here." cardStyle={customerTheme.empty} titleStyle={customerTheme.title} bodyStyle={customerTheme.subtitle} />
          ) : (
            <EmptyState title="Sign in required" body="Notifications are available after you sign in to your customer account." cardStyle={customerTheme.empty} titleStyle={customerTheme.title} bodyStyle={customerTheme.subtitle} />
          )}
        </SectionCard>
      ) : null}

      {tab === 'profile' ? (
        !authUser ? (
          <>
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
          </>
        ) : (
          <View style={[styles.workspaceColumns, wide && styles.workspaceColumnsWide]}>
            <View style={styles.columnPane}>
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

            <View style={styles.columnPane}>
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
        )
      ) : null}
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
  customerWorkspace: {
    gap: 16,
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
    flex: 1,
    gap: 16,
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
  },
  marketplaceVisualDark: {
    backgroundColor: '#223243',
  },
  marketplaceVisualTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
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
  busyIndicator: {
    marginTop: 8,
  },
});