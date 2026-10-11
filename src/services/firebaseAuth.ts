import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut as firebaseSignOut,
  Auth
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
export const firebaseApp: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const firebaseAuth: Auth = getAuth(firebaseApp);

// Configure Google OAuth Provider with Gmail Send scope
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.addScope('https://www.googleapis.com/auth/gmail.send');
// Request offline access if needed and prompt to select account
googleAuthProvider.setCustomParameters({
  prompt: 'select_account',
  login_hint: 'progressive.ent8@gmail.com',
});

// Flag to indicate if we are in the middle of a sign-in flow
let isSigningIn = false;

// Cache the access token in memory only (never localStorage for security)
let cachedAccessToken: string | null = null;
let cachedCurrentUser: User | null = null;

// Auth state listeners
type AuthCallback = (user: User | null, token: string | null) => void;
const authListeners = new Set<AuthCallback>();

const notifyListeners = (user: User | null, token: string | null) => {
  authListeners.forEach((listener) => {
    try {
      listener(user, token);
    } catch (e) {
      console.error('Error in auth listener:', e);
    }
  });
};

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
): (() => void) => {
  return onAuthStateChanged(firebaseAuth, async (user: User | null) => {
    cachedCurrentUser = user;
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
        notifyListeners(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
        notifyListeners(user, null);
      }
    } else {
      cachedAccessToken = null;
      cachedCurrentUser = null;
      if (onAuthFailure) onAuthFailure();
      notifyListeners(null, null);
    }
  });
};

export const subscribeToAuth = (callback: AuthCallback): (() => void) => {
  authListeners.add(callback);
  // Immediate fire with current state
  callback(cachedCurrentUser, cachedAccessToken);
  return () => {
    authListeners.delete(callback);
  };
};

// Sign in with Google Popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(firebaseAuth, googleAuthProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve access token from Google sign-in result');
    }

    cachedAccessToken = credential.accessToken;
    cachedCurrentUser = result.user;
    notifyListeners(result.user, cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const getCurrentGoogleUser = (): User | null => {
  return cachedCurrentUser || firebaseAuth.currentUser;
};

export const googleSignOut = async (): Promise<void> => {
  await firebaseSignOut(firebaseAuth);
  cachedAccessToken = null;
  cachedCurrentUser = null;
  notifyListeners(null, null);
};
