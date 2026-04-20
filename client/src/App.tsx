import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import NewRequest from './pages/employee/NewRequest';
import MyRequests from './pages/employee/MyRequests';
import AdminDashboard from './pages/admin/AdminDashboard';
import Inventory from './pages/admin/Inventory';
import PendingRequests from './pages/admin/PendingRequests';
import AllRequests from './pages/admin/AllRequests';
import AdminUsers from './pages/admin/AdminUsers';

const App: React.FC = () => (
  <BrowserRouter>
    <Toaster position="top-right" />
    <Navbar />
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Employee */}
      <Route element={<ProtectedRoute allowedRoles={['employee']} />}>
        <Route path="/employee" element={<EmployeeDashboard />} />
        <Route path="/employee/new-request" element={<NewRequest />} />
        <Route path="/employee/my-requests" element={<MyRequests />} />
      </Route>

      {/* Admin */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/inventory" element={<Inventory />} />
        <Route path="/admin/pending" element={<PendingRequests />} />
        <Route path="/admin/requests" element={<AllRequests />} />
        <Route path="/admin/users" element={<AdminUsers />} />
      </Route>

      {/* Default */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;
