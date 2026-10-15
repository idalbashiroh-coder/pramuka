import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Reuse existing app instance if already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Required Google Workspace scopes for Spreadsheet & Drive integration
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

// Force consent prompt so Google always grants the new Drive & Sheets permissions
provider.setCustomParameters({
  prompt: 'consent',
  access_type: 'offline',
});

const TOKEN_STORAGE_KEY = 'sipramuka_oauth_token_v1';

// In-memory and session caching for OAuth access token
let cachedAccessToken: string | null = (() => {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
})();
let isSigningIn = false;

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // sessionStorage not available
  }
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const activeToken = cachedAccessToken || (() => {
        try {
          return sessionStorage.getItem(TOKEN_STORAGE_KEY);
        } catch {
          return null;
        }
      })();

      if (activeToken) {
        cachedAccessToken = activeToken;
        if (onAuthSuccess) onAuthSuccess(user, activeToken);
      } else if (!isSigningIn) {
        if (onAuthSuccess) onAuthSuccess(user, null);
      }
    } else {
      setAccessToken(null);
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses dari Google.');
    }

    setAccessToken(credential.accessToken);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    const errorCode = String(error?.code || '').toLowerCase();
    const errorMsg = String(error?.message || '').toLowerCase();

    if (errorCode.includes('popup-blocked') || errorMsg.includes('popup-blocked')) {
      console.warn('Google Sign-In popup was blocked by browser.');
      const blockedErr = new Error(
        'Jendela login Google diblokir oleh peramban (browser). Mohon izinkan popup untuk situs ini pada bilah alamat peramban (ikon gembok/popup), lalu coba Login Google kembali.'
      );
      (blockedErr as any).code = 'auth/popup-blocked';
      throw blockedErr;
    }
    if (errorCode.includes('popup-closed-by-user') || errorMsg.includes('popup-closed')) {
      console.warn('Google Sign-In popup was closed by user.');
      const closedErr = new Error('Jendela login ditutup sebelum proses selesai. Silakan coba lagi.');
      (closedErr as any).code = 'auth/popup-closed-by-user';
      throw closedErr;
    }
    if (errorCode.includes('cancelled-popup-request') || errorMsg.includes('cancelled-popup')) {
      console.warn('Google Sign-In popup request was cancelled.');
      const cancelledErr = new Error('Permintaan login dibatalkan karena ada proses lain yang sedang berjalan.');
      (cancelledErr as any).code = 'auth/cancelled-popup-request';
      throw cancelledErr;
    }
    console.warn('Google Sign-In notice:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const fromSession = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (fromSession) {
      cachedAccessToken = fromSession;
      return fromSession;
    }
  } catch {}
  return null;
};

export const hasActiveToken = (): boolean => {
  return !!getAccessToken();
};

/**
 * Returns the current active access token.
 * Does NOT open popups in background tasks.
 * If promptIfMissing is true, can be called from explicit user click events.
 */
export const ensureAccessToken = async (promptIfMissing = false): Promise<string | null> => {
  const existing = getAccessToken();
  if (existing) {
    return existing;
  }
  if (promptIfMissing) {
    const result = await googleSignIn();
    return result.accessToken;
  }
  return null;
};

export const logout = async () => {
  await signOut(auth);
  setAccessToken(null);
};
