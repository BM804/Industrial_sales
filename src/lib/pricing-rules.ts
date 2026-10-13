export type Role = {
  name: string;
  count: number;
  rate: number;
  senior: boolean;
  startMonth: number;
  durationMonths: number;
  utilizationPct: number;
  /** Legacy display field retained while browser saves migrate to the utilization model. */
  activeMonths: number[];
  critical?: boolean;
};

export const defaultRoles: Role[] = [
  { name: 'Core developers', count: 2, rate: 180000, senior: true, startMonth: 1, durationMonths: 2, utilizationPct: 100, activeMonths:[1,2], critical: true },
  { name: 'AI engineers', count: 2, rate: 165000, senior: true, startMonth: 1, durationMonths: 2, utilizationPct: 100, activeMonths:[1,2], critical: true },
  { name: 'Frontend developers', count: 2, rate: 105000, senior: true, startMonth: 1, durationMonths: 2, utilizationPct: 100, activeMonths:[1,2] },
  { name: 'Backend developers', count: 2, rate: 115000, senior: true, startMonth: 1, durationMonths: 2, utilizationPct: 100, activeMonths:[1,2] },
  { name: 'UI/UX designers', count: 2, rate: 95000, senior: false, startMonth: 1, durationMonths: 1.5, utilizationPct: 100, activeMonths:[1,2] },
  { name: 'Project manager', count: 1, rate: 180000, senior: true, startMonth: 1, durationMonths: 5, utilizationPct: 50, activeMonths:[1,2,3,4,5], critical: true },
  { name: 'Business analyst', count: 1, rate: 125000, senior: false, startMonth: 1, durationMonths: 2, utilizationPct: 75, activeMonths:[1,2] },
  { name: 'QA / testers', count: 1, rate: 200000, senior: false, startMonth: 3, durationMonths: 1.5, utilizationPct: 100, activeMonths:[3,4] }
];

export const formatINR = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
export const toCr = (n: number) => `${(n / 10000000).toFixed(2)} Cr`;
export const manMonths = (r: Role) => r.count * r.durationMonths * (r.utilizationPct / 100);
export const manDays = (r: Role, workingDaysPerMonth = 22) => manMonths(r) * workingDaysPerMonth;
export const dailyRate = (r: Role, workingDaysPerMonth = 22) => r.rate / workingDaysPerMonth;
export const roleCost = (r: Role) => r.rate * manMonths(r);
export function baseline(roles: Role[]) { return roles.reduce((sum, r) => sum + roleCost(r), 0); }
export function swapSavings(roles: Role[], juniorRateFactor = .68) { return roles.reduce((sum, r) => sum + (r.critical ? 0 : roleCost(r) * (1 - juniorRateFactor)), 0); }
export function margin(price: number, cost: number) { return price <= 0 ? 0 : (price - cost) / price; }
export function floorPrice(cost: number, marginFloor = .35) { return cost / (1 - marginFloor); }
