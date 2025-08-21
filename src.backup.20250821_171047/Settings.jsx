import React, { useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { updateProfile, updatePassword } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiSettings, FiDollarSign, FiCalendar, FiUser, FiEdit, FiLock, FiTarget, FiLifeBuoy } from 'react-icons/fi';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import Tesseract from 'tesseract.js';
import ImportReviewModal from './ImportReviewModal';

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
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importError, setImportError] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importEntries, setImportEntries] = useState([]);
  const [importing, setImporting] = useState(false);

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

  useEffect(() => {
    if (importPreview) {
      const parsed = parseImportedText(importPreview);
      if (parsed.length > 0) {
        setImportEntries(parsed);
        setImportModalOpen(true);
      }
    }
    // eslint-disable-next-line
  }, [importPreview]);

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

  const handleImportFile = async (file) => {
    setImportPreview(null);
    setImportError('');
    if (!file) return;
    try {
      if (file.type === 'application/pdf') {
        // PDF extraction
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const typedarray = new Uint8Array(e.target.result);
            const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
            let text = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              text += content.items.map(item => item.str).join(' ') + '\n';
            }
            setImportPreview(text.trim());
          } catch (err) {
            setImportError('Could not extract text from PDF.');
          }
        };
        reader.readAsArrayBuffer(file);
      } else if (file.type.startsWith('image/')) {
        // Image OCR
        setImportPreview('Extracting text from image...');
        const { data: { text } } = await Tesseract.recognize(file, 'eng', { logger: m => {} });
        setImportPreview(text.trim());
      } else {
        setImportError('Unsupported file type. Please upload a PDF or image.');
      }
    } catch (err) {
      setImportError('Error extracting data.');
    }
  };

  // Save imported entries to Firestore
  const handleImportConfirm = async (entries) => {
    setImporting(true);
    try {
      for (const entry of entries) {
        await addDoc(collection(db, 'hours'), {
          ...entry,
          uid: user.uid,
          created: Timestamp.now(),
        });
      }
      setSuccess('Imported successfully!');
      setImportModalOpen(false);
      setImportFile(null);
      setImportPreview(null);
    } catch (err) {
      setImportError('Failed to import entries.');
    }
    setImporting(false);
  };

  // Parse extracted text into structured entries
  function parseImportedText(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const entries = [];
    const monthRegex = /^(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)/i;
    let currentMonth = '';
    for (let line of lines) {
      if (monthRegex.test(line)) {
        currentMonth = line.split(' ')[0];
        continue;
      }
      // Example: JUNE 3 - 5.4 FLIGHT / 2.1 PREPOST / 7.56 TOTAL
      const match = line.match(/^\s*([A-Z]+)\s+(\d{1,2})\s*-\s*(.*)$/i);
      if (match) {
        const [, month, day, rest] = match;
        let date = '';
        try {
          const year = new Date().getFullYear();
          date = new Date(`${month} ${day}, ${year}`).toISOString().slice(0, 10);
        } catch { date = '' }
        const off = /OFF/i.test(rest);
        const flight = parseFloat((rest.match(/([\d.]+)\s*FLIGHT/i) || [])[1] || 0);
        const prepost = parseFloat((rest.match(/([\d.]+)\s*PREPOST/i) || [])[1] || 0);
        const ground = parseFloat((rest.match(/([\d.]+)\s*GROUND/i) || [])[1] || 0);
        const cancellations = parseFloat((rest.match(/([\d.]+)\s*CANCELLATION/i) || [])[1] || 0);
        const notes = '';
        entries.push({ date, flight: off ? 0 : flight, prepost: off ? 0 : prepost, ground: off ? 0 : ground, cancellations: off ? 0 : cancellations, off, notes });
      }
    }
    return entries;
  }

  if (!user) return <div className="card"><h2>Settings</h2><p>Loading...</p></div>;

  return (
    <div className="settings-container" style={{ maxWidth: 900, margin: '2em auto', padding: '2.5em 1.5em' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: 32,
        alignItems: 'stretch',
      }}>
        {/* Profile Picture */}
        <div className="card" style={{ minHeight: 260, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '2em', borderRadius: 16, boxShadow: '0 2px 16px #4EA8FF22', background: 'rgba(35,39,42,0.97)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 22 }}><FiUser style={{ color: '#4EA8FF', fontSize: 28 }} />Profile Picture</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 12, marginTop: 12 }}>
            <img src={photoURL || 'https://ui-avatars.com/api/?name=User'} alt="Profile" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid #4EA8FF' }} />
            <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} />
            {uploading && <span style={{ color: '#4EA8FF' }}>Uploading...</span>}
          </div>
          {success && <div style={{ color: '#4EA8FF', marginTop: 12 }}>{success}</div>}
          {error && <div style={{ color: 'salmon', marginTop: 12 }}>{error}</div>}
        </div>

        {/* Update Info */}
        <div className="card" style={{ minHeight: 260, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '2em', borderRadius: 16, boxShadow: '0 2px 16px #4EA8FF22', background: 'rgba(35,39,42,0.97)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 22 }}><FiEdit style={{ color: '#4EA8FF', fontSize: 28 }} />Update Info</h3>
          <input type="text" placeholder="Name" value={displayName} onChange={e => setDisplayName(e.target.value)} style={{ marginBottom: 12, width: '100%' }} />
          <input type="email" placeholder="Email" value={email} disabled style={{ marginBottom: 12, width: '100%', opacity: 0.7 }} />
          <button onClick={handleSaveInfo} style={{ background: '#4EA8FF', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 8, padding: '0.7em 1.2em', marginTop: 8 }}>Save Info</button>
          {success && <div style={{ color: '#4EA8FF', marginTop: 12 }}>{success}</div>}
          {error && <div style={{ color: 'salmon', marginTop: 12 }}>{error}</div>}
        </div>

        {/* Change Password */}
        <div className="card" style={{ minHeight: 260, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '2em', borderRadius: 16, boxShadow: '0 2px 16px #4EA8FF22', background: 'rgba(35,39,42,0.97)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 22 }}><FiLock style={{ color: '#4EA8FF', fontSize: 28 }} />Change Password</h3>
          <input type="password" placeholder="New Password" value={password} onChange={e => setPassword(e.target.value)} style={{ marginBottom: 12, width: '100%' }} />
          <button onClick={handleChangePassword} disabled={!password} style={{ background: '#4EA8FF', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 8, padding: '0.7em 1.2em', marginTop: 8 }}>Change Password</button>
          {success && <div style={{ color: '#4EA8FF', marginTop: 12 }}>{success}</div>}
          {error && <div style={{ color: 'salmon', marginTop: 12 }}>{error}</div>}
        </div>

        {/* Monthly Goal */}
        <div className="card" style={{ minHeight: 260, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '2em', borderRadius: 16, boxShadow: '0 2px 16px #4EA8FF22', background: 'rgba(35,39,42,0.97)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 22 }}><FiTarget style={{ color: '#4EA8FF', fontSize: 28 }} />Monthly Goal</h3>
          <input type="number" placeholder="Monthly Hours Goal" value={goal} onChange={e => setGoal(e.target.value)} style={{ marginBottom: 12, width: '100%' }} disabled={goalLoading} />
          <button onClick={handleSetGoal} disabled={goalLoading} style={{ background: '#4EA8FF', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 8, padding: '0.7em 1.2em', marginTop: 8 }}>Set Goal</button>
          {success && <div style={{ color: '#4EA8FF', marginTop: 12 }}>{success}</div>}
          {error && <div style={{ color: 'salmon', marginTop: 12 }}>{error}</div>}
        </div>

        {/* Cancellation Pay */}
        <div className="card" style={{ minHeight: 260, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '2em', borderRadius: 16, boxShadow: '0 2px 16px #4EA8FF22', background: 'rgba(35,39,42,0.97)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 22 }}><FiDollarSign style={{ color: '#4EA8FF', fontSize: 28 }} />Cancellation Pay</h3>
          <p style={{ fontSize: 14, color: '#b0c4d6', marginBottom: 16 }}>
            Set how you want to handle cancellation pay for the month.
          </p>
          <Link to="/settings/cancellation-pay" style={{ textDecoration: 'none' }}>
            <button style={{ background: '#4EA8FF', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 8, padding: '0.9em 1.7em', fontSize: 18, cursor: 'pointer', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FiDollarSign style={{marginRight:4}} />Set Cancellation Pay
            </button>
          </Link>
        </div>

        {/* Weekly Off Days */}
        <div className="card" style={{ minHeight: 260, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '2em', borderRadius: 16, boxShadow: '0 2px 16px #4EA8FF22', background: 'rgba(35,39,42,0.97)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 22 }}><FiCalendar style={{ color: '#4EA8FF', fontSize: 28 }} />Weekly Off Days</h3>
          <p style={{ fontSize: 14, color: '#b0c4d6', marginBottom: 16 }}>
            Set days of the week that should automatically be marked as "OFF" in new months.
          </p>
          <Link to="/settings/weekly-off-days" style={{ textDecoration: 'none' }}>
            <button style={{ background: '#4EA8FF', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 8, padding: '0.9em 1.7em', fontSize: 18, cursor: 'pointer', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FiCalendar style={{marginRight:4}} />Set Weekly Off Days
            </button>
          </Link>
        </div>

        {/* Pay Structure */}
        <div className="card" style={{ minHeight: 260, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '2em', borderRadius: 16, boxShadow: '0 2px 16px #4EA8FF22', background: 'rgba(35,39,42,0.97)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 22 }}><FiSettings style={{ color: '#4EA8FF', fontSize: 28 }} />Pay Structure</h3>
          <Link to="/pay-structure" style={{ textDecoration: 'none' }}>
            <button style={{ background: '#4EA8FF', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 8, padding: '0.9em 1.7em', fontSize: 18, cursor: 'pointer', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FiSettings style={{marginRight:4}} />Set Pay Structure
            </button>
          </Link>
        </div>

        {/* Support & Help */}
        <div className="card" style={{ minHeight: 260, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '2em', borderRadius: 16, boxShadow: '0 2px 16px #4EA8FF22', background: 'rgba(35,39,42,0.97)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 22 }}><FiLifeBuoy style={{ color: '#4EA8FF', fontSize: 28 }} />Support & Help</h3>
          <Link to="/support" style={{ textDecoration: 'none' }}>
            <button style={{ background: '#4EA8FF', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 8, padding: '0.9em 1.7em', fontSize: 18, cursor: 'pointer', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FiLifeBuoy style={{marginRight:4}} />Go to Support
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
} 