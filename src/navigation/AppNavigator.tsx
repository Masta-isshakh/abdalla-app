import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { NavigationContainer, NavigationProp, NavigatorScreenParams, useNavigation } from '@react-navigation/native';
import { BottomTabScreenProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppState, toTitle } from '../context/AppContext';
import { getServiceByKey, howItWorks, promotions, serviceCatalog, testimonials } from '../data/catalog';
import { Address, Booking, PaymentMethod, ServiceCategoryKey, UserProfile } from '../types';

type TabParamList = {
  Home: undefined;
  Services: undefined;
  Bookings: undefined;
  Profile: undefined;
};

type RootStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList> | undefined;
  ServiceDetail: { serviceKey: ServiceCategoryKey };
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const colors = {
  background: '#F4F8F2',
  surface: '#FFFFFF',
  text: '#21343B',
  muted: '#63757B',
  border: '#D9E5DD',
  primary: '#0F7B45',
  accent: '#2CE389',
  slate: '#44545A',
  blue: '#145DA0',
  warning: '#C98A14',
};

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="ServiceDetail"
          component={ServiceDetailScreen}
          options={{
            title: 'Book service',
            headerShadowVisible: false,
            headerTintColor: colors.text,
            headerStyle: { backgroundColor: colors.background },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#7A8A8F',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#DCE6DE',
          paddingTop: 8,
          height: 68,
        },
        tabBarIcon: ({ color, size }) => {
          const iconName =
            route.name === 'Home'
              ? 'home-outline'
              : route.name === 'Services'
                ? 'grid-outline'
                : route.name === 'Bookings'
                  ? 'receipt-outline'
                  : 'person-outline';
          return <Ionicons color={color} name={iconName} size={size} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Services" component={ServicesScreen} />
      <Tab.Screen name="Bookings" component={BookingsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

type HomeProps = BottomTabScreenProps<TabParamList, 'Home'>;
type ServicesProps = BottomTabScreenProps<TabParamList, 'Services'>;
type DetailProps = NativeStackScreenProps<RootStackParamList, 'ServiceDetail'>;

function HomeScreen({ navigation }: HomeProps) {
  const rootNavigation = useNavigation<NavigationProp<RootStackParamList>>();
  const width = useWindowDimensions().width;
  const compact = width < 380;
  const wide = width >= 760;
  const { activeBooking } = useAppState();

  return (
    <SafeAreaView edges={[ 'top' ]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[ '#E9FFF3', '#F4F8F2' ]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <LogoMark />
            <View style={styles.heroHeaderText}>
              <Text style={styles.brandName}>Jahzeen</Text>
              <Text style={styles.brandTagline}>Trusted Hands for Your Home</Text>
            </View>
          </View>
          <Text style={[styles.heroTitle, compact && styles.heroTitleCompact]}>
            One app for cleaning, laundry, car care, and specialist home services.
          </Text>
          <Text style={styles.heroBody}>
            Book in minutes, track every step, and manage your household flow across iOS and Android.
          </Text>
          <View style={[styles.statRow, wide && styles.statRowWide]}>
            <StatPill label="Fast checkout" value="< 60s" />
            <StatPill label="Coverage" value="Doha-wide" />
            <StatPill label="Support" value="7 days" />
          </View>
        </LinearGradient>

        <SectionHeader title="Popular services" actionLabel="See all" onPress={() => navigation.navigate('Services')} />
        <View style={[styles.cardGrid, wide && styles.cardGridWide]}>
          {serviceCatalog.map((service) => (
            <Pressable
              key={service.key}
              onPress={() => rootNavigation.navigate('ServiceDetail', { serviceKey: service.key })}
              style={[styles.serviceCard, { backgroundColor: service.background }, wide && styles.serviceCardWide]}
            >
              <View style={[styles.serviceIconWrap, { backgroundColor: '#FFFFFFAA' }]}>
                <Ionicons color={service.accent} name={service.icon as never} size={26} />
              </View>
              <Text style={styles.serviceCardTitle}>{service.title}</Text>
              <Text style={styles.serviceCardSubtitle}>{service.subtitle}</Text>
              <Text style={[styles.metricText, { color: service.accent }]}>{service.heroMetric}</Text>
            </Pressable>
          ))}
        </View>

        {activeBooking ? (
          <View style={styles.sectionBlock}>
            <SectionHeader title="Live booking" />
            <View style={styles.trackerCard}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.trackerTitle}>{activeBooking.serviceTitle}</Text>
                  <Text style={styles.trackerMeta}>{activeBooking.bookingNumber} · {toTitle(activeBooking.status)}</Text>
                </View>
                <View style={styles.trackerBadge}>
                  <Text style={styles.trackerBadgeText}>{activeBooking.timeLabel}</Text>
                </View>
              </View>
              <Text style={styles.trackerAddress}>{activeBooking.addressLine}</Text>
              {activeBooking.timeline.map((item) => (
                <View key={item.id} style={styles.timelineRow}>
                  <View style={[styles.timelineDot, item.done && styles.timelineDotDone]} />
                  <View style={styles.timelineCopy}>
                    <Text style={styles.timelineTitle}>{item.title}</Text>
                    <Text style={styles.timelineTime}>{item.time}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <SectionHeader title="Offers" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
          {promotions.map((offer) => (
            <View key={offer.id} style={styles.offerCard}>
              <Text style={styles.offerEyebrow}>Promo code</Text>
              <Text style={styles.offerTitle}>{offer.title}</Text>
              <Text style={styles.offerDescription}>{offer.description}</Text>
              <Text style={styles.offerCode}>{offer.code}</Text>
            </View>
          ))}
        </ScrollView>

        <SectionHeader title="How it works" />
        <View style={styles.sectionBlock}>
          {howItWorks.map((step, index) => (
            <View key={step} style={styles.stepRow}>
              <View style={styles.stepIndexWrap}>
                <Text style={styles.stepIndexText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        <SectionHeader title="What customers value" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
          {testimonials.map((item) => (
            <View key={item.id} style={styles.testimonialCard}>
              <Text style={styles.testimonialQuote}>"{item.quote}"</Text>
              <Text style={styles.testimonialAuthor}>{item.name}</Text>
              <Text style={styles.testimonialMeta}>{item.service}</Text>
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

function ServicesScreen({ navigation: _navigation }: ServicesProps) {
  const rootNavigation = useNavigation<NavigationProp<RootStackParamList>>();
  const width = useWindowDimensions().width;
  const [activeFilter, setActiveFilter] = useState<ServiceCategoryKey | 'all'>('all');
  const [query, setQuery] = useState('');

  const filteredServices = serviceCatalog.filter((service) => {
    const matchesFilter = activeFilter === 'all' || service.key === activeFilter;
    const matchesQuery = `${service.title} ${service.subtitle} ${service.shortDescription}`
      .toLowerCase()
      .includes(query.trim().toLowerCase());
    return matchesFilter && matchesQuery;
  });

  return (
    <SafeAreaView edges={[ 'top' ]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>Service catalog</Text>
        <Text style={styles.screenSubtitle}>Everything visible in the Aldobi public listing has been mapped into a Jahzeen booking surface.</Text>

        <View style={styles.searchWrap}>
          <Ionicons color={colors.muted} name="search-outline" size={18} />
          <TextInput
            onChangeText={setQuery}
            placeholder="Search cleaning, laundry, AC, car wash..."
            placeholderTextColor="#8B9A9F"
            style={styles.searchInput}
            value={query}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {(['all', 'cleaning', 'laundry', 'carwash', 'homecare'] as const).map((item) => {
            const selected = activeFilter === item;
            return (
              <Pressable
                key={item}
                onPress={() => setActiveFilter(item)}
                style={[styles.filterChip, selected && styles.filterChipSelected]}
              >
                <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>
                  {item === 'all' ? 'All services' : getServiceByKey(item).title}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.cardGrid, width >= 760 && styles.cardGridWide]}>
          {filteredServices.map((service) => (
            <View key={service.key} style={[styles.catalogCard, width >= 760 && styles.catalogCardWide]}>
              <View style={styles.rowBetween}>
                <View style={[styles.serviceIconWrap, { backgroundColor: service.background }]}>
                  <Ionicons color={service.accent} name={service.icon as never} size={24} />
                </View>
                <Text style={styles.catalogMetric}>{service.heroMetric}</Text>
              </View>
              <Text style={styles.catalogTitle}>{service.title}</Text>
              <Text style={styles.catalogDescription}>{service.shortDescription}</Text>
              <View style={styles.benefitWrap}>
                {service.benefits.map((benefit) => (
                  <View key={benefit} style={styles.benefitPill}>
                    <Text style={styles.benefitText}>{benefit}</Text>
                  </View>
                ))}
              </View>
              <Pressable onPress={() => rootNavigation.navigate('ServiceDetail', { serviceKey: service.key })} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Customize booking</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ServiceDetailScreen({ navigation, route }: DetailProps) {
  const service = getServiceByKey(route.params.serviceKey);
  const width = useWindowDimensions().width;
  const wide = width >= 760;
  const { addresses, authUser, placeBooking, profile } = useAppState();
  const [selectedPackageId, setSelectedPackageId] = useState(service.packages[0].id);
  const [selectedDate, setSelectedDate] = useState(getDateOptions()[0]);
  const [selectedTime, setSelectedTime] = useState(timeSlots[1]);
  const [selectedRecurrence, setSelectedRecurrence] = useState('One time');
  const [selectedAddressId, setSelectedAddressId] = useState(addresses[0]?.id ?? '');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>(profile.defaultPaymentMethod);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedPackage = service.packages.find((item) => item.id === selectedPackageId) ?? service.packages[0];
  const extrasTotal = service.extras
    .filter((item) => selectedExtras.includes(item.id))
    .reduce((sum, item) => sum + item.price, 0);
  const subtotal = selectedPackage.price + extrasTotal;
  const serviceFee = subtotal >= 100 ? 0 : 10;
  const discount = selectedRecurrence === 'Weekly' ? 10 : 0;
  const total = subtotal + serviceFee - discount;

  async function handleBooking() {
    if (!selectedAddressId) {
      Alert.alert('Address needed', 'Save or choose an address before confirming the booking.');
      return;
    }

    setSubmitting(true);
    try {
      const booking = await placeBooking({
        serviceKey: service.key,
        serviceTitle: service.title,
        packageTitle: selectedPackage.title,
        dateLabel: selectedDate,
        timeLabel: selectedTime,
        recurrence: selectedRecurrence,
        addressId: selectedAddressId,
        notes,
        paymentMethod: selectedPayment,
        extras: service.extras.filter((item) => selectedExtras.includes(item.id)).map((item) => item.title),
        subtotal,
        serviceFee,
        discount,
        total,
      });
      Alert.alert(
        'Booking confirmed',
        `${booking.serviceTitle} is scheduled for ${booking.dateLabel} at ${booking.timeLabel}.${authUser ? ' It will sync to your Amplify account.' : ' Sign in later to keep cloud history.'}`,
        [
          {
            text: 'Open bookings',
            onPress: () => navigation.navigate('MainTabs', { screen: 'Bookings' }),
          },
        ],
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[ service.background, '#FFFFFF' ]} style={styles.detailHeroCard}>
          <View style={[styles.serviceIconWrap, styles.detailIconWrap]}>
            <Ionicons color={service.accent} name={service.icon as never} size={30} />
          </View>
          <Text style={styles.detailTitle}>{service.title}</Text>
          <Text style={styles.detailSubtitle}>{service.shortDescription}</Text>
          <Text style={styles.detailMetric}>{service.heroMetric}</Text>
        </LinearGradient>

        <SectionHeader title="Choose package" />
        {service.packages.map((item) => {
          const selected = item.id === selectedPackageId;
          return (
            <Pressable key={item.id} onPress={() => setSelectedPackageId(item.id)} style={[styles.packageCard, selected && styles.packageCardSelected]}>
              <View style={styles.rowBetween}>
                <View style={styles.packageCopy}>
                  <Text style={styles.packageTitle}>{item.title}</Text>
                  <Text style={styles.packageSubtitle}>{item.subtitle}</Text>
                </View>
                <Text style={styles.packagePrice}>QAR {item.price}</Text>
              </View>
              <Text style={styles.packageDuration}>{item.duration}</Text>
              <View style={styles.benefitWrap}>
                {item.features.map((feature) => (
                  <View key={feature} style={styles.benefitPill}>
                    <Text style={styles.benefitText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </Pressable>
          );
        })}

        <SectionHeader title="Optional extras" />
        <View style={[styles.extraGrid, wide && styles.extraGridWide]}>
          {service.extras.map((item) => {
            const selected = selectedExtras.includes(item.id);
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  setSelectedExtras((current) =>
                    current.includes(item.id) ? current.filter((entry) => entry !== item.id) : [...current, item.id],
                  );
                }}
                style={[styles.extraCard, selected && styles.extraCardSelected, wide && styles.extraCardWide]}
              >
                <Text style={styles.extraTitle}>{item.title}</Text>
                <Text style={styles.extraPrice}>+ QAR {item.price}</Text>
              </Pressable>
            );
          })}
        </View>

        <SectionHeader title="Schedule" />
        <Text style={styles.microLabel}>Select a day</Text>
        <View style={styles.choiceRowWrap}>
          {getDateOptions().map((item) => (
            <SelectableChip key={item} label={item} onPress={() => setSelectedDate(item)} selected={selectedDate === item} />
          ))}
        </View>
        <Text style={styles.microLabel}>Preferred time</Text>
        <View style={styles.choiceRowWrap}>
          {timeSlots.map((item) => (
            <SelectableChip key={item} label={item} onPress={() => setSelectedTime(item)} selected={selectedTime === item} />
          ))}
        </View>
        <Text style={styles.microLabel}>Recurrence</Text>
        <View style={styles.choiceRowWrap}>
          {['One time', 'Weekly', 'Bi-weekly'].map((item) => (
            <SelectableChip key={item} label={item} onPress={() => setSelectedRecurrence(item)} selected={selectedRecurrence === item} />
          ))}
        </View>

        <SectionHeader title="Address" />
        {addresses.map((item) => {
          const selected = item.id === selectedAddressId;
          return (
            <Pressable key={item.id} onPress={() => setSelectedAddressId(item.id)} style={[styles.addressCard, selected && styles.addressCardSelected]}>
              <View style={styles.rowBetween}>
                <Text style={styles.addressTitle}>{item.label}</Text>
                {item.isDefault ? <Text style={styles.defaultTag}>Default</Text> : null}
              </View>
              <Text style={styles.addressLine}>{item.area}, {item.street}</Text>
              <Text style={styles.addressLine}>{item.building}, {item.unitNumber}</Text>
              <Text style={styles.addressLineMuted}>{item.instructions}</Text>
            </Pressable>
          );
        })}
        <Text style={styles.helperText}>Need a new location? Add it in the Profile tab and it will appear here instantly.</Text>

        <SectionHeader title="Payment" />
        <View style={styles.choiceRowWrap}>
          <SelectableChip label="Card" onPress={() => setSelectedPayment('card')} selected={selectedPayment === 'card'} />
          <SelectableChip label="Cash on arrival" onPress={() => setSelectedPayment('cash')} selected={selectedPayment === 'cash'} />
          <SelectableChip label="Apple Pay" onPress={() => setSelectedPayment('applePay')} selected={selectedPayment === 'applePay'} />
        </View>

        <SectionHeader title="Notes" />
        <TextInput
          multiline
          onChangeText={setNotes}
          placeholder="Add gate access, parking notes, garment instructions, or special requests."
          placeholderTextColor="#8B9A9F"
          style={styles.notesInput}
          value={notes}
        />

        <SectionHeader title="Summary" />
        <View style={styles.summaryCard}>
          <SummaryRow label={selectedPackage.title} value={`QAR ${selectedPackage.price}`} />
          <SummaryRow label="Selected extras" value={`QAR ${extrasTotal}`} />
          <SummaryRow label="Service fee" value={serviceFee === 0 ? 'Free' : `QAR ${serviceFee}`} />
          <SummaryRow label="Recurring discount" value={discount === 0 ? 'QAR 0' : `- QAR ${discount}`} />
          <View style={styles.summaryDivider} />
          <SummaryRow emphasis label="Total" value={`QAR ${total}`} />
          <Text style={styles.helperText}>
            {authUser ? 'Signed in. Booking will save locally and sync to Amplify Gen 2.' : 'Guest mode is enabled. Sign in from Profile to keep long-term cloud history.'}
          </Text>
        </View>

        <Pressable disabled={submitting} onPress={handleBooking} style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}>
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Confirm booking</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function BookingsScreen() {
  const [showHistory, setShowHistory] = useState(false);
  const { bookings } = useAppState();

  const visibleBookings = bookings.filter((booking) => (showHistory ? booking.status === 'completed' : booking.status !== 'completed'));

  return (
    <SafeAreaView edges={[ 'top' ]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.screenTitle}>Bookings</Text>
            <Text style={styles.screenSubtitle}>Track every order from confirmation to completion.</Text>
          </View>
          <View style={styles.historyToggle}>
            <Text style={styles.toggleLabel}>History</Text>
            <Switch onValueChange={setShowHistory} thumbColor="#FFFFFF" trackColor={{ false: '#B5C5BD', true: '#6AC891' }} value={showHistory} />
          </View>
        </View>

        {visibleBookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No bookings here yet</Text>
            <Text style={styles.emptyText}>Start from the Services tab to place your first order.</Text>
          </View>
        ) : (
          visibleBookings.map((booking) => <BookingCard booking={booking} key={booking.id} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileScreen() {
  const {
    authMessage,
    authUser,
    busy,
    needsConfirmation,
    profile,
    addresses,
    saveAddress,
    saveProfile,
    signInWithEmail,
    signOutCurrentUser,
    signUpWithEmail,
    confirmEmailCode,
  } = useAppState();

  const [mode, setMode] = useState<'signin' | 'signup' | 'confirm'>(needsConfirmation ? 'confirm' : 'signin');
  const [email, setEmail] = useState(profile.email);
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone);
  const [preferredLanguage, setPreferredLanguage] = useState<UserProfile['preferredLanguage']>(profile.preferredLanguage);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<PaymentMethod>(profile.defaultPaymentMethod);
  const [code, setCode] = useState('');
  const [addressDraft, setAddressDraft] = useState<Omit<Address, 'id'>>({
    label: 'Office',
    area: 'Lusail',
    street: 'Marina Promenade',
    building: 'Office Block 7',
    unitNumber: 'Suite 905',
    instructions: 'Security desk on level 1.',
    contactName: profile.fullName,
    contactPhone: profile.phone,
    isDefault: false,
  });

  async function submitAuth() {
    if (mode === 'signin') {
      await signInWithEmail(email, password);
      return;
    }

    if (mode === 'signup') {
      await signUpWithEmail({ fullName, email, password, phone });
      setMode('confirm');
      return;
    }

    await confirmEmailCode(code);
    setMode('signin');
  }

  async function submitProfile() {
    await saveProfile({
      fullName,
      email,
      phone,
      preferredLanguage,
      defaultPaymentMethod,
    });
  }

  async function submitAddress() {
    await saveAddress(addressDraft);
    setAddressDraft((current) => ({
      ...current,
      label: 'Another address',
      isDefault: false,
    }));
  }

  return (
    <SafeAreaView edges={[ 'top' ]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>Profile & support</Text>
        <Text style={styles.screenSubtitle}>Manage identity, addresses, language, and cloud sync.</Text>

        <View style={styles.sectionBlock}>
          <View style={styles.rowBetween}>
            <Text style={styles.panelTitle}>Amplify account</Text>
            {authUser ? <Text style={styles.defaultTag}>Connected</Text> : null}
          </View>
          <Text style={styles.helperText}>{authMessage || 'Create an account or sign in to sync bookings with Amplify Gen 2.'}</Text>
          {!authUser ? (
            <>
              <View style={styles.authSwitchRow}>
                <SelectableChip label="Sign in" onPress={() => setMode('signin')} selected={mode === 'signin'} />
                <SelectableChip label="Create account" onPress={() => setMode('signup')} selected={mode === 'signup'} />
                {needsConfirmation ? <SelectableChip label="Confirm email" onPress={() => setMode('confirm')} selected={mode === 'confirm'} /> : null}
              </View>
              {mode !== 'confirm' ? (
                <>
                  {mode === 'signup' ? (
                    <TextInput onChangeText={setFullName} placeholder="Full name" placeholderTextColor="#8B9A9F" style={styles.fieldInput} value={fullName} />
                  ) : null}
                  <TextInput autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} placeholder="Email" placeholderTextColor="#8B9A9F" style={styles.fieldInput} value={email} />
                  {mode === 'signup' ? (
                    <TextInput keyboardType="phone-pad" onChangeText={setPhone} placeholder="Phone number" placeholderTextColor="#8B9A9F" style={styles.fieldInput} value={phone} />
                  ) : null}
                  <TextInput onChangeText={setPassword} placeholder="Password" placeholderTextColor="#8B9A9F" secureTextEntry style={styles.fieldInput} value={password} />
                </>
              ) : (
                <TextInput keyboardType="number-pad" onChangeText={setCode} placeholder="Verification code" placeholderTextColor="#8B9A9F" style={styles.fieldInput} value={code} />
              )}
              <Pressable disabled={busy} onPress={submitAuth} style={[styles.primaryButton, busy && styles.primaryButtonDisabled]}>
                {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Confirm code'}</Text>}
              </Pressable>
            </>
          ) : (
            <Pressable disabled={busy} onPress={signOutCurrentUser} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Sign out</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.panelTitle}>Profile settings</Text>
          <TextInput onChangeText={setFullName} placeholder="Full name" placeholderTextColor="#8B9A9F" style={styles.fieldInput} value={fullName} />
          <TextInput autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} placeholder="Email" placeholderTextColor="#8B9A9F" style={styles.fieldInput} value={email} />
          <TextInput keyboardType="phone-pad" onChangeText={setPhone} placeholder="Phone number" placeholderTextColor="#8B9A9F" style={styles.fieldInput} value={phone} />
          <Text style={styles.microLabel}>Language</Text>
          <View style={styles.choiceRowWrap}>
            <SelectableChip label="English" onPress={() => setPreferredLanguage('en')} selected={preferredLanguage === 'en'} />
            <SelectableChip label="Arabic ready" onPress={() => setPreferredLanguage('ar')} selected={preferredLanguage === 'ar'} />
          </View>
          <Text style={styles.microLabel}>Default payment</Text>
          <View style={styles.choiceRowWrap}>
            <SelectableChip label="Card" onPress={() => setDefaultPaymentMethod('card')} selected={defaultPaymentMethod === 'card'} />
            <SelectableChip label="Cash" onPress={() => setDefaultPaymentMethod('cash')} selected={defaultPaymentMethod === 'cash'} />
            <SelectableChip label="Apple Pay" onPress={() => setDefaultPaymentMethod('applePay')} selected={defaultPaymentMethod === 'applePay'} />
          </View>
          <Pressable onPress={submitProfile} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Save profile</Text>
          </Pressable>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.panelTitle}>Saved addresses</Text>
          {addresses.map((address) => (
            <View key={address.id} style={styles.savedAddressCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.addressTitle}>{address.label}</Text>
                {address.isDefault ? <Text style={styles.defaultTag}>Default</Text> : null}
              </View>
              <Text style={styles.addressLine}>{address.area}, {address.street}</Text>
              <Text style={styles.addressLine}>{address.building}, {address.unitNumber}</Text>
              <Text style={styles.addressLineMuted}>{address.instructions}</Text>
            </View>
          ))}
          <Text style={styles.microLabel}>Add a new address</Text>
          <TextInput onChangeText={(value) => setAddressDraft((current) => ({ ...current, label: value }))} placeholder="Label" placeholderTextColor="#8B9A9F" style={styles.fieldInput} value={addressDraft.label} />
          <TextInput onChangeText={(value) => setAddressDraft((current) => ({ ...current, area: value }))} placeholder="Area" placeholderTextColor="#8B9A9F" style={styles.fieldInput} value={addressDraft.area} />
          <TextInput onChangeText={(value) => setAddressDraft((current) => ({ ...current, street: value }))} placeholder="Street" placeholderTextColor="#8B9A9F" style={styles.fieldInput} value={addressDraft.street} />
          <TextInput onChangeText={(value) => setAddressDraft((current) => ({ ...current, building: value }))} placeholder="Building" placeholderTextColor="#8B9A9F" style={styles.fieldInput} value={addressDraft.building} />
          <TextInput onChangeText={(value) => setAddressDraft((current) => ({ ...current, unitNumber: value }))} placeholder="Unit" placeholderTextColor="#8B9A9F" style={styles.fieldInput} value={addressDraft.unitNumber} />
          <TextInput onChangeText={(value) => setAddressDraft((current) => ({ ...current, instructions: value }))} placeholder="Instructions" placeholderTextColor="#8B9A9F" style={styles.fieldInput} value={addressDraft.instructions} />
          <View style={styles.rowBetween}>
            <Text style={styles.helperText}>Use as default address</Text>
            <Switch
              onValueChange={(value) => setAddressDraft((current) => ({ ...current, isDefault: value }))}
              thumbColor="#FFFFFF"
              trackColor={{ false: '#B5C5BD', true: '#6AC891' }}
              value={addressDraft.isDefault}
            />
          </View>
          <Pressable onPress={submitAddress} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Save address</Text>
          </Pressable>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.panelTitle}>Support and trust</Text>
          <View style={styles.supportRow}>
            <SupportItem icon="shield-checkmark-outline" text="Verified specialists and transparent pricing" />
            <SupportItem icon="time-outline" text="Track each booking stage in real time" />
            <SupportItem icon="card-outline" text="Card, Apple Pay, or cash on arrival options" />
            <SupportItem icon="chatbubble-ellipses-outline" text="Bilingual-ready support structure for English and Arabic" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BookingCard({ booking }: { booking: Booking }) {
  return (
    <View style={styles.bookingCard}>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.bookingTitle}>{booking.serviceTitle}</Text>
          <Text style={styles.bookingMeta}>{booking.bookingNumber} · {toTitle(booking.status)}</Text>
        </View>
        <Text style={styles.bookingAmount}>QAR {booking.total}</Text>
      </View>
      <Text style={styles.bookingMeta}>{booking.packageTitle}</Text>
      <Text style={styles.bookingMeta}>{booking.dateLabel} · {booking.timeLabel}</Text>
      <Text style={styles.bookingAddress}>{booking.addressLine}</Text>
      {booking.timeline.map((item) => (
        <View key={item.id} style={styles.timelineRow}>
          <View style={[styles.timelineDot, item.done && styles.timelineDotDone]} />
          <View style={styles.timelineCopy}>
            <Text style={styles.timelineTitle}>{item.title}</Text>
            <Text style={styles.timelineTime}>{item.time}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function SectionHeader({ title, actionLabel, onPress }: { title: string; actionLabel?: string; onPress?: () => void }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onPress ? (
        <Pressable onPress={onPress}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SelectableChip({ label, onPress, selected }: { label: string; onPress: () => void; selected: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.choiceChip, selected && styles.choiceChipSelected]}>
      <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function SupportItem({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.supportItem}>
      <Ionicons color={colors.primary} name={icon} size={18} />
      <Text style={styles.supportText}>{text}</Text>
    </View>
  );
}

function SummaryRow({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <View style={styles.rowBetween}>
      <Text style={[styles.summaryLabel, emphasis && styles.summaryEmphasis]}>{label}</Text>
      <Text style={[styles.summaryValue, emphasis && styles.summaryEmphasis]}>{value}</Text>
    </View>
  );
}

function LogoMark() {
  return (
    <View style={styles.logoWrap}>
      <View style={styles.logoStroke} />
      <Text style={styles.logoLetter}>J</Text>
    </View>
  );
}

function getDateOptions() {
  return ['Today', 'Tomorrow', 'Wed 9 Apr', 'Thu 10 Apr', 'Fri 11 Apr'];
}

const timeSlots = ['9:00 AM - 11:00 AM', '1:00 PM - 3:00 PM', '4:00 PM - 6:00 PM', '7:00 PM - 9:00 PM'];

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 8,
    gap: 18,
  },
  heroCard: {
    borderRadius: 28,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: '#DCEADF',
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroHeaderText: {
    flex: 1,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.slate,
  },
  brandTagline: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 38,
    color: colors.text,
    fontWeight: '800',
  },
  heroTitleCompact: {
    fontSize: 25,
    lineHeight: 32,
  },
  heroBody: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.muted,
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statRowWide: {
    justifyContent: 'space-between',
  },
  statPill: {
    flexGrow: 1,
    minWidth: 96,
    backgroundColor: '#FFFFFFD9',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DCEADF',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.text,
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  cardGridWide: {
    justifyContent: 'space-between',
  },
  serviceCard: {
    width: '100%',
    borderRadius: 24,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: '#DCEADF',
  },
  serviceCardWide: {
    width: '48%',
  },
  serviceIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceCardTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.text,
  },
  serviceCardSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
  },
  metricText: {
    fontSize: 13,
    fontWeight: '800',
  },
  sectionBlock: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trackerCard: {
    backgroundColor: '#16322B',
    borderRadius: 24,
    padding: 18,
    gap: 10,
  },
  trackerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  trackerMeta: {
    color: '#D6EFE0',
    fontSize: 13,
  },
  trackerBadge: {
    backgroundColor: '#2CE389',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  trackerBadgeText: {
    color: '#0B3E25',
    fontWeight: '800',
    fontSize: 12,
  },
  trackerAddress: {
    color: '#BFE7D0',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    marginTop: 6,
    backgroundColor: '#C6D3CC',
  },
  timelineDotDone: {
    backgroundColor: '#2CE389',
  },
  timelineCopy: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  timelineTime: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  horizontalRow: {
    gap: 14,
    paddingRight: 6,
  },
  offerCard: {
    width: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  offerEyebrow: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  offerTitle: {
    fontSize: 20,
    color: colors.text,
    fontWeight: '800',
  },
  offerDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
  },
  offerCode: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '800',
    color: colors.blue,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepIndexWrap: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#E9FFF3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndexText: {
    color: colors.primary,
    fontWeight: '800',
  },
  stepText: {
    flex: 1,
    color: colors.text,
    fontWeight: '600',
    lineHeight: 21,
  },
  testimonialCard: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  testimonialQuote: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    fontWeight: '700',
  },
  testimonialAuthor: {
    fontSize: 14,
    color: colors.slate,
    fontWeight: '800',
  },
  testimonialMeta: {
    fontSize: 13,
    color: colors.muted,
  },
  screenTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
  },
  screenSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 50,
    color: colors.text,
    fontSize: 15,
  },
  filterRow: {
    gap: 10,
    paddingRight: 10,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.text,
    fontWeight: '700',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
  catalogCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  catalogCardWide: {
    width: '48%',
  },
  catalogMetric: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  catalogTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  catalogDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
  },
  benefitWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  benefitPill: {
    backgroundColor: '#F2F6F3',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  benefitText: {
    color: colors.slate,
    fontSize: 12,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: '#E9FFF3',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#CDE9D8',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  detailHeroCard: {
    borderRadius: 28,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailIconWrap: {
    backgroundColor: '#FFFFFFAA',
  },
  detailTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  detailSubtitle: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.muted,
  },
  detailMetric: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '800',
  },
  packageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  packageCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F3FFF7',
  },
  packageCopy: {
    flex: 1,
    paddingRight: 12,
  },
  packageTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  packageSubtitle: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 2,
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  packageDuration: {
    fontSize: 13,
    color: colors.blue,
    fontWeight: '700',
  },
  extraGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  extraGridWide: {
    justifyContent: 'space-between',
  },
  extraCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  extraCardWide: {
    width: '48%',
  },
  extraCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F3FFF7',
  },
  extraTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  extraPrice: {
    color: colors.primary,
    fontWeight: '800',
    marginTop: 4,
  },
  microLabel: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '700',
  },
  choiceRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  choiceChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  choiceChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  choiceChipText: {
    color: colors.text,
    fontWeight: '700',
  },
  choiceChipTextSelected: {
    color: '#FFFFFF',
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  addressCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F3FFF7',
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  addressLine: {
    fontSize: 14,
    color: colors.slate,
  },
  addressLineMuted: {
    fontSize: 13,
    color: colors.muted,
  },
  defaultTag: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 12,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
  },
  notesInput: {
    minHeight: 110,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    textAlignVertical: 'top',
    color: colors.text,
    fontSize: 15,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 14,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  summaryEmphasis: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  bookingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  bookingMeta: {
    fontSize: 13,
    color: colors.muted,
  },
  bookingAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  bookingAddress: {
    fontSize: 14,
    color: colors.slate,
    marginBottom: 4,
  },
  historyToggle: {
    alignItems: 'center',
    gap: 6,
  },
  toggleLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
    textAlign: 'center',
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  authSwitchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  fieldInput: {
    minHeight: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 15,
  },
  savedAddressCard: {
    backgroundColor: '#F9FCF9',
    borderRadius: 18,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  supportRow: {
    gap: 14,
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  supportText: {
    flex: 1,
    color: colors.slate,
    lineHeight: 21,
    fontWeight: '600',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  logoWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#E9FFF3',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoStroke: {
    position: 'absolute',
    right: 10,
    top: 6,
    width: 16,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#2CE389',
    transform: [{ rotate: '12deg' }],
    opacity: 0.95,
  },
  logoLetter: {
    fontSize: 42,
    fontWeight: '900',
    color: colors.primary,
  },
});
