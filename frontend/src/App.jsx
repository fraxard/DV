import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import WorkspacePage from './pages/WorkspacePage';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import VerifyEmail from './pages/VerifyEmail';
import Onboarding from './pages/Onboarding';
import LifecycleRoute from './components/LifecycleRoute';

function AuthRedirect() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const mode = params.get('mode');
  return <Navigate to={mode === 'signup' ? '/register' : '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<AuthRedirect />} />

        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route element={<LifecycleRoute stage="verify-email" />}>
          <Route path="/verify-email" element={<VerifyEmail />} />
        </Route>

        <Route element={<LifecycleRoute stage="onboarding" />}>
          <Route path="/onboarding" element={<Onboarding />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/vault" element={<WorkspacePage section="vault" />} />
          <Route path="/nominees" element={<WorkspacePage section="nominees" />} />
          <Route path="/activity" element={<WorkspacePage section="activity" />} />
          <Route path="/documents" element={<WorkspacePage section="documents" />} />
          <Route path="/calendar" element={<WorkspacePage section="calendar" />} />
          <Route path="/settings" element={<WorkspacePage section="settings" />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
