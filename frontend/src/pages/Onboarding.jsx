import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Globe2,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Onboarding({ onCompleted }) {
  const navigate = useNavigate();
  const { user, completeOnboarding } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [dob, setDob] = useState(user?.date_of_birth || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [country, setCountry] = useState(user?.country || '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');

    if (!name.trim() || !dob || !phone.trim() || !country.trim()) {
      setError('Please complete all fields before continuing.');
      return;
    }

    setSubmitting(true);

    try {
      await completeOnboarding({
        name,
        dateOfBirth: dob,
        phone,
        country,
      });

      if (onCompleted) {
        onCompleted();
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%',
    height: 43,
    boxSizing: 'border-box',
    padding: '0 12px',
    border: '1px solid rgba(28,32,29,.09)',
    borderRadius: 10,
    outline: 'none',
    background: '#fafbfa',
    color: '#171817',
    fontSize: 10,
    fontWeight: 500,
  };

  const fieldStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
  };

  const labelStyle = {
    color: '#59605b',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '.03em',
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          marginBottom: 18,
          color: '#66716a',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '.1em',
        }}
      >
        <span
          style={{
            width: 22,
            height: 22,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 7,
            background: '#eef2ef',
          }}
        >
          <UserRound size={12} />
        </span>

        STEP 02 / PROFILE
      </div>

      <h1
        style={{
          margin: 0,
          fontSize: 29,
          lineHeight: 1,
          letterSpacing: '-.045em',
          fontWeight: 600,
          color: '#171817',
        }}
      >
        Create your profile
      </h1>

      <p
        style={{
          margin: '12px 0 22px',
          maxWidth: 350,
          color: '#777e79',
          fontSize: 10.5,
          lineHeight: 1.6,
        }}
      >
        Tell us a little about yourself. You can always update these
        details later.
      </p>

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 13,
          }}
        >
          <div style={fieldStyle}>
            <label htmlFor="name" style={labelStyle}>
              Full name
            </label>

            <div style={{ position: 'relative' }}>
              <UserRound
                size={13}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: 15,
                  color: '#8b938d',
                }}
              />

              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                style={{
                  ...inputStyle,
                  paddingLeft: 34,
                }}
              />
            </div>
          </div>

          <div style={fieldStyle}>
            <label htmlFor="dob" style={labelStyle}>
              Date of birth
            </label>

            <div style={{ position: 'relative' }}>
              <CalendarDays
                size={13}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: 15,
                  color: '#8b938d',
                }}
              />

              <input
                id="dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                style={{
                  ...inputStyle,
                  paddingLeft: 34,
                }}
              />
            </div>
          </div>

          <div style={fieldStyle}>
            <label htmlFor="phone" style={labelStyle}>
              Phone number
            </label>

            <div style={{ position: 'relative' }}>
              <Phone
                size={13}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: 15,
                  color: '#8b938d',
                }}
              />

              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                style={{
                  ...inputStyle,
                  paddingLeft: 34,
                }}
              />
            </div>
          </div>

          <div style={fieldStyle}>
            <label htmlFor="country" style={labelStyle}>
              Country
            </label>

            <div style={{ position: 'relative' }}>
              <Globe2
                size={13}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: 15,
                  color: '#8b938d',
                }}
              />

              <input
                id="country"
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="India"
                style={{
                  ...inputStyle,
                  paddingLeft: 34,
                }}
              />
            </div>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              marginTop: 13,
              padding: '9px 11px',
              borderRadius: 9,
              background: '#fff2f0',
              color: '#b42318',
              fontSize: 9.5,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginTop: 17,
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
          {submitting ? (
            'Creating your space…'
          ) : (
            <>
              Enter DigiVirasat
              <ArrowRight size={13} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}