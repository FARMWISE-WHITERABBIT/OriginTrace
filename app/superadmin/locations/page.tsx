import { redirect } from 'next/navigation';
export default function LocationsRedirect() {
  redirect('/superadmin/reference-data?tab=locations');
}
