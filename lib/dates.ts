import { startOfWeek, addWeeks, addDays, format, parseISO } from 'date-fns';

export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 }); // Monday
}

export function getWeeks(from: Date, count: number): Date[] {
  const start = getWeekStart(from);
  return Array.from({ length: count }, (_, i) => addWeeks(start, i));
}

export function formatWeek(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function parseWeek(str: string): Date {
  return parseISO(str);
}

/**
 * Returns the day indices (0=Mon … 4=Fri) that a leave covers within the given week.
 */
export function getLeaveDaysInWeek(startOn: string, finishOn: string, weekStart: Date): number[] {
  const leaveStart = parseISO(startOn);
  const leaveEnd = parseISO(finishOn);
  const days: number[] = [];
  for (let i = 0; i < 5; i++) {
    const day = addDays(weekStart, i);
    if (day >= leaveStart && day <= leaveEnd) days.push(i);
  }
  return days;
}
