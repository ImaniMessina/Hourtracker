import React, { useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { useNavigate, Link } from 'react-router-dom';
import { collection, addDoc, Timestamp, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { motion } from 'framer-motion';
import { FiPlus, FiCalendar } from 'react-icons/fi';
import { FaPlane, FaPencilAlt, FaBook } from 'react-icons/fa';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getMonthYear(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

function getMonthRange(dateStr) {
  const date = new Date(dateStr);
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

const MONTHLY_GOAL = 100; // You can adjust this goal as needed

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [date, setDate] = useState(getToday());
  const [flight, setFlight] = useState('');
  const [prepost, setPrepost] = useState('');
  const [ground, setGround] = useState('');
  const [cancellations, setCancellations] = useState('');
  const [off, setOff] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [entries, setEntries] = useState([]);
  const [fetching, setFetching] = useState(false);
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(true);
  const [goal, setGoal] = useState(null);
  const [goalLoading, setGoalLoading] = useState(true);
  const [payBlocks, setPayBlocks] = useState([]);
  const [schoolPayStructure, setSchoolPayStructure] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [cancellationPayType, setCancellationPayType] = useState('none');
  const [cancellationThreshold, setCancellationThreshold] = useState('');
  const [cancellationFlatAmount, setCancellationFlatAmount] = useState('');
  const [cancellationPerHour, setCancellationPerHour] = useState('');

  // --- Data for charts ---
  // Monthly totals for the current year
  const [monthlyTotals, setMonthlyTotals] = useState(Array(12).fill(0));
  useEffect(() => {
    if (!user) return;
    const fetchYearData = async () => {
      const year = new Date(date).getFullYear();
      const months = Array(12).fill(0);
      for (let m = 0; m < 12; m++) {
        const start = new Date(year, m, 1).toISOString().slice(0, 10);
        const end = new Date(year, m + 1, 0).toISOString().slice(0, 10);
        const q = query(
          collection(db, 'hours'),
          where('uid', '==', user.uid),
          where('date', '>=', start),
          where('date', '<=', end)
        );
        const snap = await getDocs(q);
        let total = 0;
        snap.docs.forEach(doc => {
          const d = doc.data();
          total += (d.flight || 0) + (d.prepost || 0) + (d.ground || 0);
        });
        months[m] = total;
      }
      setMonthlyTotals(months);
    };
    fetchYearData();
  }, [user, date, loading]);

  // Breakdown by type for current month
  const typeTotals = entries.reduce(
    (acc, e) => {
      acc.flight += e.flight || 0;
      acc.prepost += e.prepost || 0;
      acc.ground += e.ground || 0;
      acc.off += e.off ? 1 : 0;
      return acc;
    },
    { flight: 0, prepost: 0, ground: 0, off: 0 }
  );

  // Chart data
  const monthsLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const barData = {
    labels: monthsLabels,
    datasets: [
      {
        label: 'Total Hours',
        data: monthlyTotals,
        backgroundColor: 'rgba(78,168,255,0.7)',
        borderRadius: 8,
      },
    ],
  };
  const barOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Monthly Total Hours (Current Year)', color: '#fff', font: { size: 18 } },
    },
    scales: {
      x: { ticks: { color: '#fff' }, grid: { color: '#23272A' } },
      y: { ticks: { color: '#fff' }, grid: { color: '#23272A' } },
    },
  };
  const pieData = {
    labels: ['Flight', 'Pre/Post', 'Ground', 'Off Days'],
    datasets: [
      {
        data: [typeTotals.flight, typeTotals.prepost, typeTotals.ground, typeTotals.off],
        backgroundColor: [
          'rgba(78,168,255,0.85)',
          'rgba(37,99,235,0.85)',
          'rgba(44,83,100,0.85)',
          'rgba(120,120,120,0.5)'
        ],
        borderWidth: 1,
      },
    ],
  };
  const pieOptions = {
    plugins: {
      legend: { labels: { color: '#fff', font: { size: 14 } } },
      title: { display: true, text: 'Breakdown by Type (This Month)', color: '#fff', font: { size: 18 } },
    },
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (!u) navigate('/login');
    });
    return () => unsubscribe();
  }, [navigate]);

  // Fetch entries for the current month
  useEffect(() => {
    if (!user) return;
    const fetchEntries = async () => {
      setFetching(true);
      const { start, end } = getMonthRange(date);
      const q = query(
        collection(db, 'hours'),
        where('uid', '==', user.uid),
        where('date', '>=', start),
        where('date', '<=', end),
        orderBy('date', 'asc')
      );
      const snap = await getDocs(q);
      setEntries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setFetching(false);
    };
    fetchEntries();
  }, [user, date, loading]);

  // Fetch user's goal and pay structure from Firestore
  useEffect(() => {
    if (!user) return;
    setGoalLoading(true);
    const fetchGoal = async () => {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setGoal(userDoc.data().monthlyGoal ? Number(userDoc.data().monthlyGoal) : null);
        setPayBlocks(userDoc.data().payBlocks || []);
        setSchoolPayStructure(userDoc.data().schoolPayStructure || false);
        setSchoolName(userDoc.data().schoolName || '');
        setCancellationPayType(userDoc.data().cancellationPayType || 'none');
        setCancellationThreshold(userDoc.data().cancellationThreshold || '');
        setCancellationFlatAmount(userDoc.data().cancellationFlatAmount || '');
        setCancellationPerHour(userDoc.data().cancellationPerHour || '');
      } else {
        setGoal(null);
        setPayBlocks([]);
        setSchoolPayStructure(false);
        setSchoolName('');
        setCancellationPayType('none');
        setCancellationThreshold('');
        setCancellationFlatAmount('');
        setCancellationPerHour('');
      }
      setGoalLoading(false);
    };
    fetchGoal();
  }, [user]);

  // Calculate totals
  const totals = entries.reduce(
    (acc, e) => {
      acc.flight += e.flight || 0;
      acc.prepost += e.prepost || 0;
      acc.ground += e.ground || 0;
      acc.total += (e.flight || 0) + (e.prepost || 0) + (e.ground || 0);
      acc.cancellationHours += e.cancellations || 0;
      return acc;
    },
    { flight: 0, prepost: 0, ground: 0, total: 0, cancellationHours: 0 }
  );

  // Calculate estimated pay using payBlocks (defensive)
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
    cancellationPay = totals.cancellationHours * Number(cancellationPerHour);
  }

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await addDoc(collection(db, 'hours'), {
        uid: user.uid,
        date,
        flight: off ? 0 : parseFloat(flight) || 0,
        prepost: off ? 0 : parseFloat(prepost) || 0,
        ground: off ? 0 : parseFloat(ground) || 0,
        cancellations: parseInt(cancellations) || 0,
        off,
        created: Timestamp.now(),
      });
      setSuccess('Saved!');
      setFlight('');
      setPrepost('');
      setGround('');
      setCancellations('');
      setOff(false);
    } catch (err) {
      setError('Error saving entry.');
    }
    setLoading(false);
  };

  if (!user) return null;

  // Get current month/year for heading
  const monthYear = getMonthYear(date);
  const progress = goal ? Math.min((totals.total / goal) * 100, 100) : 0;
  const hoursLeft = goal !== null ? Math.max(goal - totals.total, 0) : null;

  return (
    <div>
      {/* Logo/monogram in top left removed */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        style={{ position: 'relative', paddingTop: '2.5em' }}
      >
        {/* Top bar with month, total hours, and logout icon */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5em', gap: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '2.2rem', fontWeight: 600, letterSpacing: '2px', color: '#4EA8FF', textShadow: '0 0 16px #4EA8FF55', textAlign: 'left' }}>{monthYear}</div>
            <div style={{ marginTop: '0.5em', display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ width: 90, height: 90, boxShadow: '0 0 24px #4EA8FF44', borderRadius: '50%', background: 'rgba(24,26,27,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgressbar
                  value={goal ? progress : 0}
                  maxValue={100}
                  text={`${totals.total.toFixed(1)}`}
                  styles={buildStyles({
                    pathColor: '#4EA8FF',
                    trailColor: '#23272A',
                    textColor: '#fff',
                    textSize: '1.5rem',
                    pathTransitionDuration: 0.7,
                    strokeLinecap: 'round',
                    trailWidth: 6,
                    pathWidth: 8,
                    backgroundColor: 'rgba(24,26,27,0.7)',
                    fontWeight: 700,
                    fontFamily: 'Montserrat, Arial, sans-serif',
                  })}
                />
              </div>
              <div style={{ fontSize: '1rem', letterSpacing: '1px', color: '#fff', opacity: 0.7, marginLeft: 8 }}>TOTAL HOURS</div>
            </div>
          </div>
          {/* Hours to goal message */}
          <div style={{ minWidth: 220, textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: '1.25rem', background: 'rgba(24,26,27,0.7)', borderRadius: 18, padding: '1.2em 1em', boxShadow: '0 2px 12px #4EA8FF22', marginRight: 16 }}>
            {goalLoading ? (
              <span>Loading goal…</span>
            ) : goal === null ? (
              <span style={{ color: '#4EA8FF', fontWeight: 600 }}>Set your monthly goal in Settings</span>
            ) : hoursLeft > 0 ? (
              <span>{hoursLeft.toFixed(1)} hours left to reach your goal of {goal}!</span>
            ) : (
              <span style={{ color: '#4EA8FF' }}>Goal reached! 🎉</span>
            )}
            {schoolPayStructure && (
              <div style={{ marginTop: 12, color: '#4EA8FF', fontWeight: 600, fontSize: '1rem' }}>
                <span>School Pay Structure Active{schoolName ? `: ${schoolName}` : ''} ✔️</span>
              </div>
            )}
            {payBlocks && payBlocks.length > 0 && (
              <div style={{ marginTop: 12, color: '#4EA8FF', fontWeight: 600, fontSize: '1.1rem' }}>
                Estimated Pay: ${estimatedPay.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            )}
            {(cancellationPayType === 'threshold' || cancellationPayType === 'perHour') && (
              <div style={{ marginTop: 8, color: '#4EA8FF', fontWeight: 600, fontSize: '1.05rem' }}>
                Cancellation Pay: ${cancellationPay.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            )}
          </div>
          {/* Logout icon button */}
          <motion.button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              margin: 0,
              position: 'absolute',
              top: 24,
              right: 24,
              zIndex: 2,
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              transition: 'background 0.2s',
            }}
            whileHover={{ scale: 1.15, backgroundColor: '#23272A' }}
            whileTap={{ scale: 0.95 }}
            title="Logout"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4EA8FF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </motion.button>
        </div>
        {/* Main content: horizontal layout for form and table */}
        <div className="dashboard-content" style={{ alignItems: 'flex-start', gap: 48, position: 'relative' }}>
          {/* Entry Form */}
          <form className="dashboard-form" onSubmit={handleSubmit} style={{ minWidth: 320, maxWidth: 400, flex: 1, background: 'rgba(24,26,27,0.7)', borderRadius: 16, padding: '2em 1.5em', boxShadow: '0 2px 12px rgba(0,0,0,0.10)' }}>
            <h3><FiCalendar style={{ marginRight: 8, verticalAlign: 'middle' }} /> Date</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
              <button type="button" style={{ margin: 0, padding: '0.3em 1em', fontSize: '0.95em', borderRadius: 6, background: '#23272A', color: '#4EA8FF', border: 'none', fontWeight: 600, letterSpacing: 1, cursor: 'pointer' }} onClick={() => setDate(getToday())}>Today</button>
            </div>
            <h3><FaPlane style={{ marginRight: 8, verticalAlign: 'middle' }} /> Flight Hours</h3>
            <input type="number" step="0.1" value={flight} onChange={e => setFlight(e.target.value)} disabled={off} min="0" />
            <h3><FaPencilAlt style={{ marginRight: 8, verticalAlign: 'middle' }} /> Pre/Post Hours</h3>
            <input type="number" step="0.1" value={prepost} onChange={e => setPrepost(e.target.value)} disabled={off} min="0" />
            <h3><FaBook style={{ marginRight: 8, verticalAlign: 'middle' }} /> Ground Hours</h3>
            <input type="number" step="0.1" value={ground} onChange={e => setGround(e.target.value)} disabled={off} min="0" />
            <h3>Cancellation Hours</h3>
            <input type="number" step="1" min="0" value={cancellations} onChange={e => setCancellations(e.target.value)} disabled={off} />
            <label style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={off} onChange={e => setOff(e.target.checked)} /> OFF Day
            </label>
            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              style={{ marginTop: 24 }}
            >
              {loading ? 'Saving...' : 'Save'}
            </motion.button>
            <Link to="/bulk-entry" style={{ display: 'block', marginTop: 16, background: '#23272A', color: '#4EA8FF', fontWeight: 600, border: 'none', borderRadius: 8, padding: '0.7em 1.2em', textAlign: 'center', textDecoration: 'none' }}>
              Bulk Add
            </Link>
          </form>
          {/* Table Section */}
          <div className="dashboard-table" style={{ flex: 2, marginTop: 0, background: 'rgba(24, 26, 27, 0.85)', borderRadius: 18, padding: '2em 1.5em', boxShadow: '0 2px 12px rgba(0,0,0,0.10)', overflowX: 'auto', position: 'relative' }}>
            <h3 style={{ marginBottom: 24 }}><FiCalendar style={{ marginRight: 8, verticalAlign: 'middle' }} /> Entries This Month</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th><FaPlane style={{ verticalAlign: 'middle' }} /> Flight</th>
                  <th><FaPencilAlt style={{ verticalAlign: 'middle' }} /> Pre/Post</th>
                  <th><FaBook style={{ verticalAlign: 'middle' }} /> Ground</th>
                  <th>OFF</th>
                </tr>
              </thead>
              <tbody>
                {fetching ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', opacity: 0.7 }}>Loading...</td></tr>
                ) : entries.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', opacity: 0.7 }}>No entries yet.</td></tr>
                ) : (
                  entries.map(e => (
                    <motion.tr
                      key={e.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      whileHover={{ scale: 1.02, boxShadow: '0 2px 12px #4EA8FF22' }}
                    >
                      <td>{e.date}</td>
                      <td>{e.flight}</td>
                      <td>{e.prepost}</td>
                      <td>{e.ground}</td>
                      <td>{e.off ? '✔️' : ''}</td>
                    </motion.tr>
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
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </motion.div>
      {/* Data Visualization Section */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48, margin: '3em 0', justifyContent: 'center' }}>
        <div style={{ background: 'rgba(24,26,27,0.85)', borderRadius: 24, padding: 32, minWidth: 350, maxWidth: 500, flex: 1, boxShadow: '0 2px 16px #23272A33' }}>
          <Bar data={barData} options={barOptions} />
        </div>
        <div style={{ background: 'rgba(24,26,27,0.85)', borderRadius: 24, padding: 32, minWidth: 350, maxWidth: 500, flex: 1, boxShadow: '0 2px 16px #23272A33' }}>
          <Pie data={pieData} options={pieOptions} />
        </div>
      </div>
    </div>
  );
} 