import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  deleteUser,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  limit,
  getDocs,
  doc,
  runTransaction,
  deleteDoc,
} from "firebase/firestore";
import { validateRun, ConflictError } from "./persistence";
import type { Run } from "./director";
const env = import.meta.env;
export const configured = !!(
  env.VITE_FIREBASE_API_KEY &&
  env.VITE_FIREBASE_AUTH_DOMAIN &&
  env.VITE_FIREBASE_PROJECT_ID &&
  env.VITE_FIREBASE_APP_ID
);
const app = configured
  ? initializeApp({
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    })
  : null;
const auth = app ? getAuth(app) : null,
  db = app ? getFirestore(app) : null;
export const watchAuth = (fn: (user: User | null) => void) =>
  auth ? onAuthStateChanged(auth, fn) : () => {};
export async function login() {
  if (!auth)
    throw Error(
      "Cloud saves are not configured. Guest progress is saved on this device.",
    );
  return signInWithPopup(auth, new GoogleAuthProvider());
}
export async function logout() {
  if (auth) await signOut(auth);
}
function userPath() {
  if (!auth?.currentUser || !db) throw Error("Sign in to use cloud saves.");
  return { uid: auth.currentUser.uid, db };
}
export async function listCloud() {
  const { uid, db } = userPath();
  const snapshot = await getDocs(
    query(collection(db, "players", uid, "campaigns"), limit(20)),
  );
  if (auth?.currentUser?.uid !== uid)
    throw Error("Account changed. Reload cloud campaigns.");
  return snapshot.docs.map((d) => ({
    run: validateRun(JSON.parse(d.data().payload)),
    revision: d.data().revision as number,
  }));
}
export async function upload(r: Run, expectedRevision: number | null) {
  const { uid, db } = userPath();
  const payload = JSON.stringify(validateRun(r));
  const ref = doc(db, "players", uid, "campaigns", r.id);
  return runTransaction(db, async (t) => {
    const old = await t.get(ref);
    if ((old.exists() ? old.data().revision : null) !== expectedRevision)
      throw new ConflictError();
    const revision = (expectedRevision ?? 0) + 1;
    t.set(ref, {
      owner: uid,
      id: r.id,
      schema: 3,
      revision,
      updatedAt: Date.now(),
      payload,
    });
    return revision;
  });
}
export async function removeCloud(id: string) {
  const { uid, db } = userPath();
  await deleteDoc(doc(db, "players", uid, "campaigns", id));
}
export async function deleteAccount() {
  const { uid, db } = userPath();
  const account = auth!.currentUser!;
  while (true) {
    const batch = await getDocs(
      query(collection(db, "players", uid, "campaigns"), limit(20)),
    );
    if (batch.empty) break;
    await Promise.all(batch.docs.map((d) => deleteDoc(d.ref)));
  }
  if (auth?.currentUser?.uid !== uid)
    throw Error("Account changed. No authentication account was deleted.");
  await deleteUser(account);
}
