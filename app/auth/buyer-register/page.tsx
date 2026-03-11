import { redirect } from 'next/navigation';

/**
 * Self-service buyer registration has been removed.
 * New buyer organisations are created by the superadmin.
 */
export default function BuyerRegisterPage() {
  redirect('/auth/login');
}
