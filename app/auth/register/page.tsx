import { redirect } from 'next/navigation';

/**
 * Self-service org registration has been removed.
 * New organisations are created by the superadmin.
 * Existing invite-code users should use /auth/join.
 */
export default function RegisterPage() {
  redirect('/auth/login');
}
