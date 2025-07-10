import React, { useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function CancellationPay() {
  const [user, setUser] = useState(null);
  const [cancellationPayType, setCancellationPayType] = useState('none');
  const [cancellationThreshold, setCancellationThreshold] = useState('');
  const [cancellationFlatAmount, setCancellationFlatAmount] = useState('');
  const [cancellationPerHour, setCancellationPerHour] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        if (userDoc.exists()) {
          setCancellationPayType(userDoc.data().cancellationPayType || 'none');
          setCancellationThreshold(userDoc.data().cancellationThreshold || '');
          setCancellationFlatAmount(userDoc.data().cancellationFlatAmount || '');
          setCancellationPerHour(userDoc.data().cancellationPerHour || '');
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSaveCancellationPay = async () => {
    setSuccess(''); setError('');
    try {
      if (user) {
        await setDoc(doc(db, 'users', user.uid), {
          cancellationPayType,
          cancellationThreshold,
          cancellationFlatAmount,
          cancellationPerHour,
        }, { merge: true });
        setSuccess('Cancellation pay settings saved!');
      }
    } catch (err) {
      setError('Failed to save cancellation pay settings.');
    }
  };

  if (!user) return <div className="card"><h2>Cancellation Pay</h2><p>Loading...</p></div>;

  return (
    <div className="card" style={{ maxWidth: 480, margin: '40px auto', padding: '2.5em 2em' }}>
      <button onClick={() => navigate('/settings')} style={{ marginBottom: 24, background: 'none', color: '#4EA8FF', border: 'none', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>&larr; Back to Settings</button>
      <h2 style={{ marginBottom: 24 }}>Cancellation Pay</h2>
      <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 18, fontWeight: 500, cursor: 'pointer' }}>
          <input type="radio" name="cancellationPayType" value="none" checked={cancellationPayType === 'none'} onChange={() => setCancellationPayType('none')} style={{ marginTop: 2 }} />
          <span>
            None
            <div style={{ fontSize: 13, color: '#aaa', fontWeight: 400 }}>No cancellation pay will be calculated.</div>
          </span>
        </label>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 18, fontWeight: 500, cursor: 'pointer' }}>
          <input type="radio" name="cancellationPayType" value="threshold" checked={cancellationPayType === 'threshold'} onChange={() => setCancellationPayType('threshold')} style={{ marginTop: 2 }} />
          <span>
            Pay if total hours under threshold
            <div style={{ fontSize: 13, color: '#aaa', fontWeight: 400 }}>If your total hours for the month are less than a set threshold, you'll receive a flat amount.</div>
          </span>
        </label>
        {cancellationPayType === 'threshold' && (
          <div style={{ marginLeft: 32, marginBottom: 0, display: 'flex', gap: 10 }}>
            <input type="number" min="0" placeholder="Hour threshold (e.g. 60)" value={cancellationThreshold} onChange={e => setCancellationThreshold(e.target.value)} style={{ width: 120 }} />
            <input type="number" min="0" placeholder="Flat amount (e.g. 100)" value={cancellationFlatAmount} onChange={e => setCancellationFlatAmount(e.target.value)} style={{ width: 120 }} />
          </div>
        )}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 18, fontWeight: 500, cursor: 'pointer' }}>
          <input type="radio" name="cancellationPayType" value="perHour" checked={cancellationPayType === 'perHour'} onChange={() => setCancellationPayType('perHour')} style={{ marginTop: 2 }} />
          <span>
            Pay per cancellation hour
            <div style={{ fontSize: 13, color: '#aaa', fontWeight: 400 }}>You'll receive a set amount for each cancellation hour logged.</div>
          </span>
        </label>
        {cancellationPayType === 'perHour' && (
          <div style={{ marginLeft: 32, marginBottom: 0 }}>
            <input type="number" min="0" placeholder="Amount per cancellation hour (e.g. 20)" value={cancellationPerHour} onChange={e => setCancellationPerHour(e.target.value)} style={{ width: 180 }} />
          </div>
        )}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 18, fontWeight: 500, cursor: 'pointer' }}>
          <input type="radio" name="cancellationPayType" value="tierBased" checked={cancellationPayType === 'tierBased'} onChange={() => setCancellationPayType('tierBased')} style={{ marginTop: 2 }} />
          <span>
            Tier-based (final monthly tier)
            <div style={{ fontSize: 13, color: '#aaa', fontWeight: 400 }}>Cancellation pay is based on your final tier rate at the end of the month. Each cancellation hour is paid at your tier rate.</div>
          </span>
        </label>
      </div>
      <button onClick={handleSaveCancellationPay} style={{ marginTop: 16, background: '#4EA8FF', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 12, padding: '0.9em 1.7em', fontSize: 18, cursor: 'pointer', boxShadow: '0 2px 12px rgba(78,168,255,0.12)' }}>Save Cancellation Pay Settings</button>
      {(success || error) && (
        <div style={{ marginTop: 24, color: success ? '#4EA8FF' : 'salmon', fontWeight: 600 }}>
          {success || error}
        </div>
      )}
    </div>
  );
} 