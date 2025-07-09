import React, { useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { useNavigate, Link } from 'react-router-dom';
import { collection, addDoc, Timestamp, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { motion } from 'framer-motion';
import { FiPlus, FiCalendar, FiArrowRight } from 'react-icons/fi';
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
  const [notes, setNotes] = useState('');
  const [weeklyOffDays, setWeeklyOffDays] = useState([]);
  const [offDaysEffectiveDate, setOffDaysEffectiveDate] = useState('');

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
          setWeeklyOffDays(userDoc.data().weeklyOffDays || []);
          setOffDaysEffectiveDate(userDoc.data().offDaysEffectiveDate || '');
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

  // Check if current date should be auto-filled as off day
  const checkAutoOffDay = (selectedDate) => {
    if (!weeklyOffDays.length || !offDaysEffectiveDate) return false;
    
    const effectiveDate = new Date(offDaysEffectiveDate);
    const checkDate = new Date(selectedDate);
    
    // Only apply if the selected date is on or after the effective date
    if (checkDate < effectiveDate) return false;
    
    const dayOfWeek = checkDate.toLocaleDateString('en-US', { weekday: 'long' });
    return weeklyOffDays.includes(dayOfWeek);
  };

  // Handle date change with auto-off day check
  const handleDateChange = (newDate) => {
    setDate(newDate);
    const shouldBeOff = checkAutoOffDay(newDate);
    if (shouldBeOff && !off) {
      setOff(true);
      setFlight('');
      setPrepost('');
      setGround('');
      setCancellations('');
    }
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
        notes: notes || '',
        created: Timestamp.now(),
      });
      setSuccess('Saved!');
      setFlight('');
      setPrepost('');
      setGround('');
      setCancellations('');
      setOff(false);
      setNotes('');
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
        <div className="dashboard-topbar" style={{ position: 'relative' }}>
          <div className="dashboard-heading-wrap">
            <div className="dashboard-monthyear">{monthYear}</div>
            <div className="dashboard-progress-row">
              <div className="dashboard-progress-circle">
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
              <div className="dashboard-total-label">TOTAL HOURS</div>
            </div>
          </div>
          <div className="dashboard-goal-box" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'nowrap', overflow: 'hidden', flex: 1 }}>
            {goalLoading ? (
              <span>Loading goal…</span>
            ) : goal === null ? (
              <span style={{ color: '#4EA8FF', fontWeight: 600 }}>Set your monthly goal in Settings</span>
            ) : hoursLeft > 0 ? (
              <>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hoursLeft.toFixed(1)} hours left to reach your goal of {goal}!</span>
                <FiArrowRight style={{ fontSize: 28, color: '#4EA8FF', flexShrink: 0 }} />
              </>
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
          <motion.button
            onClick={handleLogout}
            className="dashboard-logout-btn"
            whileHover={{ scale: 1.15, backgroundColor: '#23272A' }}
            whileTap={{ scale: 0.95 }}
            title="Logout"
            style={{ position: 'absolute', top: 24, right: 24 }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4EA8FF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </motion.button>
        </div>
        {/* Main content: horizontal layout for form and table */}
        <div className="dashboard-content with-divider">
          {/* Entry Form */}
          <form className="dashboard-form" onSubmit={handleSubmit}>
            <h3><FiCalendar className="icon-align" /> Date</h3>
            <div className="dashboard-date-row">
              <input 
                type="date" 
                value={date} 
                onChange={e => handleDateChange(e.target.value)} 
                required 
              />
              <button 
                type="button" 
                className="dashboard-today-btn"
                onClick={() => handleDateChange(getToday())}
              >
                Today
              </button>
            </div>
            <h3><FaPlane className="icon-align" /> Flight Hours</h3>
            <input 
              type="number" 
              step="0.1" 
              value={flight} 
              onChange={e => setFlight(e.target.value)} 
              disabled={off} 
              min="0" 
            />
            <h3><FaPencilAlt className="icon-align" /> Pre/Post Hours</h3>
            <input 
              type="number" 
              step="0.1" 
              value={prepost} 
              onChange={e => setPrepost(e.target.value)} 
              disabled={off} 
              min="0" 
            />
            <h3><FaBook className="icon-align" /> Ground Hours</h3>
            <input 
              type="number" 
              step="0.1" 
              value={ground} 
              onChange={e => setGround(e.target.value)} 
              disabled={off} 
              min="0" 
            />
            <h3>Cancellation Hours</h3>
            <input 
              type="number" 
              step="1" 
              min="0" 
              value={cancellations} 
              onChange={e => setCancellations(e.target.value)} 
              disabled={off} 
            />
            <h3>Notes</h3>
            <textarea 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              placeholder="Notes (optional)" 
            />
            <label className="dashboard-off-label">
              <input 
                type="checkbox" 
                checked={off} 
                onChange={e => setOff(e.target.checked)} 
              /> 
              <span>OFF Day</span>
              {checkAutoOffDay(date) && (
                <span className="dashboard-auto-off">(Auto-filled based on weekly off days)</span>
              )}
            </label>
            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="dashboard-save-btn"
            >
              {loading ? 'Saving...' : 'Save'}
            </motion.button>
            <Link 
              to="/bulk-entry" 
              className="dashboard-bulk-btn"
              style={{
                display: 'block',
                width: '100%',
                marginTop: 12,
                background: '#23272A',
                color: '#4EA8FF',
                fontWeight: 600,
                border: 'none',
                borderRadius: 12,
                padding: '1em 2em',
                textAlign: 'center',
                textDecoration: 'none',
                minHeight: '48px',
                fontSize: '1rem',
                boxShadow: 'none',
                transition: 'all 0.2s ease',
                marginLeft: 0,
                marginRight: 0,
                alignSelf: 'center',
              }}
            >
              Bulk Add
            </Link>
          </form>
          {/* Table Section */}
          <div className="dashboard-table-section">
            <h3><FiCalendar className="icon-align" /> Entries This Month</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th><FaPlane className="icon-align" /> Flight</th>
                  <th><FaPencilAlt className="icon-align" /> Pre/Post</th>
                  <th><FaBook className="icon-align" /> Ground</th>
                  <th>OFF</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {fetching ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', opacity: 0.7 }}>Loading...</td></tr>
                ) : entries.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', opacity: 0.7 }}>No entries yet.</td></tr>
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
                      <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.notes || ''}>
                        {e.notes || ''}
                      </td>
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
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </motion.div>
      {/* Data Visualization Section */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '2em', 
        margin: '3em 0', 
        justifyContent: 'center',
        padding: '0 1em'
      }}>
        <div style={{ 
          background: 'rgba(24,26,27,0.85)', 
          borderRadius: 24, 
          padding: '2em', 
          minWidth: '300px', 
          maxWidth: '500px', 
          flex: 1, 
          boxShadow: '0 2px 16px #23272A33',
          width: '100%'
        }}>
          <Bar data={barData} options={barOptions} />
        </div>
        <div style={{ 
          background: 'rgba(24,26,27,0.85)', 
          borderRadius: 24, 
          padding: '2em', 
          minWidth: '300px', 
          maxWidth: '500px', 
          flex: 1, 
          boxShadow: '0 2px 16px #23272A33',
          width: '100%'
        }}>
          <Pie data={pieData} options={pieOptions} />
        </div>
      </div>
    </div>
  );
} 