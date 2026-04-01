import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await sql`DELETE FROM team_members WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
