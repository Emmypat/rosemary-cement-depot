import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, ArrowUpDown, Search, Package } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { inventoryApi } from '../services/api'
import { formatCurrency } from '../utils/format'

const MOCK_PRODUCTS = [
  { id: 1, name: 'OPC 42.5 (50kg)', type: 'OPC', unit: 'bags', price: 85, stock_qty: 120, reorder_level: 50 },
  { id: 2, name: 'Portland Cement (50kg)', type: 'Portland', unit: 'bags', price: 78, stock_qty: 8, reorder_level: 30 },
  { id: 3, name: 'Supaset (50kg)', type: 'Supaset', unit: 'bags', price: 95, stock_qty: 60, reorder_level: 20 },
  { id: 4, name: 'White Cement (25kg)', type: 'White', unit: 'bags', price: 145, stock_qty: 25, reorder_level: 10 },
]

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function ProductForm({ product, onClose, onSave }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: product || { unit: 'bags' }
  })

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Product Name</label>
        <input {...register('name', { required: 'Required' })}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
          <select {...register('type', { required: 'Required' })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
            <option value="">Select type</option>
            <option>OPC</option>
            <option>Portland</option>
            <option>Supaset</option>
            <option>White</option>
            <option>Masonry</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
          <select {...register('unit')}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
            <option value="bags">Bags</option>
            <option value="tonnes">Tonnes</option>
            <option value="pallets">Pallets</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Price (GHS)</label>
          <input type="number" step="0.01" {...register('price', { required: 'Required', min: 0 })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Reorder Level</label>
          <input type="number" {...register('reorder_level', { required: 'Required', min: 0 })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>
      </div>
      {!product && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Opening Stock</label>
          <input type="number" {...register('stock_qty', { required: 'Required', min: 0 })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose}
          className="flex-1 border border-slate-300 text-slate-600 rounded-lg py-2 text-sm hover:bg-slate-50">
          Cancel
        </button>
        <button type="submit"
          className="flex-1 bg-orange-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-orange-600">
          {product ? 'Update' : 'Add Product'}
        </button>
      </div>
    </form>
  )
}

function AdjustModal({ product, onClose, onAdjust }) {
  const { register, handleSubmit } = useForm({ defaultValues: { reason: 'restock' } })
  return (
    <form onSubmit={handleSubmit(onAdjust)} className="space-y-4">
      <p className="text-sm text-slate-600">Current stock: <strong>{product.stock_qty} {product.unit}</strong></p>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Adjustment Type</label>
        <select {...register('reason')}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
          <option value="restock">Restock (Add)</option>
          <option value="correction">Stock Correction</option>
          <option value="damaged">Damaged / Loss</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
        <input type="number" {...register('quantity', { required: true })}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose}
          className="flex-1 border border-slate-300 text-slate-600 rounded-lg py-2 text-sm hover:bg-slate-50">Cancel</button>
        <button type="submit"
          className="flex-1 bg-orange-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-orange-600">Adjust</button>
      </div>
    </form>
  )
}

export default function Inventory() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [adjustProduct, setAdjustProduct] = useState(null)

  const { data: products = MOCK_PRODUCTS } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryApi.getAll().then(r => r.data),
    placeholderData: MOCK_PRODUCTS,
  })

  const createMutation = useMutation({
    mutationFn: inventoryApi.create,
    onSuccess: () => { qc.invalidateQueries(['inventory']); setShowAdd(false); toast.success('Product added') },
    onError: (e) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => inventoryApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['inventory']); setEditProduct(null); toast.success('Product updated') },
    onError: (e) => toast.error(e.message),
  })

  const adjustMutation = useMutation({
    mutationFn: ({ id, data }) => inventoryApi.adjustStock(id, data),
    onSuccess: () => { qc.invalidateQueries(['inventory']); setAdjustProduct(null); toast.success('Stock adjusted') },
    onError: (e) => toast.error(e.message),
  })

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.type?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Product</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Type</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Price</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Stock</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    <Package size={32} className="mx-auto mb-2 opacity-30" />
                    No products found
                  </td>
                </tr>
              )}
              {filtered.map(product => {
                const isLow = product.stock_qty <= product.reorder_level
                return (
                  <tr key={product.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{product.name}</td>
                    <td className="px-4 py-3 text-slate-500">{product.type}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-700">{formatCurrency(product.price)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{product.stock_qty} {product.unit}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isLow ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {isLow ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setAdjustProduct(product)}
                          className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-2 py-1"
                        >
                          <ArrowUpDown size={12} /> Adjust
                        </button>
                        <button
                          onClick={() => setEditProduct(product)}
                          className="text-xs flex items-center gap-1 text-slate-600 hover:text-slate-800 border border-slate-200 rounded px-2 py-1"
                        >
                          <Pencil size={12} /> Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <Modal title="Add Product" onClose={() => setShowAdd(false)}>
          <ProductForm onClose={() => setShowAdd(false)} onSave={data => createMutation.mutate(data)} />
        </Modal>
      )}
      {editProduct && (
        <Modal title="Edit Product" onClose={() => setEditProduct(null)}>
          <ProductForm product={editProduct} onClose={() => setEditProduct(null)}
            onSave={data => updateMutation.mutate({ id: editProduct.id, data })} />
        </Modal>
      )}
      {adjustProduct && (
        <Modal title={`Adjust Stock – ${adjustProduct.name}`} onClose={() => setAdjustProduct(null)}>
          <AdjustModal product={adjustProduct} onClose={() => setAdjustProduct(null)}
            onAdjust={data => adjustMutation.mutate({ id: adjustProduct.id, data })} />
        </Modal>
      )}
    </div>
  )
}
