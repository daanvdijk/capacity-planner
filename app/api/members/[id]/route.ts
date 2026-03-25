import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  db.prepare('DELETE FROM team_members WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
