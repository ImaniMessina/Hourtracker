import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { collection, addDoc, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiPlus, FiCalendar, FiHome, FiSave } from 'react-icons/fi';

const BulkEntry = () => {
  const [bulkEntries, setBulkEntries] = useState([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
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

  // Generate entries for date range
  const generateEntries = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const entries = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      entries.push({
        date: dateStr,
        flight: '',
        prepost: '',
        ground: '',
        cancellations: '',
        off: false,
        notes: ''
      });
    }
    setBulkEntries(entries);
  };

  // Calculate total hours from bulkEntries
  const totalHours = bulkEntries.reduce((acc, entry) => {
    if (!entry.off) {
      acc += (parseFloat(entry.flight) || 0) + (parseFloat(entry.prepost) || 0) + (parseFloat(entry.ground) || 0);
    }
    return acc;
  }, 0);

  // Calculate estimated pay (same logic as Dashboard)
  function calculateEstimatedPay(totalHours, blocks) {
    if (!Array.isArray(blocks) || blocks.length === 0 || typeof totalHours !== 'number') return 0;
    let pay = 0;
    let hoursLeft = totalHours;
    for (const block of blocks) {
      if (hoursLeft <= 0) break;
      const blockStart = block.start;
      const blockEnd = block.end;
      const blockHours = Math.max(0, Math.min(hoursLeft, blockEnd - blockStart));
      if (blockHours > 0) {
        pay += blockHours * block.rate;
        hoursLeft -= blockHours;
      }
    }
    return pay;
  }
  const estimatedPay = calculateEstimatedPay(totalHours, payBlocks);

  const handleEntryChange = (index, field, value) => {
    const newEntries = [...bulkEntries];
    newEntries[index][field] = value;
    setBulkEntries(newEntries);
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) {
      setMessage('Please log in to add entries.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const userId = auth.currentUser.uid;
      const entriesToAdd = bulkEntries.filter(entry => 
        entry.flight || entry.prepost || entry.ground || entry.cancellations || entry.off || entry.notes
      );

      if (entriesToAdd.length === 0) {
        setMessage('Please add at least one entry with some data.');
        setIsSubmitting(false);
        return;
      }

      // Check for existing entries and warn user
      const existingDates = entriesToAdd.map(e => e.date);
      const existingQuery = query(
        collection(db, 'hours'),
        where('uid', '==', userId),
        where('date', 'in', existingDates)
      );
      const existingDocs = await getDocs(existingQuery);
      
      if (!existingDocs.empty) {
        const existingDatesList = existingDocs.docs.map(doc => doc.data().date);
        const proceed = window.confirm(
          `Entries already exist for: ${existingDatesList.join(', ')}\n\nDo you want to add more entries for these dates?`
        );
        if (!proceed) {
          setIsSubmitting(false);
          return;
        }
      }

      // Add all entries
      const promises = entriesToAdd.map(entry => 
        addDoc(collection(db, 'hours'), {
          uid: userId,
          date: entry.date,
          flight: parseFloat(entry.flight) || 0,
          prepost: parseFloat(entry.prepost) || 0,
          ground: parseFloat(entry.ground) || 0,
          cancellations: parseInt(entry.cancellations) || 0,
          off: entry.off,
          notes: entry.notes || '',
          created: new Date()
        })
      );

      await Promise.all(promises);
      
      setMessage(`Successfully added ${entriesToAdd.length} entries!`);
      setShowSuccess(true);
      
    } catch (error) {
      console.error('Error adding bulk entries:', error);
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
      >
        <h2>Bulk Entry</h2>
        <p style={{ color: '#666', marginBottom: 20 }}>
          Add entries for multiple dates. Select a date range and fill in the hours for each day.
        </p>
        
        {payBlocks.length > 0 && (
          <div style={{
            background: 'rgba(78,168,255,0.12)',
            color: '#4EA8FF',
            borderRadius: 16,
            padding: '18px 0',
            margin: '0 0 18px 0',
            fontWeight: 700,
            fontSize: '1.25rem',
            textAlign: 'center',
            boxShadow: '0 2px 12px #4EA8FF22',
            border: '1.5px solid #4EA8FF44',
            letterSpacing: 1
          }}>
            Estimated Pay: ${estimatedPay.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        )}
        
        <form onSubmit={handleBulkSubmit}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiCalendar />
                <span>From:</span>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)} 
                  required 
                  style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>To:</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)} 
                  required 
                  style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
                />
              </div>
              <motion.button 
                type="button" 
                onClick={generateEntries}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{ 
                  background: '#4EA8FF', 
                  color: 'white', 
                  border: 'none', 
                  padding: '8px 16px', 
                  borderRadius: 6, 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <FiPlus /> Generate Entries
              </motion.button>
            </div>
          </div>

          {bulkEntries.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ marginBottom: 16 }}>Entries ({bulkEntries.length} days)</h3>
              <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f8f9fa' }}>
                    <tr>
                      <th style={{ padding: 12, borderBottom: '1px solid #ddd', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: 12, borderBottom: '1px solid #ddd', textAlign: 'left' }}>Flight</th>
                      <th style={{ padding: 12, borderBottom: '1px solid #ddd', textAlign: 'left' }}>Pre/Post</th>
                      <th style={{ padding: 12, borderBottom: '1px solid #ddd', textAlign: 'left' }}>Ground</th>
                      <th style={{ padding: 12, borderBottom: '1px solid #ddd', textAlign: 'left' }}>Cancellations</th>
                      <th style={{ padding: 12, borderBottom: '1px solid #ddd', textAlign: 'left' }}>OFF</th>
                      <th style={{ padding: 12, borderBottom: '1px solid #ddd', textAlign: 'left' }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkEntries.map((entry, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: 12, fontWeight: 600 }}>{entry.date}</td>
                        <td style={{ padding: 8 }}>
                          <input 
                            type="number" 
                            step="0.1" 
                            value={entry.flight} 
                            onChange={e => handleEntryChange(idx, 'flight', e.target.value)} 
                            placeholder="0.0" 
                            min="0" 
                            disabled={entry.off}
                            style={{ width: '80px', padding: 6, borderRadius: 4, border: '1px solid #ddd' }}
                          />
                        </td>
                        <td style={{ padding: 8 }}>
                          <input 
                            type="number" 
                            step="0.1" 
                            value={entry.prepost} 
                            onChange={e => handleEntryChange(idx, 'prepost', e.target.value)} 
                            placeholder="0.0" 
                            min="0" 
                            disabled={entry.off}
                            style={{ width: '80px', padding: 6, borderRadius: 4, border: '1px solid #ddd' }}
                          />
                        </td>
                        <td style={{ padding: 8 }}>
                          <input 
                            type="number" 
                            step="0.1" 
                            value={entry.ground} 
                            onChange={e => handleEntryChange(idx, 'ground', e.target.value)} 
                            placeholder="0.0" 
                            min="0" 
                            disabled={entry.off}
                            style={{ width: '80px', padding: 6, borderRadius: 4, border: '1px solid #ddd' }}
                          />
                        </td>
                        <td style={{ padding: 8 }}>
                          <input 
                            type="number" 
                            step="1" 
                            min="0" 
                            value={entry.cancellations} 
                            onChange={e => handleEntryChange(idx, 'cancellations', e.target.value)} 
                            placeholder="0" 
                            disabled={entry.off}
                            style={{ width: '80px', padding: 6, borderRadius: 4, border: '1px solid #ddd' }}
                          />
                        </td>
                        <td style={{ padding: 8, textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={entry.off} 
                            onChange={e => handleEntryChange(idx, 'off', e.target.checked)} 
                            style={{ transform: 'scale(1.2)' }}
                          />
                        </td>
                        <td style={{ padding: 8 }}>
                          <input 
                            type="text" 
                            value={entry.notes} 
                            onChange={e => handleEntryChange(idx, 'notes', e.target.value)} 
                            placeholder="Notes" 
                            style={{ width: '120px', padding: 6, borderRadius: 4, border: '1px solid #ddd' }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {message && (
            <div style={{ 
              padding: 12, 
              marginBottom: 16, 
              borderRadius: 6, 
              backgroundColor: message.includes('Error') ? '#f8d7da' : '#d4edda',
              color: message.includes('Error') ? '#721c24' : '#155724',
              border: `1px solid ${message.includes('Error') ? '#f5c6cb' : '#c3e6cb'}`
            }}>
              {message}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <motion.button 
              type="submit" 
              disabled={isSubmitting || bulkEntries.length === 0}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ 
                background: '#28a745', 
                color: 'white', 
                border: 'none', 
                padding: '12px 24px', 
                borderRadius: 6, 
                cursor: isSubmitting || bulkEntries.length === 0 ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || bulkEntries.length === 0 ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <FiSave />
              {isSubmitting ? 'Saving...' : 'Save All Entries'}
            </motion.button>
            
            {showSuccess && (
              <motion.button 
                type="button" 
                onClick={handleGoHome}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{ 
                  background: '#4EA8FF', 
                  color: 'white', 
                  border: 'none', 
                  padding: '12px 24px', 
                  borderRadius: 6, 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <FiHome />
                Go Home
              </motion.button>
            )}
            
            <motion.button 
              type="button" 
              onClick={() => navigate('/dashboard')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ 
                background: '#6c757d', 
                color: 'white', 
                border: 'none', 
                padding: '12px 24px', 
                borderRadius: 6, 
                cursor: 'pointer' 
              }}
            >
              Cancel
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default BulkEntry; 