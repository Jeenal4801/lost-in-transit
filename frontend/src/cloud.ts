import type { User } from "firebase/auth";
import type { Run } from "./director";
const env = import.meta.env;
export const configured = !!(
  env.VITE_FIREBASE_API_KEY &&
  env.VITE_FIREBASE_AUTH_DOMAIN &&
  env.VITE_FIREBASE_PROJECT_ID &&
  env.VITE_FIREBASE_APP_ID
);
const backend = () => {
  if (!configured)
    throw Error(
      "Cloud saves are not configured. Guest progress stays on this device.",
    );
  return import("./cloudFirebase");
};
export function watchAuth(fn: (user: User | null) => void) {
  let cancelled = false,
    dispose: undefined | (() => void);
  if (configured)
    void backend()
      .then((b) => {
        if (!cancelled) dispose = b.watchAuth(fn);
      })
      .catch(() => fn(null));
  return () => {
    cancelled = true;
    dispose?.();
  };
}
export const login = async () => (await backend()).login();
export const logout = async () => (await backend()).logout();
export const listCloud = async () => (await backend()).listCloud();
export const upload = async (r: Run, revision: number | null) =>
  (await backend()).upload(r, revision);
export const removeCloud = async (id: string) =>
  (await backend()).removeCloud(id);
export const deleteAccount = async () => (await backend()).deleteAccount();
