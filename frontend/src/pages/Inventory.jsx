import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, ArrowUpDown, Search, Package, Clock, CheckCircle, XCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { inventoryApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { formatCurrency } from '../utils/format'

const MOCK_PRODUCTS = [
  { id: 1, name: 'Dangote Cement (50kg)', type: 'Dangote', unit: 'bags', price: 8500, stock_qty: 0, reorder_level: 50 },
  { id: 2, name: 'BUA Cement (50kg)', type: 'BUA', unit: 'bags', price: 8200, stock_qty: 0, reorder_level: 50 },
]

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1">&times;</button>
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
  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400'

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Product Name</label>
        <input {...register('name', { required: 'Required' })} className={inputCls} />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
          <select {...register('type', { required: 'Required' })} className={inputCls}>
            <option value="">Select type</option>
            <option>Dangote</option><option>BUA</option><option>Lafarge</option>
            <option>Elephant</option><option>Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
          <select {...register('unit')} className={inputCls}>
            <option value="bags">Bags</option>
            <option value="tonnes">Tonnes</option>
            <option value="pallets">Pallets</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Price (₦)</label>
          <input type="number" step="0.01" {...register('price', { required: 'Required', min: 0 })} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Reorder Level</label>
          <input type="number" {...register('reorder_level', { required: 'Required', min: 0 })} className={inputCls} />
        </div>
      </div>
      {!product && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Opening Stock</label>
          <input type="number" {...register('stock_qty', { required: 'Required', min: 0 })} className={inputCls} />
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose}
          className="flex-1 border border-slate-300 text-slate-600 rounded-xl py-3 text-sm hover:bg-slate-50">Cancel</button>
        <button type="submit"
          className="flex-1 bg-orange-500 text-white rounded-xl py-3 text-sm font-medium hover:bg-orange-600">
          {product ? 'Update' : 'Add Product'}
        </button>
      </div>
    </form>
  )
}

function AdjustModal({ product, onClose, onAdjust }) {
  const { register, handleSubmit } = useForm({ defaultValues: { reason: 'restock' } })
  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400'
  return (
    <form onSubmit={handleSubmit(onAdjust)} className="space-y-4">
      <p className="text-sm text-slate-600">Current stock: <strong>{product.stock_qty} {product.unit}</strong></p>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Adjustment Type</label>
        <select {...register('reason')} className={inputCls}>
          <option value="restock">Restock (Add)</option>
          <option value="correction">Stock Correction</option>
          <option value="damaged">Damaged / Loss</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
        <input type="number" {...register('quantity', { required: true })} className={inputCls} />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose}
          className="flex-1 border border-slate-300 text-slate-600 rounded-xl py-3 text-sm hover:bg-slate-50">Cancel</button>
        <button type="submit"
          className="flex-1 bg-orange-500 text-white rounded-xl py-3 text-sm font-medium hover:bg-orange-600">Adjust</button>
      </div>
    </form>
  )
}

const REASON_LABEL = { restock: 'Restock (+)', damaged: 'Damaged (−)', correction: 'Correction (=)' }

export default function Inventory() {
  const qc = useQueryClient()
  const { user } = useAuth()
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
    onSuccess: () => {
      qc.invalidateQueries(['inventory'])
      qc.invalidateQueries(['pendingChanges'])
      setAdjustProduct(null)
      toast.success('Adjustment submitted — awaiting approval from another user')
    },
    onError: (e) => toast.error(e.message),
  })

  const { data: pendingChanges = [] } = useQuery({
    queryKey: ['pendingChanges'],
    queryFn: () => inventoryApi.getPendingChanges().then(r => r.data),
  })

  const approveMutation = useMutation({
    mutationFn: inventoryApi.approveChange,
    onSuccess: () => { qc.invalidateQueries(['inventory']); qc.invalidateQueries(['pendingChanges']); toast.success('Adjustment approved') },
    onError: (e) => toast.error(e.message),
  })

  const rejectMutation = useMutation({
    mutationFn: inventoryApi.rejectChange,
    onSuccess: () => { qc.invalidateQueries(['pendingChanges']); toast.success('Adjustment rejected') },
    onError: (e) => toast.error(e.message),
  })

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.type?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">

      {/* Pending approvals */}
      {pendingChanges.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">Pending Approvals ({pendingChanges.length})</h3>
          </div>
          {pendingChanges.map(change => (
            <div key={change.id} className="bg-white rounded-lg border border-amber-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{change.product_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {REASON_LABEL[change.payload?.reason] || change.payload?.reason} · qty {change.payload?.quantity}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Requested by <strong>{change.requested_by}</strong></p>
                </div>
                {change.requested_by !== user?.username ? (
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => approveMutation.mutate(change.id)} disabled={approveMutation.isPending}
                      className="flex items-center gap-1 text-xs font-medium text-white bg-green-500 hover:bg-green-600 px-2.5 py-1.5 rounded-lg disabled:opacity-50">
                      <CheckCircle size={12} /> Approve
                    </button>
                    <button onClick={() => rejectMutation.mutate(change.id)} disabled={rejectMutation.isPending}
                      className="flex items-center gap-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-2.5 py-1.5 rounded-lg disabled:opacity-50">
                      <XCircle size={12} /> Reject
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-lg shrink-0">Awaiting 2nd user</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
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
            <Package size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No products found</p>
          </div>
        )}
        {filtered.map(product => {
          const isLow = product.stock_qty <= product.reorder_level
          return (
            <div key={product.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-slate-800">{product.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{product.type}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isLow ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  {isLow ? 'Low Stock' : 'In Stock'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm mb-3">
                <span className="text-slate-500">Price: <strong className="text-slate-700">{formatCurrency(product.price)}</strong></span>
                <span className="text-slate-500">Stock: <strong className={isLow ? 'text-red-600' : 'text-slate-700'}>{product.stock_qty} {product.unit}</strong></span>
              </div>
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button onClick={() => setAdjustProduct(product)}
                  className="flex-1 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg flex items-center justify-center gap-1 active:scale-[0.98]">
                  <ArrowUpDown size={14} /> Adjust
                </button>
                <button onClick={() => setEditProduct(product)}
                  className="flex-1 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg flex items-center justify-center gap-1 active:scale-[0.98]">
                  <Pencil size={14} /> Edit
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white rounded-xl border border-slate-200 overflow-hidden">
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
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">
                  <Package size={32} className="mx-auto mb-2 opacity-30" />No products found
                </td></tr>
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
                        <button onClick={() => setAdjustProduct(product)}
                          className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-2 py-1">
                          <ArrowUpDown size={12} /> Adjust
                        </button>
                        <button onClick={() => setEditProduct(product)}
                          className="text-xs flex items-center gap-1 text-slate-600 hover:text-slate-800 border border-slate-200 rounded px-2 py-1">
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
