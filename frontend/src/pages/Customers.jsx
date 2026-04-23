import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Users } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { customersApi } from '../services/api'
import { formatCurrency, formatDate } from '../utils/format'

const MOCK_CUSTOMERS = [
  { id: 1, name: 'John Mensah', phone: '0244123456', email: 'john@example.com', balance_owed: 0, created_at: new Date().toISOString() },
  { id: 2, name: 'Abena Owusu', phone: '0554321789', email: 'abena@example.com', balance_owed: 0, created_at: new Date().toISOString() },
  { id: 3, name: 'Kofi Asante', phone: '0201234567', email: null, balance_owed: 1800, created_at: new Date().toISOString() },
]

function CustomerModal({ customer, onClose, onSave }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: customer || {} })
  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400'
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{customer ? 'Edit Customer' : 'Add Customer'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1">&times;</button>
        </div>
        <form onSubmit={handleSubmit(onSave)} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input {...register('name', { required: 'Required' })} className={inputCls} />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input {...register('phone')} placeholder="080xxxxxxxx" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email (for receipts)</label>
            <input type="email" {...register('email')} placeholder="customer@email.com" className={inputCls} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-300 text-slate-600 rounded-xl py-3 text-sm hover:bg-slate-50">Cancel</button>
            <button type="submit"
              className="flex-1 bg-orange-500 text-white rounded-xl py-3 text-sm font-medium hover:bg-orange-600">
              {customer ? 'Update' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Customers() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editCustomer, setEditCustomer] = useState(null)

  const { data: customers = MOCK_CUSTOMERS } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.getAll().then(r => r.data),
    placeholderData: MOCK_CUSTOMERS,
  })

  const createMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => { qc.invalidateQueries(['customers']); setShowAdd(false); toast.success('Customer added') },
    onError: (e) => toast.error(e.message),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => customersApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['customers']); setEditCustomer(null); toast.success('Customer updated') },
    onError: (e) => toast.error(e.message),
  })

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..."
            className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-600 whitespace-nowrap">
          <Plus size={16} /> Add
        </button>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            <Users size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No customers found</p>
          </div>
        )}
        {filtered.map(customer => (
          <div key={customer.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-800">{customer.name}</p>
                {customer.phone && <p className="text-sm text-slate-500 mt-0.5">{customer.phone}</p>}
                {customer.email && <p className="text-xs text-slate-400 mt-0.5">{customer.email}</p>}
              </div>
              <div className="text-right">
                {customer.balance_owed > 0
                  ? <span className="font-semibold text-red-600 text-sm">{formatCurrency(customer.balance_owed)}</span>
                  : <span className="text-xs text-green-600 font-medium">Cleared</span>
                }
                {customer.balance_owed > 0 && <p className="text-xs text-slate-400">owed</p>}
              </div>
            </div>
            <div className="pt-3 mt-3 border-t border-slate-100">
              <button onClick={() => setEditCustomer(customer)}
                className="w-full py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg active:scale-[0.98]">
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Balance Owed</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Added</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">
                  <Users size={32} className="mx-auto mb-2 opacity-30" />No customers found
                </td></tr>
              )}
              {filtered.map(customer => (
                <tr key={customer.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{customer.name}</td>
                  <td className="px-4 py-3 text-slate-500">{customer.phone || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{customer.email || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {customer.balance_owed > 0
                      ? <span className="font-semibold text-red-600">{formatCurrency(customer.balance_owed)}</span>
                      : <span className="text-green-600 text-xs">Cleared</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(customer.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEditCustomer(customer)}
                      className="text-xs text-slate-600 hover:text-slate-800 border border-slate-200 rounded px-2 py-1">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && <CustomerModal onClose={() => setShowAdd(false)} onSave={data => createMutation.mutate(data)} />}
      {editCustomer && <CustomerModal customer={editCustomer} onClose={() => setEditCustomer(null)}
        onSave={data => updateMutation.mutate({ id: editCustomer.id, data })} />}
    </div>
  )
}
