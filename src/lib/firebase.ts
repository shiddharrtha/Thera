import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getApps,
  initializeApp,
  setReactNativeAsyncStorage,
  type ReactNativeFirebase,
} from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';

function getFirebaseWebOptions(): ReactNativeFirebase.FirebaseAppOptions {
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '';
  const databaseURL =
    process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL ??
    (projectId ? `https://${projectId}-default-rtdb.firebaseio.com` : '');

  return {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId,
    databaseURL,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  };
}

let initPromise: Promise<void> | undefined;

/** Native platforms auto-configure from GoogleService files; web needs explicit init. */
export async function ensureFirebaseInitialized(): Promise<void> {
  if (Platform.OS !== 'web') return;
  if (getApps().length > 0) return;

  if (!initPromise) {
    initPromise = (async () => {
      try {
        setReactNativeAsyncStorage(AsyncStorage);
        const options = getFirebaseWebOptions();
        if (!options.apiKey || !options.appId || !options.projectId || !options.databaseURL) {
          throw new Error(
            'Missing Firebase web config. Copy .env.example to .env and set EXPO_PUBLIC_FIREBASE_* values.',
          );
        }
        await initializeApp(options);
      } catch (error) {
        initPromise = undefined;
        throw error;
      }
    })();
  }

  await initPromise;
}

/** Native Firebase Auth instance (requires dev build, not Expo Go). */
export const firebaseAuth = auth;
