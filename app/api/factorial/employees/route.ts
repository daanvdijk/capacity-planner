import { NextResponse } from 'next/server';
import { getEmployees } from '@/lib/factorial';

export async function GET() {
  const { employees } = await getEmployees();
  return NextResponse.json(employees);
}
