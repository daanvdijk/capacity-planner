import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { sql, initSchema } from '@/lib/db';

export async function GET() {
  await initSchema();
  const { rows } = await sql`SELECT * FROM projects ORDER BY created_at`;
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { name, color } = await req.json();
  if (!name || !color) return NextResponse.json({ error: 'name and color required' }, { status: 400 });
  await initSchema();
  const id = randomUUID();
  const { rows } = await sql`
    INSERT INTO projects (id, name, color) VALUES (${id}, ${name}, ${color})
    RETURNING *
  `;
  return NextResponse.json(rows[0]);
}
