import React, { useState } from 'react';
import { auth } from './firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { FiUserPlus, FiMail, FiLock, FiLogIn } from 'react-icons/fi';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="card">
        <h2>Register</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiMail style={{marginRight:4}} />
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiLock style={{marginRight:4}} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit"><FiUserPlus style={{marginRight:8}} />Register</button>
        </form>
        {error && <p style={{ color: 'red', marginTop: '1em' }}>{error}</p>}
        <div style={{ marginTop: '20px' }}>
          <Link to="/login" style={{ color: '#4EA8FF', display: 'flex', alignItems: 'center', gap: 6 }}><FiLogIn style={{marginRight:4}} />Already have an account? Login</Link>
        </div>
      </div>
    </div>
  );
} 