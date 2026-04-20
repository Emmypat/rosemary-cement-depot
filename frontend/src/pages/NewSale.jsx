import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { Plus, Trash2, ShoppingCart } from 'lucide-react'
import toast from 'react-hot-toast'
import { salesApi, inventoryApi, customersApi } from '../services/api'
import { formatCurrency } from '../utils/format'

const MOCK_PRODUCTS = [
  { id: 1, name: 'OPC 42.5 (50kg)', price: 85, stock_qty: 120, unit: 'bags' },
  { id: 2, name: 'Portland Cement (50kg)', price: 78, stock_qty: 8, unit: 'bags' },
  { id: 3, name: 'Supaset (50kg)', price: 95, stock_qty: 60, unit: 'bags' },
  { id: 4, name: 'White Cement (25kg)', price: 145, stock_qty: 25, unit: 'bags' },
]

const MOCK_CUSTOMERS = [
  { id: 1, name: 'John Mensah', phone: '0244123456' },
  { id: 2, name: 'Abena Owusu', phone: '0554321789' },
  { id: 3, name: 'Kofi Asante', phone: '0201234567' },
]

export default function NewSale() {
  const navigate = useNavigate()
  const [isCredit, setIsCredit] = useState(false)

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

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
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
    onError: (e) => toast.error(e.message),
  })

  const onSubmit = (data) => {
    const payload = {
      ...data,
      is_credit: isCredit,
      items: data.items.map(item => ({
        product_id: parseInt(item.product_id),
        qty: parseInt(item.qty),
        unit_price: parseFloat(item.unit_price),
        subtotal: parseFloat(item.unit_price) * parseInt(item.qty),
      })),
      total,
    }
    saleMutation.mutate(payload)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-5">
      {/* Customer */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold text-slate-700">Customer Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Customer (optional)</label>
            <select {...register('customer_id')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="">Walk-in Customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name</label>
            <input {...register('customer_name')} placeholder="Or type new name"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Email (for receipt)</label>
            <input type="email" {...register('customer_email')} placeholder="customer@email.com"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">Sale Items</h2>
          <button type="button" onClick={() => append({ product_id: '', qty: 1, unit_price: 0 })}
            className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-800 font-medium">
            <Plus size={15} /> Add Item
          </button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start">
              <div className="flex-1">
                <select
                  {...register(`items.${index}.product_id`, { required: true })}
                  onChange={e => handleProductChange(index, e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">Select product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (stock: {p.stock_qty})</option>
                  ))}
                </select>
              </div>
              <div className="w-20">
                <input type="number" min="1" {...register(`items.${index}.qty`, { required: true, min: 1 })}
                  placeholder="Qty"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div className="w-28">
                <input type="number" step="0.01" {...register(`items.${index}.unit_price`, { required: true })}
                  placeholder="Price"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div className="w-24 py-2 text-right text-sm font-semibold text-slate-700">
                {formatCurrency(subtotals[index] || 0)}
              </div>
              {fields.length > 1 && (
                <button type="button" onClick={() => remove(index)} className="py-2 text-red-400 hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 pt-3 flex justify-end">
          <div className="text-right">
            <span className="text-slate-500 text-sm">Total: </span>
            <span className="text-xl font-bold text-slate-800">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Payment */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold text-slate-700">Payment</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method</label>
            <div className="flex gap-2 flex-wrap">
              {['cash', 'card', 'mobile_money'].map(method => (
                <label key={method}
                  className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border text-sm transition-colors ${
                    watchPaymentMethod === method ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-600'
                  }`}>
                  <input type="radio" value={method} {...register('payment_method')} className="hidden" />
                  {method === 'cash' ? 'Cash' : method === 'card' ? 'Card' : 'Mobile Money'}
                </label>
              ))}
            </div>
          </div>
          {watchPaymentMethod !== 'cash' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reference / Transaction ID</label>
              <input {...register('payment_reference')} placeholder="e.g. MoMo ref, card approval code"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mt-2">
          <button type="button" onClick={() => setIsCredit(!isCredit)}
            className={`w-11 h-6 rounded-full transition-colors relative ${isCredit ? 'bg-orange-500' : 'bg-slate-300'}`}>
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${isCredit ? 'left-5' : 'left-0.5'}`} />
          </button>
          <label className="text-sm text-slate-700 cursor-pointer" onClick={() => setIsCredit(!isCredit)}>
            Credit Sale (customer owes payment)
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={saleMutation.isPending}
        className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 disabled:opacity-60"
      >
        <ShoppingCart size={18} />
        {saleMutation.isPending ? 'Processing...' : 'Complete Sale & Send Receipt'}
      </button>
    </form>
  )
}
