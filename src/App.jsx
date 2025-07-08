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
import { auth } from './firebase';

function NavTabs() {
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
    { path: '/settings', label: 'Settings' },
  ];
  return (
    <nav className="nav-tabs">
      {tabs.map(tab => (
        <Link
          key={tab.path}
          to={tab.path}
          className={location.pathname.startsWith(tab.path) ? 'active' : ''}
        >
          {tab.label}
        </Link>
      ))}
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
        <Route path="/past-months" element={<PastMonths />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/pay-structure" element={<PayStructure />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App
