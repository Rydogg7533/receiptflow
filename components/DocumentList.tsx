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
  exported_at?: string | null
  export_batch_id?: string | null
}

export function DocumentList() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [exportingSheets, setExportingSheets] = useState(false)
  const [lastExport, setLastExport] = useState<{ batchId: string; exportedCount: number; spreadsheetUrl?: string } | null>(null)
  const [undoing, setUndoing] = useState(false)
  const [editDoc, setEditDoc] = useState<Document | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editForm, setEditForm] = useState<{ vendor: string; date: string; total: string; due_date: string; balance_due: string }>({ vendor: '', date: '', total: '', due_date: '', balance_due: '' })
  const { user } = useSupabase()

  type View = 'to_export' | 'archived' | 'trash'
  const [view, setView] = useState<View>('to_export')

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

    const onRefresh = () => fetchDocuments()
    window.addEventListener('documents:refresh', onRefresh)

    // Poll every 5 seconds
    const interval = setInterval(fetchDocuments, 5000)
    return () => {
      window.removeEventListener('documents:refresh', onRefresh)
      clearInterval(interval)
    }
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

        if ((payload?.exportedCount ?? 0) === 0) {
          alert(payload?.message || 'No documents to export.')
          return
        }

        // Auto-archive after export (and keep undo info)
        if (payload?.batchId && (payload?.exportedCount ?? 0) > 0) {
          await fetch('/api/documents/archive-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batchId: payload.batchId }),
          })
          setLastExport({ batchId: payload.batchId, exportedCount: payload.exportedCount })
          fetchDocuments()
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

      if ((json?.exportedCount ?? 0) === 0) {
        alert(json?.message || 'No documents to export.')
        return
      }

      // Auto-archive after export (and keep undo info)
      if (json?.batchId && (json?.exportedCount ?? 0) > 0) {
        await fetch('/api/documents/archive-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchId: json.batchId }),
        })
        setLastExport({ batchId: json.batchId, exportedCount: json.exportedCount, spreadsheetUrl: json.spreadsheetUrl })
        fetchDocuments()
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

  const retryExtract = async (doc: Document) => {
    try {
      // Optimistic UI
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, status: 'processing' } : d)))
      const res = await fetch('/api/documents/retry-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: doc.id }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || json?.details || 'Retry failed')
      fetchDocuments()
    } catch (e) {
      console.error('retry extract failed', e)
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, status: 'error' } : d)))
      alert(e instanceof Error ? e.message : 'Retry failed')
    }
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
              onClick={() => setView('to_export')}
              className={`px-3 py-2 text-sm font-medium rounded-md border ${
                view === 'to_export' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              To Export
            </button>
            {/* Exported view removed for simpler 3-tab workflow */}
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
          <p className="text-sm text-gray-400">Try switching To Export / Archived / Trash</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {editDoc ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">Review / Edit</div>
                <div className="text-xs text-gray-500 truncate max-w-[420px]">{editDoc.filename}</div>
              </div>
              <button
                className="text-sm text-gray-600 hover:text-gray-900"
                onClick={() => setEditDoc(null)}
                disabled={editSaving}
              >
                Close
              </button>
            </div>

            <div className="space-y-4 px-4 py-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Vendor</label>
                <input
                  value={editForm.vendor}
                  onChange={(e) => setEditForm((p) => ({ ...p, vendor: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Date</label>
                  <input
                    value={editForm.date}
                    onChange={(e) => setEditForm((p) => ({ ...p, date: e.target.value }))}
                    placeholder="YYYY-MM-DD"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Total</label>
                  <input
                    value={editForm.total}
                    onChange={(e) => setEditForm((p) => ({ ...p, total: e.target.value }))}
                    placeholder="e.g. 12.34"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Due date</label>
                  <input
                    value={editForm.due_date}
                    onChange={(e) => setEditForm((p) => ({ ...p, due_date: e.target.value }))}
                    placeholder="YYYY-MM-DD"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Balance due</label>
                  <input
                    value={editForm.balance_due}
                    onChange={(e) => setEditForm((p) => ({ ...p, balance_due: e.target.value }))}
                    placeholder="e.g. 0 or 123.45"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
                Saving does not delete any previously exported sheets. If you re-open and export again, you may get duplicates across sheets.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
              <button
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                onClick={() => setEditDoc(null)}
                disabled={editSaving}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={editSaving}
                onClick={async () => {
                  try {
                    setEditSaving(true)

                    const existing = (editDoc.extracted_data || {}) as any
                    const nextExtracted = {
                      ...existing,
                      vendor: editForm.vendor || null,
                      date: editForm.date || null,
                      total: editForm.total === '' ? null : Number(editForm.total),
                      due_date: editForm.due_date || null,
                      balance_due: editForm.balance_due === '' ? null : Number(editForm.balance_due),
                    }

                    // Recompute needs_review using the same basic rules as /api/extract
                    const subtotal = Number(nextExtracted?.subtotal)
                    const tax = Number(nextExtracted?.tax)
                    const tip = nextExtracted?.tip !== null && nextExtracted?.tip !== undefined ? Number(nextExtracted?.tip) : 0
                    const total = Number(nextExtracted?.total)
                    const hasTotals = Number.isFinite(total)
                    const reconcile = Number.isFinite(subtotal) && Number.isFinite(tax) && Number.isFinite(tip) && hasTotals
                      ? Math.abs((subtotal + tax + tip) - total) <= 0.05
                      : true

                    const docType = (nextExtracted?.document_type || editDoc.document_type || '').toString().toLowerCase()
                    const dueDate = nextExtracted?.due_date
                    const balanceDue = nextExtracted?.balance_due
                    const invoiceMissingFields = docType === 'invoice' && (!dueDate || balanceDue === null || balanceDue === undefined || balanceDue === '')
                    const needs_review = !reconcile || !nextExtracted?.vendor || !nextExtracted?.date || !hasTotals || invoiceMissingFields

                    const patch: any = {
                      extracted_data: nextExtracted,
                      due_date: nextExtracted?.due_date ?? null,
                      balance_due: nextExtracted?.balance_due ?? null,
                      needs_review,
                    }

                    const res = await fetch('/api/documents/update', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ documentId: editDoc.id, patch }),
                    })
                    const json = await res.json().catch(() => null)
                    if (!res.ok) throw new Error(json?.error || 'Save failed')

                    setEditDoc(null)
                    fetchDocuments()
                  } catch (e) {
                    console.error('save edit failed', e)
                    alert(e instanceof Error ? e.message : 'Save failed')
                  } finally {
                    setEditSaving(false)
                  }
                }}
              >
                {editSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {lastExport ? (
        <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="text-sm text-gray-800">
            Exported {lastExport.exportedCount} document(s) and archived them.
            {lastExport.spreadsheetUrl ? (
              <span className="ml-2">
                <a
                  className="text-blue-600 hover:underline"
                  href={lastExport.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open sheet
                </a>
              </span>
            ) : null}
            <span className="ml-2 text-gray-500">Re-opening does not delete the exported sheet. Delete it in Google Sheets if you don’t want duplicates.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                try {
                  setUndoing(true)
                  const res = await fetch('/api/documents/reopen-batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ batchId: lastExport.batchId }),
                  })
                  const json = await res.json().catch(() => null)
                  if (!res.ok) throw new Error(json?.error || 'Failed to re-open batch')

                  if (json?.message) alert(json.message)

                  setLastExport(null)
                  fetchDocuments()
                } finally {
                  setUndoing(false)
                }
              }}
              disabled={undoing}
              className="px-3 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              {undoing ? 'Re-opening…' : 'Re-open for export'}
            </button>
            <button
              onClick={() => setLastExport(null)}
              className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('to_export')}
            className={`px-3 py-2 text-sm font-medium rounded-md border ${
              view === 'to_export' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            To Export
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
                      <span className="inline-flex items-center gap-2 px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                        needs review
                        <button
                          className="underline underline-offset-2"
                          onClick={async () => {
                            try {
                              await fetch('/api/documents/mark-reviewed', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ documentId: doc.id }),
                              })
                              setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, needs_review: false } : d)))
                            } catch (e) {
                              console.error('mark reviewed failed', e)
                              alert('Failed to mark reviewed')
                            }
                          }}
                        >
                          mark reviewed
                        </button>
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
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white text-gray-900"
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
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white text-gray-900"
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
                    {view !== 'trash' ? (
                      <button
                        onClick={() => {
                          setEditDoc(doc)
                          setEditForm({
                            vendor: (doc.extracted_data?.vendor || '').toString(),
                            date: (doc.extracted_data?.date || '').toString(),
                            total: doc.extracted_data?.total !== null && doc.extracted_data?.total !== undefined ? String(doc.extracted_data.total) : '',
                            due_date: (doc.due_date || doc.extracted_data?.due_date || '').toString(),
                            balance_due:
                              doc.balance_due !== null && doc.balance_due !== undefined && doc.balance_due !== ''
                                ? String(doc.balance_due)
                                : doc.extracted_data?.balance_due !== null && doc.extracted_data?.balance_due !== undefined && doc.extracted_data?.balance_due !== ''
                                  ? String(doc.extracted_data.balance_due)
                                  : '',
                          })
                        }}
                        className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Edit
                      </button>
                    ) : null}
                    {view === 'archived' ? (
                      doc.exported_at ? (
                        <button
                          onClick={async () => {
                            const batchId = doc.export_batch_id
                            if (!batchId) {
                              alert('This document was exported, but has no batch id. Cannot re-open for export.')
                              return
                            }
                            const res = await fetch('/api/documents/reopen-batch', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ batchId }),
                            })
                            const json = await res.json().catch(() => null)
                            if (!res.ok) throw new Error(json?.error || 'Failed to re-open batch')
                            if (json?.message) alert(json.message)
                            fetchDocuments()
                          }}
                          className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                          title="Re-open for export"
                        >
                          Re-open for export
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleArchive(doc, false)}
                          className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                          title="Unarchive"
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Unarchive
                        </button>
                      )
                    ) : view === 'to_export' ? (
                      <button
                        onClick={() => toggleArchive(doc, true)}
                        className="text-gray-700 hover:text-gray-900"
                        title="Archive"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    ) : null}

                    {view !== 'trash' && doc.status === 'error' ? (
                      <button
                        onClick={() => retryExtract(doc)}
                        className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700"
                        title="Retry extraction"
                      >
                        Retry
                      </button>
                    ) : null}

                    {view === 'trash' ? (
                      <>
                        <button
                          onClick={() => restoreFromTrash(doc)}
                          className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                          title="Restore"
                        >
                          Restore to Archived
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
