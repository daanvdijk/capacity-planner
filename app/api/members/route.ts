import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { sql, initSchema } from '@/lib/db';

export async function GET() {
  await initSchema();
  const { rows } = await sql`SELECT * FROM team_members ORDER BY name`;
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { name, email, factorial_id, location_id } = await req.json();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  await initSchema();
  const id = randomUUID();
  const { rows } = await sql`
    INSERT INTO team_members (id, name, email, factorial_id, location_id)
    VALUES (${id}, ${name}, ${email ?? null}, ${factorial_id ?? null}, ${location_id ?? null})
    RETURNING *
  `;
  return NextResponse.json(rows[0]);
}
