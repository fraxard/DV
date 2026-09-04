import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Auth.module.css';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const loggedInUser = await login(email, password);

      if (!loggedInUser.email_verified) {
        navigate('/verify-email', { replace: true });
      } else if (!loggedInUser.onboarding_completed) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.root}>
      {/* Left panel */}
      <aside className={styles.panel}>
        <a href="/" className={styles.panelLogo}>
          DigiVirasat<span className={styles.dot}>.</span>
        </a>
        <div className={styles.panelBody}>
          <blockquote className={styles.panelQuote}>
            "Your family deserves clarity,<br />not confusion."
          </blockquote>
          <p className={styles.panelSub}>
            Everything they'll need — organised, protected, and waiting.
          </p>
        </div>
        <div className={styles.panelBadges}>
          <span className={styles.panelBadge}>🔒 Private by design</span>
          <span className={styles.panelBadge}>🇮🇳 Built for India</span>
        </div>
      </aside>

      {/* Right: form */}
      <main className={styles.formSide}>
        <div className={styles.formWrap}>
          <div className={styles.formHeader}>
            <h1 className={styles.formTitle}>Welcome back</h1>
            <p className={styles.formSub}>
              Sign in to access your vault.
            </p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">Email</label>
              <input id="email" type="email" className={styles.input} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>

            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label className={styles.label} htmlFor="password">Password</label>
                <a href="#" className={styles.forgot}>Forgot password?</a>
              </div>
              <div className={styles.inputWrap}>
                <input id="password" type={showPassword ? 'text' : 'password'} className={styles.input} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                <button type="button" className={styles.eyeBtn} onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
            </div>

            {error && <div className={styles.error} role="alert"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>{error}</div>}

            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? <span className={styles.spinner} /> : 'Sign In'}
            </button>
          </form>

          <p className={styles.switchText}>Don't have an account? <Link to="/register" className={styles.switchLink}>Create one</Link></p>

          <a href="/" className={styles.backLink}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>Back to home</a>
        </div>
      </main>
    </div>
  );
}