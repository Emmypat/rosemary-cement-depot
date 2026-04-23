import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { Plus, Trash2, ShoppingCart, WifiOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { salesApi, inventoryApi, customersApi } from '../services/api'
import { formatCurrency } from '../utils/format'
import { queueSale } from '../utils/offlineQueue'
import { useSync } from '../context/SyncContext'

const MOCK_PRODUCTS = [
  { id: 1, name: 'Dangote Cement (50kg)', price: 8500, stock_qty: 0, unit: 'bags' },
  { id: 2, name: 'BUA Cement (50kg)', price: 8200, stock_qty: 0, unit: 'bags' },
]
const MOCK_CUSTOMERS = [
  { id: 1, name: 'John Mensah', phone: '0244123456' },
  { id: 2, name: 'Abena Owusu', phone: '0554321789' },
]

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400'
const labelCls = 'block text-sm font-medium text-slate-700 mb-1'

export default function NewSale() {
  const navigate = useNavigate()
  const [isCredit, setIsCredit] = useState(false)
  const { refreshCount } = useSync()

  const { data: products = MOCK_PRODUCTS } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryApi.getAll().then(r => r.data),
    placeholderData: MOCK_PRODUCTS,
  })

  const { data: customers = MOCK_CUSTOMERS } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.getAll().then(r => r.data),
    placeholderData: MOCK_CUSTOMERS,
  })

  const { register, control, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      customer_id: '',
      customer_name: '',
      customer_email: '',
      payment_method: 'cash',
      payment_reference: '',
      is_credit: false,
      items: [{ product_id: '', qty: 1, unit_price: 0 }],
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchItems = watch('items')
  const watchPaymentMethod = watch('payment_method')

  const subtotals = watchItems.map(item => (parseFloat(item.unit_price) || 0) * (parseInt(item.qty) || 0))
  const total = subtotals.reduce((a, b) => a + b, 0)

  const handleProductChange = (index, productId) => {
    const product = products.find(p => p.id === parseInt(productId))
    if (product) setValue(`items.${index}.unit_price`, product.price)
  }

  const saleMutation = useMutation({
    mutationFn: salesApi.create,
    onSuccess: () => {
      toast.success('Sale recorded successfully!')
      navigate('/sales/history')
    },
    onError: (e) => {
      if (e.message?.toLowerCase().includes('network')) {
        toast('Sale may have been saved — check Sales History before retrying.', { icon: '⚠️', duration: 6000 })
        navigate('/sales/history')
      } else {
        toast.error(e.message)
      }
    },
  })

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      customer_id: data.customer_id ? parseInt(data.customer_id) : null,
      customer_email: data.customer_email || null,
      payment_reference: data.payment_reference || null,
      is_credit: isCredit,
      items: data.items.map(item => ({
        product_id: parseInt(item.product_id),
        qty: parseInt(item.qty),
        unit_price: parseFloat(item.unit_price),
        subtotal: parseFloat(item.unit_price) * parseInt(item.qty),
      })),
      total,
    }

    if (!navigator.onLine) {
      await queueSale(payload)
      await refreshCount()
      toast('Sale saved offline — will sync when connected', {
        icon: '📴',
        duration: 4000,
        style: { background: '#1e293b', color: '#fff' },
      })
      navigate('/sales/history')
      return
    }

    saleMutation.mutate(payload)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-4">
      {/* Customer */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <h2 className="font-semibold text-slate-700">Customer</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Existing Customer</label>
            <select {...register('customer_id')} className={inputCls}>
              <option value="">Walk-in Customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Name</label>
            <input {...register('customer_name')} placeholder="Or type new name" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Email (for receipt)</label>
            <input type="email" {...register('customer_email')} placeholder="customer@email.com" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">Items</h2>
          <button type="button" onClick={() => append({ product_id: '', qty: 1, unit_price: 0 })}
            className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-800 font-medium">
            <Plus size={15} /> Add Item
          </button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="border border-slate-100 rounded-xl p-3 space-y-2.5 bg-slate-50">
              <div className="flex gap-2 items-center">
                <select
                  {...register(`items.${index}.product_id`, { required: true })}
                  onChange={e => handleProductChange(index, e.target.value)}
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">Select product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (stock: {p.stock_qty})</option>
                  ))}
                </select>
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(index)} className="p-2.5 text-red-400 hover:text-red-600">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Qty</label>
                  <input type="number" min="1"
                    {...register(`items.${index}.qty`, { required: true, min: 1 })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Price (₦)</label>
                  <input type="number" step="0.01"
                    {...register(`items.${index}.unit_price`, { required: true })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Subtotal</label>
                  <div className="py-2 text-sm font-semibold text-slate-700">{formatCurrency(subtotals[index] || 0)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 pt-3 flex justify-end items-baseline gap-2">
          <span className="text-slate-500 text-sm">Total:</span>
          <span className="text-2xl font-bold text-slate-800">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Payment */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <h2 className="font-semibold text-slate-700">Payment</h2>
        <div>
          <label className={labelCls}>Method</label>
          <div className="flex gap-2 flex-wrap">
            {['cash', 'card', 'mobile_money'].map(method => (
              <label key={method}
                className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-xl border text-sm transition-colors ${
                  watchPaymentMethod === method
                    ? 'border-orange-400 bg-orange-50 text-orange-700 font-medium'
                    : 'border-slate-200 text-slate-600'
                }`}>
                <input type="radio" value={method} {...register('payment_method')} className="hidden" />
                {method === 'cash' ? 'Cash' : method === 'card' ? 'Card' : 'Mobile Money'}
              </label>
            ))}
          </div>
        </div>
        {watchPaymentMethod !== 'cash' && (
          <div>
            <label className={labelCls}>Reference / Transaction ID</label>
            <input {...register('payment_reference')} placeholder="e.g. MoMo ref, card approval" className={inputCls} />
          </div>
        )}
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setIsCredit(!isCredit)}
            className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${isCredit ? 'bg-orange-500' : 'bg-slate-300'}`}>
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${isCredit ? 'left-5' : 'left-0.5'}`} />
          </button>
          <span className="text-sm text-slate-700 cursor-pointer select-none" onClick={() => setIsCredit(!isCredit)}>
            Credit Sale (customer owes payment)
          </span>
        </div>
      </div>

      <button
        type="submit"
        disabled={saleMutation.isPending}
        className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-4 rounded-xl font-semibold text-base hover:bg-orange-600 disabled:opacity-60 active:scale-[0.98] transition-transform"
      >
        {saleMutation.isPending ? (
          'Processing...'
        ) : !navigator.onLine ? (
          <><WifiOff size={18} /> Save Offline</>
        ) : (
          <><ShoppingCart size={20} /> Complete Sale</>
        )}
      </button>
    </form>
  )
}
