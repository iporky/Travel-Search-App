import React, { useEffect, useState, Component } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, NationalPark_400Regular, NationalPark_500Medium, NationalPark_600SemiBold, NationalPark_700Bold } from '@expo-google-fonts/national-park';
import './src/i18n';

import { TabBar, TabKey } from './src/components/TabBar';
import { HomeScreen } from './src/screens/HomeScreen';
import { BuzzScreen } from './src/screens/BuzzScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { OnboardingFlow } from './src/screens/onboarding/OnboardingFlow';
import { gradients } from './src/theme/tokens';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { preloadAppAssets } from './src/assets/preload';

// ── Error boundary: shows the JS error on-screen instead of crashing ─────────
class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#1a0000', padding: 24, paddingTop: 60 }}>
          <ScrollView>
            <Text style={{ color: '#ff6b6b', fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
              ❌ Crash: {this.state.error.name}
            </Text>
            <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'monospace' }}>
              {this.state.error.message}
            </Text>
            <Text style={{ color: '#aaa', fontSize: 11, marginTop: 16 }}>
              {this.state.error.stack}
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Inner app: reads auth state, renders correct screen ───────────────────────
function AppContent() {
  const {
    user,
    isLoading,
    hasCompletedPersonalization,
    completePersonalization,
  } = useAuth();
  const [tab, setTab] = useState<TabKey>('home');

  // Wait for AsyncStorage to load persisted auth before rendering
  if (isLoading) return null;

  // Signed-in but hasn't finished personalization → run the onboarding flow first.
  if (user && !hasCompletedPersonalization) {
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <OnboardingFlow onComplete={completePersonalization} />
          <StatusBar style="dark" />
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  // Signed-in (and onboarded) → main tabs
  if (user) {
    return (
      <SafeAreaProvider>
        <LinearGradient colors={gradients.surfaceDim} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
          <View style={styles.flex}>
            {tab === 'home' && <HomeScreen />}
            {tab === 'buzz' && <BuzzScreen />}
            {tab === 'history' && <HistoryScreen />}
            {tab === 'profile' && <ProfileScreen />}
          </View>
        </SafeAreaView>
        <SafeAreaView edges={['bottom']}>
          <TabBar active={tab} onChange={setTab} />
        </SafeAreaView>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    );
  }

  // Not signed in → onboarding (first time) or jump straight to sign-in slide (returning user)
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <OnboardingScreen
          onDone={() => {/* navigation happens automatically when user signs in */}}
          initialSignInIndex={false}
        />
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    NationalPark_400Regular,
    NationalPark_500Medium,
    NationalPark_600SemiBold,
    NationalPark_700Bold,
  });
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  // Preload every static image once — screens only render after this resolves
  // so no page ever appears with half-loaded assets.
  useEffect(() => {
    preloadAppAssets().then(() => setAssetsLoaded(true));
  }, []);

  if (!fontsLoaded || !assetsLoaded) return null;

  return (
    <AuthProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
});
