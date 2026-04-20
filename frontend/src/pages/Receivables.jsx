import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, DollarSign, AlertCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { receivablesApi } from '../services/api'
import { formatCurrency, formatDate } from '../utils/format'

const MOCK_RECEIVABLES = [
  { id: 1, customer_name: 'Kofi Asante', customer_email: 'kofi@example.com', amount_owed: 1800, amount_paid: 0, sale_id: 3, due_date: '2026-05-01', paid: false, created_at: new Date().toISOString() },
  { id: 2, customer_name: 'Ama Boateng', customer_email: 'ama@example.com', amount_owed: 4200, amount_paid: 2000, sale_id: 5, due_date: '2026-04-25', paid: false, created_at: new Date().toISOString() },
  { id: 3, customer_name: 'Kwame Frimpong', customer_email: null, amount_owed: 950, amount_paid: 950, sale_id: 6, due_date: '2026-04-10', paid: true, created_at: new Date().toISOString() },
]

function PaymentModal({ receivable, onClose, onPay }) {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const remaining = receivable.amount_owed - receivable.amount_paid
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Record Payment</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
        </div>
        <form onSubmit={handleSubmit(onPay)} className="px-6 py-5 space-y-4">
          <div className="bg-orange-50 rounded-lg p-3">
            <p className="text-sm text-slate-600">Customer: <strong>{receivable.customer_name}</strong></p>
            <p className="text-sm text-slate-600">Total Owed: <strong>{formatCurrency(receivable.amount_owed)}</strong></p>
            <p className="text-sm text-slate-600">Already Paid: <strong>{formatCurrency(receivable.amount_paid)}</strong></p>
            <p className="text-sm font-semibold text-orange-700">Balance: {formatCurrency(remaining)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount Paying Now (₦)</label>
            <input type="number" step="0.01" max={remaining}
              {...register('amount', { required: 'Required', min: { value: 0.01, message: 'Must be > 0' }, max: { value: remaining, message: `Max ${remaining}` } })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
            <select {...register('method', { required: true })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="mobile_money">Mobile Money</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reference (optional)</label>
            <input {...register('reference')} placeholder="Transaction reference"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-300 text-slate-600 rounded-lg py-2 text-sm hover:bg-slate-50">Cancel</button>
            <button type="submit"
              className="flex-1 bg-orange-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-orange-600">Record Payment</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Receivables() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [payReceivable, setPayReceivable] = useState(null)
  const [filter, setFilter] = useState('all')

  const { data: receivables = MOCK_RECEIVABLES } = useQuery({
    queryKey: ['receivables'],
    queryFn: () => receivablesApi.getAll().then(r => r.data),
    placeholderData: MOCK_RECEIVABLES,
  })

  const payMutation = useMutation({
    mutationFn: ({ id, data }) => receivablesApi.recordPayment(id, data),
    onSuccess: () => { qc.invalidateQueries(['receivables']); setPayReceivable(null); toast.success('Payment recorded!') },
    onError: (e) => toast.error(e.message),
  })

  const totalOutstanding = receivables
    .filter(r => !r.paid)
    .reduce((sum, r) => sum + (r.amount_owed - r.amount_paid), 0)

  const overdue = receivables.filter(r => !r.paid && new Date(r.due_date) < new Date()).length

  const filtered = receivables
    .filter(r => filter === 'all' || (filter === 'unpaid' && !r.paid) || (filter === 'paid' && r.paid))
    .filter(r => r.customer_name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total Outstanding</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Open Accounts</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{receivables.filter(r => !r.paid).length}</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-100 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500" />
            <p className="text-sm text-red-600">Overdue</p>
          </div>
          <p className="text-2xl font-bold text-red-700 mt-1">{overdue}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>
        <div className="flex gap-2">
          {['all', 'unpaid', 'paid'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm capitalize font-medium transition-colors ${filter === f ? 'bg-orange-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Sale #</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Amount</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Paid</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Balance</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Due Date</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(r => {
                const balance = r.amount_owed - r.amount_paid
                const isOverdue = !r.paid && new Date(r.due_date) < new Date()
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{r.customer_name}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono">#{r.sale_id}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(r.amount_owed)}</td>
                    <td className="px-4 py-3 text-right text-green-600">{formatCurrency(r.amount_paid)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(balance)}</td>
                    <td className={`px-4 py-3 ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-500'}`}>{formatDate(r.due_date)}</td>
                    <td className="px-4 py-3 text-center">
                      {r.paid
                        ? <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">Paid</span>
                        : isOverdue
                          ? <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium">Overdue</span>
                          : <span className="text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full font-medium">Pending</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!r.paid && (
                        <button onClick={() => setPayReceivable(r)}
                          className="text-xs flex items-center gap-1 text-orange-600 hover:text-orange-800 border border-orange-200 rounded px-2 py-1 ml-auto">
                          <DollarSign size={12} /> Pay
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {payReceivable && (
        <PaymentModal
          receivable={payReceivable}
          onClose={() => setPayReceivable(null)}
          onPay={data => payMutation.mutate({ id: payReceivable.id, data })}
        />
      )}
    </div>
  )
}
