import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  ActivityIndicator,
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

import { readableBookingStatus, useAppState } from '../context/AppContext';
import {
  Address,
  AppRole,
  Booking,
  BookingStatus,
  CatalogItem,
  Company,
  CompanyInvitation,
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
    initialized,
    invitations,
    inviteCompany,
    loyaltyPrograms,
    marketplaceItems,
    needsConfirmation,
    placeBooking,
    profile,
    ratings,
    resendCompanyInvitation,
    revokeInvitation,
    saveAddress,
    saveCatalogItem,
    saveLoyaltyProgram,
    saveProfile,
    setCompanyActive,
    signInWithEmail,
    signOutCurrentUser,
    signUpWithEmail,
    submitRating,
    updateCompany,
    users,
  } = useAppState();

  const [adminTab, setAdminTab] = useState<'overview' | 'companies' | 'users'>('overview');
  const [companyTab, setCompanyTab] = useState<'overview' | 'catalog' | 'bookings' | 'loyalty'>('overview');
  const [customerTab, setCustomerTab] = useState<'marketplace' | 'orders' | 'account'>('marketplace');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const [signInForm, setSignInForm] = useState({ email: '', password: '' });
  const [signUpForm, setSignUpForm] = useState({ fullName: '', email: '', password: '', phone: '' });
  const [confirmCode, setConfirmCode] = useState('');

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

  const [selectedAdminCompanyId, setSelectedAdminCompanyId] = useState<string | null>(null);
  const [selectedCatalogItemId, setSelectedCatalogItemId] = useState<string | null>(null);

  const [companyFormErrors, setCompanyFormErrors] = useState<ValidationMap>({});
  const [inviteFormErrors, setInviteFormErrors] = useState<ValidationMap>({});
  const [catalogFormErrors, setCatalogFormErrors] = useState<ValidationMap>({});
  const [loyaltyFormErrors, setLoyaltyFormErrors] = useState<ValidationMap>({});
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
  const selectedCatalogItem = useMemo(
    () => companyItems.find((entry) => entry.id === selectedCatalogItemId) ?? null,
    [companyItems, selectedCatalogItemId],
  );
  const currentCompanyProgram = useMemo(
    () => loyaltyPrograms.find((entry) => entry.scope === 'company' && entry.companyId === currentCompany?.id) ?? null,
    [currentCompany?.id, loyaltyPrograms],
  );

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

  const adminMetrics = useMemo(
    () => [
      { label: 'Companies', value: String(companies.length) },
      { label: 'Published items', value: String(marketplaceItems.length) },
      { label: 'Bookings', value: String(bookings.length) },
      { label: 'Users', value: String(users.length) },
    ],
    [bookings.length, companies.length, marketplaceItems.length, users.length],
  );

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
      } else {
        await signUpWithEmail({
          fullName: signUpForm.fullName.trim(),
          email: signUpForm.email.trim(),
          password: signUpForm.password,
          phone: signUpForm.phone.trim(),
        });
      }
      setCustomerBanner({
        tone: 'success',
        text: authMode === 'signin' ? 'Sign-in request submitted.' : 'Account created. Check your email for the verification code.',
      });
    } catch (error) {
      setCustomerBanner({ tone: 'error', text: error instanceof Error ? error.message : 'Authentication failed.' });
    }
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
      setCustomerBanner({ tone: 'error', text: authUser ? 'Fix the booking details before placing the order.' : 'Sign in before placing a booking.' });
      if (!authUser) {
        setCustomerTab('account');
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

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[colors.hero, '#FFF8EF']} style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextWrap}>
              <Text style={styles.brandName}>Jahzeen</Text>
              <Text style={styles.brandTagline}>Built for empty-start marketplaces that grow company by company.</Text>
            </View>
            <RoleBadge role={activeRole} />
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
            onChangeBookingStatus={changeBookingStatus}
            loyaltyForm={loyaltyForm}
            onLoyaltyFormChange={setLoyaltyForm}
            loyaltyErrors={loyaltyFormErrors}
            onSaveLoyalty={handleLoyaltySave}
            currentProgram={currentCompanyProgram}
          />
        ) : null}

        {(activeRole === 'guest' || activeRole === 'customer') ? (
          <CustomerWorkspace
            wide={wide}
            tab={customerTab}
            onTabChange={setCustomerTab}
            authUser={authUser}
            currentUserRole={currentUserRecord?.role ?? 'customer'}
            marketplaceItems={marketplaceItems}
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
            onAuthAction={handleAuthAction}
            onConfirmCode={handleConfirmCode}
            profileForm={profileForm}
            onProfileFormChange={setProfileForm}
            profileErrors={profileErrors}
            onSaveProfile={handleProfileSave}
            addressForm={addressForm}
            onAddressFormChange={setAddressForm}
            addressErrors={addressErrors}
            onSaveAddress={handleAddressSave}
            onSignOut={signOutCurrentUser}
            banner={customerBanner}
          />
        ) : null}

        {busy ? <ActivityIndicator color={colors.primary} style={styles.busyIndicator} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

type AdminWorkspaceProps = {
  wide: boolean;
  tab: 'overview' | 'companies' | 'users';
  onTabChange: (tab: 'overview' | 'companies' | 'users') => void;
  metrics: Array<{ label: string; value: string }>;
  bookings: Booking[];
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
  banner: BannerState;
};

function AdminWorkspace({
  wide,
  tab,
  onTabChange,
  metrics,
  bookings,
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
  banner,
}: AdminWorkspaceProps) {
  return (
    <>
      <SegmentControl
        items={[
          { key: 'overview', label: 'Overview' },
          { key: 'companies', label: 'Companies' },
          { key: 'users', label: 'Users' },
        ]}
        selectedKey={tab}
        onChange={(value) => onTabChange(value as 'overview' | 'companies' | 'users')}
      />
      {banner ? <StatusBanner tone={banner.tone} text={banner.text} /> : null}

      {tab === 'overview' ? (
        <>
          <View style={[styles.metricGrid, wide && styles.metricGridWide]}>
            {metrics.map((metric) => (
              <MetricCard key={metric.label} label={metric.label} value={metric.value} />
            ))}
          </View>
          <SectionCard title="Platform bookings" subtitle="Admin sees all booking flow across every company workspace.">
            {bookings.length ? bookings.map((booking) => <BookingCard key={booking.id} booking={booking} />) : <EmptyState title="No bookings yet" body="Bookings will appear here once customers order published items." />}
          </SectionCard>
        </>
      ) : null}

      {tab === 'companies' ? (
        <View style={[styles.workspaceColumns, wide && styles.workspaceColumnsWide]}>
          <View style={styles.columnPane}>
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
                  <SecondaryButton label="Remove company" onPress={() => onDeleteCompany(selectedCompany.id)} />
                </View>
              ) : null}
            </SectionCard>

            <SectionCard title="Invite company owner" subtitle="Invitation records are stored even if SES delivery is not configured yet.">
              <View style={styles.rowGap}>
                <FormField label="Company name" value={inviteForm.companyName} onChangeText={(value) => onInviteFormChange((current) => ({ ...current, companyName: value }))} error={inviteErrors.companyName} />
                <FormField label="Invite email" value={inviteForm.email} onChangeText={(value) => onInviteFormChange((current) => ({ ...current, email: value }))} error={inviteErrors.email} />
              </View>
              <FormField label="Message" value={inviteForm.message} onChangeText={(value) => onInviteFormChange((current) => ({ ...current, message: value }))} multiline />
              <PrimaryButton label="Send invitation" onPress={onInvite} />
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

      {tab === 'users' ? (
        <SectionCard title="User directory" subtitle="All registered platform users are visible here with their current role.">
          {users.length ? users.map((user) => <InfoRow key={user.id} title={`${user.fullName} · ${user.role}`} subtitle={`${user.email}${user.companyName ? ` · ${user.companyName}` : ''}`} />) : <EmptyState title="No users yet" body="User records appear after sign-in or accepted company invitations." />}
        </SectionCard>
      ) : null}
    </>
  );
}

type CompanyWorkspaceProps = {
  wide: boolean;
  tab: 'overview' | 'catalog' | 'bookings' | 'loyalty';
  onTabChange: (tab: 'overview' | 'catalog' | 'bookings' | 'loyalty') => void;
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
  onChangeBookingStatus,
  loyaltyForm,
  onLoyaltyFormChange,
  loyaltyErrors,
  onSaveLoyalty,
  currentProgram,
}: CompanyWorkspaceProps) {
  return (
    <>
      <SegmentControl
        items={[
          { key: 'overview', label: 'Overview' },
          { key: 'catalog', label: 'Catalog' },
          { key: 'bookings', label: 'Bookings' },
          { key: 'loyalty', label: 'Loyalty' },
        ]}
        selectedKey={tab}
        onChange={(value) => onTabChange(value as 'overview' | 'catalog' | 'bookings' | 'loyalty')}
      />
      {banner ? <StatusBanner tone={banner.tone} text={banner.text} /> : null}

      {tab === 'overview' ? (
        <>
          <SectionCard title={currentCompany?.name ?? 'Company workspace'} subtitle="Only your own workspace can be edited from this role.">
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

          <View style={[styles.metricGrid, wide && styles.metricGridWide]}>
            <MetricCard label="Catalog items" value={String(companyItems.length)} />
            <MetricCard label="Published" value={String(companyItems.filter((entry) => entry.isPublished).length)} />
            <MetricCard label="Bookings" value={String(companyBookings.length)} />
            <MetricCard label="Ratings" value={String(ratings.filter((entry) => entry.companyId === currentCompany?.id).length)} />
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
                <ChoiceChip label="Featured" selected={catalogForm.featured} onPress={() => onCatalogFormChange((current) => ({ ...current, featured: !current.featured }))} />
              </View>
              <PrimaryButton label={selectedCatalogItem ? 'Save item changes' : 'Save item'} onPress={onSaveCatalog} />
              {selectedCatalogItem ? (
                <View style={styles.rowGap}>
                  <SecondaryButton label="Cancel editing" onPress={onResetCatalog} />
                  <SecondaryButton label="Delete item" onPress={() => onDeleteCatalogItem(selectedCatalogItem.id)} />
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
  tab: 'marketplace' | 'orders' | 'account';
  onTabChange: (tab: 'marketplace' | 'orders' | 'account') => void;
  authUser: { email: string } | null;
  currentUserRole: string;
  marketplaceItems: CatalogItem[];
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
  onAuthAction: () => void;
  onConfirmCode: () => void;
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
  onAuthAction,
  onConfirmCode,
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
  return (
    <>
      <SegmentControl
        items={[
          { key: 'marketplace', label: 'Marketplace' },
          { key: 'orders', label: 'Orders' },
          { key: 'account', label: authUser ? 'Account' : 'Access' },
        ]}
        selectedKey={tab}
        onChange={(value) => onTabChange(value as 'marketplace' | 'orders' | 'account')}
      />
      {banner ? <StatusBanner tone={banner.tone} text={banner.text} /> : null}

      {tab === 'marketplace' ? (
        <>
          <SectionCard title="Marketplace" subtitle="Browse live products and services without authentication.">
            {marketplaceItems.length ? (
              <View style={[styles.catalogGrid, wide && styles.catalogGridWide]}>
                {marketplaceItems.map((item) => (
                  <Pressable key={item.id} style={styles.marketplaceCard} onPress={() => onSelectItem(item)}>
                    <Text style={styles.marketplaceEyebrow}>{item.companyName}</Text>
                    <Text style={styles.marketplaceTitle}>{item.title}</Text>
                    <Text style={styles.marketplaceSummary}>{item.summary}</Text>
                    <View style={styles.rowBetween}>
                      <Text style={styles.priceText}>QAR {item.price.toFixed(0)}</Text>
                      <Text style={styles.metaText}>{item.durationLabel || item.kind}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : (
              <EmptyState title="Marketplace is empty" body="No company has published items yet. Admins can create partner workspaces and companies can publish from their dashboard." />
            )}
          </SectionCard>

          {bookingComposer.itemId ? (
            <SectionCard title="Booking composer" subtitle={authUser ? 'Everything required to place the order is validated before submission.' : 'Pick an item now and sign in when you are ready to book.'}>
              <View style={styles.rowGap}>
                <FormField label="Date" value={bookingComposer.scheduleDate} onChangeText={(value) => onBookingComposerChange((current) => ({ ...current, scheduleDate: value }))} error={bookingErrors.scheduleDate} />
                <FormField label="Time" value={bookingComposer.scheduleTime} onChangeText={(value) => onBookingComposerChange((current) => ({ ...current, scheduleTime: value }))} error={bookingErrors.scheduleTime} />
              </View>
              <FormField label="Notes" value={bookingComposer.notes} onChangeText={(value) => onBookingComposerChange((current) => ({ ...current, notes: value }))} multiline />
              <View style={styles.toggleRow}>
                <ChoiceChip label="Card" selected={bookingComposer.paymentMethod === 'card'} onPress={() => onBookingComposerChange((current) => ({ ...current, paymentMethod: 'card' }))} />
                <ChoiceChip label="Cash" selected={bookingComposer.paymentMethod === 'cash'} onPress={() => onBookingComposerChange((current) => ({ ...current, paymentMethod: 'cash' }))} />
                <ChoiceChip label="Apple Pay" selected={bookingComposer.paymentMethod === 'applePay'} onPress={() => onBookingComposerChange((current) => ({ ...current, paymentMethod: 'applePay' }))} />
              </View>
              {bookingErrors.auth ? <FieldError text={bookingErrors.auth} /> : null}
              <PrimaryButton label={authUser ? 'Place booking' : 'Sign in to book'} onPress={onPlaceBooking} />
            </SectionCard>
          ) : null}
        </>
      ) : null}

      {tab === 'orders' ? (
        <SectionCard title="My orders" subtitle="Signed-in customers can track bookings and submit ratings after completion.">
          {authUser ? (
            customerBookings.length ? customerBookings.map((booking) => (
              <View key={booking.id} style={styles.bookingWrap}>
                <BookingCard booking={booking} />
                {booking.status === 'completed' && !booking.ratingSubmitted ? (
                  <View style={styles.ratingCard}>
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
                    />
                    <PrimaryButton label="Submit rating" onPress={() => onSubmitRating(booking.id)} />
                  </View>
                ) : null}
              </View>
            )) : <EmptyState title="No bookings yet" body="Place a booking from the marketplace after a company publishes services or products." />
          ) : (
            <EmptyState title="Sign in required" body="Browsing is public, but orders and ratings are tied to a customer account." />
          )}
        </SectionCard>
      ) : null}

      {tab === 'account' ? (
        !authUser ? (
          <SectionCard title="Customer access" subtitle="Create an account or sign in when you are ready to book.">
            <View style={styles.toggleRow}>
              <ChoiceChip label="Sign in" selected={authMode === 'signin'} onPress={() => onAuthModeChange('signin')} />
              <ChoiceChip label="Sign up" selected={authMode === 'signup'} onPress={() => onAuthModeChange('signup')} />
            </View>
            {authMode === 'signin' ? (
              <>
                <FormField label="Email" value={signInForm.email} onChangeText={(value) => onSignInFormChange((current) => ({ ...current, email: value }))} error={authErrors.email} />
                <FormField label="Password" value={signInForm.password} onChangeText={(value) => onSignInFormChange((current) => ({ ...current, password: value }))} error={authErrors.password} secureTextEntry />
              </>
            ) : (
              <>
                <FormField label="Full name" value={signUpForm.fullName} onChangeText={(value) => onSignUpFormChange((current) => ({ ...current, fullName: value }))} error={authErrors.fullName} />
                <FormField label="Email" value={signUpForm.email} onChangeText={(value) => onSignUpFormChange((current) => ({ ...current, email: value }))} error={authErrors.email} />
                <FormField label="Phone" value={signUpForm.phone} onChangeText={(value) => onSignUpFormChange((current) => ({ ...current, phone: value }))} error={authErrors.phone} />
                <FormField label="Password" value={signUpForm.password} onChangeText={(value) => onSignUpFormChange((current) => ({ ...current, password: value }))} error={authErrors.password} secureTextEntry />
              </>
            )}
            <PrimaryButton label={authMode === 'signin' ? 'Sign in' : 'Create account'} onPress={onAuthAction} />
            {needsConfirmation ? (
              <View style={styles.verificationCard}>
                <Text style={styles.verificationTitle}>Email verification required</Text>
                <FormField label="Verification code" value={confirmCode} onChangeText={onConfirmCodeChange} error={authErrors.confirmCode} />
                <SecondaryButton label="Confirm email" onPress={onConfirmCode} />
              </View>
            ) : null}
          </SectionCard>
        ) : (
          <View style={[styles.workspaceColumns, wide && styles.workspaceColumnsWide]}>
            <View style={styles.columnPane}>
              <SectionCard title="Profile" subtitle={`Signed in as ${currentUserRole}`}>
                <FormField label="Full name" value={profileForm.fullName} onChangeText={(value) => onProfileFormChange((current) => ({ ...current, fullName: value }))} error={profileErrors.fullName} />
                <FormField label="Email" value={profileForm.email} onChangeText={(value) => onProfileFormChange((current) => ({ ...current, email: value }))} error={profileErrors.email} />
                <FormField label="Phone" value={profileForm.phone} onChangeText={(value) => onProfileFormChange((current) => ({ ...current, phone: value }))} error={profileErrors.phone} />
                <View style={styles.toggleRow}>
                  <ChoiceChip label="Card" selected={profileForm.defaultPaymentMethod === 'card'} onPress={() => onProfileFormChange((current) => ({ ...current, defaultPaymentMethod: 'card' }))} />
                  <ChoiceChip label="Cash" selected={profileForm.defaultPaymentMethod === 'cash'} onPress={() => onProfileFormChange((current) => ({ ...current, defaultPaymentMethod: 'cash' }))} />
                  <ChoiceChip label="Apple Pay" selected={profileForm.defaultPaymentMethod === 'applePay'} onPress={() => onProfileFormChange((current) => ({ ...current, defaultPaymentMethod: 'applePay' }))} />
                </View>
                <PrimaryButton label="Save profile" onPress={onSaveProfile} />
              </SectionCard>
            </View>

            <View style={styles.columnPane}>
              <SectionCard title="Default address" subtitle="Used as the default destination for future bookings.">
                <View style={styles.rowGap}>
                  <FormField label="Label" value={addressForm.label} onChangeText={(value) => onAddressFormChange((current) => ({ ...current, label: value }))} error={addressErrors.label} />
                  <FormField label="Area" value={addressForm.area} onChangeText={(value) => onAddressFormChange((current) => ({ ...current, area: value }))} error={addressErrors.area} />
                </View>
                <View style={styles.rowGap}>
                  <FormField label="Street" value={addressForm.street} onChangeText={(value) => onAddressFormChange((current) => ({ ...current, street: value }))} error={addressErrors.street} />
                  <FormField label="Building" value={addressForm.building} onChangeText={(value) => onAddressFormChange((current) => ({ ...current, building: value }))} error={addressErrors.building} />
                </View>
                <View style={styles.rowGap}>
                  <FormField label="Unit" value={addressForm.unitNumber} onChangeText={(value) => onAddressFormChange((current) => ({ ...current, unitNumber: value }))} />
                  <FormField label="Phone" value={addressForm.contactPhone} onChangeText={(value) => onAddressFormChange((current) => ({ ...current, contactPhone: value }))} error={addressErrors.contactPhone} />
                </View>
                <PrimaryButton label="Save address" onPress={onSaveAddress} />
                <SecondaryButton label="Sign out" onPress={() => onSignOut()} />
              </SectionCard>
            </View>
          </View>
        )
      ) : null}
    </>
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

function SectionCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
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
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  secureTextEntry?: boolean;
  error?: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#90A0A6"
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        style={[styles.input, multiline && styles.inputMultiline, error && styles.inputError]}
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

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.primaryButton} onPress={onPress}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.secondaryButton} onPress={onPress}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
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

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
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
          <Pressable style={styles.inlineAction} onPress={onAction}>
            <Text style={styles.inlineActionText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
        {secondaryActionLabel && onSecondaryAction ? (
          <Pressable style={styles.inlineAction} onPress={onSecondaryAction}>
            <Text style={styles.inlineActionText}>{secondaryActionLabel}</Text>
          </Pressable>
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
          <Pressable style={styles.inlineAction} onPress={onAction}>
            <Text style={styles.inlineActionText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
        {secondaryActionLabel && onSecondaryAction ? (
          <Pressable style={styles.inlineAction} onPress={onSecondaryAction}>
            <Text style={styles.inlineActionText}>{secondaryActionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function BookingCard({ booking }: { booking: Booking }) {
  return (
    <View style={styles.bookingCard}>
      <View style={styles.rowBetween}>
        <View style={styles.infoBodyGrow}>
          <Text style={styles.infoTitle}>{booking.itemTitle}</Text>
          <Text style={styles.infoSubtitle}>{booking.companyName} · {booking.bookingNumber}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{readableBookingStatus(booking.status)}</Text>
        </View>
      </View>
      <Text style={styles.helperText}>{booking.scheduleDate} · {booking.scheduleTime}</Text>
      <Text style={styles.helperText}>{booking.addressLine}</Text>
      <Text style={styles.helperText}>QAR {booking.total.toFixed(0)} · {booking.paymentMethod}</Text>
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
          <Pressable style={styles.inlineAction} onPress={onAction}>
            <Text style={styles.inlineActionText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
        {secondaryActionLabel && onSecondaryAction ? (
          <Pressable style={styles.inlineAction} onPress={onSecondaryAction}>
            <Text style={styles.inlineActionText}>{secondaryActionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
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
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
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
    gap: 6,
  },
  fieldLabel: {
    fontWeight: '700',
    color: colors.text,
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
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: colors.paleBlue,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    flex: 1,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: '800',
  },
  rowGap: {
    flexDirection: 'row',
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
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 150,
    gap: 4,
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
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoBodyGrow: {
    flex: 1,
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
  helperText: {
    color: colors.muted,
    lineHeight: 20,
  },
  inlineAction: {
    backgroundColor: '#FDEBE7',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inlineActionGroup: {
    gap: 8,
    alignItems: 'flex-end',
  },
  inlineActionText: {
    color: colors.accent,
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
    backgroundColor: '#FBFAF5',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    minWidth: 240,
    flexGrow: 1,
  },
  marketplaceEyebrow: {
    color: colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 12,
  },
  marketplaceTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  marketplaceSummary: {
    color: colors.muted,
    lineHeight: 20,
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
  verificationCard: {
    gap: 10,
    borderRadius: 18,
    backgroundColor: '#F7F9FC',
    padding: 14,
  },
  verificationTitle: {
    color: colors.text,
    fontWeight: '800',
  },
  busyIndicator: {
    marginTop: 8,
  },
});