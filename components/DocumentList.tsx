'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from './SupabaseProvider'
import { Download, Loader2, FileText, Trash2, Sheet, Archive, Trash } from 'lucide-react'

interface Document {
  id: string
  filename: string
  file_type: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  extracted_data: any
  created_at: string
  document_type?: string | null
  payment_status?: string | null
  due_date?: string | null
  balance_due?: number | string | null
  needs_review?: boolean | null
}

export function DocumentList() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [exportingSheets, setExportingSheets] = useState(false)
  const { user } = useSupabase()

  type View = 'active' | 'archived' | 'trash'
  const [view, setView] = useState<View>('active')

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/api/documents?view=${view}`)
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

  const fetchGoogleStatus = async () => {
    try {
      const r = await fetch('/api/google/status')
      if (r.ok) {
        const s = await r.json()
        setGoogleConnected(!!s.connected)
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchDocuments()
    fetchGoogleStatus()
    // Poll every 5 seconds
    const interval = setInterval(fetchDocuments, 5000)
    return () => clearInterval(interval)
  }, [view])

  const exportToCSV = async () => {
    try {
      const resp = await fetch('/api/export/csv')
      if (!resp.ok) throw new Error('Export failed')

      const contentType = resp.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const payload = await resp.json()
        for (const key of ['documents', 'line_items']) {
          const file = payload[key]
          if (!file?.csv) continue
          const blob = new Blob([file.csv], { type: 'text/csv' })
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = file.filename || `${key}.csv`
          a.click()
          window.URL.revokeObjectURL(url)
        }
        return
      }

      // Fallback: single CSV file
      const csv = await resp.text()
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `documents-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting CSV:', error)
    }
  }

  const exportToGoogleSheets = async () => {
    try {
      setExportingSheets(true)
      const resp = await fetch('/api/export/sheets', { method: 'POST' })
      const json = await resp.json().catch(() => ({}))
      if (!resp.ok) throw new Error(json?.details || json?.error || 'Sheets export failed')
      if (json?.spreadsheetUrl) {
        window.open(json.spreadsheetUrl, '_blank', 'noopener,noreferrer')
      }
    } catch (e) {
      console.error('Sheets export error:', e)
      alert(e instanceof Error ? e.message : 'Sheets export failed')
    } finally {
      setExportingSheets(false)
    }
  }

  const connectGoogle = () => {
    window.location.href = '/api/auth/google/start'
  }

  const toggleArchive = async (doc: Document, archived: boolean) => {
    try {
      await fetch('/api/documents/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: doc.id, archived }),
      })
      // Refresh list
      fetchDocuments()
    } catch (e) {
      console.error('archive failed', e)
    }
  }

  const moveToTrash = async (doc: Document) => {
    try {
      await fetch('/api/documents/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: doc.id }),
      })
      fetchDocuments()
    } catch (error) {
      console.error('Error trashing document:', error)
    }
  }

  const restoreFromTrash = async (doc: Document) => {
    try {
      await fetch('/api/documents/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: doc.id }),
      })
      fetchDocuments()
    } catch (error) {
      console.error('Error restoring document:', error)
    }
  }

  const deleteForever = async (doc: Document) => {
    try {
      if (!confirm('Delete forever? This cannot be undone.')) return
      await fetch('/api/documents/hard-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: doc.id }),
      })
      fetchDocuments()
    } catch (error) {
      console.error('Error hard deleting document:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    )
  }

  const completedCount = documents.filter(d => d.status === 'completed').length

  // Always render header + toggle even if there are no docs in the current view
  if (documents.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('active')}
              className={`px-3 py-2 text-sm font-medium rounded-md border ${
                view === 'active' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setView('archived')}
              className={`px-3 py-2 text-sm font-medium rounded-md border ${
                view === 'archived' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              Archived
            </button>
            <button
              onClick={() => setView('trash')}
              className={`px-3 py-2 text-sm font-medium rounded-md border ${
                view === 'trash' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              Trash
            </button>
          </div>

          {completedCount > 0 && (
            <div className="flex justify-end gap-2">
              <button
                onClick={exportToCSV}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </button>

              {googleConnected ? (
                <button
                  onClick={exportToGoogleSheets}
                  disabled={exportingSheets}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {exportingSheets ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Exporting…
                    </>
                  ) : (
                    <>
                      <Sheet className="h-4 w-4 mr-2" />
                      Export to Google Sheets
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={connectGoogle}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-black"
                >
                  <Sheet className="h-4 w-4 mr-2" />
                  Connect Google
                </button>
              )}
            </div>
          )}
        </div>

        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-gray-500">No documents in this view</p>
          <p className="text-sm text-gray-400">Try switching Active / Archived</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('active')}
            className={`px-3 py-2 text-sm font-medium rounded-md border ${
              view === 'active' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setView('archived')}
            className={`px-3 py-2 text-sm font-medium rounded-md border ${
              view === 'archived' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            Archived
          </button>
          <button
            onClick={() => setView('trash')}
            className={`px-3 py-2 text-sm font-medium rounded-md border ${
              view === 'trash' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            Trash
          </button>
        </div>

        {completedCount > 0 && (
          <div className="flex justify-end gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </button>

          {googleConnected ? (
            <button
              onClick={exportToGoogleSheets}
              disabled={exportingSheets}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {exportingSheets ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting…
                </>
              ) : (
                <>
                  <Sheet className="h-4 w-4 mr-2" />
                  Export to Google Sheets
                </>
              )}
            </button>
          ) : (
            <button
              onClick={connectGoogle}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-black"
            >
              <Sheet className="h-4 w-4 mr-2" />
              Connect Google
            </button>
          )}
          </div>
        )}
      </div>

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
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
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
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      doc.status === 'completed' ? 'bg-green-100 text-green-800' :
                      doc.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                      doc.status === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {doc.status}
                    </span>
                    {doc.needs_review ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                        needs review
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {doc.extracted_data?.vendor || '-'}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <select
                    value={(doc.document_type || doc.extracted_data?.document_type || 'other').toString()}
                    onChange={async (e) => {
                      const v = e.target.value
                      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, document_type: v } : d)))
                      await fetch('/api/documents/update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ documentId: doc.id, patch: { document_type: v } }),
                      })
                    }}
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                    disabled={doc.status !== 'completed'}
                  >
                    <option value="receipt">receipt</option>
                    <option value="invoice">invoice</option>
                    <option value="statement">statement</option>
                    <option value="other">other</option>
                  </select>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <select
                    value={(doc.payment_status || doc.extracted_data?.payment_status || 'unknown').toString()}
                    onChange={async (e) => {
                      const v = e.target.value
                      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, payment_status: v } : d)))
                      await fetch('/api/documents/update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ documentId: doc.id, patch: { payment_status: v } }),
                      })
                    }}
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                    disabled={doc.status !== 'completed'}
                  >
                    <option value="paid">paid</option>
                    <option value="unpaid">unpaid</option>
                    <option value="unknown">unknown</option>
                  </select>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {doc.extracted_data?.total ? `$${doc.extracted_data.total}` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-3">
                    {view === 'archived' ? (
                      <button
                        onClick={() => toggleArchive(doc, false)}
                        className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        title="Restore to Active"
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Restore to Active
                      </button>
                    ) : view === 'active' ? (
                      <button
                        onClick={() => toggleArchive(doc, true)}
                        className="text-gray-700 hover:text-gray-900"
                        title="Archive"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    ) : null}

                    {view === 'trash' ? (
                      <>
                        <button
                          onClick={() => restoreFromTrash(doc)}
                          className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                          title="Restore"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => deleteForever(doc)}
                          className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                          title="Delete forever"
                        >
                          Delete forever
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => moveToTrash(doc)}
                        className="text-red-600 hover:text-red-900"
                        title="Move to Trash"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
