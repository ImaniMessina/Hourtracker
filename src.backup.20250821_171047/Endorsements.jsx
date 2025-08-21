import React, { useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, Timestamp, query, where, orderBy, doc, getDoc, onSnapshot, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { FaPlus, FaEdit, FaTrash, FaFileAlt, FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaUser } from 'react-icons/fa';

export default function Endorsements() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('templates'); // 'templates' or 'endorsements'
  const [templates, setTemplates] = useState([]);
  const [endorsements, setEndorsements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    duration: '',
    durationUnit: 'days', // 'days', 'months', 'years'
    neverExpires: false
  });
  const [editingTemplate, setEditingTemplate] = useState(null);

  // Endorsement form state
  const [endorsementForm, setEndorsementForm] = useState({
    templateId: '',
    studentName: '',
    studentId: '',
    dateGiven: new Date().toISOString().slice(0, 10),
    notes: ''
  });
  const [editingEndorsement, setEditingEndorsement] = useState(null);

  // Filter state
  const [endorsementFilter, setEndorsementFilter] = useState('all'); // 'all', 'active', 'expired', 'expiring-soon'
  const [studentNameFilter, setStudentNameFilter] = useState('');
  const [templateFilter, setTemplateFilter] = useState('');
  const [expiringDaysFilter, setExpiringDaysFilter] = useState('');

  // Debug template state changes
  useEffect(() => {
    console.log('Templates state updated:', templates.length, 'templates');
    if (templates.length > 0) {
      console.log('Template names:', templates.map(t => t.name));
    }
  }, [templates]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (!u) navigate('/login');
    });
    return () => unsubscribe();
  }, [navigate]);

  // Load data
  useEffect(() => {
    if (!user) {
      console.log('No user, skipping data load');
      return;
    }

    console.log('Loading data for user:', user.uid);

    // Load templates
    const templatesQuery = query(
      collection(db, 'endorsementTemplates'),
      where('uid', '==', user.uid),
      orderBy('name', 'asc')
    );
    const templatesUnsub = onSnapshot(templatesQuery, (snap) => {
      console.log('Templates snapshot:', snap.docs.length, 'templates found');
      setTemplates(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error('Error loading templates:', error);
    });

    // Load endorsements
    const endorsementsQuery = query(
      collection(db, 'endorsements'),
      where('uid', '==', user.uid),
      orderBy('dateGiven', 'desc')
    );
    const endorsementsUnsub = onSnapshot(endorsementsQuery, (snap) => {
      console.log('Endorsements snapshot:', snap.docs.length, 'endorsements found');
      setEndorsements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error('Error loading endorsements:', error);
    });

    return () => {
      templatesUnsub();
      endorsementsUnsub();
    };
  }, [user]);

  // Calculate expiration date
  const calculateExpirationDate = (dateGiven, duration, durationUnit, neverExpires) => {
    if (neverExpires) {
      return null;
    }
    
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

  // Check if endorsement is expired
  const isExpired = (expirationDate) => {
    if (!expirationDate) return false; // Never expires
    return new Date(expirationDate) < new Date();
  };

  // Check if endorsement is expiring soon
  const isExpiringSoon = (expirationDate, daysThreshold = 30) => {
    if (!expirationDate) return false; // Never expires
    const today = new Date();
    const expiration = new Date(expirationDate);
    const diffTime = expiration - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= daysThreshold;
  };

  // Get unique student names for filter
  const uniqueStudentNames = [...new Set(endorsements.map(e => e.studentName).filter(name => name))];

  // Filter endorsements
  const filteredEndorsements = endorsements.filter(endorsement => {
    const template = templates.find(t => t.id === endorsement.templateId);
    if (!template) return false;
    
    const expirationDate = calculateExpirationDate(
      endorsement.dateGiven, 
      template.duration, 
      template.durationUnit,
      template.neverExpires
    );
    
    // Student name filter
    if (studentNameFilter && !endorsement.studentName.toLowerCase().includes(studentNameFilter.toLowerCase())) {
      return false;
    }
    
    // Template filter
    if (templateFilter && endorsement.templateId !== templateFilter) {
      return false;
    }
    
    // Status filter
    switch (endorsementFilter) {
      case 'active':
        // Never expires templates are always active
        if (template.neverExpires) return true;
        return !isExpired(expirationDate);
      case 'expired':
        // Never expires templates are never expired
        if (template.neverExpires) return false;
        return isExpired(expirationDate);
      case 'expiring-soon':
        // Never expires templates are never expiring soon
        if (template.neverExpires) return false;
        const daysThreshold = expiringDaysFilter ? parseInt(expiringDaysFilter) : 30;
        return isExpiringSoon(expirationDate, daysThreshold);
      default:
        return true;
    }
  });

  // Template handlers
  const handleTemplateSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Debug logging
    console.log('Template submission started');
    console.log('User:', user);
    console.log('Template form data:', templateForm);

    if (!user) {
      setError('User not authenticated. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      // Validate form data
      if (!templateForm.name.trim()) {
        setError('Template name is required.');
        setLoading(false);
        return;
      }

      if (!templateForm.neverExpires && (!templateForm.duration || templateForm.duration <= 0)) {
        setError('Duration is required and must be greater than 0.');
        setLoading(false);
        return;
      }

      const templateData = {
        uid: user.uid,
        name: templateForm.name.trim(),
        description: templateForm.description.trim(),
        duration: templateForm.neverExpires ? null : parseInt(templateForm.duration),
        durationUnit: templateForm.neverExpires ? null : templateForm.durationUnit,
        neverExpires: templateForm.neverExpires,
        created: Timestamp.now()
      };

      console.log('Template data to save:', templateData);

      if (editingTemplate) {
        console.log('Updating existing template:', editingTemplate.id);
        await updateDoc(doc(db, 'endorsementTemplates', editingTemplate.id), templateData);
        setSuccess('Template updated!');
      } else {
        console.log('Creating new template');
        try {
          const docRef = await addDoc(collection(db, 'endorsementTemplates'), templateData);
          console.log('Template created with ID:', docRef.id);
          setSuccess('Template created!');
        } catch (err) {
          console.error('Error creating template:', err);
          setError(`Error creating template: ${err.message}`);
          setLoading(false);
          return;
        }
      }

      setTemplateForm({ name: '', description: '', duration: '', durationUnit: 'days', neverExpires: false });
      setEditingTemplate(null);
    } catch (err) {
      console.error('Error saving template:', err);
      if (err.code === 'permission-denied') {
        setError('Permission denied. Please check your Firebase configuration.');
      } else if (err.code === 'unavailable') {
        setError('Network error. Please check your internet connection.');
      } else {
        setError(`Error saving template: ${err.message}`);
      }
    }
    setLoading(false);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description,
      duration: template.duration ? template.duration.toString() : '',
      durationUnit: template.durationUnit || 'days',
      neverExpires: template.neverExpires || false
    });
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      // Remove from local state immediately for instant feedback
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      
      await deleteDoc(doc(db, 'endorsementTemplates', templateId));
      setSuccess('Template deleted!');
    } catch (err) {
      // If deletion fails, revert the local state change
      console.error('Error deleting template:', err);
      setError('Error deleting template. Please try again.');
      // Reload templates from Firebase to restore correct state
      const templatesQuery = query(
        collection(db, 'endorsementTemplates'),
        where('uid', '==', user.uid),
        orderBy('name', 'asc')
      );
      const snapshot = await getDocs(templatesQuery);
      setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }
  };

  // Endorsement handlers
  const handleEndorsementSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Debug logging
    console.log('Endorsement submission started');
    console.log('User:', user);
    console.log('Endorsement form data:', endorsementForm);
    console.log('Available templates:', templates);

    if (!user) {
      setError('User not authenticated. Please log in again.');
      setLoading(false);
      return;
    }

    if (!endorsementForm.templateId) {
      setError('Please select a template.');
      setLoading(false);
      return;
    }

    try {
      const endorsementData = {
        uid: user.uid,
        templateId: endorsementForm.templateId,
        studentName: endorsementForm.studentName.trim(),
        studentId: endorsementForm.studentId.trim(),
        dateGiven: endorsementForm.dateGiven,
        notes: endorsementForm.notes.trim(),
        created: Timestamp.now()
      };

      console.log('Endorsement data to save:', endorsementData);

      if (editingEndorsement) {
        console.log('Updating existing endorsement:', editingEndorsement.id);
        await updateDoc(doc(db, 'endorsements', editingEndorsement.id), endorsementData);
        setSuccess('Endorsement updated!');
      } else {
        console.log('Creating new endorsement');
        try {
          const docRef = await addDoc(collection(db, 'endorsements'), endorsementData);
          console.log('Endorsement created with ID:', docRef.id);
          setSuccess('Endorsement recorded!');
        } catch (err) {
          console.error('Error creating endorsement:', err);
          setError(`Error creating endorsement: ${err.message}`);
          setLoading(false);
          return;
        }
      }

      setEndorsementForm({
        templateId: '',
        studentName: '',
        studentId: '',
        dateGiven: new Date().toISOString().slice(0, 10),
        notes: ''
      });
      setEditingEndorsement(null);
    } catch (err) {
      console.error('Error saving endorsement:', err);
      setError(`Error saving endorsement: ${err.message}`);
    }
    setLoading(false);
  };

  const handleEditEndorsement = (endorsement) => {
    setEditingEndorsement(endorsement);
    setEndorsementForm({
      templateId: endorsement.templateId,
      studentName: endorsement.studentName,
      studentId: endorsement.studentId,
      dateGiven: endorsement.dateGiven,
      notes: endorsement.notes
    });
  };

  const handleDeleteEndorsement = async (endorsementId) => {
    if (!confirm('Are you sure you want to delete this endorsement record?')) return;
    
    try {
      // Remove from local state immediately for instant feedback
      setEndorsements(prev => prev.filter(e => e.id !== endorsementId));
      
      await deleteDoc(doc(db, 'endorsements', endorsementId));
      setSuccess('Endorsement deleted!');
    } catch (err) {
      // If deletion fails, revert the local state change
      console.error('Error deleting endorsement:', err);
      setError('Error deleting endorsement. Please try again.');
      // Reload endorsements from Firebase to restore correct state
      const endorsementsQuery = query(
        collection(db, 'endorsements'),
        where('uid', '==', user.uid),
        orderBy('dateGiven', 'desc')
      );
      const snapshot = await getDocs(endorsementsQuery);
      setEndorsements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setEndorsementFilter('all');
    setStudentNameFilter('');
    setTemplateFilter('');
    setExpiringDaysFilter('');
  };

  if (!user) return null;

  return (
    <div className="card">
      <h2>Endorsements</h2>
      
      {/* Success/Error Messages */}
      {success && <div className="success-message">{success}</div>}
      {error && <div className="error-message">{error}</div>}

      {/* Tab Navigation */}
      <div className="endorsements-tabs">
        <button 
          className={`endorsement-tab ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          <FaFileAlt /> Templates
        </button>
        <button 
          className={`endorsement-tab ${activeTab === 'endorsements' ? 'active' : ''}`}
          onClick={() => setActiveTab('endorsements')}
        >
          <FaCheckCircle /> Endorsements
        </button>
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="endorsements-content">
          <div className="endorsements-section">
            <h3>{editingTemplate ? 'Edit Template' : 'Create New Template'}</h3>
            <form onSubmit={handleTemplateSubmit} className="endorsement-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Template Name</label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                    placeholder="e.g., 90-Day Solo Endorsement"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Duration</label>
                  <div className="duration-inputs">
                    <input
                      type="number"
                      value={templateForm.duration}
                      onChange={(e) => setTemplateForm({...templateForm, duration: e.target.value})}
                      placeholder="90"
                      min="1"
                      required={!templateForm.neverExpires}
                      disabled={templateForm.neverExpires}
                    />
                    <select
                      value={templateForm.durationUnit}
                      onChange={(e) => setTemplateForm({...templateForm, durationUnit: e.target.value})}
                      disabled={templateForm.neverExpires}
                    >
                      <option value="days">Days</option>
                      <option value="months">Months</option>
                      <option value="years">Years</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({...templateForm, description: e.target.value})}
                  placeholder="Brief description of this endorsement type..."
                  rows="3"
                />
              </div>
              
              <div className="form-group">
                <label className="never-expires-label">
                  <input
                    type="checkbox"
                    checked={templateForm.neverExpires}
                    onChange={(e) => setTemplateForm({...templateForm, neverExpires: e.target.checked})}
                  />
                  <span className="never-expires-text">This endorsement never expires</span>
                </label>
              </div>
              <div className="form-actions">
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.97 }}
                  className="primary-btn"
                >
                  {loading ? 'Saving...' : (editingTemplate ? 'Update Template' : 'Create Template')}
                </motion.button>
                {editingTemplate && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTemplate(null);
                      setTemplateForm({ name: '', description: '', duration: '', durationUnit: 'days', neverExpires: false });
                    }}
                    className="secondary-btn"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="endorsements-section">
            <h3>Your Templates</h3>
            {templates.length === 0 ? (
              <p className="empty-state">No templates created yet. Create your first template above.</p>
            ) : (
              <div className="templates-grid">
                {templates.map(template => (
                  <div key={template.id} className="template-card">
                    <div className="template-header">
                      <h4>{template.name}</h4>
                      <div className="template-actions">
                        <button
                          onClick={() => handleEditTemplate(template)}
                          className="icon-btn"
                          title="Edit template"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="icon-btn danger"
                          title="Delete template"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                    <p className="template-description">{template.description}</p>
                    <div className="template-duration">
                      {template.neverExpires ? (
                        <span className="never-expires-badge">Never Expires</span>
                      ) : (
                        `Duration: ${template.duration} ${template.durationUnit}`
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Endorsements Tab */}
      {activeTab === 'endorsements' && (
        <div className="endorsements-content">
          <div className="endorsements-section">
            <h3>{editingEndorsement ? 'Edit Endorsement' : 'Record New Endorsement'}</h3>
            <form onSubmit={handleEndorsementSubmit} className="endorsement-form">
              
              <div className="form-row">
                <div className="form-group">
                  <label>Template</label>
                  <select
                    value={endorsementForm.templateId}
                    onChange={(e) => {
                      console.log('Template selected:', e.target.value);
                      setEndorsementForm({...endorsementForm, templateId: e.target.value});
                    }}
                    required
                  >
                    <option value="">Select a template</option>
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Date Given</label>
                  <input
                    type="date"
                    value={endorsementForm.dateGiven}
                    onChange={(e) => setEndorsementForm({...endorsementForm, dateGiven: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Student Name</label>
                  <input
                    type="text"
                    value={endorsementForm.studentName}
                    onChange={(e) => setEndorsementForm({...endorsementForm, studentName: e.target.value})}
                    placeholder="Student's full name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Student ID (Optional)</label>
                  <input
                    type="text"
                    value={endorsementForm.studentId}
                    onChange={(e) => setEndorsementForm({...endorsementForm, studentId: e.target.value})}
                    placeholder="Student ID or certificate number"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={endorsementForm.notes}
                  onChange={(e) => setEndorsementForm({...endorsementForm, notes: e.target.value})}
                  placeholder="Additional notes about this endorsement..."
                  rows="3"
                />
              </div>
              <div className="form-actions">
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.97 }}
                  className="primary-btn"
                >
                  {loading ? 'Saving...' : (editingEndorsement ? 'Update Endorsement' : 'Record Endorsement')}
                </motion.button>
                {editingEndorsement && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEndorsement(null);
                      setEndorsementForm({
                        templateId: '',
                        studentName: '',
                        studentId: '',
                        dateGiven: new Date().toISOString().slice(0, 10),
                        notes: ''
                      });
                    }}
                    className="secondary-btn"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="endorsements-section">
            <div className="endorsements-header">
              <h3>Endorsement Records</h3>
              <button onClick={clearFilters} className="secondary-btn small">
                Clear Filters
              </button>
            </div>
            
            {/* Advanced Filters */}
            <div className="filters-section">
              <div className="filters-grid">
                <div className="filter-group">
                  <label>Status</label>
                  <select
                    value={endorsementFilter}
                    onChange={(e) => setEndorsementFilter(e.target.value)}
                  >
                    <option value="all">All Endorsements</option>
                    <option value="active">Active Only</option>
                    <option value="expired">Expired Only</option>
                    <option value="expiring-soon">Expiring Soon</option>
                  </select>
                </div>
                
                <div className="filter-group">
                  <label>Student Name</label>
                  <input
                    type="text"
                    value={studentNameFilter}
                    onChange={(e) => setStudentNameFilter(e.target.value)}
                    placeholder="Filter by student name..."
                  />
                </div>
                
                <div className="filter-group">
                  <label>Template Type</label>
                  <select
                    value={templateFilter}
                    onChange={(e) => setTemplateFilter(e.target.value)}
                  >
                    <option value="">All Templates</option>
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {endorsementFilter === 'expiring-soon' && (
                  <div className="filter-group">
                    <label>Within Days</label>
                    <input
                      type="number"
                      value={expiringDaysFilter}
                      onChange={(e) => setExpiringDaysFilter(e.target.value)}
                      placeholder="30"
                      min="1"
                    />
                  </div>
                )}
              </div>
            </div>
            
            {filteredEndorsements.length === 0 ? (
              <p className="empty-state">
                {endorsementFilter === 'all' && !studentNameFilter && !templateFilter
                  ? 'No endorsements recorded yet. Record your first endorsement above.'
                  : 'No endorsements match your current filters.'
                }
              </p>
            ) : (
              <div className="endorsements-table">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Template</th>
                      <th>Date Given</th>
                      <th>Expires</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEndorsements.map(endorsement => {
                      const template = templates.find(t => t.id === endorsement.templateId);
                      const expirationDate = template 
                        ? calculateExpirationDate(endorsement.dateGiven, template.duration, template.durationUnit, template.neverExpires)
                        : null;
                      
                      // Handle never expires templates
                      if (template && template.neverExpires) {
                        return (
                          <tr key={endorsement.id}>
                            <td>
                              <div className="student-info">
                                <div className="student-name">{endorsement.studentName}</div>
                                {endorsement.studentId && (
                                  <div className="student-id">ID: {endorsement.studentId}</div>
                                )}
                              </div>
                            </td>
                            <td>{template.name}</td>
                            <td>{endorsement.dateGiven}</td>
                            <td>Never Expires</td>
                            <td>
                              <span className="status-badge active">
                                <FaCheckCircle />
                                Active
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  onClick={() => handleEditEndorsement(endorsement)}
                                  className="icon-btn small"
                                  title="Edit endorsement"
                                >
                                  <FaEdit />
                                </button>
                                <button
                                  onClick={() => handleDeleteEndorsement(endorsement.id)}
                                  className="icon-btn small danger"
                                  title="Delete endorsement"
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      
                      // Handle regular templates with expiration
                      const expired = expirationDate ? isExpired(expirationDate) : false;
                      const expiringSoon = expirationDate ? isExpiringSoon(expirationDate, expiringDaysFilter ? parseInt(expiringDaysFilter) : 30) : false;
                      
                      let statusClass = 'active';
                      let statusText = 'Active';
                      let statusIcon = <FaCheckCircle />;
                      
                      if (expired) {
                        statusClass = 'expired';
                        statusText = 'Expired';
                        statusIcon = <FaTimesCircle />;
                      } else if (expiringSoon) {
                        statusClass = 'expiring-soon';
                        statusText = 'Expiring Soon';
                        statusIcon = <FaCalendarAlt />;
                      }
                      
                      return (
                        <tr key={endorsement.id} className={expired ? 'expired-row' : ''}>
                          <td>
                            <div className="student-info">
                              <div className="student-name">{endorsement.studentName}</div>
                              {endorsement.studentId && (
                                <div className="student-id">ID: {endorsement.studentId}</div>
                              )}
                            </div>
                          </td>
                          <td>{template ? template.name : 'Unknown Template'}</td>
                          <td>{endorsement.dateGiven}</td>
                          <td>{expirationDate || 'N/A'}</td>
                          <td>
                            <span className={`status-badge ${statusClass}`}>
                              {statusIcon}
                              {statusText}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                onClick={() => handleEditEndorsement(endorsement)}
                                className="icon-btn small"
                                title="Edit endorsement"
                              >
                                <FaEdit />
                              </button>
                              <button
                                onClick={() => handleDeleteEndorsement(endorsement.id)}
                                className="icon-btn small danger"
                                title="Delete endorsement"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 