import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ExtractedData {
  vendor_name: string | null
  invoice_number: string | null
  invoice_date: string | null
  due_date: string | null
  total_amount: number | null
  subtotal: number | null
  tax_amount: number | null
  line_items: Array<{
    description: string
    quantity: number
    unit_price: number
    total: number
  }> | null
  raw_text: string
}

export async function extractReceiptData(base64Image: string): Promise<ExtractedData> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are an expert at extracting structured data from receipts and invoices. 
        Extract all relevant information and return it as a JSON object with these fields:
        - vendor_name: The company/store name
        - invoice_number: The invoice/receipt number if present
        - invoice_date: Date in YYYY-MM-DD format
        - due_date: Due date if present, in YYYY-MM-DD format
        - total_amount: Total amount as a number
        - subtotal: Subtotal before tax as a number
        - tax_amount: Tax amount as a number
        - line_items: Array of objects with description, quantity, unit_price, total
        - raw_text: Full extracted text from the document
        
        If a field is not found, use null. Be precise with numbers.`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extract all data from this receipt/invoice and return as JSON:',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No response from OpenAI')
  }

  return JSON.parse(content) as ExtractedData
}
