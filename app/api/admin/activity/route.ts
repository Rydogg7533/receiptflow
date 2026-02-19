import { createClient } from '@/app/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Admin auth check
async function checkAdmin(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminUserId = process.env.ADMIN_USER_ID;
  if (!user || user.id !== adminUserId) {
    return null;
  }
  return user;
}

// GET /api/admin/activity
export async function GET(req: NextRequest) {
  const user = await checkAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const supabase = createClient();
  const { searchParams } = new URL(req.url);
  
  const limit = searchParams.get('limit') || '50';
  const actor = searchParams.get('actor');
  const actionType = searchParams.get('action_type');

  let query = supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(parseInt(limit));

  if (actor) query = query.eq('actor', actor);
  if (actionType) query = query.eq('action_type', actionType);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/admin/activity
export async function POST(req: NextRequest) {
  const user = await checkAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const supabase = createClient();
  const body = await req.json();

  const { data, error } = await supabase
    .from('activity_log')
    .insert([
      {
        ...body,
        created_at: new Date().toISOString(),
      },
    ])
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data[0], { status: 201 });
}
