import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const documentId = params.id

    // Get document to find storage path
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('storage_path')
      .eq('id', documentId)
      .eq('user_id', session.user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([document.storage_path])

    if (storageError) {
      console.error('Storage delete error:', storageError)
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', session.user.id)

    if (deleteError) {
      console.error('Database delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
