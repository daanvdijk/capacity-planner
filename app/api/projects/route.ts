import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import getDb from '@/lib/db';

export async function GET() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM projects ORDER BY created_at').all();
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { name, color } = await req.json();
  if (!name || !color) return NextResponse.json({ error: 'name and color required' }, { status: 400 });
  const db = getDb();
  const id = randomUUID();
  db.prepare('INSERT INTO projects (id, name, color) VALUES (?, ?, ?)').run(id, name, color);
  return NextResponse.json(db.prepare('SELECT * FROM projects WHERE id = ?').get(id));
}
