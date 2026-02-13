import Papa from 'papaparse'
import { ExtractedData } from './openai'

export function convertToCSV(data: ExtractedData[]): string {
  const flattened = data.map((item, index) => ({
    id: index + 1,
    vendor_name: item.vendor_name || '',
    invoice_number: item.invoice_number || '',
    invoice_date: item.invoice_date || '',
    due_date: item.due_date || '',
    total_amount: item.total_amount || '',
    subtotal: item.subtotal || '',
    tax_amount: item.tax_amount || '',
    raw_text: item.raw_text || '',
  }))

  return Papa.unparse(flattened)
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
