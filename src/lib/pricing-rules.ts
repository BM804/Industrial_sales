export type Role = {
  name: string;
  count: number;
  rate: number;
  startMonth: number;
  durationMonths: number;
  utilizationPct: number;
  /** Legacy display field retained while browser saves migrate to the utilization model. */
  activeMonths: number[];
  critical?: boolean;
  experienceTier?: string;
  marginPct?: number;
};

export const experienceRates = [
  { label: '1–3 Years', rate: 80000 },
  { label: '3–5 Years', rate: 100000 },
  { label: '6–8 Years', rate: 150000 },
  { label: '9–12 Years', rate: 215000 },
  { label: '12–15 Years', rate: 300000 },
  { label: '15+ Years', rate: 400000 },
] as const;

export function tierForRole(role: Role) {
  return experienceRates.find(tier=>tier.label===role.experienceTier)?.label || experienceRates.reduce((best, tier) => Math.abs(tier.rate - role.rate) < Math.abs(best.rate - role.rate) ? tier : best, experienceRates[0]).label;
}
export function normalizeRoleExperience(role:Role):Role { const tier=experienceRates.find(item=>item.label===role.experienceTier)||experienceRates.reduce((best,item)=>Math.abs(item.rate-role.rate)<Math.abs(best.rate-role.rate)?item:best,experienceRates[0]);return {...role,experienceTier:tier.label,rate:tier.rate,marginPct:role.marginPct??45}; }

export const defaultRoles: Role[] = [
  { name: 'Core developers', count: 2, rate: 150000, experienceTier:'6–8 Years', marginPct:45, startMonth: 1, durationMonths: 2, utilizationPct: 100, activeMonths:[1,2], critical: true },
  { name: 'AI engineers', count: 2, rate: 215000, experienceTier:'9–12 Years', marginPct:45, startMonth: 1, durationMonths: 2, utilizationPct: 100, activeMonths:[1,2], critical: true },
  { name: 'Frontend developers', count: 2, rate: 100000, experienceTier:'3–5 Years', marginPct:45, startMonth: 1, durationMonths: 2, utilizationPct: 100, activeMonths:[1,2] },
  { name: 'Backend developers', count: 2, rate: 150000, experienceTier:'6–8 Years', marginPct:45, startMonth: 1, durationMonths: 2, utilizationPct: 100, activeMonths:[1,2] },
  { name: 'UI/UX designers', count: 2, rate: 100000, experienceTier:'3–5 Years', marginPct:45, startMonth: 1, durationMonths: 1.5, utilizationPct: 100, activeMonths:[1,2] },
  { name: 'Project manager', count: 1, rate: 215000, experienceTier:'9–12 Years', marginPct:45, startMonth: 1, durationMonths: 5, utilizationPct: 50, activeMonths:[1,2,3,4,5], critical: true },
  { name: 'Business analyst', count: 1, rate: 100000, experienceTier:'3–5 Years', marginPct:45, startMonth: 1, durationMonths: 2, utilizationPct: 75, activeMonths:[1,2] },
  { name: 'QA / testers', count: 1, rate: 150000, experienceTier:'6–8 Years', marginPct:45, startMonth: 3, durationMonths: 1.5, utilizationPct: 100, activeMonths:[3,4] }
];

export const formatINR = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
export const toCr = (n: number) => `${(n / 10000000).toFixed(2)} Cr`;
export const manMonths = (r: Role) => r.count * r.durationMonths * (r.utilizationPct / 100);
export const roleCost = (r: Role) => r.rate * manMonths(r);
export function baseline(roles: Role[]) { return roles.reduce((sum, r) => sum + roleCost(r), 0); }
export function swapSavings(roles: Role[], juniorRateFactor = .68) { return roles.reduce((sum, r) => sum + (r.critical ? 0 : roleCost(r) * (1 - juniorRateFactor)), 0); }
export function margin(price: number, cost: number) { return price <= 0 ? 0 : (price - cost) / price; }
export function floorPrice(cost: number, marginFloor = .35) { return cost / (1 - marginFloor); }
