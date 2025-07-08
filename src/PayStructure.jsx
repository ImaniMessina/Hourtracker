import React, { useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function PayStructure() {
  const [user, setUser] = useState(null);
  const [payBlocks, setPayBlocks] = useState([
    { start: 0, end: 20, rate: 21 },
    { start: 20, end: 30, rate: 23 },
    { start: 30, end: 40, rate: 26 },
    { start: 40, end: 50, rate: 29 },
    { start: 50, end: 60, rate: 31 },
    { start: 60, end: 70, rate: 34 },
    { start: 70, end: 85, rate: 37 },
    { start: 85, end: 100, rate: 41 },
    { start: 100, end: 9999, rate: 41 },
  ]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [schoolPayStructure, setSchoolPayStructure] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        if (userDoc.exists()) {
          setPayBlocks(userDoc.data().payBlocks || payBlocks);
          setSchoolPayStructure(userDoc.data().schoolPayStructure || false);
          setSchoolName(userDoc.data().schoolName || '');
        }
      }
    });
    return () => unsubscribe();
    // eslint-disable-next-line
  }, []);

  const handlePayBlockChange = (idx, field, value) => {
    setPayBlocks(blocks => blocks.map((b, i) => i === idx ? { ...b, [field]: value } : b));
  };
  const addPayBlock = () => setPayBlocks(blocks => [...blocks, { start: 0, end: 0, rate: 0 }]);
  const removePayBlock = (idx) => setPayBlocks(blocks => blocks.length > 1 ? blocks.filter((_, i) => i !== idx) : blocks);
  const handleSavePayBlocks = async () => {
    setSuccess(''); setError(''); setLoading(true);
    try {
      if (user) {
        await setDoc(doc(db, 'users', user.uid), { payBlocks, schoolPayStructure, schoolName }, { merge: true });
        setSuccess('Pay structure saved!');
      }
    } catch (err) {
      setError('Failed to save pay structure.');
    }
    setLoading(false);
  };

  if (!user) return <div className="card"><h2>Pay Structure</h2><p>Loading...</p></div>;

  return (
    <div className="card">
      <h2>Pay Structure</h2>
      <div style={{ marginBottom: 18 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
          <input type="checkbox" checked={schoolPayStructure} onChange={e => setSchoolPayStructure(e.target.checked)} />
          School/company-provided pay structure
        </label>
        {schoolPayStructure && (
          <input type="text" placeholder="School/Company Name (optional)" value={schoolName} onChange={e => setSchoolName(e.target.value)} style={{ marginTop: 8, width: 260 }} />
        )}
      </div>
      <table style={{ width: '100%', marginBottom: 12 }}>
        <thead>
          <tr>
            <th>Start Hour</th>
            <th>End Hour</th>
            <th>Rate ($/hr)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {payBlocks.map((b, i) => (
            <tr key={i}>
              <td><input type="number" value={b.start} onChange={e => handlePayBlockChange(i, 'start', Number(e.target.value))} style={{ width: 60 }} /></td>
              <td><input type="number" value={b.end} onChange={e => handlePayBlockChange(i, 'end', Number(e.target.value))} style={{ width: 60 }} /></td>
              <td><input type="number" value={b.rate} onChange={e => handlePayBlockChange(i, 'rate', Number(e.target.value))} style={{ width: 60 }} /></td>
              <td><button type="button" onClick={() => removePayBlock(i)} style={{ background: 'none', color: '#888', border: 'none', fontSize: 18, cursor: 'pointer' }} disabled={payBlocks.length === 1}>×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={addPayBlock} style={{ background: '#23272A', color: '#4EA8FF', fontWeight: 600, border: 'none', borderRadius: 8, padding: '0.5em 1em', marginBottom: 12, cursor: 'pointer' }}>Add Block</button>
      <br />
      <button onClick={handleSavePayBlocks} disabled={loading}>{loading ? 'Saving...' : 'Save Pay Structure'}</button>
      {success && <div style={{ color: '#4EA8FF', marginTop: 12 }}>{success}</div>}
      {error && <div style={{ color: 'salmon', marginTop: 12 }}>{error}</div>}
      <button onClick={() => navigate('/settings')} style={{ marginTop: 24, background: '#23272A', color: '#4EA8FF', fontWeight: 600, border: 'none', borderRadius: 8, padding: '0.7em 1.2em', cursor: 'pointer' }}>Back to Settings</button>
    </div>
  );
} 