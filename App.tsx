import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AppProvider, useAppState } from './src/context/AppContext';
import { configureAmplify } from './src/lib/amplify';
import { AppNavigator } from './src/navigation/AppNavigator';
import { JahzeenLogo } from './src/components/JahzeenLogo';

configureAmplify();

function toFallbackMessage(value: unknown): string {
  if (value instanceof Error && value.message.trim()) {
    return value.message;
  }

  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (!value || typeof value !== 'object') {
    return 'Service is temporarily unavailable.';
  }

  const candidate = value as { message?: unknown; reason?: unknown };
  if (typeof candidate.message === 'string' && candidate.message.trim()) {
    return candidate.message;
  }

  return toFallbackMessage(candidate.reason);
}

class WebSafeBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; message: string }> {
  state = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      message: toFallbackMessage(error),
    };
  }

  componentDidMount() {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    window.addEventListener('error', this.onWindowError);
    window.addEventListener('unhandledrejection', this.onUnhandledRejection as EventListener);
  }

  componentWillUnmount() {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    window.removeEventListener('error', this.onWindowError);
    window.removeEventListener('unhandledrejection', this.onUnhandledRejection as EventListener);
  }

  private onWindowError = (event: ErrorEvent) => {
    this.setState({ hasError: true, message: toFallbackMessage(event.error ?? event.message) });
  };

  private onUnhandledRejection = (event: PromiseRejectionEvent) => {
    this.setState({ hasError: true, message: toFallbackMessage(event.reason) });
  };

  private reloadPage = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
      return;
    }

    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError && Platform.OS === 'web') {
      return <WebFallbackScreen message={this.state.message} onRetry={this.reloadPage} />;
    }

    return this.props.children;
  }
}

function WebFallbackScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <LinearGradient colors={['#0E8E4E', '#16A55D', '#29BC74']} style={styles.fallbackScreen}>
      <View style={styles.loadingGlowTop} />
      <View style={styles.loadingGlowBottom} />

      <View style={styles.fallbackBrandWrap}>
        <JahzeenLogo size={108} showWordmark wordmarkColor="#F7FFF9" subtitleColor="#E1F8EA" />
        <Text style={styles.fallbackTitle}>Temporary connection issue</Text>
        <Text style={styles.fallbackBody}>The app is still online, but the data service is not responding right now.</Text>
        <Text style={styles.fallbackHint}>Status: {message || 'Service is temporarily unavailable.'}</Text>
      </View>

      <View style={styles.fallbackActionRail}>
        <Pressable style={styles.fallbackPrimaryButton} onPress={onRetry}>
          <Text style={styles.fallbackPrimaryButtonText}>Retry</Text>
        </Pressable>
        <Text style={styles.fallbackSecondaryText}>You can keep this shortcut on Home Screen and retry anytime.</Text>
      </View>
    </LinearGradient>
  );
}

function AppBoot() {
  const { initialized } = useAppState();

  if (!initialized) {
    return (
      <LinearGradient colors={['#0E8E4E', '#16A55D', '#29BC74']} style={styles.loadingScreen}>
        <View style={styles.loadingGlowTop} />
        <View style={styles.loadingGlowBottom} />

        <View style={styles.loadingBrandWrap}>
          <View style={styles.loadingBrandCard}>
            <JahzeenLogo size={124} showWordmark wordmarkColor="#F7FFF9" subtitleColor="#E1F8EA" />
            <Text style={styles.loadingTitle}>Jahzeen Marketplace</Text>
            <Text style={styles.loadingSubtitle}>Premium home services, beautifully organized for customers, companies, and admins.</Text>
            <View style={styles.loadingProgressRow}>
              <View style={[styles.loadingProgressDot, styles.loadingProgressDotActive]} />
              <View style={styles.loadingProgressDot} />
              <View style={styles.loadingProgressDot} />
            </View>
          </View>
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
    <WebSafeBoundary>
      <AppProvider>
        <StatusBar style="dark" />
        <AppBoot />
      </AppProvider>
    </WebSafeBoundary>
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
    width: '100%',
    paddingHorizontal: 24,
  },
  loadingBrandCard: {
    width: '100%',
    maxWidth: 430,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E7FAEF59',
    backgroundColor: '#0C6B3E55',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 22,
    paddingVertical: 26,
  },
  loadingTitle: {
    color: '#F3FFF7',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  loadingSubtitle: {
    color: '#E6FBEE',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 22,
  },
  loadingProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingProgressDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#D5F7E4',
    opacity: 0.45,
  },
  loadingProgressDotActive: {
    width: 26,
    borderRadius: 99,
    opacity: 1,
    backgroundColor: '#FFFFFF',
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
  fallbackScreen: {
    flex: 1,
    backgroundColor: '#0F7B45',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    paddingTop: 110,
    paddingBottom: 60,
    paddingHorizontal: 24,
  },
  fallbackBrandWrap: {
    alignItems: 'center',
    gap: 14,
    maxWidth: 560,
  },
  fallbackTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  fallbackBody: {
    color: '#E9FCEE',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  fallbackHint: {
    color: '#DDF8E7',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 420,
  },
  fallbackActionRail: {
    width: '100%',
    maxWidth: 560,
    alignItems: 'center',
    gap: 12,
  },
  fallbackPrimaryButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackPrimaryButtonText: {
    color: '#0F7B45',
    fontSize: 20,
    fontWeight: '800',
  },
  fallbackSecondaryText: {
    color: '#DDF8E7',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
