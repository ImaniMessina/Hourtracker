import React, { useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, Timestamp, query, where, orderBy, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { motion } from 'framer-motion';
import { FaPlane, FaPencilAlt, FaBook, FaBell, FaExclamationTriangle, FaCalendarAlt, FaTimes } from 'react-icons/fa';
import FlightEntryForm from './FlightEntryForm';

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

export default function Dashboard({ showNotifications, setShowNotifications, notifications, setNotifications }) {
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
  const [goal, setGoal] = useState(null);
  const [goalLoading, setGoalLoading] = useState(true);
  const [payBlocks, setPayBlocks] = useState([]);
  const [notes, setNotes] = useState('');

  // Notification system state
  const [expiringEndorsements, setExpiringEndorsements] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [clearedNotifications, setClearedNotifications] = useState(new Set());

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (!u) navigate('/login');
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    const { start, end } = getMonthRange(date);
    const q = query(
      collection(db, 'hours'),
      where('uid', '==', user.uid),
      where('date', '>=', start),
      where('date', '<=', end),
      orderBy('date', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setEntries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setFetching(false);
    });
    return () => unsub();
  }, [user, date]);

  useEffect(() => {
    if (!user) return;
    setGoalLoading(true);
    const fetchGoal = async () => {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setGoal(userDoc.data().monthlyGoal ? Number(userDoc.data().monthlyGoal) : null);
        setPayBlocks(userDoc.data().payBlocks || []);
      } else {
        setGoal(null);
        setPayBlocks([]);
      }
      setGoalLoading(false);
    };
    fetchGoal();
  }, [user]);

  // Load endorsements and templates for notifications
  useEffect(() => {
    if (!user) return;

    // Load templates
    const templatesQuery = query(
      collection(db, 'endorsementTemplates'),
      where('uid', '==', user.uid),
      orderBy('name', 'asc')
    );
    const templatesUnsub = onSnapshot(templatesQuery, (snap) => {
      setTemplates(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Load endorsements
    const endorsementsQuery = query(
      collection(db, 'endorsements'),
      where('uid', '==', user.uid),
      orderBy('dateGiven', 'desc')
    );
    const endorsementsUnsub = onSnapshot(endorsementsQuery, (snap) => {
      const endorsements = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExpiringEndorsements(endorsements);
    });

    return () => {
      templatesUnsub();
      endorsementsUnsub();
    };
  }, [user]);

  // Calculate expiring endorsements summary
  useEffect(() => {
    if (expiringEndorsements.length === 0 || templates.length === 0) {
      setNotifications([]);
      return;
    }

    const calculateExpirationDate = (dateGiven, duration, durationUnit) => {
      const date = new Date(dateGiven);
      switch (durationUnit) {
        case 'days':
          date.setDate(date.getDate() + parseInt(duration));
          break;
        case 'months':
          date.setMonth(date.getMonth() + parseInt(duration));
          break;
        case 'years':
          date.setFullYear(date.getFullYear() + parseInt(duration));
          break;
      }
      return date.toISOString().slice(0, 10);
    };

    const isExpiringSoon = (expirationDate, daysThreshold = 30) => {
      const today = new Date();
      const expiration = new Date(expirationDate);
      const diffTime = expiration - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= daysThreshold;
    };

    const expiringCounts = {
      high: 0,    // ≤7 days
      medium: 0,  // 8-14 days
      low: 0      // 15-30 days
    };

    // Count expiring endorsements by priority
    expiringEndorsements.forEach(endorsement => {
      const template = templates.find(t => t.id === endorsement.templateId);
      if (template) {
        const expirationDate = calculateExpirationDate(
          endorsement.dateGiven,
          template.duration,
          template.durationUnit
        );
        
        if (isExpiringSoon(expirationDate, 30)) {
          const daysUntilExpiry = Math.ceil((new Date(expirationDate) - new Date()) / (1000 * 60 * 60 * 24));
          if (daysUntilExpiry <= 7) {
            expiringCounts.high++;
          } else if (daysUntilExpiry <= 14) {
            expiringCounts.medium++;
          } else {
            expiringCounts.low++;
          }
        }
      }
    });

    const newNotifications = [];

    // Create summary notifications
    if (expiringCounts.high > 0) {
      newNotifications.push({
        id: 'endorsements-high',
        type: 'endorsement-summary',
        title: 'Urgent: Endorsements Expiring Soon',
        message: `You have ${expiringCounts.high} endorsement${expiringCounts.high > 1 ? 's' : ''} expiring within 7 days`,
        priority: 'high',
        count: expiringCounts.high,
        daysRange: '≤7 days'
      });
    }

    if (expiringCounts.medium > 0) {
      newNotifications.push({
        id: 'endorsements-medium',
        type: 'endorsement-summary',
        title: 'Endorsements Expiring Soon',
        message: `You have ${expiringCounts.medium} endorsement${expiringCounts.medium > 1 ? 's' : ''} expiring within 8-14 days`,
        priority: 'medium',
        count: expiringCounts.medium,
        daysRange: '8-14 days'
      });
    }

    if (expiringCounts.low > 0) {
      newNotifications.push({
        id: 'endorsements-low',
        type: 'endorsement-summary',
        title: 'Endorsements Expiring Soon',
        message: `You have ${expiringCounts.low} endorsement${expiringCounts.low > 1 ? 's' : ''} expiring within 15-30 days`,
        priority: 'low',
        count: expiringCounts.low,
        daysRange: '15-30 days'
      });
    }

    // Filter out cleared notifications
    const activeNotifications = newNotifications.filter(notification => 
      !clearedNotifications.has(notification.id)
    );

    setNotifications(activeNotifications);
  }, [expiringEndorsements, templates, clearedNotifications]);

  // Clear notification function
  const clearNotification = (notificationId) => {
    setClearedNotifications(prev => new Set([...prev, notificationId]));
  };

  // Clear all notifications function
  const clearAllNotifications = () => {
    const allNotificationIds = notifications.map(n => n.id);
    setClearedNotifications(prev => new Set([...prev, ...allNotificationIds]));
  };

  const totals = entries.reduce(
    (acc, e) => {
      acc.flight += e.flight || 0;
      acc.prepost += e.prepost || 0;
      acc.ground += e.ground || 0;
      acc.total += (e.flight || 0) + (e.prepost || 0) + (e.ground || 0);
      return acc;
    },
    { flight: 0, prepost: 0, ground: 0, total: 0 }
  );

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const newEntry = {
        uid: user.uid,
        date,
        flight: off ? 0 : parseFloat(flight) || 0,
        prepost: off ? 0 : parseFloat(prepost) || 0,
        ground: off ? 0 : parseFloat(ground) || 0,
        cancellations: parseInt(cancellations) || 0,
        off,
        notes: notes || '',
        created: Timestamp.now(),
      };
      await addDoc(collection(db, 'hours'), newEntry);
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
  const monthYear = getMonthYear(date);
  const progress = goal ? Math.min((totals.total / goal) * 100, 100) : 0;
  const hoursLeft = goal !== null ? Math.max(goal - totals.total, 0) : null;

  return (
    <div className="dashboard-immersive-bg">
      {/* Top bar with month, total hours, and logout icon */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        style={{ position: 'relative', paddingTop: '2.5em' }}
      >
        {/* Notification Dropdown Only (no bell/logout button) */}
        {showNotifications && (
          <div className="notification-dropdown">
            <div className="notification-header">
              <h4>Notifications</h4>
              <div className="notification-header-actions">
                {notifications.length > 0 && (
                  <button
                    className="notification-clear-all-btn"
                    onClick={clearAllNotifications}
                    title="Clear all notifications"
                    aria-label="Clear all notifications"
                  >
                    Clear All <FaTimes style={{marginLeft: 6}} />
                  </button>
                )}
                <button
                  className="notification-close-btn"
                  onClick={() => setShowNotifications(false)}
                  title="Close notifications"
                  aria-label="Close notifications"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
            
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <p>No notifications</p>
              </div>
            ) : (
              <div className="notification-list">
                {notifications.map(notification => (
                  <div key={notification.id} className={`notification-item ${notification.priority}`}>
                    <div className="notification-icon">
                      <FaExclamationTriangle />
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">{notification.title}</div>
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-days-range">{notification.daysRange}</div>
                    </div>
                    <button
                      className="notification-clear-btn"
                      onClick={() => clearNotification(notification.id)}
                      title="Clear this notification"
                      aria-label="Clear this notification"
                    >
                      <FaTimes />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {notifications.length > 0 && (
              <div className="notification-footer">
                <button
                  className="notification-view-all-btn"
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/endorsements');
                  }}
                  title="View all endorsements"
                  aria-label="View all endorsements"
                >
                  View All Endorsements
                </button>
              </div>
            )}
          </div>
        )}

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
        </div>
        {/* Premium Goal/Pay Card */}
        <div className="dashboard-goalpay-card elevated">
          <div className="goalpay-icon-accent">
            <FaPlane size={32} color="#4EA8FF" />
          </div>
          <div className="goalpay-flex">
            <span className="goalpay-hoursleft">
              {goalLoading ? 'Loading…' : goal === null ? 'Set your monthly goal in Settings' : hoursLeft > 0 ? `${hoursLeft.toFixed(1)} hours left to reach your goal of ${goal}!` : 'Goal reached! 🎉'}
            </span>
            <span className="goalpay-divider" />
            <span className="goalpay-estpay">
              Estimated Pay: <span className="goalpay-payval">${estimatedPay.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </span>
          </div>
        </div>
        {/* Main content: responsive grid for form and table */}
        <div className="dashboard-main-grid">
          {/* Entry Form */}
          <FlightEntryForm
            values={{ date, flight, prepost, ground, cancellations, off, notes }}
            onChange={(field, value) => {
              if (field === 'date') setDate(value);
              else if (field === 'flight') setFlight(value);
              else if (field === 'prepost') setPrepost(value);
              else if (field === 'ground') setGround(value);
              else if (field === 'cancellations') setCancellations(value);
              else if (field === 'off') setOff(value);
              else if (field === 'notes') setNotes(value);
            }}
            onSubmit={handleSubmit}
            loading={loading}
          />
          {/* Table Section */}
          <div className="dashboard-table-section">
            <h3>Entries This Month</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Flight</th>
                  <th>Pre/Post</th>
                  <th>Ground</th>
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
                    <tr key={e.id}>
                      <td>{e.date}</td>
                      <td>{e.flight}</td>
                      <td>{e.prepost}</td>
                      <td>{e.ground}</td>
                      <td>{e.off ? '✔️' : ''}</td>
                      <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.notes || ''}>
                        {e.notes || ''}
                      </td>
                    </tr>
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
    </div>
  );
} 