import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import NewRequest from './pages/employee/NewRequest';
import MyRequests from './pages/employee/MyRequests';
import AdminDashboard from './pages/admin/AdminDashboard';
import Inventory from './pages/admin/Inventory';
import PendingRequests from './pages/admin/PendingRequests';
import AllRequests from './pages/admin/AllRequests';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Employee routes */}
        <Route element={<ProtectedRoute role="employee" />}>
          <Route path="/dashboard" element={<EmployeeDashboard />} />
          <Route path="/requests/new" element={<NewRequest />} />
          <Route path="/requests/mine" element={<MyRequests />} />
        </Route>

        {/* Admin routes */}
        <Route element={<ProtectedRoute role="admin" />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/inventory" element={<Inventory />} />
          <Route path="/admin/requests/pending" element={<PendingRequests />} />
          <Route path="/admin/requests" element={<AllRequests />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
