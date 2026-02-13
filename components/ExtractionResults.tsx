'use client'

import { useState } from 'react'
import { Download, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { ExtractedData } from '@/lib/openai'
import { convertToCSV, downloadCSV } from '@/lib/csv'

interface ExtractionResultsProps {
  extractions: Array<{
    id: string
    data: ExtractedData
    filename: string
    timestamp: string
  }>
  onClear: () => void
}

export default function ExtractionResults({ extractions, onClear }: ExtractionResultsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleExportCSV = () => {
    const data = extractions.map(e => e.data)
    const csv = convertToCSV(data)
    downloadCSV(csv, `receiptflow-export-${new Date().toISOString().split('T')[0]}.csv`)
  }

  if (extractions.length === 0) {
    return null
  }

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">
          Extracted Data ({extractions.length} items)
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={onClear}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-sm font-medium text-gray-700">Vendor</th>
              <th className="px-4 py-3 text-sm font-medium text-gray-700">Invoice #</th>
              <th className="px-4 py-3 text-sm font-medium text-gray-700">Date</th>
              <th className="px-4 py-3 text-sm font-medium text-gray-700 text-right">Total</th>
              <th className="px-4 py-3 text-sm font-medium text-gray-700"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {extractions.map((extraction) => (
              <>
                <tr key={extraction.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {extraction.data.vendor_name || 'Unknown'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {extraction.data.invoice_number || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {extraction.data.invoice_date || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {extraction.data.total_amount 
                      ? `$${extraction.data.total_amount.toFixed(2)}` 
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpandedId(expandedId === extraction.id ? null : extraction.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {expandedId === extraction.id ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </td>
                </tr>
                {expandedId === extraction.id && (
                  <tr className="bg-gray-50">
                    <td colSpan={5} className="px-4 py-4">
                      <div className="text-sm">
                        <h4 className="font-medium text-gray-700 mb-2">Full Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-gray-500">Subtotal:</span>
                            <span className="ml-2 text-gray-900">
                              {extraction.data.subtotal ? `$${extraction.data.subtotal.toFixed(2)}` : '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Tax:</span>
                            <span className="ml-2 text-gray-900">
                              {extraction.data.tax_amount ? `$${extraction.data.tax_amount.toFixed(2)}` : '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Due Date:</span>
                            <span className="ml-2 text-gray-900">
                              {extraction.data.due_date || '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Filename:</span>
                            <span className="ml-2 text-gray-900">{extraction.filename}</span>
                          </div>
                        </div>
                        {extraction.data.line_items && extraction.data.line_items.length > 0 && (
                          <div className="mt-4">
                            <h5 className="font-medium text-gray-700 mb-2">Line Items</h5>
                            <table className="w-full text-sm">
                              <thead className="bg-white">
                                <tr>
                                  <th className="text-left py-2 px-2">Description</th>
                                  <th className="text-right py-2 px-2">Qty</th>
                                  <th className="text-right py-2 px-2">Price</th>
                                  <th className="text-right py-2 px-2">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {extraction.data.line_items.map((item, idx) => (
                                  <tr key={idx} className="border-t">
                                    <td className="py-2 px-2">{item.description}</td>
                                    <td className="py-2 px-2 text-right">{item.quantity}</td>
                                    <td className="py-2 px-2 text-right">${item.unit_price.toFixed(2)}</td>
                                    <td className="py-2 px-2 text-right">${item.total.toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        <div className="mt-4 pt-4 border-t">
                          <span className="text-gray-500">Raw Text:</span>
                          <p className="mt-1 text-gray-600 text-xs whitespace-pre-wrap">
                            {extraction.data.raw_text}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
