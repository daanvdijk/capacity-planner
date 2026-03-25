import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, color } = await req.json();
  const db = getDb();
  db.prepare('UPDATE projects SET name = ?, color = ? WHERE id = ?').run(name, color, id);
  return NextResponse.json(db.prepare('SELECT * FROM projects WHERE id = ?').get(id));
}
