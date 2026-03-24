import { fetchDashboardRevenue } from '@/lib/api';
import AdminContent from './AdminContent';

export default async function RevenueDashboardPage() {
  const revenue = await fetchDashboardRevenue();

  return (
    <AdminContent revenue={revenue} />
  );
}
