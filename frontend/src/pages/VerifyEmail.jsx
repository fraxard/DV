import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './VerifyEmail.module.css';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { user, verifyEmail, resendVerification } = useAuth();

  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('dv_pending_verification');

    if (stored) {
      try {
        const data = JSON.parse(stored);

        setEmail(data.email || user?.email || '');

        if (data.devVerificationToken) {
          setToken(data.devVerificationToken);
        }
      } catch {
        // Ignore invalid session storage data.
      }
    } else if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    if (user?.email_verified) {
      navigate('/onboarding', { replace: true });
    }
  }, [user, navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();

    setError('');
    setMessage('');

    if (!token.trim()) {
      setError('Please enter your verification token.');
      return;
    }

    setSubmitting(true);

    try {
      await verifyEmail(token.trim());

      sessionStorage.removeItem('dv_pending_verification');

      navigate('/onboarding', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setMessage('');
    setResending(true);

    try {
      const data = await resendVerification();

      if (data.devVerificationToken) {
        setToken(data.devVerificationToken);

        sessionStorage.setItem(
          'dv_pending_verification',
          JSON.stringify({
            email: user?.email || email,
            devVerificationToken: data.devVerificationToken,
            devVerificationExpiresAt:
              data.devVerificationExpiresAt || null,
          })
        );

        setMessage(
          'A new development verification token has been generated.'
        );
      } else {
        setMessage('A new verification email has been sent.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <div className={styles.icon}>
          ✉
        </div>

        <div className={styles.header}>
          <p className={styles.eyebrow}>DigiVirasat</p>
          <h1>Verify your email</h1>
          <p>
            We need to verify your email before you can finish setting up
            your DigiVirasat account.
          </p>
        </div>

        {email && (
          <div className={styles.emailBox}>
            <span>Verification email</span>
            <strong>{email}</strong>
          </div>
        )}

        <form onSubmit={handleVerify} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="verification-token">
              Verification token
            </label>

            <input
              id="verification-token"
              type="text"
              inputMode="numeric"
              value={token}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setToken(value);
              }}
              placeholder="Enter 6-digit OTP"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="[0-9]{6}"
              spellCheck="false"
            />
          </div>

          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}

          {message && (
            <div className={styles.message}>
              {message}
            </div>
          )}

          <button
            type="submit"
            className={styles.primaryBtn}
            disabled={submitting}
          >
            {submitting ? 'Verifying…' : 'Verify email'}
          </button>
        </form>

        <div className={styles.devNotice}>
          <strong>Development mode</strong>
          <span>
            Your verification token is automatically loaded above.
            In production this will be replaced by an email verification
            code/link.
          </span>
        </div>

        <button
          type="button"
          className={styles.resendBtn}
          onClick={handleResend}
          disabled={resending}
        >
          {resending ? 'Generating new token…' : 'Resend verification'}
        </button>

        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate('/login')}
        >
          Back to sign in
        </button>
      </div>
    </div>
  );
}