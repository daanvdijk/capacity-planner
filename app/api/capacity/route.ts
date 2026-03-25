import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getLeaves } from '@/lib/factorial';
import { getLeaveDaysInWeek, formatWeek, parseWeek } from '@/lib/dates';
import { addDays, format } from 'date-fns';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from')!;
  const to = searchParams.get('to')!;

  const db = getDb();
  const members = db.prepare('SELECT * FROM team_members ORDER BY name').all() as {
    id: string; name: string; email: string; factorial_id: string | null;
  }[];

  const allocations = db.prepare(`
    SELECT a.*, p.name as project_name, p.color as project_color
    FROM allocations a JOIN projects p ON a.project_id = p.id
    WHERE a.week_start >= ? AND a.week_start <= ?
  `).all(from, to) as {
    id: string; member_id: string; project_id: string; week_start: string;
    percentage: number; project_name: string; project_color: string;
  }[];

  // Only fetch leaves for members that have a factorial_id
  const factorialIds = members.map(m => m.factorial_id).filter(Boolean) as string[];
  const weekEndDate = format(addDays(parseWeek(to), 6), 'yyyy-MM-dd');
  const { leaves } = await getLeaves(from, weekEndDate, factorialIds);

  // Build map: factorial_id -> leaves
  const leaveMap: Record<string, typeof leaves> = {};
  for (const leave of leaves) {
    if (!leave.approved) continue;
    const key = String(leave.employee_id);
    if (!leaveMap[key]) leaveMap[key] = [];
    leaveMap[key].push(leave);
  }

  // Collect all weeks in range
  const weeks: string[] = [];
  let cur = parseWeek(from);
  const end = parseWeek(to);
  while (cur <= end) {
    weeks.push(formatWeek(cur));
    cur = addDays(cur, 7);
  }

  const result = members.map((m) => {
    const memberLeaves = m.factorial_id ? (leaveMap[m.factorial_id] ?? []) : [];

    const weekData = weeks.map((week) => {
      const weekDate = parseWeek(week);
      const memberAllocs = allocations.filter((a) => a.member_id === m.id && a.week_start === week);

      // Collect exact leave days (0=Mon … 4=Fri) for this week
      const leaveDaySet = new Set<number>();
      for (const leave of memberLeaves) {
        for (const d of getLeaveDaysInWeek(leave.start_on, leave.finish_on, weekDate)) {
          leaveDaySet.add(d);
        }
      }
      const leave_days = Array.from(leaveDaySet).sort();

      const leavePct = leave_days.length * 20;
      const allocatedPct = memberAllocs.reduce((sum, a) => sum + a.percentage, 0);
      const availablePct = Math.max(0, 100 - leavePct - allocatedPct);

      return {
        week,
        leave_days,
        allocated_percentage: allocatedPct,
        available_percentage: availablePct,
        allocations: memberAllocs,
      };
    });

    return { member: m, weeks: weekData };
  });

  return NextResponse.json(result);
}
