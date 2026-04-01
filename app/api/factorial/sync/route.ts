import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getEmployees } from '@/lib/factorial';

export async function POST() {
  const db = getDb();

  // Only sync members already in the list that have a factorial_id
  const existing = db.prepare('SELECT factorial_id FROM team_members WHERE factorial_id IS NOT NULL').all() as { factorial_id: string }[];
  if (existing.length === 0) {
    return NextResponse.json({ updated: 0, message: 'No linked members to sync' });
  }

  const { employees, error } = await getEmployees();
  if (error) return NextResponse.json({ error }, { status: 422 });

  const empMap = new Map(employees.map(e => [String(e.id), e]));
  let updated = 0;

  const syncMany = db.transaction(() => {
    for (const { factorial_id } of existing) {
      const emp = empMap.get(factorial_id);
      if (!emp) continue;
      db.prepare('UPDATE team_members SET name = ?, email = ?, location_id = ? WHERE factorial_id = ?').run(
        emp.full_name, emp.email ?? null, emp.location_id ? String(emp.location_id) : null, factorial_id
      );
      updated++;
    }
  });

  syncMany();
  return NextResponse.json({ updated });
}
