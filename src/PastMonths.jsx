import React, { useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { FiTrash2 } from 'react-icons/fi';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const currentYear = new Date().getFullYear();
const yearRange = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i); // 11 years back, 10 years forward

function getDateRange(startYear, startMonth, endYear, endMonth) {
  const start = new Date(startYear, startMonth, 1);
  // End: last day of endMonth
  const end = new Date(endYear, endMonth + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export default function PastMonths() {
  const [startMonth, setStartMonth] = useState(new Date().getMonth());
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [endMonth, setEndMonth] = useState(new Date().getMonth());
  const [endYear, setEndYear] = useState(new Date().getFullYear());
  const [user, setUser] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ date: '', flight: '', prepost: '', ground: '', cancellations: '', off: false, notes: '' });
  const [deletingId, setDeletingId] = useState(null);
  const [payBlocks, setPayBlocks] = useState([]);
  const [schoolPayStructure, setSchoolPayStructure] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [cancellationPayType, setCancellationPayType] = useState('none');
  const [cancellationThreshold, setCancellationThreshold] = useState('');
  const [cancellationFlatAmount, setCancellationFlatAmount] = useState('');
  const [cancellationPerHour, setCancellationPerHour] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        // Load user's pay structure and settings
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        if (userDoc.exists()) {
          setPayBlocks(userDoc.data().payBlocks || []);
          setSchoolPayStructure(userDoc.data().schoolPayStructure || false);
          setSchoolName(userDoc.data().schoolName || '');
          setCancellationPayType(userDoc.data().cancellationPayType || 'none');
          setCancellationThreshold(userDoc.data().cancellationThreshold || '');
          setCancellationFlatAmount(userDoc.data().cancellationFlatAmount || '');
          setCancellationPerHour(userDoc.data().cancellationPerHour || '');
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchEntries = async () => {
      setLoading(true);
      const q = query(
        collection(db, 'hours'),
        where('uid', '==', user.uid),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'asc')
      );
      const snap = await getDocs(q);
      setEntries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    };
    fetchEntries();
  }, [user, startDate, endDate]);

  // Filter entries by search
  const filteredEntries = entries.filter(e => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (e.date && e.date.includes(s)) ||
      (e.flight && e.flight.toString().includes(s)) ||
      (e.prepost && e.prepost.toString().includes(s)) ||
      (e.ground && e.ground.toString().includes(s)) ||
      (e.cancellations && e.cancellations.toString().includes(s)) ||
      (e.off && 'off'.includes(s)) ||
      (e.notes && e.notes.toLowerCase().includes(s))
    );
  });

  // Calculate totals for filtered entries
  const totals = filteredEntries.reduce(
    (acc, e) => {
      acc.flight += e.flight || 0;
      acc.prepost += e.prepost || 0;
      acc.ground += e.ground || 0;
      acc.cancellations += e.cancellations || 0;
      acc.total += (e.flight || 0) + (e.prepost || 0) + (e.ground || 0);
      return acc;
    },
    { flight: 0, prepost: 0, ground: 0, cancellations: 0, total: 0 }
  );

  // Calculate estimated pay (same logic as Dashboard)
  function calculateEstimatedPay(totalHours, blocks) {
    if (!Array.isArray(blocks) || blocks.length === 0 || typeof totalHours !== 'number') return 0;
    let pay = 0;
    let hoursLeft = totalHours;
    for (const block of blocks) {
      if (hoursLeft <= 0) break;
      const blockStart = block.start;
      const blockEnd = block.end;
      const blockHours = Math.max(0, Math.min(hoursLeft, blockEnd - blockStart));
      if (blockHours > 0) {
        pay += blockHours * block.rate;
        hoursLeft -= blockHours;
      }
    }
    return pay;
  }
  const estimatedPay = calculateEstimatedPay(totals.total, payBlocks);

  // Calculate cancellation pay
  let cancellationPay = 0;
  if (cancellationPayType === 'threshold' && cancellationThreshold && cancellationFlatAmount) {
    if (totals.total < Number(cancellationThreshold)) {
      cancellationPay = Number(cancellationFlatAmount);
    }
  } else if (cancellationPayType === 'perHour' && cancellationPerHour) {
    cancellationPay = totals.cancellations * Number(cancellationPerHour);
  }

  // Edit entry handlers
  const startEdit = (entry) => {
    setEditingId(entry.id);
    setEditData({
      date: entry.date || '',
      flight: entry.flight || '',
      prepost: entry.prepost || '',
      ground: entry.ground || '',
      cancellations: entry.cancellations || '',
      off: !!entry.off,
      notes: entry.notes || '',
    });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditData({ date: '', flight: '', prepost: '', ground: '', cancellations: '', off: false, notes: '' });
  };
  const saveEdit = async (id) => {
    const ref = doc(db, 'hours', id);
    await updateDoc(ref, {
      date: editData.date,
      flight: parseFloat(editData.flight) || 0,
      prepost: parseFloat(editData.prepost) || 0,
      ground: parseFloat(editData.ground) || 0,
      cancellations: parseInt(editData.cancellations) || 0,
      off: !!editData.off,
      notes: editData.notes || '',
    });
    setEditingId(null);
    setEditData({ date: '', flight: '', prepost: '', ground: '', cancellations: '', off: false, notes: '' });
    // Refresh entries
    const q = query(
      collection(db, 'hours'),
      where('uid', '==', user.uid),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'asc')
    );
    const snap = await getDocs(q);
    setEntries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  // Delete entry handlers
  const confirmDelete = async (id) => {
    await deleteDoc(doc(db, 'hours', id));
    setDeletingId(null);
    // Refresh entries
    const q = query(
      collection(db, 'hours'),
      where('uid', '==', user.uid),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'asc')
    );
    const snap = await getDocs(q);
    setEntries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const title = `${startDate} to ${endDate} - Flight Hours`;
    doc.setFontSize(18);
    doc.text(title, 14, 18);
    const tableData = filteredEntries.map(e => [e.date, e.flight, e.prepost, e.ground, e.cancellations || 0, e.off ? '✔️' : '', e.notes || '']);
    doc.autoTable({
      head: [['Date', 'Flight', 'Pre/Post', 'Ground', 'Cancellations', 'OFF', 'Notes']],
      body: tableData,
      startY: 28,
      theme: 'grid',
      headStyles: { fillColor: [78, 168, 255] },
    });
    // Add totals row
    doc.autoTable({
      body: [[
        'Total',
        totals.flight.toFixed(1),
        totals.prepost.toFixed(1),
        totals.ground.toFixed(1),
        totals.cancellations,
        '',
        ''
      ]],
      startY: doc.lastAutoTable.finalY + 2,
      theme: 'plain',
      styles: { fontStyle: 'bold' },
    });
    doc.save(`${startDate}_to_${endDate}_FlightHours.pdf`);
  };

  return (
    <div className="card">
      <h2>Past Months</h2>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
        <span>From</span>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <span>to</span>
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        <input
          type="text"
          placeholder="Search by date, type, or notes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ minWidth: 200, marginLeft: 16 }}
        />
        <button onClick={handleDownloadPDF} disabled={filteredEntries.length === 0 || loading} style={{ marginLeft: 16 }}>
          Download PDF
        </button>
      </div>

      {/* Pay Breakdown Section */}
      {payBlocks.length > 0 && (
        <div style={{
          background: 'rgba(78,168,255,0.12)',
          color: '#4EA8FF',
          borderRadius: 16,
          padding: '18px 24px',
          margin: '0 0 24px 0',
          fontWeight: 700,
          fontSize: '1.1rem',
          boxShadow: '0 2px 12px #4EA8FF22',
          border: '1.5px solid #4EA8FF44',
          letterSpacing: 1
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: '1.3rem', marginBottom: 8 }}>
                Estimated Pay: ${estimatedPay.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
              {schoolPayStructure && (
                <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                  School Pay Structure Active{schoolName ? `: ${schoolName}` : ''} ✔️
                </div>
              )}
            </div>
            {(cancellationPayType === 'threshold' || cancellationPayType === 'perHour') && cancellationPay > 0 && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.1rem' }}>
                  Cancellation Pay: ${cancellationPay.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                  {cancellationPayType === 'threshold' ? 'Threshold Bonus' : 'Per Hour Rate'}
                </div>
              </div>
            )}
          </div>
          <div style={{ marginTop: 12, fontSize: '0.9rem', opacity: 0.8 }}>
            Total Hours: {totals.total.toFixed(1)} | Flight: {totals.flight.toFixed(1)} | Pre/Post: {totals.prepost.toFixed(1)} | Ground: {totals.ground.toFixed(1)} | Cancellations: {totals.cancellations}
          </div>
        </div>
      )}
      <table style={{ width: '100%', color: '#fff', borderCollapse: 'collapse', fontSize: '1rem' }}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Flight</th>
            <th>Pre/Post</th>
            <th>Ground</th>
            <th>Cancellations</th>
            <th>OFF</th>
            <th>Notes</th>
            <th colSpan="2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan="8" style={{ textAlign: 'center', opacity: 0.7 }}>Loading...</td></tr>
          ) : filteredEntries.length === 0 ? (
            <tr><td colSpan="8" style={{ textAlign: 'center', opacity: 0.7 }}>No entries for this range.</td></tr>
          ) : (
            filteredEntries.map(e => (
              editingId === e.id ? (
                <tr key={e.id} style={{ background: 'rgba(78,168,255,0.08)' }}>
                  <td>
                    <input 
                      type="date" 
                      value={editData.date} 
                      onChange={ev => setEditData(d => ({ ...d, date: ev.target.value }))}
                      style={{ padding: 6, borderRadius: 4, border: '1px solid #ddd', width: '100%' }}
                    />
                  </td>
                  <td>
                    <input 
                      type="number" 
                      step="0.1" 
                      value={editData.flight} 
                      onChange={ev => setEditData(d => ({ ...d, flight: ev.target.value }))}
                      style={{ padding: 6, borderRadius: 4, border: '1px solid #ddd', width: '60px' }}
                    />
                  </td>
                  <td>
                    <input 
                      type="number" 
                      step="0.1" 
                      value={editData.prepost} 
                      onChange={ev => setEditData(d => ({ ...d, prepost: ev.target.value }))}
                      style={{ padding: 6, borderRadius: 4, border: '1px solid #ddd', width: '60px' }}
                    />
                  </td>
                  <td>
                    <input 
                      type="number" 
                      step="0.1" 
                      value={editData.ground} 
                      onChange={ev => setEditData(d => ({ ...d, ground: ev.target.value }))}
                      style={{ padding: 6, borderRadius: 4, border: '1px solid #ddd', width: '60px' }}
                    />
                  </td>
                  <td>
                    <input 
                      type="number" 
                      step="1" 
                      min="0" 
                      value={editData.cancellations} 
                      onChange={ev => setEditData(d => ({ ...d, cancellations: ev.target.value }))}
                      style={{ padding: 6, borderRadius: 4, border: '1px solid #ddd', width: '60px' }}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={editData.off} 
                      onChange={ev => setEditData(d => ({ ...d, off: ev.target.checked }))}
                      style={{ transform: 'scale(1.2)' }}
                    />
                  </td>
                  <td>
                    <input 
                      type="text" 
                      value={editData.notes} 
                      onChange={ev => setEditData(d => ({ ...d, notes: ev.target.value }))}
                      style={{ padding: 6, borderRadius: 4, border: '1px solid #ddd', width: '120px' }}
                    />
                  </td>
                  <td colSpan="2">
                    <button 
                      onClick={() => saveEdit(e.id)} 
                      style={{ 
                        marginRight: 8, 
                        background: '#28a745', 
                        color: 'white', 
                        border: 'none', 
                        padding: '4px 8px', 
                        borderRadius: 4, 
                        cursor: 'pointer' 
                      }}
                    >
                      Save
                    </button>
                    <button 
                      onClick={cancelEdit}
                      style={{ 
                        background: '#6c757d', 
                        color: 'white', 
                        border: 'none', 
                        padding: '4px 8px', 
                        borderRadius: 4, 
                        cursor: 'pointer' 
                      }}
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={e.id}>
                  <td>{e.date}</td>
                  <td>{e.flight}</td>
                  <td>{e.prepost}</td>
                  <td>{e.ground}</td>
                  <td>{e.cancellations || 0}</td>
                  <td>{e.off ? '✔️' : ''}</td>
                  <td>{e.notes || ''}</td>
                  <td>
                    <button onClick={() => startEdit(e)}>Edit</button>
                  </td>
                  <td>
                    {deletingId === e.id ? (
                      <>
                        <button onClick={() => confirmDelete(e.id)} style={{ color: 'red', marginRight: 8 }}>Confirm</button>
                        <button onClick={() => setDeletingId(null)}>Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => setDeletingId(e.id)} style={{ background: 'none', border: 'none', color: '#888', padding: 4, cursor: 'pointer' }} title="Delete">
                        <FiTrash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              )
            ))
          )}
        </tbody>
        <tfoot>
          <tr>
            <td style={{ fontWeight: 700 }}>Total</td>
            <td>{totals.flight.toFixed(1)}</td>
            <td>{totals.prepost.toFixed(1)}</td>
            <td>{totals.ground.toFixed(1)}</td>
            <td>{totals.cancellations}</td>
            <td></td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
} 