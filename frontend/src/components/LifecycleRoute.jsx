import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LifecycleRoute({ stage }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  // No authenticated session.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Verification stage:
  // Only authenticated users who have NOT verified their email
  // should be able to access /verify-email.
  if (stage === 'verify-email') {
    if (user.email_verified) {
      if (!user.onboarding_completed) {
        return <Navigate to="/onboarding" replace />;
      }

      return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
  }

  // Onboarding stage:
  // Only verified users who have NOT completed onboarding
  // should be able to access /onboarding.
  if (stage === 'onboarding') {
    if (!user.email_verified) {
      return <Navigate to="/verify-email" replace />;
    }

    if (user.onboarding_completed) {
      return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
  }

  return <Navigate to="/dashboard" replace />;
}