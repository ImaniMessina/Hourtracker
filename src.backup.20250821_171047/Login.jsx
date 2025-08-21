import React, { useState } from 'react';
import { auth } from './firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { FiLogIn, FiMail, FiKey, FiArrowLeft, FiUserPlus, FiLock, FiSend, FiX } from 'react-icons/fi';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setResetMsg('');
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetMsg('Password reset email sent!');
    } catch (err) {
      setResetMsg('Error: ' + err.message);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none' }}>
      <div className="card">
        <h2>Login</h2>
        {showReset ? (
          <form onSubmit={handleReset} style={{ marginBottom: 16 }}>
            <input type="email" placeholder="Enter your email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required />
            <br />
            <button type="submit"><FiSend style={{marginRight:8}} />Send Reset Email</button>
            <button type="button" onClick={() => setShowReset(false)} style={{ marginLeft: 8 }}><FiArrowLeft style={{marginRight:8}} />Cancel</button>
            {resetMsg && <div style={{ marginTop: 12, color: resetMsg.startsWith('Error') ? 'salmon' : '#4EA8FF' }}>{resetMsg}</div>}
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiMail style={{marginRight:4}} />
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiLock style={{marginRight:4}} />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit"><FiLogIn style={{marginRight:8}} />Login</button>
          </form>
        )}
        {!showReset && (
          <div style={{ marginTop: 12 }}>
            <button type="button" onClick={() => setShowReset(true)} style={{ background: 'none', color: '#4EA8FF', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: '1em', display: 'flex', alignItems: 'center', gap: 6 }}><FiKey style={{marginRight:4}} />Forgot Password?</button>
          </div>
        )}
        {error && <p style={{ color: 'red', marginTop: '1em' }}>{error}</p>}
        <div style={{ marginTop: '20px' }}>
          <Link to="/register" style={{ color: '#4EA8FF', display: 'flex', alignItems: 'center', gap: 6 }}><FiLogIn style={{marginRight:4}} />Don't have an account? Register</Link>
        </div>
      </div>
    </div>
  );
} 