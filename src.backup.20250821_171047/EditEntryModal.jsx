import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FlightEntryForm from './FlightEntryForm';

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
          style={{
            width: '100%',
            maxWidth: 900,
            margin: '0 auto',
            background: 'rgba(30,34,38,0.98)',
            borderRadius: 16,
            boxShadow: '0 2px 16px #4EA8FF22',
            padding: '2.2em 2em 1.5em 2em',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <h2>Edit Entry</h2>
          <FlightEntryForm
            values={form}
            onChange={handleChange}
            onSubmit={handleSubmit}
            loading={loading}
            onCancel={onClose}
            showCancel={true}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 