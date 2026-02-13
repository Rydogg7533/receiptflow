'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from './SupabaseProvider'
import { Download, Loader2, FileText, Trash2 } from 'lucide-react'
import Papa from 'papaparse'

interface Document {
  id: string
  filename: string
  file_type: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  extracted_data: any
  created_at: string
}

export function DocumentList() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useSupabase()

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents')
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents)
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
    // Poll every 5 seconds
    const interval = setInterval(fetchDocuments, 5000)
    return () => clearInterval(interval)
  }, [])

  const exportToCSV = () => {
    const completedDocs = documents.filter(d => d.status === 'completed' && d.extracted_data)
    if (completedDocs.length === 0) return

    const rows = completedDocs.map(doc => ({
      filename: doc.filename,
      date: doc.extracted_data.date || '',
      vendor: doc.extracted_data.vendor || '',
      total: doc.extracted_data.total || '',
      subtotal: doc.extracted_data.subtotal || '',
      tax: doc.extracted_data.tax || '',
      ...doc.extracted_data,
    }))

    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `receipts-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const deleteDocument = async (id: string) => {
    try {
      const response = await fetch(`/api/documents/${id}`, { method: 'DELETE' })
      if (response.ok) {
        setDocuments(prev => prev.filter(d => d.id !== id))
      }
    } catch (error) {
      console.error('Error deleting document:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-300" />
        <p className="mt-4 text-gray-500">No documents yet</p>
        <p className="text-sm text-gray-400">Upload your first receipt to get started</p>
      </div>
    )
  }

  const completedCount = documents.filter(d => d.status === 'completed').length

  return (
    <div className="space-y-4">
      {completedCount > 0 && (
        <div className="flex justify-end">
          <button
            onClick={exportToCSV}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export to CSV
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                File
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vendor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {documents.map((doc) => (
              <tr key={doc.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                      {doc.filename}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    doc.status === 'completed' ? 'bg-green-100 text-green-800' :
                    doc.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                    doc.status === 'error' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {doc.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {doc.extracted_data?.vendor || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {doc.extracted_data?.total ? `$${doc.extracted_data.total}` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => deleteDocument(doc.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
