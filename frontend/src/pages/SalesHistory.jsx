import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, CheckCircle, Eye, Receipt } from 'lucide-react'
import toast from 'react-hot-toast'
import { salesApi, receiptsApi } from '../services/api'
import { formatCurrency, formatDateTime } from '../utils/format'

const MOCK_SALES = [
  { id: 1, customer_name: 'John Mensah', customer_email: 'john@example.com', total: 3200, payment_method: 'cash', is_credit: false, verified: true, created_at: new Date().toISOString(), items: [{ name: 'OPC 42.5', qty: 20, unit_price: 85, subtotal: 1700 }, { name: 'Portland (50kg)', qty: 19, unit_price: 78, subtotal: 1482 }] },
  { id: 2, customer_name: 'Abena Owusu', customer_email: 'abena@example.com', total: 5600, payment_method: 'mobile_money', is_credit: false, verified: true, created_at: new Date().toISOString(), items: [] },
  { id: 3, customer_name: 'Kofi Asante', customer_email: null, total: 1800, payment_method: 'card', is_credit: true, verified: false, created_at: new Date().toISOString(), items: [] },
  { id: 4, customer_name: 'Walk-in', customer_email: null, total: 680, payment_method: 'cash', is_credit: false, verified: false, created_at: new Date().toISOString(), items: [] },
]

const METHOD_BADGE = {
  cash: 'bg-green-100 text-green-700',
  card: 'bg-blue-100 text-blue-700',
  mobile_money: 'bg-purple-100 text-purple-700',
}

function SaleDetailModal({ sale, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Sale #{sale.id} Details</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-slate-500">Customer:</span> <span className="font-medium">{sale.customer_name}</span></div>
            <div><span className="text-slate-500">Date:</span> <span className="font-medium">{formatDateTime(sale.created_at)}</span></div>
            <div><span className="text-slate-500">Payment:</span>
              <span className={`ml-1 text-xs px-2 py-0.5 rounded-full capitalize ${METHOD_BADGE[sale.payment_method] || ''}`}>
                {sale.payment_method?.replace('_', ' ')}
              </span>
            </div>
            <div><span className="text-slate-500">Type:</span>
              <span className={`ml-1 text-xs px-2 py-0.5 rounded-full ${sale.is_credit ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                {sale.is_credit ? 'Credit Sale' : 'Paid'}
              </span>
            </div>
          </div>

          {sale.items?.length > 0 && (
            <table className="w-full text-sm border border-slate-100 rounded-lg overflow-hidden">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2 text-slate-600">Product</th>
                  <th className="text-right px-3 py-2 text-slate-600">Qty</th>
                  <th className="text-right px-3 py-2 text-slate-600">Price</th>
                  <th className="text-right px-3 py-2 text-slate-600">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items.map((item, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">{item.name}</td>
                    <td className="px-3 py-2 text-right">{item.qty}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-right font-semibold text-slate-700">Total</td>
                  <td className="px-3 py-2 text-right font-bold text-slate-800">{formatCurrency(sale.total)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SalesHistory() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [viewSale, setViewSale] = useState(null)

  const { data: sales = MOCK_SALES } = useQuery({
    queryKey: ['sales'],
    queryFn: () => salesApi.getAll().then(r => r.data),
    placeholderData: MOCK_SALES,
  })

  const verifyMutation = useMutation({
    mutationFn: salesApi.verify,
    onSuccess: () => { qc.invalidateQueries(['sales']); toast.success('Sale verified') },
    onError: (e) => toast.error(e.message),
  })

  const resendMutation = useMutation({
    mutationFn: receiptsApi.resend,
    onSuccess: () => toast.success('Receipt resent!'),
    onError: (e) => toast.error(e.message),
  })

  const filtered = sales.filter(s =>
    (s.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
    String(s.id).includes(search)
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by customer or ID..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">#</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Payment</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Total</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Verified</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(sale => (
                <tr key={sale.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-400 font-mono">#{sale.id}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{sale.customer_name || 'Walk-in'}</p>
                    {sale.is_credit && <span className="text-xs text-orange-600">Credit</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDateTime(sale.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${METHOD_BADGE[sale.payment_method] || 'bg-slate-100 text-slate-600'}`}>
                      {sale.payment_method?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(sale.total)}</td>
                  <td className="px-4 py-3 text-center">
                    {sale.verified
                      ? <CheckCircle size={16} className="text-green-500 mx-auto" />
                      : <button onClick={() => verifyMutation.mutate(sale.id)}
                          className="text-xs text-orange-600 underline hover:text-orange-800">Verify</button>
                    }
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setViewSale(sale)}
                        className="text-xs flex items-center gap-1 text-slate-600 hover:text-slate-800 border border-slate-200 rounded px-2 py-1">
                        <Eye size={12} /> View
                      </button>
                      {sale.customer_email && (
                        <button onClick={() => resendMutation.mutate(sale.id)}
                          className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-2 py-1">
                          <Receipt size={12} /> Receipt
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

      {viewSale && <SaleDetailModal sale={viewSale} onClose={() => setViewSale(null)} />}
    </div>
  )
}
