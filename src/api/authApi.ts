import type { CurrentUser } from '../types/models';
import { ownerDisplay, ownerEmail } from '../config/firebase';
import { auth, firebase } from './firebaseClient';
import { getHerConfig } from './databaseApi';

export async function configureAuthPersistence(): Promise<void> {
  await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
}

export async function signIn(email: string, password: string): Promise<void> {
  await auth.signInWithEmailAndPassword(email, password);
}

export async function signOut(): Promise<void> {
  await auth.signOut();
}

export function onAuthChanged(callback: (user: firebase.User | null) => void): () => void {
  return auth.onAuthStateChanged(callback);
}

export async function resolveCurrentUser(email: string): Promise<CurrentUser> {
  const normalized = email.toLowerCase();
  if (normalized === ownerEmail) {
    return { email: normalized, role: 'me', display: ownerDisplay };
  }

  const her = await getHerConfig();
  if (her?.email?.toLowerCase() === normalized) {
    return { email: normalized, role: 'her', display: her.display || 'Her' };
  }

  return { email: normalized, role: 'her', display: 'Her' };
}

export function cleanAuthError(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: string }).code) : '';
  if (code === 'auth/user-not-found') return 'no Firebase user exists for this email';
  if (code === 'auth/wrong-password' || code === 'auth/invalid-login-credentials') return 'email or password is wrong';
  if (code === 'auth/too-many-requests') return 'too many tries — wait a little and try again';
  if (code === 'auth/operation-not-allowed') return 'enable Email/Password sign-in in Firebase Authentication';
  return error instanceof Error ? error.message : 'sign-in failed';
}
