import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getEmployees } from '@/lib/factorial';

export async function POST() {
  const { rows: existing } = await sql`
    SELECT factorial_id FROM team_members WHERE factorial_id IS NOT NULL
  `;

  if (existing.length === 0) {
    return NextResponse.json({ updated: 0, message: 'No linked members to sync' });
  }

  const { employees, error } = await getEmployees();
  if (error) return NextResponse.json({ error }, { status: 422 });

  const empMap = new Map(employees.map(e => [String(e.id), e]));
  let updated = 0;

  for (const { factorial_id } of existing) {
    const emp = empMap.get(factorial_id);
    if (!emp) continue;
    await sql`
      UPDATE team_members
      SET name = ${emp.full_name}, email = ${emp.email ?? null}, location_id = ${emp.location_id ? String(emp.location_id) : null}
      WHERE factorial_id = ${factorial_id}
    `;
    updated++;
  }

  return NextResponse.json({ updated });
}
