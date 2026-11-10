import React, { useState } from 'react';
import styles from './Contact.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setError('');
    setSuccess('');

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName) {
      setError('Please enter your name.');
      return;
    }

    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!trimmedSubject) {
      setError('Please provide a subject for your message.');
      return;
    }

    if (!trimmedMessage || trimmedMessage.length < 10) {
      setError('Message must be at least 10 characters.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          subject: trimmedSubject,
          message: trimmedMessage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || 'Failed to submit support message.');
      }

      setSuccess(
        data?.message ||
        'Thank you for reaching out. Your message has been received and our team will get back to you shortly.'
      );
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err) {
      console.error('Contact form submission error:', err);
      setError(err.message || 'An error occurred while submitting your message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={styles.section} id="contact" aria-label="Contact and Support">
      <div className="container">
        <div className={styles.header} data-reveal>
          <h2 className={styles.title}>Have questions? We're here to help.</h2>
          <p className={styles.sub}>
            Whether you have inquiries about vault privacy, nominee designations, or need guidance setting up your digital estate, send us a message and our team will assist you.
          </p>
        </div>

        <div className={styles.formCard} data-reveal>
          {error && (
            <div className={styles.alertError} role="alert" style={{ marginBottom: '14px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className={styles.alertSuccess} role="status" style={{ marginBottom: '14px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{success}</span>
            </div>
          )}

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.rowTwo}>
              <div className={styles.field}>
                <label htmlFor="landingName" className={styles.label}>Full Name</label>
                <input
                  id="landingName"
                  type="text"
                  className={styles.input}
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="landingEmail" className={styles.label}>Email Address</label>
                <input
                  id="landingEmail"
                  type="email"
                  className={styles.input}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="landingSubject" className={styles.label}>Subject</label>
              <input
                id="landingSubject"
                type="text"
                className={styles.input}
                placeholder="How can we assist you?"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="landingMessage" className={styles.label}>Message</label>
              <textarea
                id="landingMessage"
                className={styles.textarea}
                placeholder="Describe your inquiry or question in detail..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            <div className={styles.actions}>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={submitting}
              >
                {submitting ? 'Sending Message...' : 'Send Message'}
                {!submitting && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
