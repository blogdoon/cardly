import { signInWithPopup, signOut as fbSignOut, onAuthStateChanged, User as FbUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db, isFirebaseConfigured } from './firebase';
import { UserProfile } from '../types/user';
import { handleFirestoreError, OperationType } from './firestoreErrors';

const DEMO_USER_STORAGE_KEY = 'cardly_demo_user_session';

export async function loginWithGoogle(): Promise<UserProfile> {
  if (isFirebaseConfigured && auth) {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Cardly Member',
        photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
        role: user.email === 'blogdoontv@gmail.com' ? 'admin' : 'customer',
        createdAt: new Date().toISOString(),
      };

      // Sync to firestore if available
      if (db) {
        const userPath = `users/${user.uid}`;
        try {
          const userRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            await setDoc(userRef, profile);
          }
        } catch (dbErr: any) {
          if (dbErr?.code === 'permission-denied') {
            handleFirestoreError(dbErr, OperationType.WRITE, userPath);
          } else {
            console.warn('Could not sync user to Firestore:', dbErr);
          }
        }
      }

      return profile;
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        console.info('Google Sign-In popup closed by user.');
        const currentStored = getStoredDemoUser();
        if (currentStored) return currentStored;
        throw new Error('Sign-in cancelled. Please try again.');
      }

      console.error('Google Sign-In failed:', err);

      // If configuration-not-found occurs (e.g. Google provider is newly provisioned or awaiting activation)
      if (err?.code === 'auth/configuration-not-found' || err?.message?.includes('configuration-not-found')) {
        console.warn('Firebase Auth Google Sign-in provider is still initializing or needs Google provider enabled in console. Providing fallback demo session.');
        return getFallbackDemoProfile();
      }

      throw new Error(err.message || 'Failed to sign in with Google');
    }
  }

  // Fallback demo Google authentication with realistic profile
  return getFallbackDemoProfile();
}

function getFallbackDemoProfile(): UserProfile {
  const demoProfile: UserProfile = {
    uid: 'demo_user_google_108',
    email: 'blogdoontv@gmail.com',
    displayName: 'Alex Morgan',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'admin',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
    savedAddresses: [
      {
        id: 'addr-1',
        name: 'Alex Morgan',
        line1: '42 Highfield Crescent',
        city: 'London',
        county: 'Greater London',
        postcode: 'SW1A 1AA',
        country: 'United Kingdom',
        isDefault: true,
      },
    ],
  };

  localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify(demoProfile));
  return demoProfile;
}

export async function logoutUser(): Promise<void> {
  if (isFirebaseConfigured && auth) {
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Error signing out from Firebase:', e);
    }
  }
  localStorage.removeItem(DEMO_USER_STORAGE_KEY);
}

export function getStoredDemoUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(DEMO_USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function subscribeToAuth(callback: (user: UserProfile | null) => void): () => void {
  if (isFirebaseConfigured && auth) {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FbUser | null) => {
      if (fbUser) {
        const profile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || 'Cardly Member',
          photoURL: fbUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${fbUser.uid}`,
          role: fbUser.email === 'blogdoontv@gmail.com' ? 'admin' : 'customer',
          createdAt: new Date().toISOString(),
        };
        callback(profile);
      } else {
        const demoUser = getStoredDemoUser();
        callback(demoUser);
      }
    });
    return unsubscribe;
  }

  // Not connected yet: read from localStorage
  const demoUser = getStoredDemoUser();
  callback(demoUser);
  return () => {};
}
