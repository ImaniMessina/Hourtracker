import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function FlightEntryForm({ values, onChange, onSubmit, loading, onCancel, showCancel }) {
  const navigate = useNavigate();
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  return (
    <form onSubmit={onSubmit} className="dashboard-form">
      <div className="dashboard-form-grid">
        <input 
          type="date" 
          value={values.date || ''} 
          onChange={e => onChange('date', e.target.value)} 
          required 
          placeholder="Date" 
          className="dashboard-form-field"
        />
        <input 
          type="number" 
          step="0.1" 
          min="0" 
          value={values.flight || ''} 
          onChange={e => onChange('flight', e.target.value)} 
          disabled={values.off} 
          placeholder="Flight" 
          className="dashboard-form-field"
        />
        <input 
          type="number" 
          step="0.1" 
          min="0" 
          value={values.prepost || ''} 
          onChange={e => onChange('prepost', e.target.value)} 
          disabled={values.off} 
          placeholder="Pre/Post" 
          className="dashboard-form-field"
        />
        <input 
          type="number" 
          step="0.1" 
          min="0" 
          value={values.ground || ''} 
          onChange={e => onChange('ground', e.target.value)} 
          disabled={values.off} 
          placeholder="Ground" 
          className="dashboard-form-field"
        />
        <input 
          type="number" 
          step="0.1" 
          min="0" 
          value={values.cancellations || ''} 
          onChange={e => onChange('cancellations', e.target.value)} 
          disabled={values.off} 
          placeholder="Cancellations" 
          className="dashboard-form-field"
        />
        
        {/* OFF checkbox */}
        <div className="dashboard-off-checkbox">
          <label className="off-checkbox-label">
            <input
              type="checkbox"
              checked={values.off}
              onChange={(e) => onChange('off', e.target.checked)}
              className="off-checkbox"
            />
            <span className="off-checkbox-text">OFF Day</span>
          </label>
        </div>
      </div>
      
      {/* Show Advanced Button */}
      <button 
        type="button" 
        onClick={() => setShowAdvanced(v => !v)} 
        className="show-advanced-btn"
      >
        {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
      </button>
      
      {/* Advanced Fields: PIC, Night, XC */}
      {showAdvanced && (
        <div className="advanced-fields">
          <input 
            type="number" 
            step="0.1" 
            min="0" 
            value={values.pic || ''} 
            onChange={e => onChange('pic', e.target.value)} 
            placeholder="PIC" 
            className="dashboard-form-field"
          />
          <input 
            type="number" 
            step="0.1" 
            min="0" 
            value={values.night || ''} 
            onChange={e => onChange('night', e.target.value)} 
            placeholder="Night" 
            className="dashboard-form-field"
          />
          <input 
            type="number" 
            step="0.1" 
            min="0" 
            value={values.xc || ''} 
            onChange={e => onChange('xc', e.target.value)} 
            placeholder="XC" 
            className="dashboard-form-field"
          />
        </div>
      )}
      
      {/* Notes */}
      <input 
        type="text" 
        value={values.notes || ''} 
        onChange={e => onChange('notes', e.target.value)} 
        placeholder="Notes (optional)" 
        className="dashboard-form-notes"
      />
      
      {/* Action Buttons */}
      <div className="form-actions">
        <button 
          type="submit" 
          disabled={loading} 
          className="dashboard-save-btn"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
        <button 
          type="button" 
          onClick={() => navigate('/bulk-entry')} 
          className="dashboard-bulk-btn"
        >
          Bulk<br />Entry
        </button>
        {showCancel && (
          <button 
            type="button" 
            onClick={onCancel} 
            className="dashboard-cancel-btn"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
} 