import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import EmployeeDashboard from './pages/employee/Dashboard';
import NewRequest from './pages/employee/NewRequest';
import MyRequests from './pages/employee/MyRequests';
import AdminDashboard from './pages/admin/Dashboard';
import Inventory from './pages/admin/Inventory';
import PendingRequests from './pages/admin/PendingRequests';
import AllRequests from './pages/admin/AllRequests';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Employee routes */}
        <Route element={<ProtectedRoute role="employee" />}>
          <Route path="/employee" element={<EmployeeDashboard />} />
          <Route path="/employee/new-request" element={<NewRequest />} />
          <Route path="/employee/my-requests" element={<MyRequests />} />
        </Route>

        {/* Admin routes */}
        <Route element={<ProtectedRoute role="admin" />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/inventory" element={<Inventory />} />
          <Route path="/admin/pending" element={<PendingRequests />} />
          <Route path="/admin/requests" element={<AllRequests />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
