import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { sql } from '@/lib/db';
import { getLeaves, getCompanyHolidays } from '@/lib/factorial';
import { getLeaveDaysInWeek, parseWeek, formatWeek } from '@/lib/dates';
import { subWeeks, addDays, format, parseISO, isWeekend } from 'date-fns';

export async function POST(req: Request) {
  const { to_week } = await req.json();
  if (!to_week) return NextResponse.json({ error: 'to_week required' }, { status: 400 });

  const toDate = parseWeek(to_week);
  const fromDate = subWeeks(toDate, 1);
  const from_week = formatWeek(fromDate);

  const { rows: members } = await sql`SELECT * FROM team_members ORDER BY name`;
  const { rows: fromAllocs } = await sql`SELECT * FROM allocations WHERE week_start = ${from_week}`;

  if (fromAllocs.length === 0) {
    return NextResponse.json({ copied: 0, message: 'No allocations found in previous week' });
  }

  const factorialIds = members.map((m: any) => m.factorial_id).filter(Boolean) as string[];
  const weekEndDate = format(addDays(toDate, 6), 'yyyy-MM-dd');

  const [{ leaves }, { holidays }] = await Promise.all([
    getLeaves(to_week, weekEndDate, factorialIds),
    getCompanyHolidays(),
  ]);

  // Build leave map: factorial_id -> approved leaves
  const leaveMap: Record<string, typeof leaves> = {};
  for (const leave of leaves) {
    if (!leave.approved) continue;
    const key = String(leave.employee_id);
    if (!leaveMap[key]) leaveMap[key] = [];
    leaveMap[key].push(leave);
  }

  // Build holiday map: location_id -> holiday dates (working days only)
  const holidayMap: Record<string, string[]> = {};
  for (const h of holidays) {
    if (!h.date || isWeekend(parseISO(h.date))) continue;
    const locKey = String(h.location_id ?? 'global');
    if (!holidayMap[locKey]) holidayMap[locKey] = [];
    holidayMap[locKey].push(h.date);
  }

  function getAvailablePct(member: any): number {
    const memberLeaves = member.factorial_id ? (leaveMap[member.factorial_id] ?? []) : [];
    const memberHolidayDates = member.location_id ? (holidayMap[member.location_id] ?? []) : [];

    const leaveDaySet = new Set<number>();
    for (const leave of memberLeaves) {
      for (const d of getLeaveDaysInWeek(leave.start_on, leave.finish_on, toDate)) {
        leaveDaySet.add(d);
      }
    }

    let holidayCount = 0;
    for (const date of memberHolidayDates) {
      for (const d of getLeaveDaysInWeek(date, date, toDate)) {
        if (!leaveDaySet.has(d)) holidayCount++;
      }
    }

    return Math.max(0, 100 - (leaveDaySet.size + holidayCount) * 20);
  }

  // Group from_week allocations by member
  const byMember: Record<string, { project_id: string; percentage: number }[]> = {};
  for (const a of fromAllocs as any[]) {
    if (!byMember[a.member_id]) byMember[a.member_id] = [];
    byMember[a.member_id].push({ project_id: a.project_id, percentage: a.percentage });
  }

  let copied = 0;

  for (const member of members as any[]) {
    const allocs = byMember[member.id];
    if (!allocs?.length) continue;

    const available = getAvailablePct(member);
    if (available === 0) continue;

    const total = allocs.reduce((s: number, a: any) => s + a.percentage, 0);
    const scale = total > available ? available / total : 1;

    for (const alloc of allocs) {
      const pct = Math.floor(alloc.percentage * scale);
      if (pct <= 0) continue;

      const id = randomUUID();
      await sql`
        INSERT INTO allocations (id, member_id, project_id, week_start, percentage)
        VALUES (${id}, ${member.id}, ${alloc.project_id}, ${to_week}, ${pct})
        ON CONFLICT (member_id, project_id, week_start)
        DO UPDATE SET percentage = EXCLUDED.percentage, id = EXCLUDED.id
      `;
      copied++;
    }
  }

  return NextResponse.json({ copied });
}
