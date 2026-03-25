import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import getDb from '@/lib/db';
import { getEmployees } from '@/lib/factorial';

export async function POST() {
  const { employees, error } = await getEmployees();
  if (error) return NextResponse.json({ error }, { status: 422 });
  if (employees.length === 0) {
    return NextResponse.json({ error: 'No employees returned from Factorial' }, { status: 422 });
  }

  const db = getDb();
  let added = 0;
  let updated = 0;

  const syncMany = db.transaction(() => {
    for (const emp of employees) {
      const existing = db.prepare('SELECT id FROM team_members WHERE factorial_id = ?').get(String(emp.id));
      if (existing) {
        db.prepare('UPDATE team_members SET name = ?, email = ? WHERE factorial_id = ?').run(
          emp.full_name, emp.email ?? null, String(emp.id)
        );
        updated++;
      } else {
        db.prepare('INSERT INTO team_members (id, name, email, factorial_id) VALUES (?, ?, ?, ?)').run(
          randomUUID(), emp.full_name, emp.email ?? null, String(emp.id)
        );
        added++;
      }
    }
  });

  syncMany();

  return NextResponse.json({ added, updated, total: employees.length });
}
