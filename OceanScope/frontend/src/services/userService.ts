/**
 * User Profile Firestore Service
 * Manages persisting and fetching user profile metadata in Firestore users/{uid}.
 */

import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export interface UserProfileData {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role?: string;
  organization?: string;
  bio?: string;
  preferredRegion?: string;
  preferredVariable?: string;
  provider?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Fetch a user profile document from Firestore by user UID
 */
export async function getUserProfile(uid: string): Promise<UserProfileData | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const data = snap.data();
      return {
        uid: data.uid || uid,
        email: data.email || '',
        displayName: data.displayName || '',
        photoURL: data.photoURL || '',
        role: data.role || 'Marine Researcher',
        organization: data.organization || '',
        bio: data.bio || '',
        preferredRegion: data.preferredRegion || 'Indian Ocean',
        preferredVariable: data.preferredVariable || 'temperature',
        provider: data.provider || 'password',
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      };
    }
    return null;
  } catch (error) {
    console.warn('[UserService] Failed to fetch user profile:', error);
    return null;
  }
}

/**
 * Update user profile document in Firestore users/{uid}.
 * Validates that current authenticated user owns this document before saving.
 */
export async function updateUserProfileData(
  uid: string,
  updates: Partial<UserProfileData>
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== uid) {
    throw new Error('Unauthorized: cannot update a profile belonging to another user.');
  }

  try {
    const userRef = doc(db, 'users', uid);
    // Exclude uid and sensitive fields
    const { uid: _ignoredUid, ...safeUpdates } = updates;

    await setDoc(
      userRef,
      {
        ...safeUpdates,
        uid,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('[UserService] Failed to update user profile document:', error);
    throw error;
  }
}
