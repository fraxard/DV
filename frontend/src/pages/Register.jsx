import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Auth.module.css';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState('');
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
      const data = await register(name, email, password);

      // Store the pending verification information temporarily.
      // This allows the verification page to survive a page refresh
      // during development.
      sessionStorage.setItem(
        'dv_pending_verification',
        JSON.stringify({
          email,
          devVerificationToken: data.devVerificationToken || null,
          devVerificationExpiresAt:
            data.devVerificationExpiresAt || null,
        })
      );

      // New users must verify their email before continuing.
      navigate('/verify-email', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const strength = !password
    ? 0
    : password.length < 8
      ? 1
      : password.length < 12 && /[A-Z]/.test(password)
        ? 2
        : 3;

  const strengthLabel = ['', 'Weak', 'Good', 'Strong'][strength];

  const strengthColor = [
    '',
    'var(--color-danger)',
    'var(--color-warning)',
    'var(--color-success)',
  ][strength];

  return (
    <div className={styles.root}>
      <aside className={styles.panel}>
        <a href="/" className={styles.panelLogo}>
          DigiVirasat<span className={styles.dot}>.</span>
        </a>

        <div className={styles.panelBody}>
          <blockquote className={styles.panelQuote}>
            "Ten minutes today.
            <br />
            Clarity for a lifetime."
          </blockquote>

          <p className={styles.panelSub}>
            Start organising your digital life. Your vault is private,
            secure, and always yours.
          </p>
        </div>

        <div className={styles.panelSteps}>
          {[
            'Create your vault',
            'Add assets & documents',
            'Assign nominees',
          ].map((s, i) => (
            <div key={i} className={styles.panelStep}>
              <span className={styles.panelStepNum}>{i + 1}</span>
              <span className={styles.panelStepText}>{s}</span>
            </div>
          ))}
        </div>
      </aside>

      <main className={styles.formSide}>
        <div className={styles.formWrap}>
          <div className={styles.formHeader}>
            <h1 className={styles.formTitle}>Create your vault</h1>
            <p className={styles.formSub}>
              Free to start. No credit card required.
            </p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label
                className={styles.label}
                htmlFor="name"
              >
                Full name
              </label>

              <input
                id="name"
                type="text"
                className={styles.input}
                placeholder="Rahul Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>

            <div className={styles.field}>
              <label
                className={styles.label}
                htmlFor="email"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                className={styles.input}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className={styles.field}>
              <label
                className={styles.label}
                htmlFor="password"
              >
                Password
              </label>

              <div className={styles.inputWrap}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={styles.input}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() =>
                    setShowPassword((v) => !v)
                  }
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showPassword ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line
                        x1="1"
                        y1="1"
                        x2="23"
                        y2="23"
                      />
                    </svg>
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                      />
                    </svg>
                  )}
                </button>
              </div>

              {password && (
                <div className={styles.strengthRow}>
                  <div className={styles.strengthBars}>
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className={styles.strengthBar}
                        style={{
                          background:
                            strength >= n
                              ? strengthColor
                              : 'var(--color-border)',
                        }}
                      />
                    ))}
                  </div>

                  <span
                    className={styles.strengthLabel}
                    style={{ color: strengthColor }}
                  >
                    {strengthLabel}
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div
                className={styles.error}
                role="alert"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                  />
                  <line
                    x1="12"
                    y1="8"
                    x2="12"
                    y2="12"
                  />
                  <line
                    x1="12"
                    y1="16"
                    x2="12.01"
                    y2="16"
                  />
                </svg>

                {error}
              </div>
            )}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={submitting}
            >
              {submitting ? (
                <span className={styles.spinner} />
              ) : (
                'Create Vault'
              )}
            </button>

            <p className={styles.terms}>
              By creating an account, you agree to our{' '}
              <a href="#">Terms of Service</a> and{' '}
              <a href="#">Privacy Policy</a>.
            </p>
          </form>

          <p className={styles.switchText}>
            Already have an account?{' '}
            <Link
              to="/login"
              className={styles.switchLink}
            >
              Sign in
            </Link>
          </p>

          <a href="/" className={styles.backLink}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Back to home
          </a>
        </div>
      </main>
    </div>
  );
}