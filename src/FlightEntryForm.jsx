import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function FlightEntryForm({ values, onChange, onSubmit, loading, onCancel, showCancel }) {
  const navigate = useNavigate();
  const [showAdvanced, setShowAdvanced] = useState(false);
  return (
    <form onSubmit={onSubmit} style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 16,
      alignItems: 'flex-end',
      background: 'rgba(30,34,38,0.98)',
      borderRadius: 16,
      padding: '1.2em 1.2em 1em 1.2em',
      boxShadow: '0 2px 16px #4EA8FF22',
      maxWidth: 900,
      margin: '0 auto',
      flexDirection: 'column', // allow vertical expansion
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, width: '100%' }}>
        <input type="date" value={values.date || ''} onChange={e => onChange('date', e.target.value)} required placeholder="Date" style={{ flex: '1 1 120px', minWidth: 120, padding: '0.7em', borderRadius: 8, border: '1px solid #444', background: '#23272A', color: '#fff', fontSize: 16 }} />
        <input type="number" step="0.1" min="0" value={values.flight || ''} onChange={e => onChange('flight', e.target.value)} disabled={values.off} placeholder="Flight" style={{ flex: '1 1 90px', minWidth: 90, padding: '0.7em', borderRadius: 8, border: '1px solid #444', background: '#23272A', color: '#fff', fontSize: 16 }} />
        <input type="number" step="0.1" min="0" value={values.prepost || ''} onChange={e => onChange('prepost', e.target.value)} disabled={values.off} placeholder="Pre/Post" style={{ flex: '1 1 90px', minWidth: 90, padding: '0.7em', borderRadius: 8, border: '1px solid #444', background: '#23272A', color: '#fff', fontSize: 16 }} />
        <input type="number" step="0.1" min="0" value={values.ground || ''} onChange={e => onChange('ground', e.target.value)} disabled={values.off} placeholder="Ground" style={{ flex: '1 1 90px', minWidth: 90, padding: '0.7em', borderRadius: 8, border: '1px solid #444', background: '#23272A', color: '#fff', fontSize: 16 }} />
        <input type="number" step="0.1" min="0" value={values.cancellations || ''} onChange={e => onChange('cancellations', e.target.value)} disabled={values.off} placeholder="Cancellations" style={{ flex: '1 1 110px', minWidth: 110, padding: '0.7em', borderRadius: 8, border: '1px solid #444', background: '#23272A', color: '#fff', fontSize: 16 }} />
        {/* OFF toggle as a small button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 90px', minWidth: 90 }}>
          <button
            type="button"
            aria-pressed={values.off}
            onClick={() => onChange('off', !values.off)}
            style={{
              width: 32,
              height: 18,
              borderRadius: 12,
              border: '1.5px solid #4EA8FF',
              background: values.off ? 'linear-gradient(90deg, #4EA8FF 0%, #1E90FF 100%)' : '#23272A',
              position: 'relative',
              transition: 'background 0.2s',
              outline: 'none',
              cursor: 'pointer',
              padding: 0,
              marginRight: 4,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                display: 'block',
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 1px 4px #0002',
                position: 'absolute',
                left: values.off ? 15 : 3,
                top: 1.5,
                transition: 'left 0.18s',
              }}
            />
          </button>
          <span style={{ fontWeight: 600, color: '#bcdcff', fontSize: 15, letterSpacing: 1 }}>OFF</span>
        </div>
      </div>
      {/* Show Advanced Button */}
      <button type="button" onClick={() => setShowAdvanced(v => !v)} style={{ alignSelf: 'flex-start', background: 'none', color: '#4EA8FF', fontWeight: 600, border: '1px solid #4EA8FF', borderRadius: 8, padding: '0.7em 1.2em', fontSize: 16, cursor: 'pointer', marginTop: 8, marginBottom: 8 }}>
        {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
      </button>
      {/* Advanced Fields: PIC, Night, XC */}
      {showAdvanced && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
          <input type="number" step="0.1" min="0" value={values.pic || ''} onChange={e => onChange('pic', e.target.value)} placeholder="PIC" style={{ flex: '1 1 90px', minWidth: 90, padding: '0.7em', borderRadius: 8, border: '1px solid #444', background: '#23272A', color: '#fff', fontSize: 16 }} />
          <input type="number" step="0.1" min="0" value={values.night || ''} onChange={e => onChange('night', e.target.value)} placeholder="Night" style={{ flex: '1 1 90px', minWidth: 90, padding: '0.7em', borderRadius: 8, border: '1px solid #444', background: '#23272A', color: '#fff', fontSize: 16 }} />
          <input type="number" step="0.1" min="0" value={values.xc || ''} onChange={e => onChange('xc', e.target.value)} placeholder="XC" style={{ flex: '1 1 90px', minWidth: 90, padding: '0.7em', borderRadius: 8, border: '1px solid #444', background: '#23272A', color: '#fff', fontSize: 16 }} />
        </div>
      )}
      {/* Notes always visible */}
      <input type="text" value={values.notes || ''} onChange={e => onChange('notes', e.target.value)} placeholder="Notes (optional)" style={{ width: '100%', padding: '0.7em', borderRadius: 8, border: '1px solid #444', background: '#23272A', color: '#fff', fontSize: 16, marginBottom: 8 }} />
      {/* Save and Bulk Entry Buttons Row */}
      <div style={{ display: 'flex', gap: 16, width: '100%', marginTop: 8 }}>
        <button type="submit" disabled={loading} style={{ flex: 1, background: 'linear-gradient(90deg, #4EA8FF 0%, #1E90FF 100%)', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 8, padding: '1em 0', fontSize: 18, cursor: loading ? 'not-allowed' : 'pointer' }}>{loading ? 'Saving...' : 'Save'}</button>
        <button type="button" onClick={() => navigate('/bulk-entry')} style={{ flex: 1, background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 8, padding: '1em 0', fontSize: 18, cursor: 'pointer' }}>Bulk Entry</button>
        {showCancel && (
          <button type="button" onClick={onCancel} style={{ flex: 1, background: '#444', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 8, padding: '1em 0', fontSize: 18, cursor: 'pointer' }}>Cancel</button>
        )}
      </div>
    </form>
  );
} 