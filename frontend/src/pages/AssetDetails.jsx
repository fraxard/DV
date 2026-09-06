import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Building, Landmark, Coins, ShieldCheck, Globe, FileText,
  Briefcase, TrendingUp, FolderOpen, Pencil, Trash2, UsersRound, Plus,
  UploadCloud, FileCheck, Download, Check, AlertTriangle, X, LayoutDashboard,
  Settings, UserPlus, Info, Calendar, Copy, CheckCheck
} from 'lucide-react';
import styles from './AssetDetails.module.css';
import { getCategoryFieldConfig } from '../config/assetCategoryFields';
import BottomNav from '../components/BottomNav';

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

  // Edit Category Information Modal
  const [isEditCategoryInfoOpen, setIsEditCategoryInfoOpen] = useState(false);
  const [categoryInfoFormData, setCategoryInfoFormData] = useState({});
  const [isSavingCategoryInfo, setIsSavingCategoryInfo] = useState(false);
  const [categoryInfoError, setCategoryInfoError] = useState('');
  const [copiedFieldKey, setCopiedFieldKey] = useState(null);

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

  // Handle Category Information Edit
  const handleOpenEditCategoryInfo = () => {
    if (!asset) return;
    setCategoryInfoError('');
    const config = getCategoryFieldConfig(asset.category);
    const initialData = {};
    config.fields.forEach((field) => {
      initialData[field.key] = asset.metadata && asset.metadata[field.key] !== undefined && asset.metadata[field.key] !== null
        ? asset.metadata[field.key]
        : '';
    });
    setCategoryInfoFormData(initialData);
    setIsEditCategoryInfoOpen(true);
  };

  const handleCloseEditCategoryInfo = () => {
    if (isSavingCategoryInfo) return;
    setIsEditCategoryInfoOpen(false);
    setCategoryInfoError('');
  };

  const handleSaveCategoryInfoSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSavingCategoryInfo(true);
      setCategoryInfoError('');

      // Merge updated fields with existing asset metadata (preserving other keys if any)
      const updatedMetadata = {
        ...(asset.metadata || {}),
        ...categoryInfoFormData,
      };

      // Clean empty strings or whitespace-only strings to null or omit
      const cleanedMetadata = {};
      Object.entries(updatedMetadata).forEach(([k, v]) => {
        if (typeof v === 'string') {
          const trimmed = v.trim();
          if (trimmed.length > 0) {
            cleanedMetadata[k] = trimmed;
          }
        } else if (v !== null && v !== undefined) {
          cleanedMetadata[k] = v;
        }
      });

      const res = await fetch(`${API_URL}/vault/assets/${assetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ metadata: cleanedMetadata }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCategoryInfoError(data.error?.message || 'Failed to update category information.');
        return;
      }

      setAsset(data.asset);
      setIsEditCategoryInfoOpen(false);
    } catch (err) {
      console.error('Error updating category metadata:', err);
      setCategoryInfoError('An error occurred while saving category details.');
    } finally {
      setIsSavingCategoryInfo(false);
    }
  };

  // Copy to Clipboard with temporary badge
  const handleCopyField = async (key, val) => {
    if (!val) return;
    try {
      await navigator.clipboard.writeText(String(val));
      setCopiedFieldKey(key);
      setTimeout(() => {
        setCopiedFieldKey((curr) => (curr === key ? null : curr));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
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
        {/* Breadcrumb / Back Path */}
        <nav className={styles.breadcrumbNav} aria-label="Breadcrumb">
          <div className={styles.breadcrumbRow}>
            <Link to="/vault" className={styles.breadcrumbLink}>
              Vault
            </Link>
            <span className={styles.breadcrumbSeparator}>/</span>
            <Link to={`/vault?category=${encodeURIComponent(asset.category)}`} className={styles.breadcrumbLink}>
              {categoryMeta.label}
            </Link>
            <span className={styles.breadcrumbSeparator}>/</span>
            <span className={styles.breadcrumbCurrent} title={asset.name}>
              {asset.name}
            </span>
          </div>

          <Link to="/vault" className={styles.backBtn} title="Back to Vault">
            <ArrowLeft size={12} /> Back to Vault
          </Link>
        </nav>

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

        {/* Layer 1 — At a Glance Summary Strip (Single horizontal row of 4 columns on desktop) */}
        <div className={styles.overviewGrid}>
          {/* 1. Asset Value */}
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Asset Value</span>
            <strong className={styles.metricValue}>
              {formatCurrency(asset.estimated_value, asset.currency)}
            </strong>
            <span className={styles.metricSub}>
              {asset.estimated_value ? `Currency: ${asset.currency || 'INR'}` : (
                <button
                  type="button"
                  className={styles.metricSubAction}
                  onClick={handleOpenEditAsset}
                >
                  <Pencil size={10} /> Set estimated value
                </button>
              )}
            </span>
          </div>

          {/* 2. Category */}
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Category</span>
            <strong className={styles.metricValue}>{categoryMeta.label}</strong>
            <span className={styles.metricSub}>
              {asset.subcategory ? asset.subcategory : (
                asset.metadata && Object.keys(asset.metadata).length > 0
                  ? 'Details configured'
                  : 'Standard entry'
              )}
            </span>
          </div>

          {/* 3. Valuation Date */}
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Valuation Date</span>
            <strong className={styles.metricValue}>
              {asset.valuation_date ? asset.valuation_date : 'Not specified'}
            </strong>
            <span className={styles.metricSub}>
              {asset.valuation_date ? (
                'Recorded appraisal'
              ) : (
                <button
                  type="button"
                  className={styles.metricSubAction}
                  onClick={handleOpenEditAsset}
                >
                  <Calendar size={10} /> Add appraisal date
                </button>
              )}
            </span>
          </div>

          {/* 4. Allocation Status */}
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Allocation Status</span>
            <strong className={styles.metricValue} style={{ color: totalAllocated === 100 ? '#16a34a' : '#1b4fd8' }}>
              {formatCleanPercent(totalAllocated)}
            </strong>
            <div>
              <div className={styles.metricProgressTrack}>
                <div
                  className={`${styles.metricProgressFill} ${totalAllocated === 100 ? styles.metricProgressFillFull : ''}`}
                  style={{ width: `${Math.min(100, totalAllocated)}%` }}
                />
              </div>
              <span className={styles.metricSub} style={{ marginTop: '4px' }}>
                {totalAllocated === 100 ? (
                  '100% designated'
                ) : remainingAllocated === 100 ? (
                  'Unallocated'
                ) : (
                  `${formatCleanPercent(remainingAllocated)} remaining`
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Layer 2 — 2x2 Detail Workspace Grid (Row 1: Overview & Notes + Category Info, Row 2: Documents + Beneficiary Allocations) */}
        <div className={styles.contentGrid}>
          {/* 1. Overview & Notes Panel */}
          <section className={styles.section}>
            <div className={styles.sectionHeader} style={{ marginBottom: '12px' }}>
              <span className={styles.sectionTitle}>Overview & Notes</span>
              {asset.description && (
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={handleOpenEditAsset}
                  title="Edit description or notes"
                >
                  <Pencil size={12} /> Edit Notes
                </button>
              )}
            </div>
            <div className={styles.panel}>
              {asset.description ? (
                <>
                  <div className={styles.descriptionBox}>
                    {asset.description}
                  </div>
                  <div className={styles.metaTimestamps} style={{ marginTop: 'auto' }}>
                    <span>Recorded on {new Date(asset.created_at).toLocaleDateString()}</span>
                    <span>Last updated {new Date(asset.updated_at).toLocaleDateString()}</span>
                  </div>
                </>
              ) : (
                <div className={styles.emptyState}>
                  <p>No description or notes have been added yet.</p>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={handleOpenEditAsset}
                    style={{ display: 'inline-flex', margin: '0 auto' }}
                  >
                    <Plus size={12} /> Add Notes
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* 2. Asset Information / Dynamic Category Information Section */}
          {(() => {
            const categoryConfig = getCategoryFieldConfig(asset.category);
            const configuredFields = categoryConfig.fields || [];

            // Collect any extra custom metadata keys that might not be in the configured fields
            const configuredKeysSet = new Set(configuredFields.map((f) => f.key));
            const extraEntries = asset.metadata && typeof asset.metadata === 'object'
              ? Object.entries(asset.metadata).filter(
                  ([k, v]) => !configuredKeysSet.has(k) && v !== null && v !== undefined && v !== ''
                )
              : [];

            const hasAnyMetadata = configuredFields.some(
              (f) => asset.metadata && asset.metadata[f.key] !== undefined && asset.metadata[f.key] !== null && asset.metadata[f.key] !== ''
            ) || extraEntries.length > 0;

            return (
              <section className={styles.section}>
                <div className={styles.sectionHeader} style={{ marginBottom: '12px' }}>
                  <span className={styles.sectionTitle}>
                    <Info size={14} /> {categoryConfig.label} Information
                  </span>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={handleOpenEditCategoryInfo}
                    title="Edit category specific properties"
                  >
                    <Pencil size={12} /> Edit Details
                  </button>
                </div>

                <div className={styles.panel}>
                  {hasAnyMetadata ? (
                    <>
                      <div className={styles.categoryInfoGrid}>
                        {configuredFields
                          .filter((field) => {
                            const rawVal = asset.metadata ? asset.metadata[field.key] : null;
                            return rawVal !== null && rawVal !== undefined && String(rawVal).trim() !== '';
                          })
                          .map((field) => {
                            const rawVal = asset.metadata[field.key];
                            const displayVal = String(rawVal);
                            const isCopyable = field.copyable;
                            const isCopied = copiedFieldKey === field.key;

                            return (
                              <div className={styles.categoryFieldCard} key={field.key}>
                                <span className={styles.fieldLabel}>{field.label}</span>
                                <div className={styles.fieldValueRow}>
                                  <span className={styles.fieldValue}>
                                    {displayVal}
                                  </span>
                                  {isCopyable && (
                                    <button
                                      type="button"
                                      className={styles.copyBtn}
                                      onClick={() => handleCopyField(field.key, rawVal)}
                                      title={`Copy ${field.label}`}
                                    >
                                      {isCopied ? (
                                        <span className={styles.copiedBadge}>
                                          <CheckCheck size={11} /> Copied
                                        </span>
                                      ) : (
                                        <>
                                          <Copy size={11} /> Copy
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>

                      {extraEntries.length > 0 && (
                        <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(30,35,32,0.06)' }}>
                          <span className={styles.fieldLabel} style={{ marginBottom: '10px', display: 'block' }}>
                            Additional Custom Properties
                          </span>
                          <div className={styles.metadataGrid}>
                            {extraEntries.map(([key, val]) => (
                              <div className={styles.metaItem} key={key}>
                                <span className={styles.metaKey}>{key.replace(/_/g, ' ')}</span>
                                <span className={styles.metaVal}>
                                  {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className={styles.emptyState}>
                      <p>No {categoryConfig.label.toLowerCase()} details have been added yet.</p>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={handleOpenEditCategoryInfo}
                        style={{ display: 'inline-flex', margin: '0 auto' }}
                      >
                        <Plus size={12} /> Add {categoryConfig.label} Details
                      </button>
                    </div>
                  )}
                </div>
              </section>
            );
          })()}

          {/* 3. Attached Documents Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader} style={{ marginBottom: '12px' }}>
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
                <Plus size={12} /> Upload
              </button>
            </div>

            <div className={styles.panel} style={{ padding: '16px' }}>
              {loadingDocs ? (
                <div className={styles.emptyState}>Loading attached documents...</div>
              ) : documents.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No documents attached yet.</p>
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

          {/* 4. Nominees & Beneficiary Allocations Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader} style={{ marginBottom: '12px' }}>
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
                  <UserPlus size={12} /> Assign
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
                  <p>No beneficiaries assigned yet.</p>
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
        </div>

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

        {/* Edit Category Information Modal */}
        {isEditCategoryInfoOpen && (() => {
          const categoryConfig = getCategoryFieldConfig(asset.category);
          const fields = categoryConfig.fields || [];

          return (
            <div className={styles.modalOverlay} onClick={handleCloseEditCategoryInfo}>
              <div
                className={styles.modalCard}
                style={{ maxWidth: '580px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.modalHeader}>
                  <div>
                    <h3 className={styles.modalTitle}>Edit {categoryConfig.label} Details</h3>
                    <p style={{ fontSize: '11px', color: '#7a827c', margin: '3px 0 0' }}>
                      Update specific properties and specifications for this {categoryConfig.label.toLowerCase()} record.
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.closeBtn}
                    onClick={handleCloseEditCategoryInfo}
                    disabled={isSavingCategoryInfo}
                  >
                    <X size={15} />
                  </button>
                </div>

                {categoryInfoError && (
                  <div className={styles.formError} style={{ margin: '14px 20px 0' }}>
                    <AlertTriangle size={13} />
                    <span>{categoryInfoError}</span>
                  </div>
                )}

                <form
                  onSubmit={handleSaveCategoryInfoSubmit}
                  style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                >
                  <div
                    className={styles.modalBody}
                    style={{
                      overflowY: 'auto',
                      padding: '16px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                    }}
                  >
                    {fields.map((field) => {
                      const value = categoryInfoFormData[field.key] !== undefined ? categoryInfoFormData[field.key] : '';

                      return (
                        <div className={styles.formGroup} key={field.key}>
                          <label className={styles.formLabel}>
                            {field.label}
                            {field.required && <span style={{ color: '#dc2626' }}> *</span>}
                          </label>

                          {field.type === 'select' ? (
                            <select
                              className={styles.formSelect}
                              value={value}
                              onChange={(e) =>
                                setCategoryInfoFormData({
                                  ...categoryInfoFormData,
                                  [field.key]: e.target.value,
                                })
                              }
                            >
                              <option value="">{field.placeholder || `Select ${field.label}`}</option>
                              {field.options?.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : field.type === 'textarea' ? (
                            <textarea
                              className={styles.formTextarea}
                              rows={3}
                              placeholder={field.placeholder || ''}
                              value={value}
                              onChange={(e) =>
                                setCategoryInfoFormData({
                                  ...categoryInfoFormData,
                                  [field.key]: e.target.value,
                                })
                              }
                            />
                          ) : (
                            <input
                              type={field.type === 'date' ? 'date' : 'text'}
                              className={styles.formInput}
                              placeholder={field.placeholder || ''}
                              value={value}
                              onChange={(e) =>
                                setCategoryInfoFormData({
                                  ...categoryInfoFormData,
                                  [field.key]: e.target.value,
                                })
                              }
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className={styles.modalActions} style={{ padding: '14px 20px', borderTop: '1px solid var(--w-line)' }}>
                    <button
                      type="button"
                      className={styles.cancelBtn}
                      onClick={handleCloseEditCategoryInfo}
                      disabled={isSavingCategoryInfo}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={styles.submitBtn}
                      disabled={isSavingCategoryInfo}
                    >
                      <Check size={12} />
                      {isSavingCategoryInfo ? 'Saving Details...' : 'Save Category Details'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}
      </main>

      {/* Floating Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
