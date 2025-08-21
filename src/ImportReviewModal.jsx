import React, { useState } from 'react';
import { FiCheck, FiX } from 'react-icons/fi';

export default function ImportReviewModal({ open, onClose, onConfirm, entries: initialEntries, loading }) {
  const [entries, setEntries] = useState(initialEntries || []);

  React.useEffect(() => {
    setEntries(initialEntries || []);
  }, [initialEntries, open]);

  const handleChange = (idx, field, value) => {
    setEntries(e => e.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  };

  const handleConfirm = () => {
    onConfirm(entries);
  };

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      <div
        className="modal-card"
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
          padding: '20px',
          maxWidth: 900,
          width: '98vw',
          animation: 'modal-in 0.2s ease-out',
        }}
      >
        <h2 style={{ marginBottom: '15px', textAlign: 'center' }}>Review Imported Entries</h2>
        <div style={{ maxHeight: 400, overflowY: 'auto', margin: '1.5em 0' }}>
          <table className="import-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Flight</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Pre/Post</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Ground</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Cancellations</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>OFF</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px' }}>
                    <input type="date" value={e.date || ''} onChange={ev => handleChange(idx, 'date', ev.target.value)} style={{ width: '100%' }} />
                  </td>
                  <td style={{ padding: '10px' }}>
                    <input type="number" step="0.1" min="0" value={e.flight || ''} onChange={ev => handleChange(idx, 'flight', ev.target.value)} disabled={e.off} style={{ width: '100%' }} />
                  </td>
                  <td style={{ padding: '10px' }}>
                    <input type="number" step="0.1" min="0" value={e.prepost || ''} onChange={ev => handleChange(idx, 'prepost', ev.target.value)} disabled={e.off} style={{ width: '100%' }} />
                  </td>
                  <td style={{ padding: '10px' }}>
                    <input type="number" step="0.1" min="0" value={e.ground || ''} onChange={ev => handleChange(idx, 'ground', ev.target.value)} disabled={e.off} style={{ width: '100%' }} />
                  </td>
                  <td style={{ padding: '10px' }}>
                    <input type="number" step="0.1" min="0" value={e.cancellations || ''} onChange={ev => handleChange(idx, 'cancellations', ev.target.value)} disabled={e.off} style={{ width: '100%' }} />
                  </td>
                  <td style={{ padding: '10px' }}>
                    <input type="checkbox" checked={!!e.off} onChange={ev => handleChange(idx, 'off', ev.target.checked)} disabled={e.off} style={{ width: '100%' }} />
                  </td>
                  <td style={{ padding: '10px' }}>
                    <input type="text" value={e.notes || ''} onChange={ev => handleChange(idx, 'notes', ev.target.value)} style={{ width: '100%' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '20px' }}>
          <button
            type="button"
            className="modal-save"
            onClick={handleConfirm}
            disabled={loading}
            style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '5px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FiCheck style={{ marginRight: 8 }} />
            {loading ? 'Importing...' : 'Confirm Import'}
          </button>
          <button
            type="button"
            className="modal-cancel"
            onClick={onClose}
            disabled={loading}
            style={{
              backgroundColor: '#f44336',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '5px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FiX style={{ marginRight: 8 }} />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
} 