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

// GET /api/admin/tasks
export async function GET(req: NextRequest) {
  const user = await checkAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const supabase = createClient();
  const { searchParams } = new URL(req.url);
  
  const status = searchParams.get('status');
  const assigned = searchParams.get('assigned_to');
  const priority = searchParams.get('priority');
  const category = searchParams.get('category');

  let query = supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (assigned) query = query.eq('assigned_to', assigned);
  if (priority) query = query.eq('priority', priority);
  if (category) query = query.eq('category', category);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/admin/tasks
export async function POST(req: NextRequest) {
  const user = await checkAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const supabase = createClient();
  const body = await req.json();

  const { data, error } = await supabase
    .from('tasks')
    .insert([body])
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data[0], { status: 201 });
}
