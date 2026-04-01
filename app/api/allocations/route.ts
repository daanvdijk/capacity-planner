import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { sql, initSchema } from '@/lib/db';

export async function GET(req: Request) {
  await initSchema();
  const { searchParams } = new URL(req.url);
  const weekStart = searchParams.get('week_start');

  const { rows } = weekStart
    ? await sql`
        SELECT a.*, p.name as project_name, p.color as project_color
        FROM allocations a JOIN projects p ON a.project_id = p.id
        WHERE a.week_start = ${weekStart}
        ORDER BY a.week_start`
    : await sql`
        SELECT a.*, p.name as project_name, p.color as project_color
        FROM allocations a JOIN projects p ON a.project_id = p.id
        ORDER BY a.week_start`;

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { member_id, project_id, week_start, percentage } = await req.json();
  if (!member_id || !project_id || !week_start || percentage == null)
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  if (percentage < 0 || percentage > 100)
    return NextResponse.json({ error: 'percentage must be 0-100' }, { status: 400 });

  await initSchema();

  const { rows: [existing] } = await sql`
    SELECT COALESCE(SUM(percentage), 0)::int as total
    FROM allocations
    WHERE member_id = ${member_id} AND week_start = ${week_start} AND project_id != ${project_id}
  `;

  if (existing.total + percentage > 100)
    return NextResponse.json({ error: `Total exceeds 100% (current: ${existing.total}%)` }, { status: 400 });

  const id = randomUUID();
  await sql`
    INSERT INTO allocations (id, member_id, project_id, week_start, percentage)
    VALUES (${id}, ${member_id}, ${project_id}, ${week_start}, ${percentage})
    ON CONFLICT (member_id, project_id, week_start)
    DO UPDATE SET percentage = EXCLUDED.percentage, id = EXCLUDED.id
  `;

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { member_id, project_id, week_start } = await req.json();
  await sql`
    DELETE FROM allocations
    WHERE member_id = ${member_id} AND project_id = ${project_id} AND week_start = ${week_start}
  `;
  return NextResponse.json({ ok: true });
}
