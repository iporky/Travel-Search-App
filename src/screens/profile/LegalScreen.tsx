import React, { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import DeviceInfo from 'react-native-device-info';
import { colors, spacing } from '../../theme/tokens';
import { API_HOST } from '../../config';
import { SectionTitle, TopBar } from '../../components/profile/ProfileUI';
import { PRIVACY_POLICY } from '../../content/privacyPolicy';

// Settings → Privacy Policy / About Us load the WEBSITE's pages in-app
// (mobile view — the site is responsive below 900px, so a phone-width WebView
// gets the mobile layout):
//   • About Us       → {API_HOST}/About   — capital A on purpose: nginx has a
//     case-sensitive `location /about` that 301s to an internal host, while
//     the SPA's React Router matches paths case-insensitively, so /About
//     serves the app shell and renders the /about route.
//   • Privacy Policy → {API_HOST}/privacy
// If the site can't load (offline), fall back to the bundled copy of the
// website's privacy text / a short About blurb instead of a blank page.

type Props = {
  kind: 'privacyPolicy' | 'about';
  onBack: () => void;
  /**
   * The website's CTAs must not act as website navigation inside the app:
   * "Explore More" / "Ask KiKi" → the app's Home tab; tapping the hero's
   * place name → run that place as a search in the app (Home tab).
   */
  onNavigateHome?: (searchQuery?: string) => void;
};

const PAGE_URL: Record<Props['kind'], string> = {
  about: `${API_HOST}/About`,
  privacyPolicy: `${API_HOST}/privacy`,
};

// The website's own chrome (fixed MUI AppBar with the hamburger + profile
// buttons, and the desktop nav rail) is for the website only — the app already
// has its TopBar. Injected before the page renders so it never flashes in.
const HIDE_SITE_CHROME_JS = `(function () {
  var css = 'header.MuiAppBar-root,.MuiAppBar-root{display:none!important;}' +
            // The site pins <main> at top:48px to clear its mobile bar.
            'main{top:0!important;}body{padding-top:0!important;}';
  var style = document.createElement('style');
  style.appendChild(document.createTextNode(css));
  (document.head || document.documentElement).appendChild(style);
})(); true;`;

// Click interceptor (capture phase, runs before the site's own React handlers):
//   • location widget (pin + place name, .locWidget__label) → searchPlace
//   • "Explore More" (hero, styles.waitlistButton → navigate('/')) and the
//     "Ask KiKi" feature links (.aboutLink → navigate('/')) → exploreHome
//   • any other plain <a href> is inert in-app.
const INTERCEPT_NAV_JS = `(function () {
  if (window.__konnectNavHook) return; window.__konnectNavHook = true;
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.nodeType === 1 ? e.target : (e.target && e.target.parentElement);
    if (!t || !t.closest) return;
    function halt() {
      e.preventDefault();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation(); else e.stopPropagation();
    }
    function post(m) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m));
    }
    var badge = t.closest('[role="button"]');
    if (badge && badge.querySelector('.locWidget__label')) {
      var q = (badge.querySelector('.locWidget__label').textContent || '').trim();
      halt();
      if (q) post({ type: 'searchPlace', query: q });
      return;
    }
    var btn = t.closest('button, [role="button"], a');
    if (!btn) return;
    var cls = (btn.getAttribute && btn.getAttribute('class')) || '';
    var label = (btn.textContent || '').trim().toLowerCase();
    if (label.indexOf('explore more') === 0 || /waitlistButton/.test(cls) || /(^| )aboutLink( |$)/.test(cls)) {
      halt();
      post({ type: 'exploreHome' });
      return;
    }
    if (btn.tagName === 'A' && btn.getAttribute('href')) halt();
  }, true);
})(); true;`;

export function LegalScreen({ kind, onBack, onNavigateHome }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  // Bumped to remount the WebView back onto the expected page if the site's
  // SPA router escapes to another route (e.g. Privacy's "Contact" button).
  const [webKey, setWebKey] = useState(0);
  const snapBack = useRef(false);
  const version = DeviceInfo.getVersion();
  const expectedPath = kind === 'about' ? '/about' : '/privacy';

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg?.type === 'exploreHome') onNavigateHome?.();
      else if (msg?.type === 'searchPlace' && typeof msg.query === 'string') onNavigateHome?.(msg.query);
    } catch {
      // not ours
    }
  };

  return (
    <View style={styles.screen}>
      <TopBar title={kind === 'about' ? t('settings.aboutUs') : t('settings.privacyPolicy')} onBack={onBack} />
      {failed ? (
        <ScrollView contentContainerStyle={styles.fallback} showsVerticalScrollIndicator={false}>
          {kind === 'about' ? (
            <>
              <View style={styles.section}>
                <SectionTitle>{t('about.heading')}</SectionTitle>
                <Text style={styles.paragraph}>{t('about.body')}</Text>
              </View>
              <View style={styles.section}>
                <Text style={styles.smallHeading}>{t('about.versionLabel')}</Text>
                <Text style={styles.paragraph}>{t('about.version', { version })}</Text>
              </View>
              <View style={styles.section}>
                <Text style={styles.smallHeading}>{t('about.contactLabel')}</Text>
                <Text style={styles.paragraph}>care@konnect.kr</Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.paragraph}>{PRIVACY_POLICY.intro}</Text>
              {PRIVACY_POLICY.sections.map((s) => (
                <View key={s.title} style={styles.section}>
                  <SectionTitle>{s.title}</SectionTitle>
                  <View style={styles.textBlock}>
                    {s.blocks.map((b, i) =>
                      b.kind === 'heading' ? (
                        <Text key={i} style={styles.smallHeading}>
                          {b.text}
                        </Text>
                      ) : b.kind === 'bullet' ? (
                        <View key={i} style={styles.bulletRow}>
                          <Text style={styles.bullet}>•</Text>
                          <Text style={[styles.paragraph, styles.bulletText]}>{b.text}</Text>
                        </View>
                      ) : (
                        <Text key={i} style={styles.paragraph}>
                          {b.text}
                        </Text>
                      ),
                    )}
                  </View>
                </View>
              ))}
              <Text style={styles.muted}>{PRIVACY_POLICY.lastUpdated}</Text>
            </>
          )}
        </ScrollView>
      ) : (
        <View style={styles.webWrap}>
          <WebView
            key={webKey}
            source={{ uri: PAGE_URL[kind] }}
            style={styles.web}
            injectedJavaScriptBeforeContentLoaded={HIDE_SITE_CHROME_JS}
            injectedJavaScript={HIDE_SITE_CHROME_JS + INTERCEPT_NAV_JS}
            onMessage={onMessage}
            onNavigationStateChange={(nav) => {
              // Website navigation is website-only: any route change away from
              // this page (full load or SPA pushState) snaps back.
              try {
                const path = new URL(nav.url).pathname.toLowerCase();
                if (!path.startsWith(expectedPath) && !snapBack.current) {
                  snapBack.current = true;
                  setLoading(true);
                  setWebKey((k) => k + 1);
                  setTimeout(() => {
                    snapBack.current = false;
                  }, 500);
                }
              } catch {
                // unparsable url — ignore
              }
            }}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setFailed(true);
              setLoading(false);
            }}
            onHttpError={(e) => {
              if (e.nativeEvent.statusCode >= 400) {
                setFailed(true);
                setLoading(false);
              }
            }}
            // Keep navigation inside the two content pages of our own site.
            originWhitelist={['https://*']}
            setSupportMultipleWindows={false}
            domStorageEnabled
            javaScriptEnabled
          />
          {loading && (
            <View style={styles.loading} pointerEvents="none">
              <ActivityIndicator color={colors.blue[500]} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  webWrap: { flex: 1 },
  web: { flex: 1, backgroundColor: 'transparent' },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.default,
  },
  fallback: { paddingHorizontal: spacing[5], paddingTop: spacing[3], paddingBottom: spacing[24], gap: spacing[8] },
  section: { gap: spacing[3] },
  textBlock: { gap: spacing[2] },
  smallHeading: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.16,
    color: colors.text.primary,
  },
  paragraph: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.28,
    color: colors.text.primary,
  },
  bulletRow: { flexDirection: 'row', gap: spacing[1], paddingLeft: spacing[2] },
  bullet: { width: 12, fontFamily: 'NationalPark_400Regular', fontSize: 14, lineHeight: 20, color: colors.text.primary },
  bulletText: { flex: 1 },
  muted: { fontFamily: 'NationalPark_500Medium', fontSize: 12, lineHeight: 16, color: colors.gray[700] },
});
