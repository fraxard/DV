import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, completeOnboarding } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('India');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setSubmitting(true);

    try {
    await completeOnboarding({
  name,
  dateOfBirth: dob,
  phone,
  country,
});

navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '32px',
        background: '#f5f3ef',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          background: '#fff',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 20px 60px rgba(0,0,0,.08)',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '.12em',
            textTransform: 'uppercase',
            opacity: 0.55,
          }}
        >
          DigiVirasat
        </p>

        <h1
          style={{
            margin: '10px 0 8px',
            fontSize: '32px',
          }}
        >
          Let's set up your profile
        </h1>

        <p
          style={{
            margin: '0 0 28px',
            color: '#666',
            lineHeight: 1.6,
          }}
        >
          Just a few details before we open your vault.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label>Full name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label>Date of birth</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label>Phone number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="+91 98765 43210"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label>Country</label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {error && (
            <p style={{ color: '#b42318', marginBottom: 16 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '14px 18px',
              border: 0,
              borderRadius: '10px',
              background: '#171717',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {submitting ? 'Saving...' : 'Continue to DigiVirasat'}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  marginTop: '7px',
  padding: '12px 14px',
  border: '1px solid #ddd',
  borderRadius: '9px',
  fontSize: '14px',
};