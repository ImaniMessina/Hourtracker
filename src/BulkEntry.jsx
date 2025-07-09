import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiCalendar, FiHome, FiSave, FiPlus, FiTrash2 } from 'react-icons/fi';

const emptyEntry = (date) => ({
  date: date || new Date().toISOString().split('T')[0],
  flight: '',
  prepost: '',
  ground: '',
  cancellations: '',
  off: false,
  notes: ''
});

const BulkEntry = () => {
  const [entries, setEntries] = useState([]);
  const [current, setCurrent] = useState(emptyEntry());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [payBlocks, setPayBlocks] = useState([]);
  const [user, setUser] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        if (userDoc.exists()) {
          setPayBlocks(userDoc.data().payBlocks || []);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAddEntry = () => {
    if (!current.date) return;
    setEntries(prev => [...prev, { ...current }]);
    setCurrent(emptyEntry(current.date));
  };

  const handleRemoveEntry = (idx) => {
    setEntries(prev => prev.filter((_, i) => i !== idx));
  };

  const handleChange = (field, value) => {
    setCurrent(cur => ({ ...cur, [field]: value }));
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    try {
      if (user && entries.length > 0) {
        await Promise.all(entries.map(entry =>
          addDoc(collection(db, 'hours'), {
            uid: user.uid,
            ...entry,
            flight: entry.off ? 0 : parseFloat(entry.flight) || 0,
            prepost: entry.off ? 0 : parseFloat(entry.prepost) || 0,
            ground: entry.off ? 0 : parseFloat(entry.ground) || 0,
            cancellations: entry.off ? 0 : parseInt(entry.cancellations) || 0,
            created: new Date()
          })
        ));
        setShowSuccess(true);
        setEntries([]);
        setMessage('Entries saved!');
      }
    } catch (error) {
      setMessage('Error adding entries. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  return (
    <div className="container">
      <motion.div 
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ maxWidth: 1100, margin: '2em auto', padding: '2.5em 2.5em' }}
      >
        <h2>Bulk Entry</h2>
        <p style={{ color: '#888', marginBottom: 20 }}>
          Add entries for any day. Fill in the details, click Add Entry, and repeat for as many days as you want. Save all at once when done.
        </p>
        <form onSubmit={handleBulkSubmit}>
          <div className="bulk-form-grid">
            <div className="bulk-form-row">
              <input type="date" value={current.date} onChange={e => handleChange('date', e.target.value)} required className="bulk-input" />
              <input type="number" step="0.1" min="0" placeholder="Flight" value={current.flight} onChange={e => handleChange('flight', e.target.value)} className="bulk-input" disabled={current.off} />
              <input type="number" step="0.1" min="0" placeholder="Pre/Post" value={current.prepost} onChange={e => handleChange('prepost', e.target.value)} className="bulk-input" disabled={current.off} />
              <input type="number" step="0.1" min="0" placeholder="Ground" value={current.ground} onChange={e => handleChange('ground', e.target.value)} className="bulk-input" disabled={current.off} />
              <input type="number" step="1" min="0" placeholder="Cancellations" value={current.cancellations} onChange={e => handleChange('cancellations', e.target.value)} className="bulk-input" disabled={current.off} />
            </div>
            <div className="bulk-form-row">
              <label className="bulk-off-label">
                <input type="checkbox" checked={current.off} onChange={e => handleChange('off', e.target.checked)} /> OFF
              </label>
              <input type="text" placeholder="Notes" value={current.notes} onChange={e => handleChange('notes', e.target.value)} className="bulk-input bulk-notes-input" />
              <motion.button 
                type="button" 
                onClick={handleAddEntry}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bulk-add-btn"
              >
                <FiPlus /> Add Entry
              </motion.button>
            </div>
          </div>

          {entries.length > 0 && (
            <div className="bulk-table-container">
              <h3 style={{ marginBottom: 18, color: '#4EA8FF', letterSpacing: 2, paddingLeft: 24, paddingTop: 18, fontSize: '2rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 3 }}>Entries ({entries.length})</h3>
              <table className="bulk-table">
                <thead>
                  <tr style={{ background: 'rgba(35,39,42,0.85)' }}>
                    <th>Date</th>
                    <th>Flight</th>
                    <th>Pre/Post</th>
                    <th>Ground</th>
                    <th>Cancellations</th>
                    <th>OFF</th>
                    <th>Notes</th>
                    <th style={{ width: 56, textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #23272A' }}>
                      <td>{entry.date}</td>
                      <td>{entry.flight}</td>
                      <td>{entry.prepost}</td>
                      <td>{entry.ground}</td>
                      <td>{entry.cancellations}</td>
                      <td>{entry.off ? '✔️' : ''}</td>
                      <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.notes}</td>
                      <td style={{ textAlign: 'center', padding: 0 }}>
                        <button type="button" onClick={() => handleRemoveEntry(idx)} style={{ background: 'none', border: 'none', color: '#4EA8FF', cursor: 'pointer', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, margin: '0 auto' }} title="Remove"><FiTrash2 /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {message && (
            <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: message.includes('Error') ? '#f8d7da' : '#d4edda', color: message.includes('Error') ? '#721c24' : '#155724', border: `1px solid ${message.includes('Error') ? '#f5c6cb' : '#c3e6cb'}` }}>{message}</div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <motion.button 
              type="submit" 
              disabled={isSubmitting || entries.length === 0}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ background: '#28a745', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 6, cursor: isSubmitting || entries.length === 0 ? 'not-allowed' : 'pointer', opacity: isSubmitting || entries.length === 0 ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <FiSave />
              {isSubmitting ? 'Saving...' : 'Save All Entries'}
            </motion.button>
            <motion.button 
              type="button" 
              onClick={handleGoHome}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ background: '#6c757d', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <FiHome />
              Cancel
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default BulkEntry; 