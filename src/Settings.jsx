import React, { useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { updateProfile, updatePassword } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Link } from 'react-router-dom';
import { FiUploadCloud } from 'react-icons/fi';
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
        const cancellations = parseInt((rest.match(/([\d.]+)\s*CANCELLATION/i) || [])[1] || 0);
        const notes = '';
        entries.push({ date, flight: off ? 0 : flight, prepost: off ? 0 : prepost, ground: off ? 0 : ground, cancellations: off ? 0 : cancellations, off, notes });
      }
    }
    return entries;
  }

  if (!user) return <div className="card"><h2>Settings</h2><p>Loading...</p></div>;

  return (
    <div className="card">
      <h2>Settings</h2>
      <div style={{ marginBottom: 40, padding: '2em 0', borderBottom: '1.5px solid #23272a33' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FiUploadCloud style={{ color: '#4EA8FF', fontSize: 28 }} />
          Import Past Months
          <span style={{ background: '#23272a', color: '#4EA8FF', fontWeight: 700, fontSize: '0.85em', borderRadius: 8, padding: '2px 10px', marginLeft: 8, letterSpacing: 1 }}>BETA</span>
        </h3>
        <p style={{ color: '#b0c4d6', margin: '8px 0 18px 0', fontSize: '1.05em' }}>
          Upload a PDF or screenshot of your old logbook/monthly summary. We'll extract the data and let you review it before importing.
        </p>
        <input
          type="file"
          accept=".pdf,image/*"
          onChange={async e => {
            const file = e.target.files[0] || null;
            setImportFile(file);
            setImportPreview(null);
            setImportError('');
            if (file) await handleImportFile(file);
          }}
          style={{ marginBottom: 16 }}
        />
        {importFile && (
          <div style={{ marginTop: 10, color: '#4EA8FF', fontWeight: 500 }}>
            Selected: {importFile.name}
            <button style={{ marginLeft: 18, color: '#fff', background: '#23272a', border: 'none', borderRadius: 8, padding: '2px 10px', cursor: 'pointer' }} onClick={() => { setImportFile(null); setImportPreview(null); }}>Remove</button>
          </div>
        )}
        {importError && <div style={{ color: '#ff4e4e', marginTop: 8 }}>{importError}</div>}
        {importPreview && (
          <div style={{ marginTop: 18, background: '#181a28', borderRadius: 12, padding: 18, color: '#fff' }}>
            <h4>Extracted Text (debug)</h4>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '1em' }}>{importPreview}</pre>
          </div>
        )}
        {importPreview && parseImportedText(importPreview).length === 0 && (
          <div style={{ color: '#ffb84e', marginTop: 12, fontWeight: 500 }}>
            No entries found in the extracted text. Please check the format or share the text with your developer to improve parsing.
          </div>
        )}
      </div>
      <ImportReviewModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onConfirm={handleImportConfirm}
        entries={importEntries}
        loading={importing}
      />
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