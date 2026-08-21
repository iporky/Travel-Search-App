/**
 * AuthContext — Firebase Authentication (Google + Apple only).
 *
 * ─── How it works ─────────────────────────────────────────────────────────
 *  • Google : native Google Sign-In SDK returns an idToken → exchanged for a
 *             Firebase credential → auth().signInWithCredential().
 *  • Apple  : Firebase generic OAuth provider ('apple.com'). On Android this
 *             opens a secure Chrome Custom Tabs web flow; on iOS the native
 *             Apple sheet.
 *  • Session: auth().onAuthStateChanged() is the single source of truth and
 *             persists automatically across restarts (Firebase keychain).
 *  • Backend: every successful sign-in is pushed to our backend via the
 *             mock addUser() API (once per uid per app session).
 *
 * ─── Config requirements ──────────────────────────────────────────────────
 *  • android/app/google-services.json present + google-services Gradle plugin
 *    applied + signing SHA-1 registered in the Firebase project.
 *  • Google & Apple providers enabled in Firebase Console → Authentication.
 *  • Native module — does NOT run in Expo Go. Use: npx expo run:android / ios
 * ─────────────────────────────────────────────────────────────────────────
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { AccessToken, LoginManager, Settings as FBSettings } from 'react-native-fbsdk-next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';
import { addUser } from '../api/users';
import { verifyFirebaseSso } from '../api/auth';
import { getProfile, updateProfile } from '../api/profile';
import { FORCE_ONBOARDING } from '../config';

// Initialize the Facebook SDK once at module load (reads the app id / client
// token from the native resources configured in AndroidManifest/strings.xml).
FBSettings.initializeSDK();

// ─── Client IDs ─────────────────────────────────────────────────────────────
// Web client (type 3) from google-services.json — required by Firebase to mint
// a verifiable Google idToken.
const WEB_CLIENT_ID =
  '814154492607-btob4c9rrapk1thod6goccu7a7qqd37q.apps.googleusercontent.com';
const IOS_CLIENT_ID =
  '814154492607-hm4ookbdmmu9uhustj477bktal2e69jt.apps.googleusercontent.com';

// Configure once at module load (before any component renders)
GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID,
  iosClientId: IOS_CLIENT_ID,
  offlineAccess: true,
});

const ONBOARDING_KEY = '@konnect:onboarding_done';
// Personalization onboarding is tracked per-user so each account completes it once.
const personalizationKey = (uid: string) => `@konnect:personalization_done:${uid}`;
const profileNameKey = (uid: string) => `@konnect:profile_name:${uid}`;
// A locally-picked profile photo (camera/library) overrides the provider photo.
const profilePhotoKey = (uid: string) => `@konnect:profile_photo:${uid}`;

// ─── Types ───────────────────────────────────────────────────────────────────
export interface KonnectUser {
  id: string;
  name: string;
  email: string;
  photo: string | null;
}

interface AuthContextValue {
  user: KonnectUser | null;
  isLoading: boolean;
  hasSeenOnboarding: boolean;
  /** Whether the signed-in user has finished the personalization onboarding flow. */
  hasCompletedPersonalization: boolean;
  /** When true, onboarding should open directly on the first question. */
  personalizationStartsFromQuestions: boolean;
  /** Resolve to true when actually signed in, false when the user cancelled. */
  signInWithGoogle: () => Promise<boolean>;
  signInWithApple: () => Promise<boolean>;
  signInWithFacebook: () => Promise<boolean>;
  signOut: () => Promise<void>;
  markOnboardingDone: () => Promise<void>;
  completePersonalization: () => Promise<void>;
  restartPersonalizationFromQuestions: () => Promise<void>;
  updateProfileName: (name: string) => Promise<void>;
  /** Persist a locally-picked profile photo (camera/library) for this user. */
  updateProfilePhoto: (uri: string) => Promise<void>;
  /** Save display name and/or a new photo to the backend in one PATCH. */
  saveProfile: (fields: { name?: string; photoUri?: string }) => Promise<void>;
  /** GET the backend profile for the signed-in user (null if none). */
  fetchProfile: () => Promise<import('../api/profile').UserProfile | null>;
  /**
   * GET the backend profile and adopt its `profile_pic` (S3 URL) as the
   * authoritative avatar, overriding the Firebase photo. Call on sign-in and
   * whenever the profile screen/editor opens.
   */
  refreshProfile: () => Promise<import('../api/profile').UserProfile | null>;
}

// ─── Context ─────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

function mapUser(
  fb: FirebaseAuthTypes.User,
  preferredName?: string | null,
  preferredPhoto?: string | null,
): KonnectUser {
  return {
    id: fb.uid,
    name: preferredName?.trim() || fb.displayName || 'Konnect User',
    email: fb.email ?? '',
    photo: preferredPhoto || fb.photoURL || null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<KonnectUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [hasCompletedPersonalization, setHasCompletedPersonalization] = useState(false);
  const [personalizationStartsFromQuestions, setPersonalizationStartsFromQuestions] = useState(false);
  // Tracks which uids we've already synced to the backend this session.
  const syncedUids = useRef<Set<string>>(new Set());
  // Set right before an interactive sign-in so we can distinguish a fresh
  // sign-in (→ always run the personalization questions first) from a silent
  // session restore on app launch (→ respect the stored completion flag).
  const freshSignIn = useRef(false);

  // ── Restore onboarding flag + subscribe to Firebase auth state ─────────────
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((v) => {
      if (v === 'true') setHasSeenOnboarding(true);
    });

    const unsubscribe = auth().onAuthStateChanged(async (fbUser) => {
      if (fbUser) {
        const savedProfileName = await AsyncStorage.getItem(profileNameKey(fbUser.uid));
        const savedProfilePhoto = await AsyncStorage.getItem(profilePhotoKey(fbUser.uid));
        setUser(mapUser(fbUser, savedProfileName, savedProfilePhoto));
        await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
        setHasSeenOnboarding(true);

        // The backend profile_pic (S3 URL) is the source of truth for the
        // avatar — fetch it on every sign-in and let it override the Firebase
        // photo. Only falls back to Firebase when the backend has no pic.
        getProfile()
          .then((profile) => {
            if (!profile) return;
            if (profile.profile_pic) {
              AsyncStorage.setItem(profilePhotoKey(fbUser.uid), profile.profile_pic).catch(() => {});
            }
            if (profile.name) {
              AsyncStorage.setItem(profileNameKey(fbUser.uid), profile.name).catch(() => {});
            }
            setUser((prev) =>
              prev && prev.id === fbUser.uid
                ? {
                    ...prev,
                    name: profile.name || prev.name,
                    // Firebase may hand back no email (provider hid it); the
                    // backend profile has it — History/search key off it.
                    email: prev.email || profile.email || '',
                    // Backend pic wins; keep whatever we had if it's null.
                    photo: profile.profile_pic ?? prev.photo,
                  }
                : prev,
            );
          })
          .catch((e) => console.warn('[Auth] getProfile on sign-in failed', e?.message ?? e));

        // Restore whether this specific user already finished personalization.
        // On a fresh sign-in, always start the questions regardless of any
        // previously-stored completion, so onboarding runs after every login.
        if (freshSignIn.current) {
          freshSignIn.current = false;
          await AsyncStorage.removeItem(personalizationKey(fbUser.uid));
          setHasCompletedPersonalization(false);
          setPersonalizationStartsFromQuestions(true);
        } else if (FORCE_ONBOARDING) {
          // TESTING: run the full flow (intro → username → questions) on every
          // launch, even for returning users. Controlled from src/config.
          setHasCompletedPersonalization(false);
          setPersonalizationStartsFromQuestions(false);
        } else {
          const done = await AsyncStorage.getItem(personalizationKey(fbUser.uid));
          setHasCompletedPersonalization(done === 'true');
          setPersonalizationStartsFromQuestions(false);
        }

        // Push to our backend once per uid per session.
        if (!syncedUids.current.has(fbUser.uid)) {
          syncedUids.current.add(fbUser.uid);
          try {
            await addUser({
              uid: fbUser.uid,
              name: fbUser.displayName,
              profileName: savedProfileName,
              email: fbUser.email,
              photoUrl: fbUser.photoURL,
              provider: fbUser.providerData[0]?.providerId ?? 'firebase',
              createdAt: new Date().toISOString(),
            });
          } catch (e) {
            console.warn('[Auth] addUser sync failed', e);
          }

          // Verify the Firebase session with our backend, registering this
          // device. Fire-and-forget: sign-in UX never blocks on it.
          try {
            const [firebaseToken, deviceId] = await Promise.all([
              fbUser.getIdToken(),
              DeviceInfo.getUniqueId(),
            ]);
            verifyFirebaseSso({
              firebaseToken,
              deviceId,
              platform: Platform.OS,
            }).catch((e) => console.warn('[Auth] verify-firebase failed', e?.message ?? e));
          } catch (e) {
            console.warn('[Auth] verify-firebase setup failed', e);
          }
        }
      } else {
        setUser(null);
        setHasCompletedPersonalization(false);
        setPersonalizationStartsFromQuestions(false);
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  // ── Google ─────────────────────────────────────────────────────────────────
  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    // Firebase session is already active; nothing to do.
    if (auth().currentUser) return true;

    const runGoogleFlow = async (forceInteractive = false) => {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      let signInResult: any = null;
      const hasPreviousSignIn = await GoogleSignin.hasPreviousSignIn();

      if (!forceInteractive && hasPreviousSignIn) {
        // Reuse existing Google session without presenting native UI.
        signInResult = await GoogleSignin.signInSilently().catch(() => null);
      }

      if (!signInResult) {
        signInResult = await GoogleSignin.signIn();
      }

      // Newer Google Sign-In versions may return tokens from signIn() under
      // different shapes, so read from the sign-in payload first, then fallback.
      const signInData = (signInResult as any)?.data ?? signInResult;
      let idToken: string | undefined = signInData?.idToken;
      let accessToken: string | undefined = signInData?.accessToken;

      if (!idToken || !accessToken) {
        const tokenResult = await GoogleSignin.getTokens().catch(() => null);
        idToken = idToken ?? tokenResult?.idToken;
        accessToken = accessToken ?? tokenResult?.accessToken;
      }

      if (!idToken) {
        throw new Error(
          'Google sign-in returned no idToken. Verify webClientId and add your debug/release SHA-1 + SHA-256 in Firebase.'
        );
      }

      const credential = auth.GoogleAuthProvider.credential(idToken, accessToken);
      // Mark this as a fresh sign-in so onboarding questions run first.
      freshSignIn.current = true;
      await auth().signInWithCredential(credential);
      // onAuthStateChanged drives state + backend sync.
    };

    try {
      await runGoogleFlow();
      return true;
    } catch (error) {
      if (
        isErrorWithCode(error) &&
        (error.code === statusCodes.SIGN_IN_CANCELLED ||
          error.code === statusCodes.IN_PROGRESS)
      ) {
        return false; // user dismissed — not an error
      }

      const msg = String((error as any)?.message ?? '').toLowerCase();
      if (
        msg.includes('please use `signout()` instead') ||
        msg.includes('please use signout() instead') ||
        msg.includes('current activity is null')
      ) {
        // Already signed in at SDK level or screen not attached to an Activity.
        return false;
      }

      // Release builds can surface stale Google ID tokens from cached sessions.
      // Clear local Google session once and retry an interactive sign-in.
      if (msg.includes('invalid-credential') || msg.includes('id token issued') || msg.includes('stale')) {
        try {
          await auth().signOut().catch(() => {});
          await GoogleSignin.signOut().catch(() => {});
          await GoogleSignin.revokeAccess().catch(() => {});
          await runGoogleFlow(true);
          return true;
        } catch (retryError) {
          console.error('[Auth] Google retry failed', retryError);
          throw retryError;
        }
      }

      console.error('[Auth] Google sign-in error', error);
      throw error;
    }
  }, []);

  // ── Apple ──────────────────────────────────────────────────────────────────
  const signInWithApple = useCallback(async (): Promise<boolean> => {
    try {
      const provider = new auth.OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      // Mark this as a fresh sign-in so onboarding questions run first.
      freshSignIn.current = true;
      // RN Firebase v25 exposes the native web-OAuth flow as signInWithRedirect
      // (there is no auth().signInWithProvider on the JS side).
      await auth().signInWithRedirect(provider);
      // onAuthStateChanged drives state + backend sync.
      return true;
    } catch (error: any) {
      const msg = String(error?.message ?? '').toLowerCase();
      if (
        error?.code === 'auth/cancelled-popup-request' ||
        error?.code === 'auth/popup-closed-by-user' ||
        msg.includes('cancel')
      ) {
        return false; // user dismissed
      }
      console.error('[Auth] Apple sign-in error', error);
      throw error;
    }
  }, []);

  // ── Facebook ───────────────────────────────────────────────────────────────
  // Facebook's TOS require the official Facebook SDK on Android (Firebase's
  // generic OAuth flow is blocked for facebook.com). Flow: FB SDK native login
  // → AccessToken → Firebase credential exchange → signInWithCredential.
  // Requires facebook_app_id / facebook_client_token in strings.xml and the
  // release key hash registered in the Facebook app settings.
  const signInWithFacebook = useCallback(async (): Promise<boolean> => {
    try {
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
      if (result.isCancelled) return false; // user dismissed — not an error

      const token = await AccessToken.getCurrentAccessToken();
      if (!token?.accessToken) {
        throw new Error('Facebook login returned no access token.');
      }

      const credential = auth.FacebookAuthProvider.credential(token.accessToken);
      // Mark this as a fresh sign-in so onboarding questions run first.
      freshSignIn.current = true;
      await auth().signInWithCredential(credential);
      // onAuthStateChanged drives state + backend sync.
      return true;
    } catch (error: any) {
      const msg = String(error?.message ?? '').toLowerCase();
      if (msg.includes('cancel')) return false; // user dismissed
      console.error('[Auth] Facebook sign-in error', error);
      throw error;
    }
  }, []);

  // ── Sign out ──────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    try {
      await GoogleSignin.signOut();
    } catch {
      // ignore — may not have been a Google session
    }
    try {
      await auth().signOut();
    } catch {
      // ignore — clear local state regardless
    }
    setUser(null);
  }, []);

  const markOnboardingDone = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setHasSeenOnboarding(true);
  }, []);

  const completePersonalization = useCallback(async () => {
    const uid = auth().currentUser?.uid;
    if (uid) await AsyncStorage.setItem(personalizationKey(uid), 'true');
    setHasCompletedPersonalization(true);
    setPersonalizationStartsFromQuestions(false);
  }, []);

  const restartPersonalizationFromQuestions = useCallback(async () => {
    const uid = auth().currentUser?.uid;
    if (!uid) return;

    await AsyncStorage.removeItem(personalizationKey(uid));
    setHasCompletedPersonalization(false);
    setPersonalizationStartsFromQuestions(true);
  }, []);

  // Save the display name and/or a newly-picked photo to the backend
  // (PATCH /api/v1/profile/{uid}) and reflect the result locally. The photo is
  // uploaded as a file and the returned public S3 URL becomes user.photo, so it
  // persists and is shareable (a local file:// uri never leaves the device).
  const saveProfile = useCallback(
    async (fields: { name?: string; photoUri?: string }): Promise<void> => {
      const fbUser = auth().currentUser;
      if (!fbUser) return;
      const name = fields.name?.trim();

      // Optimistic local update so the UI reflects the change immediately.
      if (name) {
        await AsyncStorage.setItem(profileNameKey(fbUser.uid), name);
      }
      if (fields.photoUri) {
        await AsyncStorage.setItem(profilePhotoKey(fbUser.uid), fields.photoUri);
      }
      setUser((prev) =>
        prev
          ? { ...prev, name: name || prev.name, photo: fields.photoUri ?? prev.photo }
          : prev,
      );

      try {
        // The API `username` must be strict alphanumeric (^[a-zA-Z0-9]{4,20}$);
        // send the display value as `name` and a sanitized copy as `username`.
        const username = name
          ? name.replace(/[^A-Za-z0-9]/g, '').slice(0, 20)
          : undefined;
        const profile = await updateProfile({
          name,
          username: username && username.length >= 4 ? username : undefined,
          photoUri: fields.photoUri,
        });
        // Adopt server truth (esp. the S3 photo URL).
        if (profile.profile_pic) {
          await AsyncStorage.setItem(profilePhotoKey(fbUser.uid), profile.profile_pic);
        }
        if (profile.name) {
          await AsyncStorage.setItem(profileNameKey(fbUser.uid), profile.name);
        }
        setUser((prev) =>
          prev
            ? {
                ...prev,
                name: profile.name || prev.name,
                photo: profile.profile_pic ?? prev.photo,
              }
            : prev,
        );
      } catch (e) {
        console.warn('[Auth] saveProfile (PATCH /profile) failed', e);
      }
    },
    [],
  );

  // Back-compat thin wrappers.
  const updateProfileName = useCallback(
    (name: string) => saveProfile({ name }),
    [saveProfile],
  );
  const updateProfilePhoto = useCallback(
    (uri: string) => saveProfile({ photoUri: uri }),
    [saveProfile],
  );

  const fetchProfile = useCallback(() => getProfile().catch(() => null), []);

  // Fetch the backend profile and adopt its S3 photo as the authoritative
  // avatar (overriding the Firebase pic). Used on the profile screen / editor.
  const refreshProfile = useCallback(async () => {
    const fbUser = auth().currentUser;
    if (!fbUser) return null;
    try {
      const profile = await getProfile();
      if (profile) {
        if (profile.profile_pic) {
          await AsyncStorage.setItem(profilePhotoKey(fbUser.uid), profile.profile_pic);
        }
        if (profile.name) {
          await AsyncStorage.setItem(profileNameKey(fbUser.uid), profile.name);
        }
        setUser((prev) =>
          prev && prev.id === fbUser.uid
            ? {
                ...prev,
                name: profile.name || prev.name,
                email: prev.email || profile.email || '',
                photo: profile.profile_pic ?? prev.photo,
              }
            : prev,
        );
      }
      return profile;
    } catch (e) {
      console.warn('[Auth] refreshProfile failed', e);
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        hasSeenOnboarding,
        hasCompletedPersonalization,
        personalizationStartsFromQuestions,
        signInWithGoogle,
        signInWithApple,
        signInWithFacebook,
        signOut,
        markOnboardingDone,
        completePersonalization,
        restartPersonalizationFromQuestions,
        updateProfileName,
        updateProfilePhoto,
        saveProfile,
        fetchProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
