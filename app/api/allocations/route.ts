import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import getDb from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const db = getDb();
  let query = 'SELECT a.*, p.name as project_name, p.color as project_color FROM allocations a JOIN projects p ON a.project_id = p.id';
  const params: string[] = [];

  const weekStart = searchParams.get('week_start');
  if (weekStart) {
    query += ' WHERE a.week_start = ?';
    params.push(weekStart);
  }
  query += ' ORDER BY a.week_start';
  return NextResponse.json(db.prepare(query).all(...params));
}

export async function POST(req: Request) {
  const { member_id, project_id, week_start, percentage } = await req.json();
  if (!member_id || !project_id || !week_start || percentage == null)
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  if (percentage < 0 || percentage > 100)
    return NextResponse.json({ error: 'percentage must be 0-100' }, { status: 400 });

  const db = getDb();

  // Check existing total for this member/week (excluding this project)
  const existing = db.prepare(
    'SELECT COALESCE(SUM(percentage),0) as total FROM allocations WHERE member_id = ? AND week_start = ? AND project_id != ?'
  ).get(member_id, week_start, project_id) as { total: number };

  if (existing.total + percentage > 100)
    return NextResponse.json({ error: `Total exceeds 100% (current: ${existing.total}%)` }, { status: 400 });

  const id = randomUUID();
  db.prepare(`
    INSERT INTO allocations (id, member_id, project_id, week_start, percentage)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(member_id, project_id, week_start) DO UPDATE SET percentage = excluded.percentage, id = excluded.id
  `).run(id, member_id, project_id, week_start, percentage);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { member_id, project_id, week_start } = await req.json();
  const db = getDb();
  db.prepare('DELETE FROM allocations WHERE member_id = ? AND project_id = ? AND week_start = ?').run(
    member_id, project_id, week_start
  );
  return NextResponse.json({ ok: true });
}
