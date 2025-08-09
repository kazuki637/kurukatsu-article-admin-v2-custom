
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCAL-nBWF_Yo14HwgKbpcc_H95KjNmND5s",
  authDomain: "kurukatsu-app.firebaseapp.com",
  projectId: "kurukatsu-app",
  storageBucket: "kurukatsu-app.firebasestorage.app",
  messagingSenderId: "702781399082",
  appId: "1:702781399082:ios:4beb9dc94037cd0ead2353"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const ADMIN_EMAILS: string[] = ['admin@example.com', 'kurukatsu637@gmail.com'];
