import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './BottomNav.module.css';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const path = location.pathname;

  const navItems = [
    { label: 'Vault', to: '/vault', active: path.startsWith('/vault') },
    { label: 'Nominees', to: '/nominees', active: path.startsWith('/nominees') },
    { label: 'Documents', to: '/documents', active: path.startsWith('/documents') },
    { label: 'Calendar', to: '/calendar', active: path.startsWith('/calendar') },
    { label: 'Activity', to: '/activity', active: path.startsWith('/activity') },
    { label: 'Settings', to: '/settings', active: path.startsWith('/settings') },
  ];

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className={styles.floatingNavWrapper}>
      <nav className={styles.bottomNav} aria-label="Global navigation">
        <Link
          className={`${styles.navLogo} ${path === '/dashboard' ? styles.navItemActive : ''}`}
          to="/dashboard"
          title="Dashboard"
        >
          DV.
        </Link>
        {navItems.map(({ label, to, active }) => (
          <Link
            key={label}
            className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
            to={to}
          >
            {label}
          </Link>
        ))}
        <button
          type="button"
          className={styles.signOutBtn}
          onClick={handleSignOut}
          title="Sign out of DigiVirasat"
        >
          Sign out
        </button>
      </nav>
    </div>
  );
}
