import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/session';

const EMAIL = 'daan@mvst.co';
const PASSWORD = 'DaanMVST';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (email !== EMAIL || password !== PASSWORD) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  await createSession();
  return NextResponse.json({ ok: true });
}
