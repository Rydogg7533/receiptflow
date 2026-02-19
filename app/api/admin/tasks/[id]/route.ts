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

// PUT /api/admin/tasks/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await checkAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const supabase = createClient();
  const body = await req.json();
  const id = params.id;

  // Update the updated_at timestamp
  const updateData = {
    ...body,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', id)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  return NextResponse.json(data[0]);
}

// DELETE /api/admin/tasks/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await checkAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const supabase = createClient();
  const id = params.id;

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
