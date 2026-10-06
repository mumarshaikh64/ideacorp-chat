import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { initStaffSocket } from './services/socket';

// Pages
import LoginPage from './pages/LoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AgentDeskPage from './pages/AgentDeskPage';
import ConversationsPage from './pages/ConversationsPage';
import CustomersPage from './pages/CustomersPage';
import UsersPage from './pages/UsersPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import CustomerChatPage from './pages/CustomerChatPage';
import BulkSMSPage from './pages/BulkSMSPage';
import NumbersInventoryPage from './pages/NumbersInventoryPage';

// Layout & Common
import Sidebar from './components/admin/Sidebar';
import Topbar from './components/admin/Topbar';
import InviteCustomerModal from './components/admin/InviteCustomerModal';

function ProtectedAdminLayout() {
  const { isAuthenticated, user, token } = useAuthStore();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (token) {
      initStaffSocket(token);
    }
  }, [token]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const getPageTitle = (pathname) => {
    switch (pathname) {
      case '/admin':
        return 'Overview Dashboard';
      case '/admin/agent-desk':
        return 'Agent Live Desk';
      case '/admin/numbers':
        return 'Telecom Numbers Inventory';
      case '/admin/campaigns':
        return 'Bulk SMS Broadcasts';
      case '/admin/conversations':
        return 'Conversation Logs & Transcripts';
      case '/admin/customers':
        return 'Customer CRM';
      case '/admin/users':
        return 'Staff & Role Management';
      case '/admin/reports':
        return 'Performance Reports & Analytics';
      case '/admin/settings':
        return 'Platform Settings';
      default:
        return 'IdeaCrop Admin Panel';
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          title={getPageTitle(location.pathname)}
          onOpenInviteModal={() => setIsInviteModalOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-8">
          <Routes>
            <Route index element={<AdminDashboardPage />} />
            <Route path="agent-desk" element={<AgentDeskPage onOpenInviteModal={() => setIsInviteModalOpen(true)} />} />
            <Route path="numbers" element={<NumbersInventoryPage />} />
            <Route path="campaigns" element={<BulkSMSPage />} />
            <Route path="conversations" element={<ConversationsPage />} />
            <Route path="customers" element={<CustomersPage onOpenInviteModal={() => setIsInviteModalOpen(true)} />} />
            <Route
              path="users"
              element={['admin', 'supervisor'].includes(user?.role) ? <UsersPage /> : <Navigate to="/admin" replace />}
            />
            <Route path="reports" element={<ReportsPage />} />
            <Route
              path="settings"
              element={user?.role === 'admin' ? <SettingsPage /> : <Navigate to="/admin" replace />}
            />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>

      {/* Global SMS Invite Modal */}
      <InviteCustomerModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Customer Chat Routes */}
        <Route path="/c/:chatToken" element={<CustomerChatPage />} />
        
        {/* Auth Route */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/admin" replace /> : <LoginPage />}
        />

        {/* Authenticated Staff Routes */}
        <Route path="/admin/*" element={<ProtectedAdminLayout />} />

        {/* Root Redirect */}
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? "/admin" : "/login"} replace />}
        />

        {/* 404 Catch-All: Support direct token root route /:chatToken if not matching others */}
        <Route path="/:chatToken" element={<CustomerChatPage />} />
      </Routes>
    </BrowserRouter>
  );
}
