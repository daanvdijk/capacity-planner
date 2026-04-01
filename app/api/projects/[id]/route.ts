import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await sql`DELETE FROM projects WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, color } = await req.json();
  const { rows } = await sql`
    UPDATE projects SET name = ${name}, color = ${color} WHERE id = ${id}
    RETURNING *
  `;
  return NextResponse.json(rows[0]);
}
