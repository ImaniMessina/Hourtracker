import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const BulkEntry = () => {
  const [bulkRows, setBulkRows] = useState([{ flight: '', prepost: '', ground: '', cancellations: '', off: false, notes: '' }]);
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const addBulkRow = () => {
    setBulkRows([...bulkRows, { flight: '', prepost: '', ground: '', cancellations: '', off: false, notes: '' }]);
  };

  const removeBulkRow = (index) => {
    if (bulkRows.length > 1) {
      setBulkRows(bulkRows.filter((_, i) => i !== index));
    }
  };

  const handleBulkChange = (index, field, value) => {
    const newRows = [...bulkRows];
    newRows[index][field] = value;
    setBulkRows(newRows);
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
      const entriesToAdd = bulkRows.filter(row => 
        row.flight || row.prepost || row.ground || row.cancellations || row.off || row.notes
      );

      if (entriesToAdd.length === 0) {
        setMessage('Please add at least one entry with some data.');
        setIsSubmitting(false);
        return;
      }

      // Check if entries already exist for this date
      const existingQuery = query(
        collection(db, 'hours'),
        where('uid', '==', userId),
        where('date', '==', bulkDate)
      );
      const existingDocs = await getDocs(existingQuery);
      let proceed = true;
      if (!existingDocs.empty) {
        proceed = window.confirm('Entries already exist for this date. Do you want to add more?');
      }
      if (!proceed) {
        setIsSubmitting(false);
        return;
      }

      // Add all entries
      const promises = entriesToAdd.map(row => 
        addDoc(collection(db, 'hours'), {
          uid: userId,
          date: bulkDate,
          flight: parseFloat(row.flight) || 0,
          prepost: parseFloat(row.prepost) || 0,
          ground: parseFloat(row.ground) || 0,
          cancellations: parseInt(row.cancellations) || 0,
          off: row.off,
          notes: row.notes || '',
          created: new Date()
        })
      );

      await Promise.all(promises);
      
      setMessage(`Successfully added ${entriesToAdd.length} entries for ${bulkDate}!`);
      setBulkRows([{ flight: '', prepost: '', ground: '', cancellations: '', off: false, notes: '' }]);
      setBulkDate(new Date().toISOString().split('T')[0]);
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      
    } catch (error) {
      console.error('Error adding bulk entries:', error);
      setMessage('Error adding entries. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Bulk Entry</h2>
        <p style={{ color: '#666', marginBottom: 20 }}>
          Add multiple entries for the same date. Leave fields empty if not applicable.
        </p>
        
        <form onSubmit={handleBulkSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
              Date for all entries:
            </label>
            <input 
              type="date" 
              value={bulkDate} 
              onChange={e => setBulkDate(e.target.value)} 
              required 
              style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd' }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Entries</h3>
              <button 
                type="button" 
                onClick={addBulkRow}
                style={{ 
                  background: '#007bff', 
                  color: 'white', 
                  border: 'none', 
                  padding: '8px 16px', 
                  borderRadius: 6, 
                  cursor: 'pointer' 
                }}
              >
                + Add Row
              </button>
            </div>

            {bulkRows.map((row, idx) => (
              <div key={idx} className="bulk-row">
                <input 
                  type="number" 
                  step="0.1" 
                  value={row.flight} 
                  onChange={e => handleBulkChange(idx, 'flight', e.target.value)} 
                  placeholder="Flight" 
                  min="0" 
                />
                <input 
                  type="number" 
                  step="0.1" 
                  value={row.prepost} 
                  onChange={e => handleBulkChange(idx, 'prepost', e.target.value)} 
                  placeholder="Pre/Post" 
                  min="0" 
                />
                <input 
                  type="number" 
                  step="0.1" 
                  value={row.ground} 
                  onChange={e => handleBulkChange(idx, 'ground', e.target.value)} 
                  placeholder="Ground" 
                  min="0" 
                />
                <input 
                  type="number" 
                  step="1" 
                  min="0" 
                  value={row.cancellations} 
                  onChange={e => handleBulkChange(idx, 'cancellations', e.target.value)} 
                  placeholder="Cancellation Hours" 
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 12 }}>
                  <input 
                    type="checkbox" 
                    checked={row.off} 
                    onChange={e => handleBulkChange(idx, 'off', e.target.checked)} 
                  /> 
                  OFF
                </label>
                <input 
                  type="text" 
                  value={row.notes} 
                  onChange={e => handleBulkChange(idx, 'notes', e.target.value)} 
                  placeholder="Notes" 
                />
                <button 
                  type="button" 
                  onClick={() => removeBulkRow(idx)} 
                  style={{ 
                    background: 'none', 
                    color: '#888', 
                    border: 'none', 
                    fontSize: 18, 
                    cursor: 'pointer',
                    padding: '4px 8px'
                  }} 
                  disabled={bulkRows.length === 1}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

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

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button 
              type="submit" 
              disabled={isSubmitting}
              style={{ 
                background: '#28a745', 
                color: 'white', 
                border: 'none', 
                padding: '12px 24px', 
                borderRadius: 6, 
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              {isSubmitting ? 'Saving...' : 'Save All Entries'}
            </button>
            <button 
              type="button" 
              onClick={() => navigate('/dashboard')}
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
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkEntry; 