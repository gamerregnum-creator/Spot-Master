const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export async function fetchDashboardRevenue() {
  const res = await fetch(`${API_BASE_URL}/dashboard/revenue`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch revenue data');
  return res.json();
}

export async function fetchDashboardStaking() {
  const res = await fetch(`${API_BASE_URL}/dashboard/staking`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch staking data');
  return res.json();
}

export async function fetchDashboardReferrals() {
  const res = await fetch(`${API_BASE_URL}/dashboard/referrals`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch referral data');
  return res.json();
}

export async function fetchAdminHolders() {
  const res = await fetch(`${API_BASE_URL}/dashboard/holders`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch admin holders: ${res.status}`);
  return res.json();
}
