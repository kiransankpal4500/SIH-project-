/**
 * OceanScope Firebase Authentication Context & Hook
 * Manages global authentication state, session persistence, and auth operations.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  UserCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../config/firebase';

export interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signup: (email: string, password: string, displayName: string) => Promise<UserCredential>;
  login: (email: string, password: string) => Promise<UserCredential>;
  loginWithGoogle: () => Promise<UserCredential>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync basic user document in Firestore on auth changes
  const syncUserToFirestore = async (user: User, additionalData: Record<string, unknown> = {}) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || additionalData.displayName || '',
          photoURL: user.photoURL || '',
          provider: user.providerData[0]?.providerId || 'password',
          role: 'Researcher',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          ...additionalData,
        });
      } else {
        await setDoc(
          userRef,
          {
            updatedAt: Timestamp.now(),
            email: user.email || '',
            ...(user.displayName ? { displayName: user.displayName } : {}),
            ...(user.photoURL ? { photoURL: user.photoURL } : {}),
            ...additionalData,
          },
          { merge: true }
        );
      }
    } catch (err) {
      console.warn('[AuthContext] Firestore user synchronization non-blocking error:', err);
    }
  };

  useEffect(() => {
    // Process any returning Google redirect credentials on mount
    getRedirectResult(auth)
      .then((cred) => {
        if (cred?.user) {
          syncUserToFirestore(cred.user);
        }
      })
      .catch((err) => {
        console.warn('[AuthContext] Google redirect result notice:', err);
      });

    // Safety timeout: prevent auth state listener from staying in loading state indefinitely
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 4000);

    // Single shared listener for Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(safetyTimer);
      setCurrentUser(user);
      setLoading(false);
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  const signup = async (email: string, password: string, displayName: string): Promise<UserCredential> => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    
    // Set display name in Firebase Auth
    if (displayName.trim()) {
      await updateProfile(cred.user, { displayName: displayName.trim() });
    }

    // Send email verification link
    try {
      await sendEmailVerification(cred.user);
    } catch (verifErr) {
      console.warn('[AuthContext] Email verification dispatch error:', verifErr);
    }

    // Provision Firestore profile record
    await syncUserToFirestore(cred.user, { displayName: displayName.trim() });

    // Refresh state with updated user
    setCurrentUser(auth.currentUser);
    return cred;
  };

  const login = async (email: string, password: string): Promise<UserCredential> => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await syncUserToFirestore(cred.user);
    return cred;
  };

  const loginWithGoogle = async (): Promise<UserCredential> => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await syncUserToFirestore(cred.user);
      return cred;
    } catch (popupErr: any) {
      // If popup was blocked or failed with COOP policy, fallback to redirect-based sign-in
      if (
        popupErr?.code === 'auth/popup-blocked' ||
        popupErr?.message?.includes('Cross-Origin-Opener-Policy')
      ) {
        console.warn('[AuthContext] Popup blocked or COOP restricted, initiating redirect sign-in...');
        await signInWithRedirect(auth, googleProvider);
        throw new Error('Redirecting to Google Sign-In...');
      }
      throw popupErr;
    }
  };

  const logout = async (): Promise<void> => {
    await signOut(auth);
  };

  const resetPassword = async (email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateUserProfile = async (displayName: string, photoURL?: string): Promise<void> => {
    if (!auth.currentUser) throw new Error('No authenticated user to update.');

    const updatePayload: { displayName: string; photoURL?: string } = {
      displayName: displayName.trim(),
    };
    if (photoURL !== undefined) {
      updatePayload.photoURL = photoURL.trim();
    }

    await updateProfile(auth.currentUser, updatePayload);
    await syncUserToFirestore(auth.currentUser, updatePayload);
    setCurrentUser({ ...auth.currentUser } as User);
  };

  const resendVerificationEmail = async (): Promise<void> => {
    if (!auth.currentUser) throw new Error('No user is currently signed in.');
    await sendEmailVerification(auth.currentUser);
  };

  const value: AuthContextType = {
    currentUser,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    updateUserProfile,
    resendVerificationEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
