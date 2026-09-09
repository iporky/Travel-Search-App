import React, { useEffect, useRef, useState, Component } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, NationalPark_400Regular, NationalPark_500Medium, NationalPark_600SemiBold, NationalPark_700Bold, NationalPark_800ExtraBold } from '@expo-google-fonts/national-park';
// The Profile identity card's email line is Inter in the design (12276:94319).
// Subpath import so Metro bundles only this one weight, not all 36 Inter files.
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
// Freeze text at its designed size regardless of the phone's font/display
// settings — must run before any Text/TextInput renders.
import './src/utils/lockFontScaling';
import './src/i18n';

import { TabBar, TabKey } from './src/components/TabBar';
import { colors } from './src/theme/tokens';
import { IntroSplash } from './src/screens/IntroSplash';
import { HomeScreen } from './src/screens/HomeScreen';
import { EventsScreen } from './src/screens/EventsScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { OnboardingFlow } from './src/screens/onboarding/OnboardingFlow';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { preloadAppAssets } from './src/assets/preload';
import { trackPageView } from './src/api/tracking';
import { ScreenTransition } from './src/components/ScreenTransition';

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
  // Buzz detail/compose screens go full-bleed (over the tab bar) so their inputs
  // can sit flush on the keyboard.
  const [buzzFullScreen, setBuzzFullScreen] = useState(false);
  // Set when another tab asks Home to run a search (About page's place name).
  const [homeQuery, setHomeQuery] = useState<string | null>(null);

  // One page_view tracking row per tab visit (source_type page_view, updated
  // Tracking contract) — referrer = the previous tab's path, GA-style.
  const prevPathRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user || !hasCompletedPersonalization) return;
    const path = '/' + tab;
    trackPageView(path, prevPathRef.current ?? undefined);
    prevPathRef.current = path;
  }, [tab, user, hasCompletedPersonalization]);

  // Wait for AsyncStorage to load persisted auth before rendering. A painted
  // ground (not null) so there's never a black frame if the splash has lifted.
  if (isLoading) return <View style={{ flex: 1, backgroundColor: '#f4feff' }} />;

  // Signed-in but hasn't finished personalization → run the onboarding flow first.
  if (user && !hasCompletedPersonalization) {
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <ScreenTransition transitionKey="personalize">
            <OnboardingFlow onComplete={completePersonalization} />
          </ScreenTransition>
          <StatusBar style="dark" />
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  // Signed-in (and onboarded) → main tabs
  if (user) {
    return (
      <SafeAreaProvider>
        {/* One ground across the whole shell — including behind the bottom
            tab bar — so every page reads as one uninterrupted surface. Home
            uses its original design gradient (Home_Default 12320:52295);
            Profile/History sit on Semantic/Surface/default (#f2f9ff); the
            rest keep flat #ecf4fe. */}
        {tab === 'home' ? (
          <LinearGradient
            colors={['#e9f3fe', '#f9fcff']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              tab === 'profile' || tab === 'history' ? styles.appBgSurface : styles.appBg,
            ]}
          />
        )}
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
          <View style={styles.flex}>
            {/* Cross-fade between tabs instead of snapping. */}
            <ScreenTransition transitionKey={tab}>
              {tab === 'home' && (
                <HomeScreen initialQuery={homeQuery} onInitialQueryConsumed={() => setHomeQuery(null)} />
              )}
              {tab === 'events' && <EventsScreen onFullScreen={setBuzzFullScreen} />}
              {tab === 'history' && <HistoryScreen onFullScreen={setBuzzFullScreen} />}
              {tab === 'profile' && (
                <ProfileScreen
                  onFullScreen={setBuzzFullScreen}
                  onNavigateHome={(q) => {
                    if (q) setHomeQuery(q);
                    setBuzzFullScreen(false);
                    setTab('home');
                  }}
                />
              )}
            </ScreenTransition>
          </View>
        </SafeAreaView>
        {!buzzFullScreen && (
          <SafeAreaView edges={['bottom']}>
            <TabBar
              active={tab}
              onChange={(k) => {
                setBuzzFullScreen(false);
                setTab(k);
              }}
            />
          </SafeAreaView>
        )}
        <StatusBar style="dark" />
      </SafeAreaProvider>
    );
  }

  // Not signed in → onboarding (first time) or jump straight to sign-in slide (returning user)
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ScreenTransition transitionKey="signedOut">
          <OnboardingScreen
            onDone={() => {/* navigation happens automatically when user signs in */}}
            initialSignInIndex={false}
          />
        </ScreenTransition>
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
    NationalPark_800ExtraBold,
    Inter_500Medium,
  });
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  // Intro bird animation — the first thing shown on every app open. Fonts and
  // assets keep loading behind it, so by the time it ends (~6 s) the welcome
  // screens are warm.
  const [introDone, setIntroDone] = useState(false);

  // Preload every static image once — screens only render after this resolves
  // so no page ever appears with half-loaded assets.
  useEffect(() => {
    preloadAppAssets().then(() => setAssetsLoaded(true));
  }, []);

  // The app mounts and loads BEHIND the splash overlay; the splash holds
  // (frozen on its last frame if need be) until fonts + assets are in, then
  // fades out over the already-rendered first screen — no black gap.
  const ready = fontsLoaded && assetsLoaded;
  return (
    <View style={styles.appRoot}>
      {ready ? (
        <AuthProvider>
          <LanguageProvider>
            <AppContent />
          </LanguageProvider>
        </AuthProvider>
      ) : (
        <View style={styles.appLoading} />
      )}
      {!introDone && <IntroSplash canFinish={ready} onDone={() => setIntroDone(true)} />}
    </View>
  );
}


const styles = StyleSheet.create({
  appRoot: { flex: 1 },
  // Neutral pale ground while fonts/assets stream in under the splash.
  appLoading: { flex: 1, backgroundColor: '#f4feff' },
  safe: { flex: 1 },
  flex: { flex: 1 },
  appBg: { backgroundColor: '#ecf4fe' },
  appBgSurface: { backgroundColor: colors.surface.default },
});
