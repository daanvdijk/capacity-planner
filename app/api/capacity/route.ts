import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getLeaves, getCompanyHolidays } from '@/lib/factorial';
import { getLeaveDaysInWeek, formatWeek, parseWeek } from '@/lib/dates';
import { addDays, format, parseISO, isWeekend } from 'date-fns';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from')!;
  const to = searchParams.get('to')!;

  const db = getDb();
  const members = db.prepare('SELECT * FROM team_members ORDER BY name').all() as {
    id: string; name: string; email: string; factorial_id: string | null; location_id: string | null;
  }[];

  const allocations = db.prepare(`
    SELECT a.*, p.name as project_name, p.color as project_color
    FROM allocations a JOIN projects p ON a.project_id = p.id
    WHERE a.week_start >= ? AND a.week_start <= ?
  `).all(from, to) as {
    id: string; member_id: string; project_id: string; week_start: string;
    percentage: number; project_name: string; project_color: string;
  }[];

  const factorialIds = members.map(m => m.factorial_id).filter(Boolean) as string[];
  const weekEndDate = format(addDays(parseWeek(to), 6), 'yyyy-MM-dd');

  // Fetch personal leaves and national holidays in parallel
  const [{ leaves }, { holidays }] = await Promise.all([
    getLeaves(from, weekEndDate, factorialIds),
    getCompanyHolidays(),
  ]);

  // Build map: factorial_id -> approved leaves
  const leaveMap: Record<string, typeof leaves> = {};
  for (const leave of leaves) {
    if (!leave.approved) continue;
    const key = String(leave.employee_id);
    if (!leaveMap[key]) leaveMap[key] = [];
    leaveMap[key].push(leave);
  }

  // Build map: location_id -> holidays (only working days)
  const holidayMap: Record<string, { date: string; name: string }[]> = {};
  for (const h of holidays) {
    if (!h.date) continue;
    if (isWeekend(parseISO(h.date))) continue;
    const locKey = String(h.location_id ?? 'global');
    if (!holidayMap[locKey]) holidayMap[locKey] = [];
    holidayMap[locKey].push({ date: h.date, name: h.summary });
  }

  // Collect all weeks
  const weeks: string[] = [];
  let cur = parseWeek(from);
  const end = parseWeek(to);
  while (cur <= end) {
    weeks.push(formatWeek(cur));
    cur = addDays(cur, 7);
  }

  const result = members.map((m) => {
    const memberLeaves = m.factorial_id ? (leaveMap[m.factorial_id] ?? []) : [];
    const memberHolidays = m.location_id ? (holidayMap[m.location_id] ?? []) : [];

    const weekData = weeks.map((week) => {
      const weekDate = parseWeek(week);
      const memberAllocs = allocations.filter((a) => a.member_id === m.id && a.week_start === week);

      // Personal leave days
      const leaveDaySet = new Set<number>();
      for (const leave of memberLeaves) {
        for (const d of getLeaveDaysInWeek(leave.start_on, leave.finish_on, weekDate)) {
          leaveDaySet.add(d);
        }
      }
      const leave_days = Array.from(leaveDaySet).sort();

      // National holiday days (skip days already counted as personal leave)
      const holiday_days: { day: number; name: string }[] = [];
      for (const h of memberHolidays) {
        const days = getLeaveDaysInWeek(h.date, h.date, weekDate);
        for (const d of days) {
          if (!leaveDaySet.has(d)) {
            holiday_days.push({ day: d, name: h.name });
          }
        }
      }
      holiday_days.sort((a, b) => a.day - b.day);

      const offDays = leaveDaySet.size + holiday_days.length;
      const allocatedPct = memberAllocs.reduce((sum, a) => sum + a.percentage, 0);
      const availablePct = Math.max(0, 100 - offDays * 20 - allocatedPct);

      return { week, leave_days, holiday_days, allocated_percentage: allocatedPct, available_percentage: availablePct, allocations: memberAllocs };
    });

    return { member: m, weeks: weekData };
  });

  return NextResponse.json(result);
}
