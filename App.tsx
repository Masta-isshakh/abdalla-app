import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AppProvider, useAppState } from './src/context/AppContext';
import { configureAmplify } from './src/lib/amplify';
import { AppNavigator } from './src/navigation/AppNavigator';
import { JahzeenLogo } from './src/components/JahzeenLogo';

configureAmplify();

function AppBoot() {
  const { initialized } = useAppState();

  if (!initialized) {
    return (
      <LinearGradient colors={['#0E8E4E', '#16A55D', '#29BC74']} style={styles.loadingScreen}>
        <View style={styles.loadingGlowTop} />
        <View style={styles.loadingGlowBottom} />

        <View style={styles.loadingBrandWrap}>
          <JahzeenLogo size={122} showWordmark wordmarkColor="#F7FFF9" subtitleColor="#E1F8EA" />
          <Text style={styles.loadingSubtitle}>Premium home services, beautifully organized.</Text>
        </View>

        <View style={styles.loadingActionRail}>
          <View style={styles.loadingPrimaryButton}>
            <Text style={styles.loadingPrimaryButtonText}>تسجيل الدخول</Text>
          </View>
          <View style={styles.loadingGhostButton}>
            <Text style={styles.loadingGhostButtonText}>إنشاء حساب جديد</Text>
          </View>
          <Text style={styles.loadingLanguageText}>العربية</Text>
        </View>
      </LinearGradient>
    );
  }

  return <AppNavigator />;
}

export default function App() {
  return (
    <AppProvider>
      <StatusBar style="dark" />
      <AppBoot />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: '#0F7B45',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    paddingTop: 120,
    paddingBottom: 70,
  },
  loadingGlowTop: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#9DE2BB40',
    top: -140,
    right: -120,
  },
  loadingGlowBottom: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#C7F0DA36',
    bottom: -170,
    left: -120,
  },
  loadingBrandWrap: {
    alignItems: 'center',
    gap: 14,
  },
  loadingSubtitle: {
    color: '#E6FBEE',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
  loadingActionRail: {
    width: '100%',
    paddingHorizontal: 30,
    gap: 12,
    alignItems: 'center',
  },
  loadingPrimaryButton: {
    width: '100%',
    minHeight: 54,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingPrimaryButtonText: {
    color: '#0F7B45',
    fontSize: 21,
    fontWeight: '800',
  },
  loadingGhostButton: {
    width: '100%',
    minHeight: 54,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E5F9EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingGhostButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  loadingLanguageText: {
    color: '#DDF8E7',
    marginTop: 10,
    fontSize: 20,
    fontWeight: '700',
  },
});
