import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import NewSale from './pages/NewSale'
import SalesHistory from './pages/SalesHistory'
import Receivables from './pages/Receivables'
import Receipts from './pages/Receipts'
import Customers from './pages/Customers'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="sales/new" element={<NewSale />} />
          <Route path="sales/history" element={<SalesHistory />} />
          <Route path="receivables" element={<Receivables />} />
          <Route path="receipts" element={<Receipts />} />
          <Route path="customers" element={<Customers />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
