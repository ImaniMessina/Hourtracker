import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function EditEntryModal({ open, onClose, onSave, entry, loading }) {
  const [form, setForm] = useState(entry || {});

  useEffect(() => {
    setForm(entry || {});
  }, [entry, open]);

  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
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
        >
          <h2>Edit Entry</h2>
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="modal-form-row">
              <label>Date
                <input type="date" value={form.date || ''} onChange={e => handleChange('date', e.target.value)} />
              </label>
              <label>Flight
                <input type="number" step="0.1" min="0" value={form.flight || ''} onChange={e => handleChange('flight', e.target.value)} disabled={form.off} />
              </label>
              <label>Pre/Post
                <input type="number" step="0.1" min="0" value={form.prepost || ''} onChange={e => handleChange('prepost', e.target.value)} disabled={form.off} />
              </label>
              <label>Ground
                <input type="number" step="0.1" min="0" value={form.ground || ''} onChange={e => handleChange('ground', e.target.value)} disabled={form.off} />
              </label>
              <label>Cancellations
                <input type="number" step="1" min="0" value={form.cancellations || ''} onChange={e => handleChange('cancellations', e.target.value)} disabled={form.off} />
              </label>
            </div>
            <div className="modal-form-row">
              <label className="modal-off-label">
                <input type="checkbox" checked={!!form.off} onChange={e => handleChange('off', e.target.checked)} /> OFF
              </label>
              <label style={{ flex: 2 }}>Notes
                <input type="text" value={form.notes || ''} onChange={e => handleChange('notes', e.target.value)} />
              </label>
            </div>
            <div className="modal-actions">
              <button type="submit" className="modal-save" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
              <button type="button" className="modal-cancel" onClick={onClose} disabled={loading}>Cancel</button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 