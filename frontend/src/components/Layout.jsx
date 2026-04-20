import { useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingCart, History,
  CreditCard, Receipt, Users, Menu, X, Building2
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/sales/new', icon: ShoppingCart, label: 'New Sale' },
  { to: '/sales/history', icon: History, label: 'Sales History' },
  { to: '/receivables', icon: CreditCard, label: 'Receivables' },
  { to: '/receipts', icon: Receipt, label: 'Receipts' },
  { to: '/customers', icon: Users, label: 'Customers' },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const currentPage = navItems.find(item => location.pathname.startsWith(item.to))?.label || 'Dashboard'

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-200
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
          <div className="bg-orange-500 rounded-lg p-1.5">
            <Building2 size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white leading-tight">CementTrack</p>
            <p className="text-xs text-slate-400">Business Manager</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-orange-500 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 px-6 py-4 border-t border-slate-700">
          <p className="text-xs text-slate-500">v1.0.0 · eu-west-1</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-500 hover:text-slate-700"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-lg font-semibold text-slate-800">{currentPage}</h1>
          <div className="ml-auto flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
              <span className="text-orange-600 font-semibold text-sm">A</span>
            </div>
            <span className="text-sm text-slate-600 hidden sm:block">Admin</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
