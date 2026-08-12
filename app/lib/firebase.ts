import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase web configuration is intentionally public. Access control lives in
// Authentication and Firestore security rules, not in the API key.
const firebaseConfig = {
  apiKey: "AIzaSyBkIC4X7TEBHmwPZ1QVzwCoSkd-9-LAdrg",
  authDomain: "maison-elan-shop.firebaseapp.com",
  projectId: "maison-elan-shop",
  storageBucket: "maison-elan-shop.firebasestorage.app",
  messagingSenderId: "980797869662",
  appId: "1:980797869662:web:f6a1b1f5699d4c5ff96ecf",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = (() => {
  try {
    return initializeAuth(firebaseApp, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch (error) {
    // During hot reload the Firebase app can outlive this module. Reuse its
    // already-initialized Auth instance instead of interrupting local preview.
    if (typeof error === "object" && error && "code" in error && error.code === "auth/already-initialized") {
      return getAuth(firebaseApp);
    }
    throw error;
  }
})();
export const firestore = getFirestore(firebaseApp);
