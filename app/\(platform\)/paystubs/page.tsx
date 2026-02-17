'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import PageHeader from '@/components/platform/PageHeader'
import Link from 'next/link'
import { Plus, Download, Eye, Trash2, FileText } from 'lucide-react'

interface PayStub {
  id: string
  employee_name: string
  pay_period_start: string
  pay_period_end: string
  pay_date: string
  net_pay: number
  created_at: string
  status: string
  pdf_storage_path: string | null
}

export default function PayStubsPage() {
  const { user, loading: authLoading } = useSupabase()
  const [paystubs, setPaystubs] = useState<PayStub[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchPayStubs()
    } else {
      setIsLoading(false)
    }
  }, [user])

  const fetchPayStubs = async () => {
    try {
      const response = await fetch('/api/paystubs')
      if (response.ok) {
        const data = await response.json()
        setPaystubs(data.paystubs || [])
      }
    } catch (error) {
      console.error('Error fetching pay stubs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pay stub?')) {
      return
    }

    setDeleteId(id)
    try {
      const response = await fetch(`/api/paystubs/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setPaystubs(paystubs.filter(p => p.id !== id))
      } else {
        alert('Failed to delete pay stub')
      }
    } catch (error) {
      console.error('Error deleting pay stub:', error)
      alert('Error deleting pay stub')
    } finally {
      setDeleteId(null)
    }
  }

  const handleDownload = async (id: string) => {
    try {
      const response = await fetch(`/api/paystubs/${id}/pdf`)
      if (response.ok) {
        const data = await response.json()
        window.open(data.pdf_url, '_blank')
      } else {
        alert('PDF not generated yet. Please generate it first.')
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Pay Stubs"
        description="Generate professional pay stubs for your employees"
        action={
          <Link
            href="/paystubs/create"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={18} />
            Create Pay Stub
          </Link>
        }
      />

      {/* Pay Stubs List */}
      {paystubs.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
          <div className="flex justify-center mb-6">
            <FileText size={64} className="text-zinc-700" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            No pay stubs yet
          </h3>
          <p className="text-zinc-400 mb-6">
            Create your first pay stub to get started
          </p>
          <Link
            href="/paystubs/create"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            <Plus size={18} />
            Create Pay Stub
          </Link>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-800 border-b border-zinc-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Pay Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Pay Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Net Pay
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {paystubs.map((paystub) => (
                  <tr key={paystub.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-white">
                      {paystub.employee_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-400">
                      {formatDate(paystub.pay_period_start)} - {formatDate(paystub.pay_period_end)}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-400">
                      {formatDate(paystub.pay_date)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-white">
                      {formatCurrency(paystub.net_pay)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          paystub.status === 'final'
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-yellow-500/20 text-yellow-300'
                        }`}
                      >
                        {paystub.status === 'final' ? 'Final' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/paystubs/${paystub.id}`}
                          className="p-2 text-zinc-400 hover:text-white transition-colors"
                          title="View"
                        >
                          <Eye size={16} />
                        </Link>
                        {paystub.pdf_storage_path && (
                          <button
                            onClick={() => handleDownload(paystub.id)}
                            className="p-2 text-zinc-400 hover:text-white transition-colors"
                            title="Download PDF"
                          >
                            <Download size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(paystub.id)}
                          disabled={deleteId === paystub.id}
                          className="p-2 text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
