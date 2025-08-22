// src/firebase.js
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";

// .env.local から読み込み（CRAは REACT_APP_ プレフィックス必須）
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Hot Reload 対策：既存Appがあれば再利用
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();

// 認証ユーティリティ
export const signInGoogle = () => signInWithPopup(auth, provider);
export const signOutGoogle = () => signOut(auth);
export const onAuth = (cb) => onAuthStateChanged(auth, cb);

// users/{uid}/state/appData にまとめて保存
export const userDocRef = (uid) => doc(db, "users", uid, "state", "appData");

// ここから不足していたエクスポートを追加
export async function loadCloud(uid) {
  const ref = userDocRef(uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : { memoDB: {}, rankDB: {} };
}

export async function saveCloud(uid, data) {
  const ref = userDocRef(uid);
  // merge:true で部分更新
  await setDoc(ref, data, { merge: true });
}

export function subscribeCloud(uid, cb) {
  const ref = userDocRef(uid);
  return onSnapshot(ref, (snap) => {
    cb(snap.exists() ? snap.data() : { memoDB: {}, rankDB: {} });
  });
}
