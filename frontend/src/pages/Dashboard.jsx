import { useQuery } from '@tanstack/react-query'
import { Package, ShoppingCart, CreditCard, TrendingUp, AlertTriangle, Clock } from 'lucide-react'
import { dashboardApi } from '../services/api'
import { formatCurrency, formatDate } from '../utils/format'

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// Mock data for when API is not yet connected
const MOCK = {
  total_products: 8,
  low_stock_count: 2,
  today_sales: 4,
  today_revenue: 125000,
  total_receivables: 452000,
  overdue_count: 3,
  recent_sales: [
    { id: 1, customer_name: 'John Adebayo', total: 32000, payment_method: 'cash', created_at: new Date().toISOString() },
    { id: 2, customer_name: 'Ngozi Okonkwo', total: 56000, payment_method: 'mobile_money', created_at: new Date().toISOString() },
    { id: 3, customer_name: 'Emeka Okafor', total: 18000, payment_method: 'card', created_at: new Date().toISOString() },
  ],
  low_stock_products: [
    { id: 1, name: 'Dangote Cement (50kg)', stock_qty: 0, reorder_level: 50, unit: 'bags' },
    { id: 2, name: 'BUA Cement (50kg)', stock_qty: 0, reorder_level: 50, unit: 'bags' },
  ],
}

const METHOD_BADGE = {
  cash: 'bg-green-100 text-green-700',
  card: 'bg-blue-100 text-blue-700',
  mobile_money: 'bg-purple-100 text-purple-700',
}

export default function Dashboard() {
  const { data: summary = MOCK, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.getSummary().then(r => r.data),
    placeholderData: MOCK,
  })

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="Products in Stock"
          value={summary.total_products}
          sub={`${summary.low_stock_count} low stock`}
          color="bg-blue-500"
        />
        <StatCard
          icon={ShoppingCart}
          label="Today's Sales"
          value={summary.today_sales}
          sub={formatCurrency(summary.today_revenue)}
          color="bg-green-500"
        />
        <StatCard
          icon={CreditCard}
          label="Total Receivables"
          value={formatCurrency(summary.total_receivables)}
          sub={`${summary.overdue_count} overdue`}
          color="bg-orange-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Revenue Today"
          value={formatCurrency(summary.today_revenue)}
          sub="cash + card + mobile"
          color="bg-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700">Recent Sales</h2>
            <Clock size={16} className="text-slate-400" />
          </div>
          <div className="divide-y divide-slate-50">
            {summary.recent_sales?.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-slate-700">{sale.customer_name || 'Walk-in'}</p>
                  <p className="text-xs text-slate-400">{formatDate(sale.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${METHOD_BADGE[sale.payment_method] || 'bg-slate-100 text-slate-600'}`}>
                    {sale.payment_method?.replace('_', ' ')}
                  </span>
                  <span className="text-sm font-semibold text-slate-800">{formatCurrency(sale.total)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700">Low Stock Alerts</h2>
            <AlertTriangle size={16} className="text-orange-400" />
          </div>
          <div className="divide-y divide-slate-50">
            {summary.low_stock_products?.length === 0 && (
              <p className="px-5 py-6 text-sm text-slate-400 text-center">All products are well stocked</p>
            )}
            {summary.low_stock_products?.map((product) => (
              <div key={product.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium text-slate-700">{product.name}</p>
                  <span className="text-xs text-orange-600 font-semibold">{product.stock_qty} {product.unit}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-orange-400 h-1.5 rounded-full"
                    style={{ width: `${Math.min((product.stock_qty / product.reorder_level) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Reorder at {product.reorder_level} {product.unit}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
