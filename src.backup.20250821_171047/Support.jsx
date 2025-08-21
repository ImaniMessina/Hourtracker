import React, { useState } from 'react';
import { db } from './firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

// To change the support email for notifications, update the value in the email notification logic (to be added in the next step)

const initialForm = {
  name: '',
  email: '',
  type: 'bug',
  message: '',
};

const FAQS = [
  {
    q: 'How do I set up my pay structure?',
    a: 'Go to Settings > Pay Structure and enter your pay blocks according to your company or school rules.'
  },
  {
    q: 'How is cancellation pay calculated?',
    a: 'You can choose from several options in Settings > Cancellation Pay. The tier-based option pays at your final monthly tier rate.'
  },
  {
    q: 'Can I edit or delete entries?',
    a: 'Yes! Use the edit and delete buttons in the Past Months or Dashboard views.'
  },
  {
    q: 'Is my data backed up?',
    a: 'All your data is securely stored in the cloud using Firebase.'
  },
];

export default function Support() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess('');
    setError('');
    try {
      await addDoc(collection(db, 'supportTickets'), {
        ...form,
        created: Timestamp.now(),
      });
      setSuccess('Thank you! Your report has been submitted. We will review it as soon as possible.');
      setForm(initialForm);
    } catch (err) {
      setError('There was an error submitting your report. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <div className="container" style={{ maxWidth: 600, margin: '2em auto', padding: '2.5em 1.5em' }}>
      <div className="card" style={{ padding: '2em', borderRadius: 16, boxShadow: '0 2px 16px #4EA8FF22', background: 'rgba(35,39,42,0.97)' }}>
        <h2 style={{ marginBottom: 18 }}>Support & Help</h2>
        <p style={{ color: '#aaa', marginBottom: 24 }}>We're here to help! Submit an issue, question, or suggestion below, or check out our quick tips.</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <input name="name" value={form.name} onChange={handleChange} placeholder="Name (optional)" style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #444', background: '#23272A', color: '#fff' }} />
            <input name="email" value={form.email} onChange={handleChange} placeholder="Email (optional)" style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #444', background: '#23272A', color: '#fff' }} />
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label htmlFor="type" style={{ color: '#fff', fontWeight: 500 }}>Type:</label>
            <select name="type" value={form.type} onChange={handleChange} style={{ padding: 8, borderRadius: 8, border: '1px solid #444', background: '#23272A', color: '#fff' }}>
              <option value="bug">Bug</option>
              <option value="question">Question</option>
              <option value="suggestion">Suggestion</option>
              <option value="other">Other</option>
            </select>
          </div>
          <textarea name="message" value={form.message} onChange={handleChange} placeholder="Describe your issue or suggestion..." rows={4} style={{ padding: 10, borderRadius: 8, border: '1px solid #444', background: '#23272A', color: '#fff', resize: 'vertical' }} required />
          <button type="submit" disabled={submitting} style={{ background: '#4EA8FF', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 8, padding: '0.9em 1.7em', fontSize: 18, cursor: submitting ? 'not-allowed' : 'pointer', marginTop: 8 }}>
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
          {success && <div style={{ color: '#4EA8FF', marginTop: 12 }}>{success}</div>}
          {error && <div style={{ color: 'salmon', marginTop: 12 }}>{error}</div>}
        </form>
      </div>
      <div className="card" style={{ marginTop: 32, padding: '2em', borderRadius: 16, boxShadow: '0 2px 16px #4EA8FF22', background: 'rgba(35,39,42,0.97)' }}>
        <h3 style={{ marginBottom: 16, color: '#4EA8FF', fontWeight: 700 }}>Quick Tips & FAQ</h3>
        <ul style={{ listStyle: 'none', padding: 0, color: '#fff' }}>
          {FAQS.map((faq, i) => (
            <li key={i} style={{ marginBottom: 18 }}>
              <strong style={{ color: '#4EA8FF' }}>{faq.q}</strong>
              <div style={{ marginTop: 4, color: '#ccc' }}>{faq.a}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 