import { redirect } from 'next/navigation';
export default function TenantHealthRedirect() {
  redirect('/superadmin/tenants?tab=health');
}
