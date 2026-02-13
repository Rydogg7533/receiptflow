import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import OpenAI from 'openai'

// Lazy-load OpenAI client to avoid build-time errors
let openai: OpenAI | null = null
function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openai
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
    
    // Check auth
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { documentId } = await request.json()

    if (!documentId) {
      return NextResponse.json({ error: 'No document ID provided' }, { status: 400 })
    }

    // Get document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', session.user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Update status to processing
    await supabase
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', documentId)

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.storage_path)

    if (downloadError) {
      console.error('Download error:', downloadError)
      throw new Error('Failed to download file')
    }

    // Convert to base64
    const buffer = await fileData.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const mimeType = document.file_type
    const dataUrl = `data:${mimeType};base64,${base64}`

    // Extract data using OpenAI
    const extraction = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert at extracting structured data from receipts and invoices. 
Extract the following information and return it as JSON:
{
  "vendor": "store/merchant name",
  "date": "YYYY-MM-DD",
  "total": "total amount (number only, no $)",
  "subtotal": "subtotal before tax (number only)",
  "tax": "tax amount (number only)",
  "line_items": [
    {
      "description": "item description",
      "quantity": "quantity (number)",
      "price": "unit price (number)",
      "total": "line total (number)"
    }
  ],
  "payment_method": "payment method if visible",
  "receipt_number": "receipt/invoice number if visible"
}

Return ONLY valid JSON, no markdown formatting. If a field is not found, use null or empty array.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: dataUrl,
              },
            },
            {
              type: 'text',
              text: 'Extract all information from this receipt/invoice and return as JSON.',
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    })

    const extractedData = JSON.parse(extraction.choices[0].message.content || '{}')

    // Update document with extracted data
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        status: 'completed',
        extracted_data: extractedData,
      })
      .eq('id', documentId)

    if (updateError) {
      console.error('Update error:', updateError)
      throw new Error('Failed to save extracted data')
    }

    return NextResponse.json({ success: true, data: extractedData })

  } catch (error) {
    console.error('Extraction error:', error)
    
    // Update document status to error
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
    const { documentId } = await request.json().catch(() => ({}))
    
    if (documentId) {
      await supabase
        .from('documents')
        .update({
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', documentId)
    }

    return NextResponse.json(
      { error: 'Extraction failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
