'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSupabase } from '@/components/SupabaseProvider'
import PageHeader from '@/components/platform/PageHeader'
import { Download, Edit, Trash2, FileDown } from 'lucide-react'

interface PayStub {
  id: string
  company_name: string
  company_address?: string
  company_phone?: string
  company_ein?: string
  employee_name: string
  employee_address?: string
  employee_id_number?: string
  ssn_last_four?: string
  pay_method: string
  pay_period_start: string
  pay_period_end: string
  pay_date: string
  pay_frequency: string
  earnings: Array<{
    description: string
    type: string
    hours?: number
    rate?: number
    amount: number
  }>
  deductions: Array<{
    description: string
    type: string
    amount: number
  }>
  gross_pay: number
  total_deductions: number
  net_pay: number
  ytd_gross: number
  ytd_deductions: number
  ytd_net: number
  status: string
  pdf_storage_path: string | null
  created_at: string
}

export default function PayStubViewPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useSupabase()
  const [paystub, setPaystub] = useState<PayStub | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (user && params.id) {
      fetchPayStub()
    }
  }, [user, params.id])

  const fetchPayStub = async () => {
    try {
      const response = await fetch(`/api/paystubs/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setPaystub(data.paystub)
      } else {
        router.push('/paystubs')
      }
    } catch (error) {
      console.error('Error fetching pay stub:', error)
      router.push('/paystubs')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true)
    try {
      const response = await fetch(`/api/paystubs/${params.id}/pdf`, {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.is_watermarked) {
          alert('Free tier: PDF generated with watermark. Upgrade to remove watermark.')
        }
        // Refresh to get updated pdf_storage_path
        await fetchPayStub()
        // Open PDF
        window.open(data.pdf_url, '_blank')
      } else {
        alert('Failed to generate PDF')
      }
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleDownload = async () => {
    if (!paystub?.pdf_storage_path) {
      alert('Please generate the PDF first')
      return
    }

    try {
      const response = await fetch(`/api/paystubs/${params.id}/pdf`)
      if (response.ok) {
        const data = await response.json()
        window.open(data.pdf_url, '_blank')
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this pay stub?')) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/paystubs/${params.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/paystubs')
      } else {
        alert('Failed to delete pay stub')
      }
    } catch (error) {
      console.error('Error deleting pay stub:', error)
      alert('Error deleting pay stub')
    } finally {
      setIsDeleting(false)
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
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!paystub) {
    return <div>Pay stub not found</div>
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Pay Stub - ${paystub.employee_name}`}
        description={`${formatDate(paystub.pay_period_start)} - ${formatDate(paystub.pay_period_end)}`}
        action={
          <div className="flex items-center gap-2">
            {paystub.pdf_storage_path ? (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Download size={18} />
                Download PDF
              </button>
            ) : (
              <button
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <FileDown size={18} />
                {isGeneratingPDF ? 'Generating...' : 'Generate PDF'}
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Trash2 size={18} />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        }
      />

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 space-y-8">
        {/* Header Info */}
        <div className="border-b border-zinc-800 pb-6">
          <h2 className="text-2xl font-bold text-white mb-2">{paystub.company_name}</h2>
          {paystub.company_address && <p className="text-zinc-400 text-sm">{paystub.company_address}</p>}
          <div className="flex gap-4 text-sm text-zinc-400 mt-2">
            {paystub.company_phone && <span>Phone: {paystub.company_phone}</span>}
            {paystub.company_ein && <span>EIN: {paystub.company_ein}</span>}
          </div>
        </div>

        {/* Employee & Pay Period */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-zinc-800 pb-6">
          <div>
            <h3 className="font-semibold text-white mb-3">Employee</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-400">Name:</dt>
                <dd className="font-semibold text-white">{paystub.employee_name}</dd>
              </div>
              {paystub.employee_address && (
                <div className="flex justify-between">
                  <dt className="text-zinc-400">Address:</dt>
                  <dd className="font-semibold text-white">{paystub.employee_address}</dd>
                </div>
              )}
              {paystub.employee_id_number && (
                <div className="flex justify-between">
                  <dt className="text-zinc-400">Employee ID:</dt>
                  <dd className="font-semibold text-white">{paystub.employee_id_number}</dd>
                </div>
              )}
              {paystub.ssn_last_four && (
                <div className="flex justify-between">
                  <dt className="text-zinc-400">SSN:</dt>
                  <dd className="font-semibold text-white">***-**-{paystub.ssn_last_four}</dd>
                </div>
              )}
            </dl>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-3">Pay Period</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-400">Period:</dt>
                <dd className="font-semibold text-white">
                  {formatDate(paystub.pay_period_start)} - {formatDate(paystub.pay_period_end)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-400">Pay Date:</dt>
                <dd className="font-semibold text-white">{formatDate(paystub.pay_date)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-400">Frequency:</dt>
                <dd className="font-semibold text-white capitalize">{paystub.pay_frequency}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-400">Pay Method:</dt>
                <dd className="font-semibold text-white capitalize">{paystub.pay_method.replace('_', ' ')}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Earnings */}
        <div>
          <h3 className="font-semibold text-white mb-4">Earnings</h3>
          <div className="space-y-2">
            {paystub.earnings.map((earning, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <div className="flex-1">
                  <span className="text-white">{earning.description}</span>
                  {earning.hours && earning.rate && (
                    <span className="text-zinc-500 text-xs ml-2">
                      {earning.hours} hrs × {formatCurrency(earning.rate)}
                    </span>
                  )}
                </div>
                <span className="font-semibold text-white">{formatCurrency(earning.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between items-center text-sm font-bold border-t border-zinc-700 pt-2 mt-2">
              <span className="text-white">Gross Pay</span>
              <span className="text-white">{formatCurrency(paystub.gross_pay)}</span>
            </div>
          </div>
        </div>

        {/* Deductions */}
        {paystub.deductions.length > 0 && (
          <div>
            <h3 className="font-semibold text-white mb-4">Deductions</h3>
            <div className="space-y-2">
              {paystub.deductions.map((deduction, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-white">{deduction.description}</span>
                  <span className="font-semibold text-red-400">-{formatCurrency(deduction.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center text-sm font-bold border-t border-zinc-700 pt-2 mt-2">
                <span className="text-white">Total Deductions</span>
                <span className="text-red-400">-{formatCurrency(paystub.total_deductions)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Net Pay */}
        <div className="bg-green-600/10 border-2 border-green-600/30 rounded-lg p-6 text-center">
          <p className="text-sm text-zinc-400 mb-2">NET PAY</p>
          <p className="text-4xl font-bold text-green-400">{formatCurrency(paystub.net_pay)}</p>
        </div>

        {/* YTD Summary */}
        <div className="text-center text-sm text-zinc-500">
          <p>
            YTD Summary: Gross {formatCurrency(paystub.ytd_gross)} | Deductions{' '}
            {formatCurrency(paystub.ytd_deductions)} | Net {formatCurrency(paystub.ytd_net)}
          </p>
        </div>
      </div>
    </div>
  )
}
