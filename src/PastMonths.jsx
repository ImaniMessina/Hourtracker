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
  const [editData, setEditData] = useState({ date: '', flight: '', prepost: '', ground: '', off: false, notes: '' });
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => setUser(u));
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
      acc.total += (e.flight || 0) + (e.prepost || 0) + (e.ground || 0);
      return acc;
    },
    { flight: 0, prepost: 0, ground: 0, total: 0 }
  );

  // Edit entry handlers
  const startEdit = (entry) => {
    setEditingId(entry.id);
    setEditData({
      date: entry.date || '',
      flight: entry.flight || '',
      prepost: entry.prepost || '',
      ground: entry.ground || '',
      off: !!entry.off,
      notes: entry.notes || '',
    });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditData({ date: '', flight: '', prepost: '', ground: '', off: false, notes: '' });
  };
  const saveEdit = async (id) => {
    const ref = doc(db, 'hours', id);
    await updateDoc(ref, {
      date: editData.date,
      flight: parseFloat(editData.flight) || 0,
      prepost: parseFloat(editData.prepost) || 0,
      ground: parseFloat(editData.ground) || 0,
      off: !!editData.off,
      notes: editData.notes || '',
    });
    setEditingId(null);
    setEditData({ date: '', flight: '', prepost: '', ground: '', off: false, notes: '' });
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
    const tableData = filteredEntries.map(e => [e.date, e.flight, e.prepost, e.ground, e.off ? '✔️' : '', e.notes || '']);
    doc.autoTable({
      head: [['Date', 'Flight', 'Pre/Post', 'Ground', 'OFF', 'Notes']],
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
      <table style={{ width: '100%', color: '#fff', borderCollapse: 'collapse', fontSize: '1rem' }}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Flight</th>
            <th>Pre/Post</th>
            <th>Ground</th>
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
                  <td><input type="date" value={editData.date} onChange={ev => setEditData(d => ({ ...d, date: ev.target.value }))} /></td>
                  <td><input type="number" step="0.1" value={editData.flight} onChange={ev => setEditData(d => ({ ...d, flight: ev.target.value }))} /></td>
                  <td><input type="number" step="0.1" value={editData.prepost} onChange={ev => setEditData(d => ({ ...d, prepost: ev.target.value }))} /></td>
                  <td><input type="number" step="0.1" value={editData.ground} onChange={ev => setEditData(d => ({ ...d, ground: ev.target.value }))} /></td>
                  <td><input type="checkbox" checked={editData.off} onChange={ev => setEditData(d => ({ ...d, off: ev.target.checked }))} /></td>
                  <td><input type="text" value={editData.notes} onChange={ev => setEditData(d => ({ ...d, notes: ev.target.value }))} /></td>
                  <td colSpan="2">
                    <button onClick={() => saveEdit(e.id)} style={{ marginRight: 8 }}>Save</button>
                    <button onClick={cancelEdit}>Cancel</button>
                  </td>
                </tr>
              ) : (
                <tr key={e.id}>
                  <td>{e.date}</td>
                  <td>{e.flight}</td>
                  <td>{e.prepost}</td>
                  <td>{e.ground}</td>
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
            <td></td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
} 