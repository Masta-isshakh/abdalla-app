import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { AppProvider, useAppState } from './src/context/AppContext';
import { configureAmplify } from './src/lib/amplify';
import { AppNavigator } from './src/navigation/AppNavigator';

configureAmplify();

function AppBoot() {
  const { initialized } = useAppState();

  if (!initialized) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.loadingGlowTop} />
        <View style={styles.loadingGlowBottom} />
        <Image source={require('./assets/icon.png')} style={styles.loadingLogo} resizeMode="cover" />
        <Text style={styles.loadingTitle}>Jahzeen</Text>
        <Text style={styles.loadingSubtitle}>Premium home services marketplace</Text>
        <ActivityIndicator color="#0F7B45" size="large" />
      </View>
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
    backgroundColor: '#F4F8F2',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  loadingGlowTop: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 999,
    backgroundColor: '#CFECD8',
    top: -120,
    right: -80,
  },
  loadingGlowBottom: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: '#DDEEE3',
    bottom: -90,
    left: -70,
  },
  loadingLogo: {
    width: 116,
    height: 116,
    borderRadius: 32,
    marginBottom: 16,
  },
  loadingTitle: {
    color: '#0F7B45',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  loadingSubtitle: {
    color: '#4F6B59',
    fontSize: 14,
    marginBottom: 18,
    fontWeight: '600',
  },
});
