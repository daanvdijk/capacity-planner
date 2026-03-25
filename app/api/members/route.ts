import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import getDb from '@/lib/db';

export async function GET() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM team_members ORDER BY name').all();
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { name, email, factorial_id } = await req.json();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const db = getDb();
  const id = randomUUID();
  db.prepare('INSERT INTO team_members (id, name, email, factorial_id) VALUES (?, ?, ?, ?)').run(
    id, name, email ?? null, factorial_id ?? null
  );
  return NextResponse.json(db.prepare('SELECT * FROM team_members WHERE id = ?').get(id));
}
