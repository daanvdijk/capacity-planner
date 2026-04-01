import { NextResponse } from 'next/server';
import { sql, initSchema } from '@/lib/db';
import { getLeaves, getCompanyHolidays } from '@/lib/factorial';
import { getLeaveDaysInWeek, formatWeek, parseWeek } from '@/lib/dates';
import { addDays, format, parseISO, isWeekend } from 'date-fns';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from')!;
  const to = searchParams.get('to')!;

  await initSchema();

  const { rows: members } = await sql`SELECT * FROM team_members ORDER BY name`;
  const { rows: allocations } = await sql`
    SELECT a.*, p.name as project_name, p.color as project_color
    FROM allocations a JOIN projects p ON a.project_id = p.id
    WHERE a.week_start >= ${from} AND a.week_start <= ${to}
  `;

  const factorialIds = members.map((m: any) => m.factorial_id).filter(Boolean) as string[];
  const weekEndDate = format(addDays(parseWeek(to), 6), 'yyyy-MM-dd');

  const [{ leaves }, { holidays }] = await Promise.all([
    getLeaves(from, weekEndDate, factorialIds),
    getCompanyHolidays(),
  ]);

  const leaveMap: Record<string, typeof leaves> = {};
  for (const leave of leaves) {
    if (!leave.approved) continue;
    const key = String(leave.employee_id);
    if (!leaveMap[key]) leaveMap[key] = [];
    leaveMap[key].push(leave);
  }

  const holidayMap: Record<string, { date: string; name: string }[]> = {};
  for (const h of holidays) {
    if (!h.date) continue;
    if (isWeekend(parseISO(h.date))) continue;
    const locKey = String(h.location_id ?? 'global');
    if (!holidayMap[locKey]) holidayMap[locKey] = [];
    holidayMap[locKey].push({ date: h.date, name: h.summary });
  }

  const weeks: string[] = [];
  let cur = parseWeek(from);
  const end = parseWeek(to);
  while (cur <= end) {
    weeks.push(formatWeek(cur));
    cur = addDays(cur, 7);
  }

  const result = members.map((m: any) => {
    const memberLeaves = m.factorial_id ? (leaveMap[m.factorial_id] ?? []) : [];
    const memberHolidays = m.location_id ? (holidayMap[m.location_id] ?? []) : [];

    const weekData = weeks.map((week) => {
      const weekDate = parseWeek(week);
      const memberAllocs = allocations.filter((a: any) => a.member_id === m.id && a.week_start === week);

      const leaveDaySet = new Set<number>();
      for (const leave of memberLeaves) {
        for (const d of getLeaveDaysInWeek(leave.start_on, leave.finish_on, weekDate)) {
          leaveDaySet.add(d);
        }
      }
      const leave_days = Array.from(leaveDaySet).sort();

      const holiday_days: { day: number; name: string }[] = [];
      for (const h of memberHolidays) {
        const days = getLeaveDaysInWeek(h.date, h.date, weekDate);
        for (const d of days) {
          if (!leaveDaySet.has(d)) holiday_days.push({ day: d, name: h.name });
        }
      }
      holiday_days.sort((a, b) => a.day - b.day);

      const offDays = leaveDaySet.size + holiday_days.length;
      const allocatedPct = memberAllocs.reduce((sum: number, a: any) => sum + a.percentage, 0);
      const availablePct = Math.max(0, 100 - offDays * 20 - allocatedPct);

      return { week, leave_days, holiday_days, allocated_percentage: allocatedPct, available_percentage: availablePct, allocations: memberAllocs };
    });

    return { member: m, weeks: weekData };
  });

  return NextResponse.json(result);
}
