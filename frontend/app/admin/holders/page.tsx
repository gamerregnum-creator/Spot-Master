import { fetchAdminHolders } from '@/lib/api';
import HoldersContent from './HoldersContent';

export default async function AdminHoldersPage() {
  const holders = await fetchAdminHolders();

  return <HoldersContent holders={holders} />;
}
