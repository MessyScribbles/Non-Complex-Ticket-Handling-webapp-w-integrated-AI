// src/lib/profile.ts
import { auth, db } from './firebase'; // Import auth and db from your firebase setup
import { updateProfile } from 'firebase/auth'; // For updating user's displayName and photoURL in Firebase Auth
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'; // For updating Firestore user document
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // For Firebase Storage

// Define APP_ID consistent with your Firestore rules and other components
const APP_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;

/**
 * Updates the user's display name in Firebase Authentication and their Firestore profile.
 * @param userId The UID of the user.
 * @param newName The new display name.
 * @returns A Promise that resolves when the update is complete.
 */
export const updateUserProfileName = async (userId: string, newName: string): Promise<void> => {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    throw new Error("Not authorized: User must be logged in and match the profile being updated.");
  }

  try {
    // 1. Update display name in Firebase Authentication profile
    await updateProfile(auth.currentUser, { displayName: newName });

    // 2. Update name in Firestore user document
    const userDocRef = doc(db, `users/${userId}`); // Path: /users/{userId}
    await updateDoc(userDocRef, {
      name: newName,
      updatedAt: serverTimestamp(),
    });

    console.log(`User ${userId} display name updated to: ${newName}`);
  } catch (error) {
    console.error("Error updating user profile name:", error);
    throw error;
  }
};

/**
 * Uploads a new profile picture to Firebase Storage and updates the user's profile URL.
 * @param userId The UID of the user.
 * @param file The image file to upload.
 * @returns A Promise that resolves with the new photo URL.
 */
export const updateUserProfilePicture = async (userId: string, file: File): Promise<string> => {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    throw new Error("Not authorized: User must be logged in and match the profile being updated.");
  }

  const storage = getStorage();
  // Define the storage path: profile_pictures/{userId}/{timestamp}_{filename}
  const storageRef = ref(storage, `profile_pictures/${userId}/${Date.now()}_${file.name}`);

  try {
    // 1. Upload file to Firebase Storage
    const snapshot = await uploadBytes(storageRef, file);
    const photoURL = await getDownloadURL(snapshot.ref);

    // 2. Update photoURL in Firebase Authentication profile
    await updateProfile(auth.currentUser, { photoURL: photoURL });

    // 3. Update profilePictureUrl in Firestore user document
    const userDocRef = doc(db, `users/${userId}`); // Path: /users/{userId}
    await updateDoc(userDocRef, {
      profilePictureUrl: photoURL,
      updatedAt: serverTimestamp(),
    });

    console.log(`User ${userId} profile picture updated: ${photoURL}`);
    return photoURL;
  } catch (error) {
    console.error("Error updating user profile picture:", error);
    throw error;
  }
};

/**
 * Updates the user's online status in their Firestore profile.
 * @param userId The UID of the user.
 * @param status The new online status ('online' | 'offline' | 'away' etc.).
 * @returns A Promise that resolves when the update is complete.
 */
export const updateUserOnlineStatus = async (userId: string, status: string): Promise<void> => {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    throw new Error("Not authorized: User must be logged in and match the profile being updated.");
  }

  try {
    const userDocRef = doc(db, `users/${userId}`); // Path: /users/{userId}
    await updateDoc(userDocRef, {
      onlineStatus: status,
      lastSeen: serverTimestamp(), // Update lastSeen whenever status changes
    });

    console.log(`User ${userId} online status updated to: ${status}`);
  } catch (error) {
    console.error("Error updating user online status:", error);
    throw error;
  }
};