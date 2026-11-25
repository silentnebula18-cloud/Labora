import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import { getMessaging, type Messaging } from '@react-native-firebase/messaging';

const app = getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);

let messagingInstance: Messaging | null = null;
try {
  messagingInstance = getMessaging(app);
} catch (error) {
  console.warn('Firebase Messaging not initialized:', error);
}

export const messaging = messagingInstance;

console.log('Firebase App:', app.name);
console.log('Firebase Auth initialized:', !!auth);
console.log('Firestore initialized:', !!db);
console.log('Messaging initialized:', !!messaging);

