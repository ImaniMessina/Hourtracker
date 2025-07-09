import React, { useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { updateProfile, updatePassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Link } from 'react-router-dom';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [goal, setGoal] = useState('');
  const [goalLoading, setGoalLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [uploading, setUploading] = useState(false);
  const [monthlyGoals, setMonthlyGoals] = useState(Array(12).fill(''));
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
  const [cancellationPayType, setCancellationPayType] = useState('none'); // 'none', 'threshold', 'perHour'
  const [cancellationThreshold, setCancellationThreshold] = useState('');
  const [cancellationFlatAmount, setCancellationFlatAmount] = useState('');
  const [cancellationPerHour, setCancellationPerHour] = useState('');
  const [weeklyOffDays, setWeeklyOffDays] = useState([]);
  const [offDaysEffectiveDate, setOffDaysEffectiveDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        setDisplayName(u.displayName || '');
        setEmail(u.email || '');
        setPhotoURL(u.photoURL || '');
        // Load monthly goals from Firestore
        setGoalLoading(true);
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        if (userDoc.exists()) {
          setGoal(userDoc.data().monthlyGoal || '');
          setMonthlyGoals(userDoc.data().monthlyGoals || Array(12).fill(''));
          // Load payBlocks if present
          setPayBlocks(userDoc.data().payBlocks || payBlocks);
          setCancellationPayType(userDoc.data().cancellationPayType || 'none');
          setCancellationThreshold(userDoc.data().cancellationThreshold || '');
          setCancellationFlatAmount(userDoc.data().cancellationFlatAmount || '');
          setCancellationPerHour(userDoc.data().cancellationPerHour || '');
          setWeeklyOffDays(userDoc.data().weeklyOffDays || []);
          setOffDaysEffectiveDate(userDoc.data().offDaysEffectiveDate || new Date().toISOString().slice(0, 10));
        }
        setGoalLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSaveInfo = async () => {
    setSuccess(''); setError('');
    try {
      if (user && displayName !== user.displayName) {
        await updateProfile(user, { displayName });
      }
      setSuccess('Info updated!');
    } catch (err) {
      setError('Failed to update info.');
    }
  };

  const handleChangePassword = async () => {
    setSuccess(''); setError('');
    try {
      if (user && password) {
        await updatePassword(user, password);
        setSuccess('Password changed!');
        setPassword('');
      }
    } catch (err) {
      setError('Failed to change password.');
    }
  };

  const handleSetGoal = async () => {
    setSuccess(''); setError('');
    try {
      if (user) {
        await setDoc(doc(db, 'users', user.uid), { monthlyGoal: goal }, { merge: true });
        setSuccess('Monthly goal saved!');
      }
    } catch (err) {
      setError('Failed to save goal.');
    }
  };

  const handlePhotoUpload = async (e) => {
    if (!user || !e.target.files[0]) return;
    setUploading(true);
    const storage = getStorage();
    const file = e.target.files[0];
    const fileRef = storageRef(storage, `profile-pictures/${user.uid}`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    await updateProfile(user, { photoURL: url });
    setPhotoURL(url);
    setUploading(false);
    setSuccess('Profile picture updated!');
  };

  const handleSetMonthlyGoals = async () => {
    setSuccess(''); setError('');
    try {
      if (user) {
        await setDoc(doc(db, 'users', user.uid), { monthlyGoals }, { merge: true });
        setSuccess('Monthly goals saved!');
      }
    } catch (err) {
      setError('Failed to save monthly goals.');
    }
  };

  const handlePayBlockChange = (idx, field, value) => {
    setPayBlocks(blocks => blocks.map((b, i) => i === idx ? { ...b, [field]: value } : b));
  };
  const addPayBlock = () => setPayBlocks(blocks => [...blocks, { start: 0, end: 0, rate: 0 }]);
  const removePayBlock = (idx) => setPayBlocks(blocks => blocks.length > 1 ? blocks.filter((_, i) => i !== idx) : blocks);
  const handleSavePayBlocks = async () => {
    setSuccess(''); setError('');
    try {
      if (user) {
        await setDoc(doc(db, 'users', user.uid), { payBlocks }, { merge: true });
        setSuccess('Pay structure saved!');
      }
    } catch (err) {
      setError('Failed to save pay structure.');
    }
  };

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

  if (!user) return <div className="card"><h2>Settings</h2><p>Loading...</p></div>;

  return (
    <div className="card">
      <h2>Settings</h2>
      <div style={{ marginBottom: 32 }}>
        <h3>Profile Picture</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 12 }}>
          <img src={photoURL || 'https://ui-avatars.com/api/?name=User'} alt="Profile" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #4EA8FF' }} />
          <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} />
        </div>
        {uploading && <span style={{ color: '#4EA8FF' }}>Uploading...</span>}
      </div>
      <div style={{ marginBottom: 32 }}>
        <h3>Update Info</h3>
        <input type="text" placeholder="Name" value={displayName} onChange={e => setDisplayName(e.target.value)} style={{ marginBottom: 12, width: '100%' }} />
        <input type="email" placeholder="Email" value={email} disabled style={{ marginBottom: 12, width: '100%', opacity: 0.7 }} />
        <button onClick={handleSaveInfo}>Save Info</button>
      </div>
      <div style={{ marginBottom: 32 }}>
        <h3>Change Password</h3>
        <input type="password" placeholder="New Password" value={password} onChange={e => setPassword(e.target.value)} style={{ marginBottom: 12, width: '100%' }} />
        <button onClick={handleChangePassword} disabled={!password}>Change Password</button>
      </div>
      <div style={{ marginBottom: 32 }}>
        <h3>Monthly Goal</h3>
        <input type="number" placeholder="Monthly Hours Goal" value={goal} onChange={e => setGoal(e.target.value)} style={{ marginBottom: 12, width: '100%' }} disabled={goalLoading} />
        <button onClick={handleSetGoal} disabled={goalLoading}>Set Goal</button>
      </div>
      <div style={{ marginBottom: 32 }}>
        <h3>Cancellation Pay</h3>
        <p style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
          Set how you want to handle cancellation pay for the month.
        </p>
        <Link to="/settings/cancellation-pay">
          <button style={{ background: '#23272A', color: '#4EA8FF', fontWeight: 600, border: 'none', borderRadius: 8, padding: '0.7em 1.2em', cursor: 'pointer' }}>
            Set Cancellation Pay
          </button>
        </Link>
      </div>
      <div style={{ marginBottom: 32 }}>
        <h3>Weekly Off Days</h3>
        <p style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
          Set days of the week that should automatically be marked as "OFF" in new months.
        </p>
        <Link to="/settings/weekly-off-days">
          <button style={{ background: '#23272A', color: '#4EA8FF', fontWeight: 600, border: 'none', borderRadius: 8, padding: '0.7em 1.2em', cursor: 'pointer' }}>
            Set Weekly Off Days
          </button>
        </Link>
      </div>
      <div style={{ marginBottom: 32 }}>
        <Link to="/pay-structure">
          <button style={{ background: '#23272A', color: '#4EA8FF', fontWeight: 600, border: 'none', borderRadius: 8, padding: '0.7em 1.2em', cursor: 'pointer' }}>
            Set Pay Structure
          </button>
        </Link>
      </div>
      {(success || error) && (
        <div style={{ marginTop: 24, color: success ? '#4EA8FF' : 'salmon', fontWeight: 600 }}>
          {success || error}
        </div>
      )}
    </div>
  );
} 