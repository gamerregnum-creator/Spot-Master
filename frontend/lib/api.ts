const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';

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

// Distribute revenue for a store sale
// body: { sale_total: number, user_id: string, order_id: string }
export async function distributeRevenue(businessId: string, saleTotal: number, userId: string, orderId: string) {
  const res = await fetch(`${API_BASE_URL}/revenue/distribute/${businessId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sale_total: saleTotal, user_id: userId, order_id: orderId }),
  });
  if (!res.ok) throw new Error(`Revenue distribution failed: ${res.status}`);
  return res.json();
}

// Distribute license/service funds
export async function distributeLicense(licenseId: string, amount: number, consultantCut: number, poolCut: number) {
  const res = await fetch(`${API_BASE_URL}/revenue/license`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ license_id: licenseId, amount, consultant_cut: consultantCut, pool_cut: poolCut }),
  });
  if (!res.ok) throw new Error(`License distribution failed: ${res.status}`);
  return res.json();
}

// Trigger the Unity Pool raffle for a given pool
export async function triggerUnityRaffle(poolId: string) {
  const res = await fetch(`${API_BASE_URL}/unity/raffle/${poolId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Unity raffle failed: ${res.status}`);
  return res.json();
}

// Sync a user profile from Clerk → backend
export async function syncUser(profile: {
  id: string;
  email: string;
  full_name?: string;
  wallet_address?: string;
}) {
  const res = await fetch(`${API_BASE_URL}/user/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  if (!res.ok) throw new Error(`User sync failed: ${res.status}`);
  return res.json();
}

// Admin: get revenue logs
export async function fetchRevenueLogs(limit = 50) {
  const res = await fetch(`${API_BASE_URL}/admin/revenue-logs?limit=${limit}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch revenue logs: ${res.status}`);
  return res.json();
}

// Admin: toggle contract pause
export async function toggleContractPause() {
  const res = await fetch(`${API_BASE_URL}/admin/pause`, { method: 'POST' });
  if (!res.ok) throw new Error(`Toggle pause failed: ${res.status}`);
  return res.json();
}

// Admin: trigger company dividend distribution
export async function triggerCompanyDistribute() {
  const res = await fetch(`${API_BASE_URL}/admin/distribute-company`, { method: 'POST' });
  if (!res.ok) throw new Error(`Company distribute failed: ${res.status}`);
  return res.json();
}

// Admin: update holder wallet address (emergency)
export async function updateHolderWallet(userId: string, oldWallet: string, newWallet: string, reason: string) {
  const res = await fetch(`${API_BASE_URL}/admin/holder/update-wallet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, old_wallet: oldWallet, new_wallet: newWallet, reason }),
  });
  if (!res.ok) throw new Error(`Wallet update failed: ${res.status}`);
  return res.json();
}

// Admin: register sponsor ↔ player relationship
export async function registerSponsor(sponsorWallet: string, playerUserId: string) {
  const res = await fetch(`${API_BASE_URL}/admin/sponsor/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sponsor_wallet: sponsorWallet, player_user_id: playerUserId }),
  });
  if (!res.ok) throw new Error(`Sponsor registration failed: ${res.status}`);
  return res.json();
}

// Process a staking action
export async function stakingAction(walletId: string, amount: number) {
  const res = await fetch(`${API_BASE_URL}/staking/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet_id: walletId, amount }),
  });
  if (!res.ok) throw new Error(`Staking action failed: ${res.status}`);
  return res.json();
}
