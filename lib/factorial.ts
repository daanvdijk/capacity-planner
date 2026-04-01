export interface FactorialEmployee {
  id: number;
  full_name: string;
  email: string;
  location_id: number | null;
  team_ids: number[];
}

export interface FactorialLeave {
  id: number;
  employee_id: number;
  employee_full_name: string;
  start_on: string;
  finish_on: string;
  approved: boolean;
}

export interface FactorialHoliday {
  id: number;
  location_id: number | null;
  summary: string;
  date: string;
  half_day: string | null;
}

function getConfig() {
  return {
    base: process.env.FACTORIAL_API_BASE!,
    key: process.env.FACTORIAL_API_KEY!,
  };
}

function headers(key: string) {
  return {
    'X-API-KEY': key,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
}

export async function getEmployees(): Promise<{ employees: FactorialEmployee[]; error?: string }> {
  const { base, key } = getConfig();
  if (!key || key === 'your_factorial_api_key_here')
    return { employees: [], error: 'No API key configured' };
  const res = await fetch(`${base}/employees/employees`, { headers: headers(key), cache: 'no-store' });
  if (res.status === 401)
    return { employees: [], error: 'API key rejected (401) — check it is active and has Employees read permission in Factorial Settings → Configuration → API' };
  if (!res.ok)
    return { employees: [], error: `Factorial returned ${res.status}` };
  const data = await res.json();
  const employees = Array.isArray(data) ? data : (data.data ?? []);
  return { employees };
}

/** Fetch leaves only for the given factorial employee IDs (parallel requests, one per employee). */
export async function getLeaves(from: string, to: string, factorialIds: string[]): Promise<{ leaves: FactorialLeave[] }> {
  const { base, key } = getConfig();
  if (!key || key === 'your_factorial_api_key_here' || factorialIds.length === 0) return { leaves: [] };

  const results = await Promise.all(
    factorialIds.map(async (empId) => {
      const params = new URLSearchParams({ from, to, employee_id: empId });
      const res = await fetch(`${base}/timeoff/leaves?${params}`, { headers: headers(key), cache: 'no-store' });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data.data ?? []);
    })
  );

  return { leaves: results.flat() };
}

/** Fetch all company (national) holidays — one request, keyed by location_id. */
export async function getCompanyHolidays(): Promise<{ holidays: FactorialHoliday[] }> {
  const { base, key } = getConfig();
  if (!key || key === 'your_factorial_api_key_here') return { holidays: [] };
  const res = await fetch(`${base}/holidays/company_holidays`, { headers: headers(key), cache: 'no-store' });
  if (!res.ok) return { holidays: [] };
  const data = await res.json();
  const holidays = Array.isArray(data) ? data : (data.data ?? []);
  return { holidays };
}
