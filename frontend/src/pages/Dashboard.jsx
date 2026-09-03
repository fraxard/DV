import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <main>
      <h1>Dashboard</h1>

      <p>Welcome, {user?.name}!</p>
      <p>Email: {user?.email}</p>

      <button onClick={logout}>
        Logout
      </button>
    </main>
  );
}