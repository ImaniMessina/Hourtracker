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
      <div style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 16 }}>
          <input type="radio" name="cancellationPayType" value="none" checked={cancellationPayType === 'none'} onChange={() => setCancellationPayType('none')} /> None
        </label>
        <label style={{ marginRight: 16 }}>
          <input type="radio" name="cancellationPayType" value="threshold" checked={cancellationPayType === 'threshold'} onChange={() => setCancellationPayType('threshold')} />
          Pay if total hours under threshold
        </label>
        <label>
          <input type="radio" name="cancellationPayType" value="perHour" checked={cancellationPayType === 'perHour'} onChange={() => setCancellationPayType('perHour')} />
          Pay per cancellation hour
        </label>
      </div>
      {cancellationPayType === 'threshold' && (
        <div style={{ marginBottom: 8 }}>
          <input type="number" min="0" placeholder="Hour threshold (e.g. 60)" value={cancellationThreshold} onChange={e => setCancellationThreshold(e.target.value)} style={{ marginRight: 8 }} />
          <input type="number" min="0" placeholder="Flat amount (e.g. 100)" value={cancellationFlatAmount} onChange={e => setCancellationFlatAmount(e.target.value)} />
          <div style={{ fontSize: 13, color: '#aaa', marginTop: 4 }}>If your total hours for the month are less than this threshold, you'll receive the flat amount.</div>
        </div>
      )}
      {cancellationPayType === 'perHour' && (
        <div style={{ marginBottom: 8 }}>
          <input type="number" min="0" placeholder="Amount per cancellation hour (e.g. 20)" value={cancellationPerHour} onChange={e => setCancellationPerHour(e.target.value)} />
          <div style={{ fontSize: 13, color: '#aaa', marginTop: 4 }}>You'll receive this amount for each cancellation hour logged.</div>
        </div>
      )}
      <button onClick={handleSaveCancellationPay} style={{ marginTop: 16, background: '#4EA8FF', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 12, padding: '0.9em 1.7em', fontSize: 18, cursor: 'pointer', boxShadow: '0 2px 12px rgba(78,168,255,0.12)' }}>Save Cancellation Pay Settings</button>
      {(success || error) && (
        <div style={{ marginTop: 24, color: success ? '#4EA8FF' : 'salmon', fontWeight: 600 }}>
          {success || error}
        </div>
      )}
    </div>
  );
} 