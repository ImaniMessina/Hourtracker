import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  Link
} from 'react-router-dom';
import { useEffect, useState } from 'react'
import './App.css'
import Register from './Register';
import Login from './Login';
import Dashboard from './Dashboard';
import PastMonths from './PastMonths';
import Settings from './Settings';
import PayStructure from './PayStructure';
import BulkEntry from './BulkEntry';
import WeeklyOffDays from './WeeklyOffDays';
import CancellationPay from './CancellationPay';
import Endorsements from './Endorsements';
import { auth } from './firebase';
import { FiLogOut } from 'react-icons/fi';
import { FaBell } from 'react-icons/fa';
import { FaBeer } from 'react-icons/fa';

function NavTabs({ onShowNotifications, notificationCount }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubscribe();
  }, []);
  // Hide on login/register or if not logged in
  if (!user || location.pathname === '/login' || location.pathname === '/register') return null;
  const tabs = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/past-months', label: 'Past Months' },
    { path: '/endorsements', label: 'Endorsements' },
    { path: '/settings', label: 'Settings' },
  ];

  const handleLogout = async () => {
    await auth.signOut();
    window.location.href = '/login';
  };

  return (
    <nav className="nav-tabs nav-tabs-with-logout">
      <div className="nav-tabs-list">
        {tabs.map(tab => (
          <Link
            key={tab.path}
            to={tab.path}
            className={location.pathname.startsWith(tab.path) ? 'active' : ''}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      <div className="nav-tabs-actions">
        <button className="notification-bell-btn" onClick={onShowNotifications} title="Notifications" aria-label="Notifications">
          {/* Simpler bell SVG, no clapper/line at the bottom */}
          <svg width="22" height="22" viewBox="0 0 24 24" style={{display:'block', color:'#4EA8FF', background:'none', fill:'none', stroke:'#4EA8FF', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round'}}>
            <path d="M18 16v-5a6 6 0 1 0-12 0v5l-1.5 2v1h15v-1l-1.5-2z"/>
            {/* Removed clapper path for a cleaner look */}
          </svg>
          {/* Notification badge removed for rebuild */}
        </button>
        <button className="logout-btn" onClick={handleLogout} title="Log out" aria-label="Log out">
          <svg width="22" height="22" viewBox="0 0 24 24" style={{display:'block', color:'#4EA8FF', background:'none', fill:'none', stroke:'#4EA8FF', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round'}}>
            <path d="M10 17l5-5-5-5"/>
            <path d="M15 12H3"/>
            <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
          </svg>
        </button>
      </div>
    </nav>
  );
}

function AppRoutes() {
  return (
    <>
      <NavTabs />
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/bulk-entry" element={<BulkEntry />} />
        <Route path="/past-months" element={<PastMonths />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/weekly-off-days" element={<WeeklyOffDays />} />
        <Route path="/settings/cancellation-pay" element={<CancellationPay />} />
        <Route path="/pay-structure" element={<PayStructure />} />
        <Route path="/endorsements" element={<Endorsements />} />
      </Routes>
    </>
  );
}

function App() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  return (
    <Router>
      <NavTabs
        onShowNotifications={() => setShowNotifications(true)}
        notificationCount={notifications.length}
      />
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={
          <Dashboard
            showNotifications={showNotifications}
            setShowNotifications={setShowNotifications}
            notifications={notifications}
            setNotifications={setNotifications}
          />
        } />
        <Route path="/bulk-entry" element={<BulkEntry />} />
        <Route path="/past-months" element={<PastMonths />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/weekly-off-days" element={<WeeklyOffDays />} />
        <Route path="/settings/cancellation-pay" element={<CancellationPay />} />
        <Route path="/pay-structure" element={<PayStructure />} />
        <Route path="/endorsements" element={<Endorsements />} />
      </Routes>
    </Router>
  );
}

export default App
