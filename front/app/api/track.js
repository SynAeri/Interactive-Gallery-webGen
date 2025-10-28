import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';


export async function POST() {
  await kv.incr('visit_count');
  const count = await kv.get('visit_count');
  return NextResponse.json({ visits: count });
}

export async function GET() {
  return NextResponse.json({ visits: visitCount });
}
