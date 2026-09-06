import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Building, Landmark, Coins, ShieldCheck, Globe, FileText,
  Briefcase, TrendingUp, FolderOpen, Pencil, Trash2, UsersRound, Plus,
  UploadCloud, FileCheck, Download, Check, AlertTriangle, X, LayoutDashboard,
  Settings, UserPlus, Info, Calendar
} from 'lucide-react';
import styles from './AssetDetails.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const CATEGORY_META = {
  property: {
    label: 'Property',
    description: 'Real estate, land, and physical property holdings',
    icon: Building,
  },
  financial: {
    label: 'Financial',
    description: 'Bank accounts, savings, deposits and financial holdings',
    icon: Landmark,
  },
  crypto: {
    label: 'Crypto',
    description: 'Digital currencies, tokens, wallets and exchange accounts',
    icon: Coins,
  },
  insurance: {
    label: 'Insurance',
    description: 'Policies, health, term and protection records',
    icon: ShieldCheck,
  },
  digital: {
    label: 'Digital',
    description: 'Online accounts, domains, cloud services and digital assets',
    icon: Globe,
  },
  legal: {
    label: 'Legal',
    description: 'Wills, trusts, powers of attorney and legal records',
    icon: FileText,
  },
  business: {
    label: 'Business',
    description: 'Companies, partnerships, equity and commercial holdings',
    icon: Briefcase,
  },
  investments: {
    label: 'Investments',
    description: 'Mutual funds, stocks, bonds and investment portfolios',
    icon: TrendingUp,
  },
  other: {
    label: 'Other Assets',
    description: 'Vehicles, valuables, heirlooms and miscellaneous legacy items',
    icon: FolderOpen,
  },
};

const getCategoryMeta = (cat) => {
  const key = (cat || 'other').toLowerCase().trim();
  return CATEGORY_META[key] || {
    label: key.charAt(0).toUpperCase() + key.slice(1),
    description: 'Recorded legacy items and assets',
    icon: FolderOpen,
  };
};

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatCurrency = (val, curr = 'INR') => {
  if (val === null || val === undefined || isNaN(Number(val))) return 'Not valued';
  const num = Number(val);
  const currencyCode = (curr || 'INR').toUpperCase();
  if (currencyCode === 'INR') {
    return `₹${num.toLocaleString('en-IN')}`;
  }
  return `${currencyCode} ${num.toLocaleString('en-US')}`;
};

const formatCleanPercent = (val) => {
  const num = Number(val);
  if (isNaN(num)) return '0%';
  return `${parseFloat(num.toFixed(2))}%`;
};

export default function AssetDetails() {
  const { assetId } = useParams();
  const navigate = useNavigate();

  // Asset Data & Loading States
  const [asset, setAsset] = useState(null);
  const [loadingAsset, setLoadingAsset] = useState(true);
  const [assetError, setAssetError] = useState('');

  // Documents & Loading States
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  // Allocations & Loading States
  const [allocations, setAllocations] = useState([]);
  const [totalAllocated, setTotalAllocated] = useState(0);
  const [remainingAllocated, setRemainingAllocated] = useState(100);
  const [loadingAllocations, setLoadingAllocations] = useState(true);

  // User's Full Nominee List
  const [allNominees, setAllNominees] = useState([]);

  // Edit Asset Modal
  const [isEditAssetOpen, setIsEditAssetOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    category: 'financial',
    subcategory: '',
    description: '',
    estimatedValue: '',
    currency: 'INR',
    valuationDate: '',
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editFormError, setEditFormError] = useState('');

  // Delete Asset Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingAsset, setIsDeletingAsset] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Upload Document Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFormData, setUploadFormData] = useState({
    name: '',
    description: '',
    file: null,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Delete Document Modal
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);

  // Assign Nominee Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignFormData, setAssignFormData] = useState({
    nomineeId: '',
    allocationPercentage: '',
    canView: true,
    canDownloadDocs: true,
  });
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);
  const [assignError, setAssignError] = useState('');

  // Edit Allocation Modal
  const [editingAssignment, setEditingAssignment] = useState(null);

  // Fetch Asset
  const fetchAsset = async () => {
    try {
      setLoadingAsset(true);
      setAssetError('');
      const res = await fetch(`${API_URL}/vault/assets/${assetId}`, { credentials: 'include' });
      if (res.status === 404) {
        setAssetError('Asset not found or access denied.');
        setAsset(null);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAssetError(data.error?.message || 'Failed to load asset details.');
        setAsset(null);
        return;
      }
      const data = await res.json();
      setAsset(data.asset);
    } catch (err) {
      console.error('Error fetching asset:', err);
      setAssetError('Network error while loading asset.');
    } finally {
      setLoadingAsset(false);
    }
  };

  // Fetch Documents Attached to this Asset
  const fetchDocuments = async () => {
    try {
      setLoadingDocs(true);
      const res = await fetch(`${API_URL}/documents?assetId=${assetId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Fetch Nominee Allocations for this Asset
  const fetchAllocations = async () => {
    try {
      setLoadingAllocations(true);
      const res = await fetch(`${API_URL}/vault/assets/${assetId}/nominees`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAllocations(data.nominees || []);
        setTotalAllocated(data.total_allocated_percentage || 0);
        setRemainingAllocated(data.remaining_percentage !== undefined ? data.remaining_percentage : 100);
      }
    } catch (err) {
      console.error('Error fetching allocations:', err);
    } finally {
      setLoadingAllocations(false);
    }
  };

  // Fetch User's Global Nominee Directory
  const fetchAllNominees = async () => {
    try {
      const res = await fetch(`${API_URL}/nominees`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAllNominees(data.nominees || []);
      }
    } catch (err) {
      console.error('Error fetching nominees:', err);
    }
  };

  useEffect(() => {
    if (assetId) {
      fetchAsset();
      fetchDocuments();
      fetchAllocations();
      fetchAllNominees();
    }
  }, [assetId]);

  // Handle Edit Asset
  const handleOpenEditAsset = () => {
    if (!asset) return;
    setEditFormError('');
    setEditFormData({
      name: asset.name || '',
      category: asset.category || 'financial',
      subcategory: asset.subcategory || '',
      description: asset.description || '',
      estimatedValue: asset.estimated_value !== null ? asset.estimated_value : '',
      currency: asset.currency || 'INR',
      valuationDate: asset.valuation_date || '',
    });
    setIsEditAssetOpen(true);
  };

  const handleCloseEditAsset = () => {
    if (isSubmittingEdit) return;
    setIsEditAssetOpen(false);
    setEditFormError('');
  };

  const handleSaveAssetSubmit = async (e) => {
    e.preventDefault();
    if (!editFormData.name.trim()) {
      setEditFormError('Asset name is required.');
      return;
    }
    try {
      setIsSubmittingEdit(true);
      setEditFormError('');
      const payload = {
        name: editFormData.name.trim(),
        category: editFormData.category,
        subcategory: editFormData.subcategory.trim() || null,
        description: editFormData.description.trim() || null,
        estimatedValue: editFormData.estimatedValue !== '' ? Number(editFormData.estimatedValue) : null,
        currency: editFormData.currency.trim().toUpperCase() || 'INR',
        valuationDate: editFormData.valuationDate || null,
      };
      const res = await fetch(`${API_URL}/vault/assets/${assetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditFormError(data.error?.message || 'Failed to update asset.');
        return;
      }
      setAsset(data.asset);
      setIsEditAssetOpen(false);
    } catch (err) {
      console.error('Error updating asset:', err);
      setEditFormError('An unexpected error occurred while saving.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Delete Asset
  const handleConfirmDeleteAsset = async () => {
    try {
      setIsDeletingAsset(true);
      setDeleteError('');
      const res = await fetch(`${API_URL}/vault/assets/${assetId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error?.message || 'Failed to delete asset.');
        return;
      }
      navigate('/vault', { replace: true });
    } catch (err) {
      console.error('Error deleting asset:', err);
      setDeleteError('An unexpected error occurred while deleting.');
    } finally {
      setIsDeletingAsset(false);
    }
  };

  // Handle Upload Document Linked to this Asset
  const handleOpenUpload = () => {
    setUploadError('');
    setUploadFormData({
      name: '',
      description: '',
      file: null,
    });
    setIsUploadModalOpen(true);
  };

  const handleCloseUpload = () => {
    if (isUploading) return;
    setIsUploadModalOpen(false);
    setUploadError('');
  };

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    if (!allowed.includes(ext)) {
      setUploadError('Unsupported file type. Please upload a PDF, JPG, PNG, or WebP.');
      return;
    }
    if (selectedFile.size > 15 * 1024 * 1024) {
      setUploadError('File size exceeds 15 MB limit.');
      return;
    }
    setUploadError('');
    const baseName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) || selectedFile.name;
    setUploadFormData((prev) => ({
      ...prev,
      file: selectedFile,
      name: prev.name.trim() ? prev.name : baseName,
    }));
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFormData.file) {
      setUploadError('Please select a file to upload.');
      return;
    }
    if (!uploadFormData.name.trim()) {
      setUploadError('Document name is required.');
      return;
    }
    try {
      setIsUploading(true);
      setUploadError('');
      const form = new FormData();
      form.append('file', uploadFormData.file);
      form.append('name', uploadFormData.name.trim());
      if (uploadFormData.description.trim()) {
        form.append('description', uploadFormData.description.trim());
      }
      form.append('assetId', assetId);

      const res = await fetch(`${API_URL}/documents`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error?.message || 'Failed to upload document.');
        return;
      }
      setIsUploadModalOpen(false);
      fetchDocuments();
    } catch (err) {
      console.error('Error uploading document:', err);
      setUploadError('An unexpected error occurred during upload.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Download Document
  const handleDownloadDoc = async (docId, fileName) => {
    try {
      const res = await fetch(`${API_URL}/documents/${docId}/download`, { credentials: 'include' });
      if (!res.ok) {
        alert('Failed to download document. Please try again.');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || 'document');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading document:', err);
      alert('Error downloading document.');
    }
  };

  // Handle Delete Document
  const handleDeleteDocConfirm = async () => {
    if (!documentToDelete) return;
    try {
      setIsDeletingDoc(true);
      const res = await fetch(`${API_URL}/documents/${documentToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error?.message || 'Failed to delete document.');
        return;
      }
      setDocumentToDelete(null);
      fetchDocuments();
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Error deleting document.');
    } finally {
      setIsDeletingDoc(false);
    }
  };

  // Handle Assign Nominee
  const handleOpenAssignNominee = () => {
    setAssignError('');
    setEditingAssignment(null);
    setAssignFormData({
      nomineeId: '',
      allocationPercentage: '',
      canView: true,
      canDownloadDocs: true,
    });
    setIsAssignModalOpen(true);
  };

  const handleOpenEditAssignment = (item) => {
    setAssignError('');
    setEditingAssignment(item);
    setAssignFormData({
      nomineeId: item.nominee_id,
      allocationPercentage: item.allocation_percentage.toString(),
      canView: item.can_view !== undefined ? item.can_view : true,
      canDownloadDocs: item.can_download_docs !== undefined ? item.can_download_docs : true,
    });
    setIsAssignModalOpen(true);
  };

  const handleCloseAssignModal = () => {
    if (isSubmittingAssign) return;
    setIsAssignModalOpen(false);
    setEditingAssignment(null);
    setAssignError('');
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    const pct = Number(assignFormData.allocationPercentage);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      setAssignError('Allocation percentage must be between 0.01 and 100.');
      return;
    }
    const currentAllocatedExcludingEdit = editingAssignment
      ? totalAllocated - (editingAssignment.allocation_percentage || 0)
      : totalAllocated;
    const maxAvailable = Math.max(0, Math.round((100 - currentAllocatedExcludingEdit) * 100) / 100);
    if (pct > maxAvailable) {
      setAssignError(`Allocation cannot exceed available ${maxAvailable}%.`);
      return;
    }

    try {
      setIsSubmittingAssign(true);
      setAssignError('');

      if (editingAssignment) {
        // Update allocation PUT
        const res = await fetch(`${API_URL}/vault/assets/${assetId}/nominees/${editingAssignment.nominee_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            allocationPercentage: pct,
            canView: assignFormData.canView,
            canDownloadDocs: assignFormData.canDownloadDocs,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setAssignError(data.error?.message || 'Failed to update allocation.');
          return;
        }
      } else {
        // Assign new nominee POST
        if (!assignFormData.nomineeId) {
          setAssignError('Please select a nominee.');
          return;
        }
        const res = await fetch(`${API_URL}/vault/assets/${assetId}/nominees`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            nomineeId: assignFormData.nomineeId,
            allocationPercentage: pct,
            canView: assignFormData.canView,
            canDownloadDocs: assignFormData.canDownloadDocs,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setAssignError(data.error?.message || 'Failed to assign nominee.');
          return;
        }
      }

      setIsAssignModalOpen(false);
      fetchAllocations();
    } catch (err) {
      console.error('Error assigning nominee:', err);
      setAssignError('An unexpected error occurred.');
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const handleRemoveNominee = async (nomineeId) => {
    if (!window.confirm('Are you sure you want to remove this nominee from this asset?')) return;
    try {
      const res = await fetch(`${API_URL}/vault/assets/${assetId}/nominees/${nomineeId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error?.message || 'Failed to remove nominee.');
        return;
      }
      fetchAllocations();
    } catch (err) {
      console.error('Error removing nominee:', err);
      alert('Error removing nominee.');
    }
  };

  // Keyboard Escape Handler for Modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isEditAssetOpen && !isSubmittingEdit) handleCloseEditAsset();
        if (isDeleteModalOpen && !isDeletingAsset) setIsDeleteModalOpen(false);
        if (isUploadModalOpen && !isUploading) handleCloseUpload();
        if (isAssignModalOpen && !isSubmittingAssign) handleCloseAssignModal();
        if (documentToDelete && !isDeletingDoc) setDocumentToDelete(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditAssetOpen, isSubmittingEdit, isDeleteModalOpen, isDeletingAsset, isUploadModalOpen, isUploading, isAssignModalOpen, isSubmittingAssign, documentToDelete, isDeletingDoc]);

  // Loading State
  if (loadingAsset) {
    return (
      <div className={styles.shell}>
        <main className={styles.content}>
          <Link to="/vault" className={styles.back}>
            <ArrowLeft size={12} /> Back to Vault
          </Link>
          <div className={styles.stateContainer}>
            <h2 className={styles.stateTitle}>Loading asset details...</h2>
            <p className={styles.stateText}>Retrieving record from your secure vault.</p>
          </div>
        </main>
      </div>
    );
  }

  // Error / Not Found State
  if (assetError || !asset) {
    return (
      <div className={styles.shell}>
        <main className={styles.content}>
          <Link to="/vault" className={styles.back}>
            <ArrowLeft size={12} /> Back to Vault
          </Link>
          <div className={styles.stateContainer}>
            <AlertTriangle size={32} color="#dc2626" />
            <h2 className={styles.stateTitle}>Asset Not Found</h2>
            <p className={styles.stateText}>
              {assetError || 'The requested asset could not be found or access is denied.'}
            </p>
            <Link to="/vault" className={styles.submitBtn} style={{ textDecoration: 'none', marginTop: '10px' }}>
              Return to Vault
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const categoryMeta = getCategoryMeta(asset.category);
  const CategoryIcon = categoryMeta.icon;

  const assignedNomineeIds = new Set(allocations.map((a) => a.nominee_id));
  const availableNominees = allNominees.filter((n) => !assignedNomineeIds.has(n.id));

  // Determine metadata keys to display
  const metadataEntries = asset.metadata && typeof asset.metadata === 'object'
    ? Object.entries(asset.metadata).filter(([k, v]) => v !== null && v !== undefined && v !== '')
    : [];

  return (
    <div className={styles.shell}>
      <main className={styles.content}>
        {/* Navigation Breadcrumb */}
        <Link to="/vault" className={styles.back}>
          <ArrowLeft size={12} /> Back to Vault
        </Link>

        {/* Asset Header */}
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <span className={styles.eyebrow}>
              <CategoryIcon size={12} /> {categoryMeta.label}
            </span>
            <h1 className={styles.title}>{asset.name}</h1>
            <div className={styles.subtitle}>
              <span>{categoryMeta.label}{asset.subcategory ? ` · ${asset.subcategory}` : ''}</span>
              <span>·</span>
              <strong>{formatCurrency(asset.estimated_value, asset.currency)}</strong>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={handleOpenEditAsset}
              title="Edit asset details"
            >
              <Pencil size={13} /> Edit Asset
            </button>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.deleteBtn}`}
              onClick={() => setIsDeleteModalOpen(true)}
              title="Delete asset"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </header>

        {/* Overview Metric Grid */}
        <div className={styles.overviewGrid}>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Asset Value</span>
            <strong className={styles.metricValue}>
              {formatCurrency(asset.estimated_value, asset.currency)}
            </strong>
            <span className={styles.metricSub}>Currency: {asset.currency || 'INR'}</span>
          </div>

          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Category</span>
            <strong className={styles.metricValue}>{categoryMeta.label}</strong>
            <span className={styles.metricSub}>{asset.subcategory || 'Standard entry'}</span>
          </div>

          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Valuation Date</span>
            <strong className={styles.metricValue} style={{ fontSize: '16px' }}>
              {asset.valuation_date ? asset.valuation_date : 'Not specified'}
            </strong>
            <span className={styles.metricSub}>
              {asset.valuation_date ? 'Recorded appraisal' : 'No valuation date'}
            </span>
          </div>

          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Allocation Status</span>
            <strong className={styles.metricValue} style={{ color: totalAllocated === 100 ? '#16a34a' : '#2563eb' }}>
              {formatCleanPercent(totalAllocated)}
            </strong>
            <span className={styles.metricSub}>
              {totalAllocated === 100 ? 'Fully allocated' : `${formatCleanPercent(remainingAllocated)} unallocated`}
            </span>
          </div>
        </div>

        {/* Overview / Notes Panel */}
        <section className={styles.section}>
          <div className={styles.panel}>
            <div className={styles.sectionHeader} style={{ marginBottom: '8px' }}>
              <span className={styles.sectionTitle}>Overview & Notes</span>
            </div>
            <div className={styles.descriptionBox}>
              {asset.description ? asset.description : 'No description or specific notes recorded for this asset.'}
            </div>
            <div className={styles.metaTimestamps}>
              <span>Recorded on {new Date(asset.created_at).toLocaleDateString()}</span>
              <span>Last updated {new Date(asset.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
        </section>

        {/* Asset Information / Metadata Section */}
        <section className={styles.section}>
          <div className={styles.panel}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>
                <Info size={14} /> Asset Information
              </span>
            </div>
            {metadataEntries.length > 0 ? (
              <div className={styles.metadataGrid}>
                {metadataEntries.map(([key, val]) => (
                  <div className={styles.metaItem} key={key}>
                    <span className={styles.metaKey}>{key.replace(/_/g, ' ')}</span>
                    <span className={styles.metaVal}>
                      {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : typeof val === 'object' ? JSON.stringify(val) : String(val)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p>No additional metadata or custom properties recorded for this asset.</p>
              </div>
            )}
          </div>
        </section>

        {/* Attached Documents Section */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <FileText size={15} /> Attached Documents
              <span className={styles.sectionCount}>{documents.length}</span>
            </div>
            <button
              type="button"
              className={styles.submitBtn}
              style={{ padding: '6px 12px', fontSize: '10px' }}
              onClick={handleOpenUpload}
            >
              <Plus size={12} /> Upload Document
            </button>
          </div>

          <div className={styles.panel} style={{ padding: '16px' }}>
            {loadingDocs ? (
              <div className={styles.emptyState}>Loading attached documents...</div>
            ) : documents.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No documents attached to this asset yet. Upload deeds, account statements, policies, or proof of ownership.</p>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={handleOpenUpload}
                  style={{ display: 'inline-flex', margin: '0 auto' }}
                >
                  <Plus size={12} /> Upload First Document
                </button>
              </div>
            ) : (
              <div className={styles.docList}>
                {documents.map((doc) => (
                  <div className={styles.docItem} key={doc.id}>
                    <div className={styles.docInfo}>
                      <div className={styles.docIcon}>
                        <FileText size={16} />
                      </div>
                      <div className={styles.docMeta}>
                        <span className={styles.docName} title={doc.name}>{doc.name}</span>
                        <span className={styles.docSub}>
                          {doc.file_name} · {formatBytes(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className={styles.docActions}>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => handleDownloadDoc(doc.id, doc.file_name)}
                        title="Download file"
                        aria-label="Download file"
                      >
                        <Download size={13} />
                      </button>
                      <button
                        type="button"
                        className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                        onClick={() => setDocumentToDelete(doc)}
                        title="Delete document"
                        aria-label="Delete document"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Nominees & Beneficiary Allocations Section */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <UsersRound size={15} /> Beneficiary Allocations
              <span className={styles.sectionCount}>{allocations.length}</span>
            </div>
            {allocations.length > 0 && remainingAllocated > 0 && availableNominees.length > 0 && (
              <button
                type="button"
                className={styles.submitBtn}
                style={{ padding: '6px 12px', fontSize: '10px' }}
                onClick={handleOpenAssignNominee}
              >
                <UserPlus size={12} /> Assign Nominee
              </button>
            )}
          </div>

          <div className={styles.panel} style={{ padding: '16px' }}>
            {/* Visual Allocation Progress Gauge */}
            <div className={styles.allocationGauge}>
              <div className={styles.gaugeMeta}>
                <span className={styles.gaugeLabel}>Total Allocated Share</span>
                <span className={styles.gaugeValue}>{formatCleanPercent(totalAllocated)} / 100%</span>
              </div>
              <div className={styles.gaugeTrack}>
                <div
                  className={`${styles.gaugeFill} ${totalAllocated === 100 ? styles.gaugeFillFull : ''}`}
                  style={{ width: `${Math.min(100, totalAllocated)}%` }}
                />
              </div>
              <div className={styles.gaugeFootnote}>
                {remainingAllocated > 0
                  ? `${formatCleanPercent(remainingAllocated)} remaining to be allocated.`
                  : '100% fully allocated across designated beneficiaries.'}
              </div>
            </div>

            {loadingAllocations ? (
              <div className={styles.emptyState}>Loading beneficiary allocations...</div>
            ) : allocations.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No beneficiaries assigned to this asset yet. Designate trusted nominees to allocate inheritance shares.</p>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={handleOpenAssignNominee}
                  style={{ display: 'inline-flex', margin: '0 auto' }}
                >
                  <UserPlus size={12} /> Assign Beneficiary
                </button>
              </div>
            ) : (
              <div className={styles.nomineeList}>
                {allocations.map((item) => (
                  <div className={styles.nomineeItem} key={item.nominee_id}>
                    <div className={styles.nomineeInfo}>
                      <span className={styles.nomineeName}>{item.nominee_name}</span>
                      <span className={styles.nomineeSub}>
                        {item.nominee_relationship} · {item.nominee_email}
                      </span>
                    </div>

                    <div className={styles.nomineeControls}>
                      <span className={styles.allocBadge}>
                        {formatCleanPercent(item.allocation_percentage)}
                      </span>
                      {item.can_view && <span className={styles.permBadge}>Can View</span>}
                      {item.can_download_docs && <span className={styles.permBadge}>Can Download</span>}

                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => handleOpenEditAssignment(item)}
                        title="Edit allocation percentage"
                        aria-label="Edit allocation percentage"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                        onClick={() => handleRemoveNominee(item.nominee_id)}
                        title="Remove nominee"
                        aria-label="Remove nominee"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Floating Bottom Navigation */}
        <nav className={styles.bottomNav}>
          <div className={styles.navLinks}>
            <Link to="/dashboard" className={styles.navLink}>
              <LayoutDashboard size={14} />
              <span>Overview</span>
            </Link>
            <Link to="/vault" className={`${styles.navLink} ${styles.activeNavLink}`}>
              <FolderOpen size={14} />
              <span>Vault</span>
            </Link>
            <Link to="/nominees" className={styles.navLink}>
              <UsersRound size={14} />
              <span>Nominees</span>
            </Link>
            <Link to="/documents" className={styles.navLink}>
              <FileText size={14} />
              <span>Documents</span>
            </Link>
            <Link to="/settings" className={styles.navLink}>
              <Settings size={14} />
              <span>Settings</span>
            </Link>
          </div>
        </nav>

        {/* =========================================================
            EDIT ASSET MODAL
            ========================================================= */}
        {isEditAssetOpen && (
          <div className={styles.modalOverlay} onClick={handleCloseEditAsset}>
            <div className={styles.modalWindow} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHead}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Pencil size={16} color="#1b4fd8" />
                  <h3>Edit Asset</h3>
                </div>
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={handleCloseEditAsset}
                  disabled={isSubmittingEdit}
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>

              {editFormError && <div className={styles.formError}>{editFormError}</div>}

              <form onSubmit={handleSaveAssetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className={styles.formGroup}>
                  <label>Asset Name</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Category</label>
                    <select
                      className={styles.formInput}
                      value={editFormData.category}
                      onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                      required
                    >
                      <option value="property">Property</option>
                      <option value="financial">Financial</option>
                      <option value="insurance">Insurance</option>
                      <option value="crypto">Crypto</option>
                      <option value="digital">Digital</option>
                      <option value="legal">Legal</option>
                      <option value="business">Business</option>
                      <option value="investments">Investments</option>
                      <option value="other">Other Assets</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Subcategory (Optional)</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={editFormData.subcategory}
                      onChange={(e) => setEditFormData({ ...editFormData, subcategory: e.target.value })}
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Estimated Value</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={styles.formInput}
                      value={editFormData.estimatedValue}
                      onChange={(e) => setEditFormData({ ...editFormData, estimatedValue: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Valuation Date</label>
                    <input
                      type="date"
                      className={styles.formInput}
                      value={editFormData.valuationDate}
                      onChange={(e) => setEditFormData({ ...editFormData, valuationDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Description (Optional)</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  />
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={handleCloseEditAsset}
                    disabled={isSubmittingEdit}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={isSubmittingEdit || !editFormData.name.trim()}
                  >
                    <Pencil size={12} />
                    {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================
            DELETE ASSET CONFIRMATION MODAL
            ========================================================= */}
        {isDeleteModalOpen && (
          <div className={styles.modalOverlay} onClick={() => !isDeletingAsset && setIsDeleteModalOpen(false)}>
            <div className={styles.modalWindow} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHead}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={18} color="#dc2626" />
                  <h3>Delete Asset</h3>
                </div>
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isDeletingAsset}
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>

              {deleteError && <div className={styles.formError}>{deleteError}</div>}

              <p className={styles.stateText} style={{ textAlign: 'left', marginBottom: '16px' }}>
                Are you sure you want to delete <strong>"{asset.name}"</strong>? This will remove all associated nominee allocations. Attached documents will safely remain in your Documents archive.
              </p>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isDeletingAsset}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.destructiveBtn}
                  onClick={handleConfirmDeleteAsset}
                  disabled={isDeletingAsset}
                >
                  <Trash2 size={12} /> {isDeletingAsset ? 'Deleting...' : 'Delete Asset'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            UPLOAD ATTACHED DOCUMENT MODAL
            ========================================================= */}
        {isUploadModalOpen && (
          <div className={styles.modalOverlay} onClick={handleCloseUpload}>
            <div className={styles.modalWindow} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHead}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UploadCloud size={17} color="#1b4fd8" />
                  <h3>Attach Document</h3>
                </div>
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={handleCloseUpload}
                  disabled={isUploading}
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>

              {uploadError && <div className={styles.formError}>{uploadError}</div>}

              <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className={styles.formGroup}>
                  <label>Document File</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  />

                  {!uploadFormData.file ? (
                    <div
                      className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className={styles.dropzoneIconWrapper}>
                        <UploadCloud size={18} />
                      </div>
                      <span className={styles.dropzonePrimaryText}>Drop your document here</span>
                      <span className={styles.dropzoneSecondaryText}>or click to browse</span>
                      <span className={styles.dropzoneSecondaryText} style={{ fontSize: '9px' }}>
                        PDF, JPG, PNG or WebP · Up to 15 MB
                      </span>
                    </div>
                  ) : (
                    <div className={styles.selectedFileCard}>
                      <div className={styles.selectedFileInfo}>
                        <FileCheck size={18} color="#1b4fd8" />
                        <div>
                          <div className={styles.selectedFileName}>{uploadFormData.file.name}</div>
                          <div className={styles.selectedFileSize}>{formatBytes(uploadFormData.file.size)}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={styles.closeBtn}
                        onClick={() => setUploadFormData({ ...uploadFormData, file: null })}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>Document Name</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="e.g. Property Title Deed, Account Statement"
                    value={uploadFormData.name}
                    onChange={(e) => setUploadFormData({ ...uploadFormData, name: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Description (Optional)</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="Brief description or purpose"
                    value={uploadFormData.description}
                    onChange={(e) => setUploadFormData({ ...uploadFormData, description: e.target.value })}
                  />
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={handleCloseUpload}
                    disabled={isUploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={isUploading || !uploadFormData.file || !uploadFormData.name.trim()}
                  >
                    <UploadCloud size={12} /> {isUploading ? 'Uploading...' : 'Upload Document'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================
            DELETE DOCUMENT CONFIRMATION MODAL
            ========================================================= */}
        {documentToDelete && (
          <div className={styles.modalOverlay} onClick={() => !isDeletingDoc && setDocumentToDelete(null)}>
            <div className={styles.modalWindow} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHead}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={18} color="#dc2626" />
                  <h3>Delete Document</h3>
                </div>
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={() => setDocumentToDelete(null)}
                  disabled={isDeletingDoc}
                >
                  <X size={15} />
                </button>
              </div>

              <p className={styles.stateText} style={{ textAlign: 'left', marginBottom: '16px' }}>
                Are you sure you want to delete <strong>"{documentToDelete.name}"</strong>? This will remove the file from storage and database records.
              </p>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setDocumentToDelete(null)}
                  disabled={isDeletingDoc}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.destructiveBtn}
                  onClick={handleDeleteDocConfirm}
                  disabled={isDeletingDoc}
                >
                  <Trash2 size={12} /> {isDeletingDoc ? 'Deleting...' : 'Delete Document'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            ASSIGN / EDIT NOMINEE ALLOCATION MODAL
            ========================================================= */}
        {isAssignModalOpen && (() => {
          const currentAllocatedExcludingEdit = editingAssignment
            ? totalAllocated - (editingAssignment.allocation_percentage || 0)
            : totalAllocated;
          const maxAvailable = Math.max(0, Math.round((100 - currentAllocatedExcludingEdit) * 100) / 100);

          return (
            <div className={styles.modalOverlay} onClick={handleCloseAssignModal}>
              <div className={styles.modalWindow} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHead}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UsersRound size={17} color="#1b4fd8" />
                    <h3>{editingAssignment ? 'Edit Beneficiary Allocation' : 'Assign Beneficiary'}</h3>
                  </div>
                  <button
                    type="button"
                    className={styles.closeBtn}
                    onClick={handleCloseAssignModal}
                    disabled={isSubmittingAssign}
                  >
                    <X size={15} />
                  </button>
                </div>

                {assignError && <div className={styles.formError}>{assignError}</div>}

                <div style={{ fontSize: '11px', color: '#657069', marginBottom: '14px' }}>
                  {editingAssignment ? (
                    <span>Adjusting share for <strong>{editingAssignment.nominee_name}</strong>.</span>
                  ) : (
                    <span>Allocate an inheritance share of <strong>{asset.name}</strong> to a trusted nominee.</span>
                  )}
                </div>

                <form onSubmit={handleAssignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {!editingAssignment && (
                    <div className={styles.formGroup}>
                      <label>Select Nominee</label>
                      {availableNominees.length === 0 ? (
                        <div style={{ fontSize: '11px', color: '#dc2626' }}>
                          All existing nominees are already assigned to this asset, or you have no nominees registered.
                        </div>
                      ) : (
                        <select
                          className={styles.formInput}
                          value={assignFormData.nomineeId}
                          onChange={(e) => setAssignFormData({ ...assignFormData, nomineeId: e.target.value })}
                          required
                        >
                          <option value="">-- Choose a nominee --</option>
                          {availableNominees.map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.full_name} ({n.relationship}) · {n.email}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  <div className={styles.formGroup}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <label>Allocation Percentage (%)</label>
                      <span style={{ fontSize: '10px', color: '#8c938e' }}>
                        Max available: {formatCleanPercent(maxAvailable)}
                      </span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={maxAvailable}
                      className={styles.formInput}
                      placeholder={`e.g. ${maxAvailable}`}
                      value={assignFormData.allocationPercentage}
                      onChange={(e) => setAssignFormData({ ...assignFormData, allocationPercentage: e.target.value })}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={assignFormData.canView}
                        onChange={(e) => setAssignFormData({ ...assignFormData, canView: e.target.checked })}
                      />
                      <span>Allow nominee to view asset details</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={assignFormData.canDownloadDocs}
                        onChange={(e) => setAssignFormData({ ...assignFormData, canDownloadDocs: e.target.checked })}
                      />
                      <span>Allow nominee to download attached documents</span>
                    </label>
                  </div>

                  <div className={styles.modalActions}>
                    <button
                      type="button"
                      className={styles.cancelBtn}
                      onClick={handleCloseAssignModal}
                      disabled={isSubmittingAssign}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={styles.submitBtn}
                      disabled={
                        isSubmittingAssign ||
                        (!editingAssignment && !assignFormData.nomineeId) ||
                        !assignFormData.allocationPercentage
                      }
                    >
                      <Check size={12} />
                      {isSubmittingAssign ? 'Saving...' : editingAssignment ? 'Save Allocation' : 'Assign Nominee'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}
      </main>
    </div>
  );
}
