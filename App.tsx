import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppProvider, useAppState } from './src/context/AppContext';
import { configureAmplify } from './src/lib/amplify';
import { AppNavigator } from './src/navigation/AppNavigator';

configureAmplify();

function AppBoot() {
  const { initialized } = useAppState();

  if (!initialized) {
    return (
      <View style={styles.loadingScreen}>
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
  },
});
