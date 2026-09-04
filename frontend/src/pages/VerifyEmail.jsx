import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function VerifyEmail({ onVerified }) {
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
      } catch {
        setEmail(user?.email || '');
      }
    } else if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    if (user?.email_verified) {
      onVerified?.();
    }
  }, [user, onVerified]);

  const handleVerify = async (e) => {
    e.preventDefault();

    setError('');
    setMessage('');

    if (token.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setSubmitting(true);

    try {
      await verifyEmail(token.trim());

      sessionStorage.removeItem('dv_pending_verification');

      if (onVerified) {
        onVerified();
      } else {
        navigate('/onboarding', { replace: true });
      }
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
      await resendVerification();

      setMessage(
        'A new verification code has been sent to your email.'
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div>
      <div
        style={{
          width: 38,
          height: 38,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 12,
          background: '#eef2ef',
          color: '#596c60',
          marginBottom: 20,
        }}
      >
        <Mail size={18} strokeWidth={1.8} />
      </div>

      <p
        style={{
          margin: '0 0 8px',
          color: '#8b918d',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '.14em',
        }}
      >
        STEP 01 / VERIFICATION
      </p>

      <h1
        style={{
          margin: 0,
          fontSize: 30,
          lineHeight: 1,
          letterSpacing: '-.045em',
          fontWeight: 600,
          color: '#171817',
        }}
      >
        Verify your email
      </h1>

      <p
        style={{
          margin: '14px 0 22px',
          maxWidth: 350,
          color: '#777e79',
          fontSize: 11,
          lineHeight: 1.65,
        }}
      >
        We've sent a 6-digit verification code to your email.
      </p>

      {email && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            marginBottom: 22,
            padding: '10px 12px',
            border: '1px solid rgba(28,32,29,.07)',
            borderRadius: 11,
            background: '#f5f7f5',
            color: '#59625c',
            fontSize: 10,
          }}
        >
          <Mail size={13} />

          <strong style={{ fontWeight: 650 }}>
            {email}
          </strong>
        </div>
      )}

      <form onSubmit={handleVerify}>
        <label
          htmlFor="verification-token"
          style={{
            display: 'block',
            marginBottom: 7,
            color: '#59605b',
            fontSize: 10,
            fontWeight: 650,
          }}
        >
          Verification code
        </label>

        <input
          id="verification-token"
          type="text"
          inputMode="numeric"
          value={token}
          onChange={(e) => {
            const value = e.target.value
              .replace(/\D/g, '')
              .slice(0, 6);

            setToken(value);
          }}
          placeholder="000000"
          autoComplete="one-time-code"
          maxLength={6}
          pattern="[0-9]{6}"
          spellCheck="false"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            height: 52,
            padding: '0 16px',
            border: '1px solid rgba(28,32,29,.1)',
            borderRadius: 12,
            outline: 'none',
            background: '#fafbfa',
            color: '#171817',
            fontSize: 20,
            fontWeight: 650,
            letterSpacing: '.28em',
          }}
        />

        {error && (
          <div
            role="alert"
            style={{
              marginTop: 10,
              padding: '9px 11px',
              borderRadius: 10,
              background: '#fff2f0',
              color: '#b42318',
              fontSize: 10,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 10,
              color: '#5d7664',
              fontSize: 10,
            }}
          >
            <CheckCircle2 size={12} />
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            height: 44,
            marginTop: 18,
            border: 0,
            borderRadius: 10,
            background: '#202321',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            cursor: submitting ? 'default' : 'pointer',
            opacity: submitting ? 0.65 : 1,
          }}
        >
          {submitting ? 'Verifying…' : 'Verify email'}
        </button>
      </form>

      <button
        type="button"
        onClick={handleResend}
        disabled={resending}
        style={{
          width: '100%',
          marginTop: 12,
          padding: 0,
          border: 0,
          background: 'transparent',
          color: '#68716b',
          fontSize: 10,
          fontWeight: 650,
          cursor: resending ? 'default' : 'pointer',
        }}
      >
        {resending
          ? 'Sending new code…'
          : 'Resend verification code'}
      </button>
    </div>
  );
}