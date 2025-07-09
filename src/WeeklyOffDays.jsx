import React, { useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function WeeklyOffDays() {
  const [user, setUser] = useState(null);
  const [weeklyOffDays, setWeeklyOffDays] = useState([]);
  const [offDaysEffectiveDate, setOffDaysEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        if (userDoc.exists()) {
          setWeeklyOffDays(userDoc.data().weeklyOffDays || []);
          setOffDaysEffectiveDate(userDoc.data().offDaysEffectiveDate || new Date().toISOString().slice(0, 10));
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSaveWeeklyOffDays = async () => {
    setSuccess(''); setError('');
    try {
      if (user) {
        await setDoc(doc(db, 'users', user.uid), {
          weeklyOffDays,
          offDaysEffectiveDate,
        }, { merge: true });
        setSuccess('Weekly off days saved! These will apply to new months from the effective date.');
      }
    } catch (err) {
      setError('Failed to save weekly off days.');
    }
  };

  const toggleOffDay = (day) => {
    setWeeklyOffDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  if (!user) return <div className="card"><h2>Weekly Off Days</h2><p>Loading...</p></div>;

  return (
    <div className="card">
      <h2>Weekly Off Days</h2>
      <p style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
        Select days of the week that should automatically be marked as "OFF" in new months. This will only apply to months from the effective date forward.
      </p>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Effective Date (from when this applies):
        </label>
        <input 
          type="date" 
          value={offDaysEffectiveDate} 
          onChange={e => setOffDaysEffectiveDate(e.target.value)} 
          style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8 }}>Select Off Days:</label>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
            <label key={day} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              padding: '8px 12px', 
              borderRadius: 6, 
              border: `2px solid ${weeklyOffDays.includes(day) ? '#4EA8FF' : '#ddd'}`,
              background: weeklyOffDays.includes(day) ? 'rgba(78,168,255,0.1)' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
              <input 
                type="checkbox" 
                checked={weeklyOffDays.includes(day)} 
                onChange={() => toggleOffDay(day)} 
                style={{ transform: 'scale(1.2)' }}
              />
              {day}
            </label>
          ))}
        </div>
      </div>
      <button onClick={handleSaveWeeklyOffDays} style={{ marginRight: 16 }}>
        Save Weekly Off Days
      </button>
      <button onClick={() => navigate('/settings')} style={{ background: '#23272A', color: '#4EA8FF', fontWeight: 600, border: 'none', borderRadius: 8, padding: '0.7em 1.2em', cursor: 'pointer' }}>
        Back to Settings
      </button>
      {(success || error) && (
        <div style={{ marginTop: 24, color: success ? '#4EA8FF' : 'salmon', fontWeight: 600 }}>
          {success || error}
        </div>
      )}
    </div>
  );
} 