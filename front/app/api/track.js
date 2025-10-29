import { NextResponse } from 'next/server';
import { neon } from '@neon/serverless';

const sql = neon(process.env.DATABASE_URL);

export async function POST() {
  try {
    // Increment
    await sql`
      INSERT INTO analytics (key, value) VALUES ('visits', 1)
      ON CONFLICT (key) DO UPDATE SET value = analytics.value + 1
    `;
    
    // Get updated count
    const [row] = await sql`SELECT value FROM analytics WHERE key = 'visits'`;
    
    return NextResponse.json({ visits: row.value });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to track visit' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const [row] = await sql`SELECT value FROM analytics WHERE key = 'visits'`;
    return NextResponse.json({ visits: row?.value || 0 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get visits' }, { status: 500 });
  }
}
