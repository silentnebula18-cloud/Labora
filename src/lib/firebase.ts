import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';

const app = getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);

console.log('Firebase App:', app.name);
console.log('Firebase Auth initialized:', !!auth);
console.log('Firestore initialized:', !!db);
