import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    <AnimatePresence>
      <motion.div
        className="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className="modal-card"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{ maxWidth: 900, width: '98vw' }}
        >
          <h2>Review Imported Entries</h2>
          <div style={{ maxHeight: 400, overflowY: 'auto', margin: '1.5em 0' }}>
            <table className="import-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Flight</th>
                  <th>Pre/Post</th>
                  <th>Ground</th>
                  <th>Cancellations</th>
                  <th>OFF</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, idx) => (
                  <tr key={idx}>
                    <td><input type="date" value={e.date || ''} onChange={ev => handleChange(idx, 'date', ev.target.value)} /></td>
                    <td><input type="number" step="0.1" min="0" value={e.flight || ''} onChange={ev => handleChange(idx, 'flight', ev.target.value)} disabled={e.off} /></td>
                    <td><input type="number" step="0.1" min="0" value={e.prepost || ''} onChange={ev => handleChange(idx, 'prepost', ev.target.value)} disabled={e.off} /></td>
                    <td><input type="number" step="0.1" min="0" value={e.ground || ''} onChange={ev => handleChange(idx, 'ground', ev.target.value)} disabled={e.off} /></td>
                    <td><input type="number" step="0.1" min="0" value={e.cancellations || ''} onChange={ev => handleChange(idx, 'cancellations', ev.target.value)} disabled={e.off} /></td>
                    <td><input type="checkbox" checked={!!e.off} onChange={ev => handleChange(idx, 'off', ev.target.checked)} /></td>
                    <td><input type="text" value={e.notes || ''} onChange={ev => handleChange(idx, 'notes', ev.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="modal-actions">
            <button type="button" className="modal-save" onClick={handleConfirm} disabled={loading}><FiCheck style={{marginRight:8}} />{loading ? 'Importing...' : 'Confirm Import'}</button>
            <button type="button" className="modal-cancel" onClick={onClose} disabled={loading}><FiX style={{marginRight:8}} />Cancel</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 