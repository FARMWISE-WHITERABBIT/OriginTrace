import { redirect } from 'next/navigation';
export default function CommoditiesRedirect() {
  redirect('/superadmin/reference-data?tab=commodities');
}
