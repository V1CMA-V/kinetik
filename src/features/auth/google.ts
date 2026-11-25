import { supabase } from '@/lib/supabase';

type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

/** Google's `CommonStatusCodes.DEVELOPER_ERROR`: wrong SHA-1, package or client ID. */
const DEVELOPER_ERROR = '10';

export class GoogleSignInError extends Error {}

let loaded: GoogleSignInModule | null | undefined;

/**
 * The library is native: builds made before it was added (or Expo Go) don't have it,
 * and importing it there throws. Load it lazily so the rest of the app keeps working.
 */
function loadGoogle(): GoogleSignInModule | null {
  if (loaded !== undefined) return loaded;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const google: GoogleSignInModule = require('@react-native-google-signin/google-signin');
    google.GoogleSignin.configure({
      // The *web* client ID: Google issues the ID token for it, and Supabase verifies it.
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      // iOS client (its reversed form is the URL scheme in app.json). Not a secret.
      iosClientId: '542621400527-04jmbt2frik6kpq9pruv0achg9kps0jv.apps.googleusercontent.com',
    });
    loaded = google;
  } catch {
    loaded = null;
  }
  return loaded;
}

/**
 * Native Google account picker → ID token → Supabase session.
 * Resolves `'cancelled'` when the person closes the picker (not an error).
 */
export async function signInWithGoogle(): Promise<'signed-in' | 'cancelled'> {
  const google = loadGoogle();
  if (!google) {
    throw new GoogleSignInError(
      'Esta versión de la app no incluye el acceso con Google. Instala la versión más reciente.',
    );
  }
  const { GoogleSignin, isCancelledResponse, isErrorWithCode, statusCodes } = google;

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) return 'cancelled';

    const idToken = response.data.idToken;
    if (!idToken) throw new GoogleSignInError('Google no devolvió un token. Vuelve a intentar.');

    const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
    if (error) throw error;
    return 'signed-in';
  } catch (error) {
    if (isErrorWithCode(error)) {
      switch (error.code) {
        case statusCodes.SIGN_IN_CANCELLED:
        case statusCodes.IN_PROGRESS:
          return 'cancelled';
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          throw new GoogleSignInError('Actualiza Google Play Services para entrar con Google.');
        case DEVELOPER_ERROR:
          throw new GoogleSignInError(
            'El acceso con Google no está configurado (revisa el SHA-1 y los IDs de cliente).',
          );
      }
    }
    throw error;
  }
}

/** Forget the chosen Google account so the picker shows up again on the next sign-in. */
export async function signOutFromGoogle() {
  try {
    await loadGoogle()?.GoogleSignin.signOut();
  } catch {
    // Not signed in with Google (e.g. email/password session): nothing to do.
  }
}
