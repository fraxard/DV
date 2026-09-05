import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, CalendarDays, Check, Download, FileCheck, FileText,
  FolderOpen, Pencil, Percent, Plus, Search, Settings, ShieldCheck, Trash2, Upload, UploadCloud,
  UserCheck, UserPlus, UsersRound, WalletCards, X
} from 'lucide-react';
import styles from './WorkspacePage.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const formatCleanNumber = (val) => {
  const num = Number(val);
  if (isNaN(num)) return '0';
  return parseFloat(num.toFixed(2)).toString();
};

const formatCleanPercent = (val) => {
  return `${formatCleanNumber(val)}%`;
};

const configs = {
  vault: {
    eyebrow: 'ORGANISE',
    title: 'Your vault',
    description: 'A structured home for the assets, records and information that make up your digital legacy.',
    icon: FolderOpen,
    actions: [['Add asset', 'add-asset', WalletCards], ['Upload document', '/documents?upload=1', Upload]],
    stats: [['0', 'total assets'], ['0', 'categories'], ['0', 'allocated']],
    rows: [],
  },
  nominees: {
    eyebrow: 'PEOPLE',
    title: 'Nominees',
    description: 'Manage the trusted beneficiaries who will receive designated access to your legacy.',
    icon: UsersRound,
    actions: [['Add nominee', 'add-nominee', UserPlus]],
    stats: [['0', 'total nominees'], ['0', 'assigned to assets'], ['0', 'unassigned']],
    rows: [],
  },
  activity: {
    eyebrow: 'TIMELINE',
    title: 'Recent activity',
    description: 'A clear record of changes made inside your private legacy workspace.',
    icon: ShieldCheck,
    actions: [],
    stats: [['04', 'recent events'], ['Today', 'last activity'], ['Secure', 'workspace']],
    rows: [
      ['Passport added', 'Documents · Today 02:42 PM', 'Completed'],
      ['Nominee updated', 'People · Today 11:18 AM', 'Completed'],
      ['Insurance policy added', 'Protection · Yesterday', 'Completed'],
      ['Bank account added', 'Financial · 31 Aug', 'Completed'],
    ],
  },
  documents: {
    eyebrow: 'ARCHIVE',
    title: 'Documents',
    description: 'Keep important records organised and ready for the people who may need them later.',
    icon: FileText,
    actions: [['Upload document', '/documents?upload=1', Upload]],
    stats: [['0', 'documents'], ['0', 'attached to assets'], ['0', 'standalone files']],
    rows: [],
  },
  calendar: {
    eyebrow: 'PLAN AHEAD',
    title: 'Legacy calendar',
    description: 'Keep renewals, reviews and important legacy milestones visible in one place.',
    icon: CalendarDays,
    actions: [['Add event', '/calendar?new=1', CalendarDays]],
    stats: [['04', 'scheduled'], ['01', 'this month'], ['03', 'upcoming']],
    rows: [
      ['Review nominees', 'Scheduled · 05', 'Upcoming'],
      ['Insurance renewal', 'Scheduled · 10', 'Upcoming'],
      ['Document review', 'Scheduled · 17', 'Upcoming'],
      ['Legacy check-in', 'Scheduled · 24', 'Upcoming'],
    ],
  },
  settings: {
    eyebrow: 'PREFERENCES',
    title: 'Settings',
    description: 'Manage your workspace preferences and account-level options.',
    icon: Settings,
    actions: [],
    stats: [['Secure', 'session'], ['7 days', 'session window'], ['On', 'notifications']],
    rows: [
      ['Profile', 'Personal information', 'Available'],
      ['Security', 'Session and access', 'Protected'],
      ['Notifications', 'Workspace alerts', 'Enabled'],
      ['Preferences', 'Display options', 'Available'],
    ],
  },
};

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

const RELATIONSHIPS = [
  'Spouse',
  'Child',
  'Parent',
  'Sibling',
  'Relative',
  'Legal Heir',
  'Friend',
  'Partner',
  'Other',
];

export default function WorkspacePage({ section }) {
  const location = useLocation();
  const navigate = useNavigate();
  const config = configs[section] || configs.vault;
  const Icon = config.icon;
  const hasNew = new URLSearchParams(location.search).get('new');
  const uploadParam = new URLSearchParams(location.search).get('upload');

  // Documents, Assets, and Nominees live state
  const [documents, setDocuments] = useState([]);
  const [assets, setAssets] = useState([]);
  const [nominees, setNominees] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(section === 'documents');
  const [loadingAssets, setLoadingAssets] = useState(section === 'vault');
  const [loadingNominees, setLoadingNominees] = useState(section === 'nominees');

  // Add / Edit Asset modal state
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [isSubmittingAsset, setIsSubmittingAsset] = useState(false);
  const [assetFormError, setAssetFormError] = useState('');
  const [assetFormData, setAssetFormData] = useState({
    name: '',
    category: 'financial',
    subcategory: '',
    description: '',
    estimatedValue: '',
    currency: 'INR',
    valuationDate: '',
  });

  // Delete Asset confirmation modal state
  const [assetToDelete, setAssetToDelete] = useState(null);
  const [isDeletingAsset, setIsDeletingAsset] = useState(false);
  const [deleteAssetError, setDeleteAssetError] = useState('');

  // Asset Allocations Manager modal state
  const [allocatingAsset, setAllocatingAsset] = useState(null);
  const [assetAllocations, setAssetAllocations] = useState([]);
  const [totalAllocated, setTotalAllocated] = useState(0);
  const [remainingAllocated, setRemainingAllocated] = useState(100);
  const [isLoadingAllocations, setIsLoadingAllocations] = useState(false);
  const [allocationError, setAllocationError] = useState('');
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [assignFormData, setAssignFormData] = useState({
    nomineeId: '',
    allocationPercentage: '',
    canView: true,
    canDownloadDocs: true,
  });
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  // Add / Edit Nominee modal state
  const [isNomineeModalOpen, setIsNomineeModalOpen] = useState(false);
  const [editingNominee, setEditingNominee] = useState(null);
  const [isSubmittingNominee, setIsSubmittingNominee] = useState(false);
  const [nomineeFormError, setNomineeFormError] = useState('');
  const [nomineeFormData, setNomineeFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    relationship: 'Spouse',
    notes: '',
  });

  // Delete Nominee confirmation modal state
  const [nomineeToDelete, setNomineeToDelete] = useState(null);
  const [isDeletingNominee, setIsDeletingNominee] = useState(false);
  const [deleteNomineeError, setDeleteNomineeError] = useState('');

  // Edit Document modal state
  const [editingDocument, setEditingDocument] = useState(null);
  const [isUpdatingDoc, setIsUpdatingDoc] = useState(false);
  const [editDocError, setEditDocError] = useState('');
  const [editDocFormData, setEditDocFormData] = useState({
    name: '',
    description: '',
    assetId: '',
  });

  // Delete Document confirmation modal state
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Upload Document state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadFormData, setUploadFormData] = useState({
    name: '',
    description: '',
    assetId: '',
    file: null,
  });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const isDocSection = section === 'documents';
  const isVaultSection = section === 'vault';
  const isNomineeSection = section === 'nominees';

  // Handle URL query parameters for modal open
  useEffect(() => {
    if (hasNew === 'asset' && isVaultSection) {
      handleOpenAddAsset();
    } else if (hasNew === '1' && isNomineeSection) {
      handleOpenAddNominee();
    }
  }, [hasNew, section]);

  // Handle Escape key to close active modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isAddAssetOpen && !isSubmittingAsset) handleCloseAddAsset();
        if (assetToDelete && !isDeletingAsset) handleCloseDeleteAssetConfirm();
        if (allocatingAsset && !isSubmittingAssign) handleCloseAllocations();
        if (isNomineeModalOpen && !isSubmittingNominee) handleCloseNomineeModal();
        if (nomineeToDelete && !isDeletingNominee) handleCloseDeleteNomineeConfirm();
        if (editingDocument && !isUpdatingDoc) handleCloseEditDoc();
        if (documentToDelete && !isDeletingDoc) handleCloseDeleteConfirm();
        if (uploadParam && !isUploading) navigate('/documents');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isAddAssetOpen, isSubmittingAsset, assetToDelete, isDeletingAsset,
    allocatingAsset, isSubmittingAssign, isNomineeModalOpen, isSubmittingNominee,
    nomineeToDelete, isDeletingNominee, editingDocument, isUpdatingDoc,
    documentToDelete, isDeletingDoc, uploadParam, isUploading
  ]);

  const fetchDocuments = async () => {
    try {
      setLoadingDocs(true);
      const res = await fetch(`${API_URL}/documents`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const fetchAssets = async () => {
    try {
      setLoadingAssets(true);
      const res = await fetch(`${API_URL}/vault/assets`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets || []);
      }
    } catch (err) {
      console.error('Failed to load assets:', err);
    } finally {
      setLoadingAssets(false);
    }
  };

  const fetchNominees = async () => {
    try {
      setLoadingNominees(true);
      const res = await fetch(`${API_URL}/nominees`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setNominees(data.nominees || []);
      }
    } catch (err) {
      console.error('Failed to load nominees:', err);
    } finally {
      setLoadingNominees(false);
    }
  };

  useEffect(() => {
    if (isDocSection) {
      fetchDocuments();
      fetchAssets();
    } else if (isVaultSection) {
      fetchAssets();
      fetchNominees();
    } else if (isNomineeSection) {
      fetchNominees();
      fetchAssets();
    }
  }, [section]);

  // -------------------------------------------------------------
  // NOMINEE HANDLERS
  // -------------------------------------------------------------
  const handleOpenAddNominee = () => {
    setEditingNominee(null);
    setNomineeFormError('');
    setNomineeFormData({
      fullName: '',
      email: '',
      phone: '',
      relationship: 'Spouse',
      notes: '',
    });
    setIsNomineeModalOpen(true);
  };

  const handleOpenEditNominee = (nominee) => {
    setEditingNominee(nominee);
    setNomineeFormError('');
    setNomineeFormData({
      fullName: nominee.full_name || '',
      email: nominee.email || '',
      phone: nominee.phone || '',
      relationship: nominee.relationship || 'Spouse',
      notes: nominee.notes || '',
    });
    setIsNomineeModalOpen(true);
  };

  const handleCloseNomineeModal = () => {
    if (isSubmittingNominee) return;
    setIsNomineeModalOpen(false);
    setEditingNominee(null);
    setNomineeFormError('');
    if (hasNew === '1') {
      navigate('/nominees', { replace: true });
    }
  };

  const handleSaveNomineeSubmit = async (e) => {
    e.preventDefault();
    if (!nomineeFormData.fullName.trim()) {
      setNomineeFormError('Nominee full name is required.');
      return;
    }
    if (!nomineeFormData.email.trim()) {
      setNomineeFormError('Nominee email is required.');
      return;
    }

    try {
      setIsSubmittingNominee(true);
      setNomineeFormError('');

      const payload = {
        fullName: nomineeFormData.fullName.trim(),
        email: nomineeFormData.email.trim().toLowerCase(),
        phone: nomineeFormData.phone.trim() || undefined,
        relationship: nomineeFormData.relationship.trim(),
        notes: nomineeFormData.notes.trim() || undefined,
      };

      const url = editingNominee ? `${API_URL}/nominees/${editingNominee.id}` : `${API_URL}/nominees`;
      const method = editingNominee ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Failed to save nominee.');
      }

      await fetchNominees();
      handleCloseNomineeModal();
    } catch (err) {
      setNomineeFormError(err.message);
    } finally {
      setIsSubmittingNominee(false);
    }
  };

  const handleOpenDeleteNomineeConfirm = (nominee) => {
    setDeleteNomineeError('');
    setNomineeToDelete(nominee);
  };

  const handleCloseDeleteNomineeConfirm = () => {
    if (isDeletingNominee) return;
    setNomineeToDelete(null);
    setDeleteNomineeError('');
  };

  const handleConfirmDeleteNominee = async () => {
    if (!nomineeToDelete) return;
    try {
      setIsDeletingNominee(true);
      setDeleteNomineeError('');

      const res = await fetch(`${API_URL}/nominees/${nomineeToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || 'Failed to delete nominee.');
      }

      await fetchNominees();
      setNomineeToDelete(null);
    } catch (err) {
      setDeleteNomineeError(err.message);
    } finally {
      setIsDeletingNominee(false);
    }
  };

  // -------------------------------------------------------------
  // ASSET ALLOCATION HANDLERS
  // -------------------------------------------------------------
  const fetchAllocationsForAsset = async (assetId) => {
    try {
      setIsLoadingAllocations(true);
      setAllocationError('');
      const res = await fetch(`${API_URL}/vault/assets/${assetId}/nominees`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setAssetAllocations(data.nominees || []);
        setTotalAllocated(data.total_allocated_percentage || 0);
        setRemainingAllocated(data.remaining_percentage !== undefined ? data.remaining_percentage : 100);
      }
    } catch (err) {
      console.error('Failed to load asset allocations:', err);
    } finally {
      setIsLoadingAllocations(false);
    }
  };

  const handleOpenAllocations = async (asset) => {
    setAllocatingAsset(asset);
    setAllocationError('');
    setAssignFormData({
      nomineeId: '',
      allocationPercentage: '',
      canView: true,
      canDownloadDocs: true,
    });
    await fetchAllocationsForAsset(asset.id);
  };

  const handleOpenEditAssignment = (item) => {
    setEditingAssignment(item);
    setAllocationError('');
    setAssignFormData({
      nomineeId: item.nominee_id,
      allocationPercentage: formatCleanNumber(item.allocation_percentage),
      canView: Boolean(item.can_view),
      canDownloadDocs: Boolean(item.can_download_docs),
    });
  };

  const handleCancelEditAssignment = () => {
    setEditingAssignment(null);
    setAllocationError('');
    setAssignFormData({
      nomineeId: '',
      allocationPercentage: '',
      canView: true,
      canDownloadDocs: true,
    });
  };

  const handleCloseAllocations = () => {
    if (isSubmittingAssign) return;
    setAllocatingAsset(null);
    setAssetAllocations([]);
    setAllocationError('');
    setEditingAssignment(null);
    setAssignFormData({
      nomineeId: '',
      allocationPercentage: '',
      canView: true,
      canDownloadDocs: true,
    });
  };

  const handleAssignNomineeSubmit = async (e) => {
    e.preventDefault();
    if (!assignFormData.nomineeId) {
      setAllocationError('Please select a nominee to assign.');
      return;
    }
    const val = Number(assignFormData.allocationPercentage);
    if (isNaN(val) || val <= 0 || val > 100) {
      setAllocationError('Allocation percentage must be greater than 0 and at most 100.');
      return;
    }

    const otherAllocated = editingAssignment
      ? totalAllocated - (editingAssignment.allocation_percentage || 0)
      : totalAllocated;
    const available = Math.max(0, Math.round((100 - otherAllocated) * 100) / 100);

    if (val > available) {
      setAllocationError(`Only ${formatCleanNumber(available)}% remains available for this asset.`);
      return;
    }

    try {
      setIsSubmittingAssign(true);
      setAllocationError('');

      const isEdit = Boolean(editingAssignment);
      const url = isEdit
        ? `${API_URL}/vault/assets/${allocatingAsset.id}/nominees/${editingAssignment.nominee_id}`
        : `${API_URL}/vault/assets/${allocatingAsset.id}/nominees`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nomineeId: assignFormData.nomineeId,
          allocationPercentage: val,
          canView: assignFormData.canView,
          canDownloadDocs: assignFormData.canDownloadDocs,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || (isEdit ? 'Failed to update allocation.' : 'Failed to assign nominee.'));
      }

      setEditingAssignment(null);
      setAssignFormData({
        nomineeId: '',
        allocationPercentage: '',
        canView: true,
        canDownloadDocs: true,
      });

      await fetchAllocationsForAsset(allocatingAsset.id);
      await fetchNominees();
    } catch (err) {
      setAllocationError(err.message);
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const handleRemoveNomineeAssignment = async (nomineeId) => {
    try {
      setAllocationError('');
      const res = await fetch(`${API_URL}/vault/assets/${allocatingAsset.id}/nominees/${nomineeId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || 'Failed to remove assignment.');
      }
      if (editingAssignment && editingAssignment.nominee_id === nomineeId) {
        handleCancelEditAssignment();
      }
      await fetchAllocationsForAsset(allocatingAsset.id);
      await fetchNominees();
    } catch (err) {
      setAllocationError(err.message);
    }
  };

  // -------------------------------------------------------------
  // ASSET CRUD HANDLERS
  // -------------------------------------------------------------
  const handleOpenAddAsset = () => {
    setEditingAsset(null);
    setAssetFormError('');
    setAssetFormData({
      name: '',
      category: 'financial',
      subcategory: '',
      description: '',
      estimatedValue: '',
      currency: 'INR',
      valuationDate: '',
    });
    setIsAddAssetOpen(true);
  };

  const handleOpenEditAsset = (asset) => {
    setEditingAsset(asset);
    setAssetFormError('');
    setAssetFormData({
      name: asset.name || '',
      category: asset.category || 'financial',
      subcategory: asset.subcategory || '',
      description: asset.description || '',
      estimatedValue: asset.estimated_value !== null && asset.estimated_value !== undefined ? asset.estimated_value : '',
      currency: asset.currency || 'INR',
      valuationDate: asset.valuation_date || '',
    });
    setIsAddAssetOpen(true);
  };

  const handleCloseAddAsset = () => {
    if (isSubmittingAsset) return;
    setIsAddAssetOpen(false);
    setEditingAsset(null);
    setAssetFormError('');
    if (hasNew === 'asset') {
      navigate('/vault', { replace: true });
    }
  };

  const handleSaveAssetSubmit = async (e) => {
    e.preventDefault();
    if (!assetFormData.name.trim()) {
      setAssetFormError('Asset name is required.');
      return;
    }
    if (!assetFormData.category) {
      setAssetFormError('Asset category is required.');
      return;
    }

    try {
      setIsSubmittingAsset(true);
      setAssetFormError('');

      const payload = {
        name: assetFormData.name.trim(),
        category: assetFormData.category,
        subcategory: assetFormData.subcategory.trim() || null,
        description: assetFormData.description.trim() || null,
        currency: assetFormData.currency || 'INR',
      };

      if (assetFormData.estimatedValue !== '') {
        const val = Number(assetFormData.estimatedValue);
        if (isNaN(val) || val < 0) {
          setAssetFormError('Estimated value must be a non-negative number.');
          setIsSubmittingAsset(false);
          return;
        }
        payload.estimatedValue = val;
      } else {
        payload.estimatedValue = null;
      }

      if (assetFormData.valuationDate) {
        payload.valuationDate = assetFormData.valuationDate;
      } else {
        payload.valuationDate = null;
      }

      const url = editingAsset ? `${API_URL}/vault/assets/${editingAsset.id}` : `${API_URL}/vault/assets`;
      const method = editingAsset ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || (editingAsset ? 'Failed to update asset.' : 'Failed to create asset.'));
      }

      await fetchAssets();
      if (isDocSection) await fetchDocuments();
      setIsAddAssetOpen(false);
      setEditingAsset(null);
      if (hasNew === 'asset') {
        navigate('/vault', { replace: true });
      }
    } catch (err) {
      setAssetFormError(err.message);
    } finally {
      setIsSubmittingAsset(false);
    }
  };

  const handleOpenDeleteAssetConfirm = (asset) => {
    setDeleteAssetError('');
    setAssetToDelete(asset);
  };

  const handleCloseDeleteAssetConfirm = () => {
    if (isDeletingAsset) return;
    setAssetToDelete(null);
    setDeleteAssetError('');
  };

  const handleConfirmDeleteAsset = async () => {
    if (!assetToDelete) return;
    try {
      setIsDeletingAsset(true);
      setDeleteAssetError('');

      const res = await fetch(`${API_URL}/vault/assets/${assetToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || 'Failed to delete asset.');
      }

      await fetchAssets();
      if (isDocSection) await fetchDocuments();
      if (isNomineeSection) await fetchNominees();
      setAssetToDelete(null);
    } catch (err) {
      setDeleteAssetError(err.message);
    } finally {
      setIsDeletingAsset(false);
    }
  };

  // -------------------------------------------------------------
  // DOCUMENT CRUD HANDLERS
  // -------------------------------------------------------------
  const handleOpenEditDoc = (doc) => {
    setEditDocError('');
    setEditingDocument(doc);
    setEditDocFormData({
      name: doc.name || '',
      description: doc.description || '',
      assetId: doc.asset_id || '',
    });
  };

  const handleCloseEditDoc = () => {
    if (isUpdatingDoc) return;
    setEditingDocument(null);
    setEditDocError('');
  };

  const handleUpdateDocSubmit = async (e) => {
    e.preventDefault();
    if (!editDocFormData.name.trim()) {
      setEditDocError('Document name is required.');
      return;
    }

    try {
      setIsUpdatingDoc(true);
      setEditDocError('');

      const payload = {
        name: editDocFormData.name.trim(),
        description: editDocFormData.description.trim() || null,
        assetId: editDocFormData.assetId || null,
      };

      const res = await fetch(`${API_URL}/documents/${editingDocument.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Failed to update document.');
      }

      await fetchDocuments();
      setEditingDocument(null);
    } catch (err) {
      setEditDocError(err.message);
    } finally {
      setIsUpdatingDoc(false);
    }
  };

  const handleOpenDeleteConfirm = (doc) => {
    setDeleteError('');
    setDocumentToDelete(doc);
  };

  const handleCloseDeleteConfirm = () => {
    if (isDeletingDoc) return;
    setDocumentToDelete(null);
    setDeleteError('');
  };

  const handleConfirmDelete = async () => {
    if (!documentToDelete) return;
    try {
      setIsDeletingDoc(true);
      setDeleteError('');

      const res = await fetch(`${API_URL}/documents/${documentToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || 'Failed to delete document.');
      }

      setDocuments((prev) => prev.filter((d) => d.id !== documentToDelete.id));
      setDocumentToDelete(null);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setIsDeletingDoc(false);
    }
  };

  // -------------------------------------------------------------
  // FILE UPLOAD / DROPZONE HANDLERS
  // -------------------------------------------------------------
  const validateAndSetFile = (file) => {
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`File is too large (${formatBytes(file.size)}). Maximum upload size is 15 MB.`);
      return;
    }

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    const isAllowedExt = ALLOWED_EXTENSIONS.includes(ext);
    const isAllowedMime = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase()) || file.type === '';

    if (!isAllowedExt && !isAllowedMime) {
      setUploadError('Unsupported file type. Only PDF, JPG, PNG, and WebP files are allowed.');
      return;
    }

    setUploadError('');
    setUploadFormData((prev) => ({
      ...prev,
      file,
      name: prev.name || file.name.replace(/\.[^/.]+$/, ''),
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleRemoveSelectedFile = (e) => {
    e.stopPropagation();
    setUploadFormData((prev) => ({ ...prev, file: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

      const formData = new FormData();
      formData.append('file', uploadFormData.file);
      formData.append('name', uploadFormData.name.trim());
      if (uploadFormData.description) formData.append('description', uploadFormData.description.trim());
      if (uploadFormData.assetId) formData.append('assetId', uploadFormData.assetId);

      const res = await fetch(`${API_URL}/documents`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Failed to upload document.');
      }

      setUploadFormData({ name: '', description: '', assetId: '', file: null });
      navigate('/documents');
      fetchDocuments();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Section-specific dynamic statistics
  const currentStats = isDocSection
    ? [
        [documents.length.toString(), 'total files'],
        [documents.filter((d) => d.asset_id).length.toString(), 'linked to assets'],
        [documents.filter((d) => !d.asset_id).length.toString(), 'standalone files'],
      ]
    : isVaultSection
    ? [
        [assets.length.toString(), 'total assets'],
        [new Set(assets.map((a) => a.category)).size.toString(), 'categories'],
        ['0', 'need review'],
      ]
    : isNomineeSection
    ? [
        [nominees.length.toString(), 'total nominees'],
        [nominees.filter((n) => n.assigned_assets_count > 0).length.toString(), 'assigned to assets'],
        [nominees.filter((n) => n.assigned_assets_count === 0).length.toString(), 'unassigned'],
      ]
    : config.stats;

  return (
    <div className={styles.shell}>
      <main className={styles.content}>
        <Link to="/dashboard" className={styles.back}><ArrowLeft size={13} /> Dashboard</Link>

        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>{config.eyebrow}</span>
            <h1>{config.title}</h1>
            <p>{config.description}</p>
          </div>
          <div className={styles.headerIcon}><Icon size={19} /></div>
        </header>

        {(hasNew && !isDocSection && !isVaultSection && !isNomineeSection) && (
          <div className={styles.notice}>
            <strong>Create flow ready</strong>
            <span>
              This route is wired and ready for the real backend action when we build that feature.
            </span>
          </div>
        )}

        <section className={styles.stats}>
          {currentStats.map(([value, label]) => (
            <div className={styles.stat} key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <span className={styles.kicker}>WORKSPACE</span>
              <h2>{config.title} overview</h2>
            </div>
            <div className={styles.actions}>
              {isVaultSection && (
                <button
                  type="button"
                  onClick={handleOpenAddAsset}
                  className={styles.actionBtn}
                >
                  <WalletCards size={13} /> Add asset
                </button>
              )}
              {isNomineeSection && (
                <button
                  type="button"
                  onClick={handleOpenAddNominee}
                  className={styles.actionBtn}
                >
                  <UserPlus size={13} /> Add nominee
                </button>
              )}
              {config.actions
                .filter(([label, to]) => !(isVaultSection && to === 'add-asset') && !(isNomineeSection && to === 'add-nominee'))
                .map(([label, to, ActionIcon]) => (
                  <Link to={to} className={styles.action} key={label}>
                    <ActionIcon size={13} /> {label}
                  </Link>
                ))}
            </div>
          </div>

          <div className={styles.rows}>
            {isDocSection ? (
              loadingDocs ? (
                <div style={{ padding: '20px 0', textAlign: 'center', fontSize: '11px', color: '#8c938e' }}>
                  Loading documents...
                </div>
              ) : documents.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', fontSize: '11px', color: '#8c938e' }}>
                  No documents uploaded yet. Click "Upload document" to add your first legacy record.
                </div>
              ) : (
                documents.map((doc) => (
                  <div className={styles.row} key={doc.id}>
                    <div className={styles.rowIcon}><FileText size={14} /></div>
                    <div className={styles.rowMain}>
                      <strong>{doc.name}</strong>
                      <span>
                        {doc.file_name} · {formatBytes(doc.file_size)}
                        {doc.asset_name ? ` · Asset: ${doc.asset_name}` : ' · Standalone'}
                      </span>
                    </div>
                    <div className={styles.itemActions}>
                      <button
                        onClick={() => handleOpenEditDoc(doc)}
                        className={styles.iconActionBtn}
                        title="Edit document"
                        aria-label="Edit document"
                        type="button"
                      >
                        <Pencil size={13} />
                      </button>
                      <a
                        href={`${API_URL}/documents/${doc.id}/download`}
                        className={styles.iconActionBtn}
                        title="Download file"
                        aria-label="Download file"
                        download
                      >
                        <Download size={13} />
                      </a>
                      <button
                        onClick={() => handleOpenDeleteConfirm(doc)}
                        className={styles.iconActionBtn}
                        title="Delete document"
                        aria-label="Delete document"
                        type="button"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : isVaultSection ? (
              loadingAssets ? (
                <div style={{ padding: '20px 0', textAlign: 'center', fontSize: '11px', color: '#8c938e' }}>
                  Loading assets...
                </div>
              ) : assets.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', fontSize: '11px', color: '#8c938e' }}>
                  No assets recorded in your vault yet. Click "Add asset" to begin cataloguing your digital legacy.
                </div>
              ) : (
                assets.map((asset) => (
                  <div className={styles.row} key={asset.id}>
                    <div className={styles.rowIcon}><FolderOpen size={14} /></div>
                    <div className={styles.rowMain}>
                      <strong>{asset.name}</strong>
                      <span>
                        {asset.category.charAt(0).toUpperCase() + asset.category.slice(1)}
                        {asset.subcategory ? ` · ${asset.subcategory}` : ''}
                        {asset.estimated_value ? ` · ${asset.currency || 'INR'} ${Number(asset.estimated_value).toLocaleString('en-IN')}` : ''}
                      </span>
                    </div>
                    <div className={styles.itemActions}>
                      <button
                        onClick={() => handleOpenAllocations(asset)}
                        className={styles.iconActionBtn}
                        title="Manage Nominees & Allocations"
                        aria-label="Manage Nominees & Allocations"
                        type="button"
                      >
                        <UsersRound size={13} />
                      </button>
                      <button
                        onClick={() => handleOpenEditAsset(asset)}
                        className={styles.iconActionBtn}
                        title="Edit asset"
                        aria-label="Edit asset"
                        type="button"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteAssetConfirm(asset)}
                        className={styles.iconActionBtn}
                        title="Delete asset"
                        aria-label="Delete asset"
                        type="button"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : isNomineeSection ? (
              loadingNominees ? (
                <div style={{ padding: '20px 0', textAlign: 'center', fontSize: '11px', color: '#8c938e' }}>
                  Loading nominees...
                </div>
              ) : nominees.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', fontSize: '11px', color: '#8c938e' }}>
                  No nominees registered yet. Click "Add nominee" to designate trusted beneficiaries for your legacy.
                </div>
              ) : (
                nominees.map((nominee) => (
                  <div className={styles.row} key={nominee.id}>
                    <div className={styles.rowIcon}><UsersRound size={14} /></div>
                    <div className={styles.rowMain}>
                      <strong>{nominee.full_name}</strong>
                      <span>
                        {nominee.relationship} · {nominee.email}
                        {nominee.phone ? ` · ${nominee.phone}` : ''}
                        {nominee.assigned_assets_count > 0 ? ` · Assigned to ${nominee.assigned_assets_count} asset${nominee.assigned_assets_count > 1 ? 's' : ''}` : ' · Unassigned'}
                      </span>
                    </div>
                    <div className={styles.itemActions}>
                      <button
                        onClick={() => handleOpenEditNominee(nominee)}
                        className={styles.iconActionBtn}
                        title="Edit nominee"
                        aria-label="Edit nominee"
                        type="button"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteNomineeConfirm(nominee)}
                        className={styles.iconActionBtn}
                        title="Delete nominee"
                        aria-label="Delete nominee"
                        type="button"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : (
              config.rows.map(([title, meta, status]) => (
                <div className={styles.row} key={`${title}-${meta}`}>
                  <div className={styles.rowIcon}><Icon size={14} /></div>
                  <div className={styles.rowMain}>
                    <strong>{title}</strong>
                    <span>{meta}</span>
                  </div>
                  <span className={styles.status}>{status}</span>
                </div>
              ))
            )}
          </div>
        </section>

        {!isDocSection && !isVaultSection && !isNomineeSection && (
          <section className={styles.empty}>
            <Search size={15} />
            <div>
              <strong>Frontend route is connected.</strong>
              <span>The next step is replacing these preview records with live API data.</span>
            </div>
          </section>
        )}

        {/* =========================================================
            UPLOAD DOCUMENT MODAL WITH CUSTOM DROPZONE
            ========================================================= */}
        {isDocSection && uploadParam && (
          <div className={styles.uploadModalOverlay} onClick={() => !isUploading && navigate('/documents')}>
            <div className={styles.uploadModal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHead}>
                <h3>Upload Legacy Document</h3>
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={() => navigate('/documents')}
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
                    onChange={handleFileChange}
                  />

                  {!uploadFormData.file ? (
                    <div
                      className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      role="button"
                      tabIndex={0}
                    >
                      <div className={styles.dropzoneIconWrapper}>
                        <UploadCloud size={18} />
                      </div>
                      <span className={styles.dropzonePrimaryText}>Drop your document here</span>
                      <span className={styles.dropzoneSecondaryText}>or click to browse</span>
                      <span className={styles.dropzoneHelper}>
                        PDF, JPG, PNG or WebP · Maximum 15 MB
                      </span>
                    </div>
                  ) : (
                    <div className={styles.selectedFileCard}>
                      <div className={styles.selectedFileInfo}>
                        <div className={styles.selectedFileIcon}>
                          <FileCheck size={18} />
                        </div>
                        <div className={styles.selectedFileMeta}>
                          <span className={styles.selectedFileName} title={uploadFormData.file.name}>
                            {uploadFormData.file.name}
                          </span>
                          <span className={styles.selectedFileSize}>
                            {formatBytes(uploadFormData.file.size)} · Click to change
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={styles.removeFileBtn}
                        onClick={handleRemoveSelectedFile}
                        title="Remove file"
                        aria-label="Remove file"
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
                    placeholder="e.g. Property Deed, Life Insurance Policy"
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

                <div className={styles.formGroup}>
                  <label>Link to Asset (Optional)</label>
                  <select
                    className={styles.formInput}
                    value={uploadFormData.assetId}
                    onChange={(e) => setUploadFormData({ ...uploadFormData, assetId: e.target.value })}
                  >
                    <option value="">-- Standalone Document (No Asset) --</option>
                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name} ({asset.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => navigate('/documents')}
                    disabled={isUploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={isUploading || !uploadFormData.file || !uploadFormData.name.trim()}
                  >
                    <Upload size={12} /> {isUploading ? 'Uploading...' : 'Upload Document'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================
            EDIT DOCUMENT METADATA MODAL
            ========================================================= */}
        {editingDocument && (
          <div className={styles.uploadModalOverlay} onClick={handleCloseEditDoc}>
            <div className={styles.uploadModal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHead}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Pencil size={16} color="#1b4fd8" />
                  <h3>Edit Document Details</h3>
                </div>
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={handleCloseEditDoc}
                  disabled={isUpdatingDoc}
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>

              {editDocError && <div className={styles.formError}>{editDocError}</div>}

              <form onSubmit={handleUpdateDocSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className={styles.formGroup}>
                  <label>Document Name</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="Document title"
                    value={editDocFormData.name}
                    onChange={(e) => setEditDocFormData({ ...editDocFormData, name: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Description (Optional)</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="Brief description or purpose"
                    value={editDocFormData.description}
                    onChange={(e) => setEditDocFormData({ ...editDocFormData, description: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Link to Asset</label>
                  <select
                    className={styles.formInput}
                    value={editDocFormData.assetId}
                    onChange={(e) => setEditDocFormData({ ...editDocFormData, assetId: e.target.value })}
                  >
                    <option value="">-- Standalone Document (No Asset) --</option>
                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name} ({asset.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={handleCloseEditDoc}
                    disabled={isUpdatingDoc}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={isUpdatingDoc || !editDocFormData.name.trim()}
                  >
                    <Pencil size={12} /> {isUpdatingDoc ? 'Saving...' : 'Save Changes'}
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
          <div className={styles.uploadModalOverlay} onClick={handleCloseDeleteConfirm}>
            <div className={styles.uploadModal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHead}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={17} color="#dc2626" />
                  <h3>Delete document?</h3>
                </div>
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={handleCloseDeleteConfirm}
                  disabled={isDeletingDoc}
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>

              {deleteError && <div className={styles.formError}>{deleteError}</div>}

              <p className={styles.confirmBody}>
                Are you sure you want to permanently delete <strong>"{documentToDelete.name}"</strong> ({documentToDelete.file_name})? This file will be removed from your secure storage and cannot be recovered.
              </p>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={handleCloseDeleteConfirm}
                  disabled={isDeletingDoc}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.destructiveBtn}
                  onClick={handleConfirmDelete}
                  disabled={isDeletingDoc}
                >
                  <Trash2 size={12} /> {isDeletingDoc ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            ADD / EDIT ASSET MODAL
            ========================================================= */}
        {isAddAssetOpen && (
          <div className={styles.uploadModalOverlay} onClick={handleCloseAddAsset}>
            <div className={styles.uploadModal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHead}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {editingAsset ? <Pencil size={16} color="#1b4fd8" /> : <WalletCards size={17} color="#1b4fd8" />}
                  <h3>{editingAsset ? 'Edit Vault Asset' : 'Add Vault Asset'}</h3>
                </div>
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={handleCloseAddAsset}
                  disabled={isSubmittingAsset}
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>

              {assetFormError && <div className={styles.formError}>{assetFormError}</div>}

              <form onSubmit={handleSaveAssetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className={styles.formGroup}>
                  <label>Asset Name</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="e.g. HDFC Salary Account, Villa in Goa"
                    value={assetFormData.name}
                    onChange={(e) => setAssetFormData({ ...assetFormData, name: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Category</label>
                    <select
                      className={styles.formInput}
                      value={assetFormData.category}
                      onChange={(e) => setAssetFormData({ ...assetFormData, category: e.target.value })}
                      required
                    >
                      <option value="financial">Financial</option>
                      <option value="property">Property</option>
                      <option value="insurance">Insurance</option>
                      <option value="digital">Digital / Crypto</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Subcategory (Optional)</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="e.g. Savings, Real Estate"
                      value={assetFormData.subcategory}
                      onChange={(e) => setAssetFormData({ ...assetFormData, subcategory: e.target.value })}
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
                      placeholder="e.g. 500000"
                      value={assetFormData.estimatedValue}
                      onChange={(e) => setAssetFormData({ ...assetFormData, estimatedValue: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Valuation Date</label>
                    <input
                      type="date"
                      className={styles.formInput}
                      value={assetFormData.valuationDate}
                      onChange={(e) => setAssetFormData({ ...assetFormData, valuationDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Description (Optional)</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="Account details, policy note, or location"
                    value={assetFormData.description}
                    onChange={(e) => setAssetFormData({ ...assetFormData, description: e.target.value })}
                  />
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={handleCloseAddAsset}
                    disabled={isSubmittingAsset}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={isSubmittingAsset || !assetFormData.name.trim()}
                  >
                    {editingAsset ? <Pencil size={12} /> : <Plus size={12} />}
                    {isSubmittingAsset ? (editingAsset ? 'Saving...' : 'Creating...') : (editingAsset ? 'Save Changes' : 'Save Asset')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================
            DELETE ASSET CONFIRMATION MODAL
            ========================================================= */}
        {assetToDelete && (
          <div className={styles.uploadModalOverlay} onClick={handleCloseDeleteAssetConfirm}>
            <div className={styles.uploadModal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHead}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={17} color="#dc2626" />
                  <h3>Delete asset?</h3>
                </div>
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={handleCloseDeleteAssetConfirm}
                  disabled={isDeletingAsset}
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>

              {deleteAssetError && <div className={styles.formError}>{deleteAssetError}</div>}

              <p className={styles.confirmBody}>
                Are you sure you want to delete <strong>"{assetToDelete.name}"</strong>? This action cannot be undone. Documents linked to this asset will <strong>NOT</strong> be deleted; they will safely become standalone documents.
              </p>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={handleCloseDeleteAssetConfirm}
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
            ASSET NOMINEE ALLOCATION MANAGER MODAL
            ========================================================= */}
        {allocatingAsset && (() => {
          const assignedNomineeIds = new Set(assetAllocations.map((a) => a.nominee_id));
          const availableNominees = editingAssignment
            ? nominees.filter((n) => n.id === editingAssignment.nominee_id)
            : nominees.filter((n) => !assignedNomineeIds.has(n.id));

          const allAssigned = !editingAssignment && nominees.length > 0 && availableNominees.length === 0;
          const noNomineesAtAll = nominees.length === 0;

          const currentOtherAllocated = editingAssignment
            ? totalAllocated - (editingAssignment.allocation_percentage || 0)
            : totalAllocated;
          const currentAvailable = Math.max(0, Math.round((100 - currentOtherAllocated) * 100) / 100);

          const enteredVal = Number(assignFormData.allocationPercentage);
          const isOverAvailable =
            assignFormData.allocationPercentage !== '' &&
            !isNaN(enteredVal) &&
            (enteredVal > currentAvailable || enteredVal <= 0);

          return (
            <div className={styles.uploadModalOverlay} onClick={handleCloseAllocations}>
              <div className={styles.uploadModal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHead}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UsersRound size={17} color="#1b4fd8" />
                    <h3>Beneficiary Allocations</h3>
                  </div>
                  <button
                    type="button"
                    className={styles.closeBtn}
                    onClick={handleCloseAllocations}
                    disabled={isSubmittingAssign}
                    aria-label="Close"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div style={{ fontSize: '11px', color: '#667169' }}>
                  Manage nominees and percentage distributions for <strong>{allocatingAsset.name}</strong>.
                </div>

                {/* Progress bar visual */}
                <div className={styles.progressBarContainer}>
                  <div className={styles.progressBarMeta}>
                    <span className={styles.progressBarLabel}>Total Allocation</span>
                    <span className={styles.progressBarValue}>{formatCleanPercent(totalAllocated)} / 100%</span>
                  </div>
                  <div className={styles.progressBarTrack}>
                    <div
                      className={`${styles.progressBarFill} ${totalAllocated === 100 ? styles.progressBarFillFull : ''}`}
                      style={{ width: `${Math.min(100, totalAllocated)}%` }}
                    />
                  </div>
                  <div style={{ fontSize: '9px', color: '#8c938e' }}>
                    {remainingAllocated > 0
                      ? `${formatCleanPercent(remainingAllocated)} remaining to be allocated.`
                      : '100% fully allocated.'}
                  </div>
                </div>

                {allocationError && <div className={styles.formError}>{allocationError}</div>}

                {/* Existing assigned nominees */}
                <div className={styles.formGroup}>
                  <label>Assigned Nominees ({assetAllocations.length})</label>
                  {isLoadingAllocations ? (
                    <div style={{ padding: '10px 0', fontSize: '10px', color: '#8c938e', textAlign: 'center' }}>
                      Loading allocations...
                    </div>
                  ) : assetAllocations.length === 0 ? (
                    <div style={{ padding: '12px', fontSize: '10px', color: '#8c938e', background: '#fafbfa', borderRadius: '8px', border: '1px solid rgba(30,35,32,0.06)', textAlign: 'center' }}>
                      No beneficiaries assigned yet. Use the form below to allocate.
                    </div>
                  ) : (
                    <div className={styles.assignmentList}>
                      {assetAllocations.map((item) => (
                        <div className={styles.assignmentItem} key={item.nominee_id}>
                          <div className={styles.assignmentInfo}>
                            <span className={styles.assignmentName}>{item.nominee_name}</span>
                            <span className={styles.assignmentSub}>{item.nominee_relationship} · {item.nominee_email}</span>
                          </div>
                          <div className={styles.assignmentControls}>
                            <span className={styles.allocationBadge}>{formatCleanPercent(item.allocation_percentage)}</span>
                            <button
                              type="button"
                              className={styles.iconActionBtn}
                              onClick={() => handleOpenEditAssignment(item)}
                              title="Edit allocation"
                              aria-label="Edit allocation"
                              disabled={isSubmittingAssign}
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              type="button"
                              className={styles.iconActionBtn}
                              onClick={() => handleRemoveNomineeAssignment(item.nominee_id)}
                              title="Remove assignment"
                              aria-label="Remove assignment"
                              disabled={isSubmittingAssign}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Empty State when no nominees exist in user account */}
                {noNomineesAtAll ? (
                  <div style={{ padding: '14px', fontSize: '11px', color: '#667169', background: '#fafbfa', borderRadius: '8px', border: '1px solid rgba(30,35,32,0.06)', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 10px 0' }}>No nominees yet. Add a nominee first to assign them to this asset.</p>
                    <button
                      type="button"
                      className={styles.submitBtn}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontSize: '10px', margin: '0 auto' }}
                      onClick={() => {
                        handleCloseAllocations();
                        handleOpenAddNominee();
                      }}
                    >
                      <UserPlus size={12} /> Add nominee
                    </button>
                  </div>
                ) : allAssigned ? (
                  <div style={{ padding: '12px', fontSize: '11px', color: '#526058', background: '#f4f6f4', borderRadius: '8px', border: '1px solid rgba(30,35,32,0.06)', textAlign: 'center' }}>
                    All nominees are already assigned to this asset.
                  </div>
                ) : (
                  /* Assign / Update Form */
                  <form onSubmit={handleAssignNomineeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid rgba(30,35,32,0.08)', paddingTop: '12px' }}>
                    {editingAssignment && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#1b4fd8', fontWeight: 600 }}>
                        <span>Editing allocation for {editingAssignment.nominee_name}</span>
                        <button
                          type="button"
                          onClick={handleCancelEditAssignment}
                          style={{ background: 'none', border: 'none', color: '#667169', cursor: 'pointer', fontSize: '10px', textDecoration: 'underline' }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label>Select Nominee</label>
                        <select
                          className={styles.formInput}
                          value={assignFormData.nomineeId}
                          onChange={(e) => setAssignFormData({ ...assignFormData, nomineeId: e.target.value })}
                          disabled={Boolean(editingAssignment)}
                          required
                        >
                          <option value="">{editingAssignment ? '-- Selected Nominee --' : '-- Choose Nominee --'}</option>
                          {availableNominees.map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.full_name} ({n.relationship})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.formGroup}>
                        <label>Allocation (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="100"
                          className={styles.formInput}
                          placeholder="e.g. 50"
                          value={assignFormData.allocationPercentage}
                          onChange={(e) => setAssignFormData({ ...assignFormData, allocationPercentage: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    {/* Real-time Inline Feedback */}
                    {assignFormData.allocationPercentage !== '' && !isNaN(enteredVal) && enteredVal > currentAvailable && (
                      <div style={{ fontSize: '10px', color: '#d93025', marginTop: '-4px' }}>
                        Only {formatCleanNumber(currentAvailable)}% remains available for this asset.
                      </div>
                    )}
                    {assignFormData.allocationPercentage !== '' && !isNaN(enteredVal) && enteredVal <= 0 && (
                      <div style={{ fontSize: '10px', color: '#d93025', marginTop: '-4px' }}>
                        Allocation percentage must be greater than 0%.
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '14px', fontSize: '10px', color: '#667169' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={assignFormData.canView}
                          onChange={(e) => setAssignFormData({ ...assignFormData, canView: e.target.checked })}
                        />
                        Can view details
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={assignFormData.canDownloadDocs}
                          onChange={(e) => setAssignFormData({ ...assignFormData, canDownloadDocs: e.target.checked })}
                        />
                        Can download documents
                      </label>
                    </div>

                    <div className={styles.modalActions}>
                      {editingAssignment ? (
                        <button
                          type="button"
                          className={styles.cancelBtn}
                          onClick={handleCancelEditAssignment}
                          disabled={isSubmittingAssign}
                        >
                          Cancel
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={styles.cancelBtn}
                          onClick={handleCloseAllocations}
                          disabled={isSubmittingAssign}
                        >
                          Done
                        </button>
                      )}
                      <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={
                          isSubmittingAssign ||
                          !assignFormData.nomineeId ||
                          assignFormData.allocationPercentage === '' ||
                          isOverAvailable
                        }
                      >
                        {editingAssignment ? (
                          <>
                            <Pencil size={12} /> {isSubmittingAssign ? 'Updating...' : 'Update Allocation'}
                          </>
                        ) : (
                          <>
                            <Plus size={12} /> {isSubmittingAssign ? 'Saving...' : 'Set Allocation'}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          );
        })()}

        {/* =========================================================
            ADD / EDIT NOMINEE MODAL
            ========================================================= */}
        {isNomineeModalOpen && (
          <div className={styles.uploadModalOverlay} onClick={handleCloseNomineeModal}>
            <div className={styles.uploadModal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHead}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {editingNominee ? <Pencil size={16} color="#1b4fd8" /> : <UserPlus size={17} color="#1b4fd8" />}
                  <h3>{editingNominee ? 'Edit Nominee' : 'Add Nominee'}</h3>
                </div>
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={handleCloseNomineeModal}
                  disabled={isSubmittingNominee}
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>

              {nomineeFormError && <div className={styles.formError}>{nomineeFormError}</div>}

              <form onSubmit={handleSaveNomineeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className={styles.formGroup}>
                  <label>Full Name</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="e.g. Sarah Sharma"
                    value={nomineeFormData.fullName}
                    onChange={(e) => setNomineeFormData({ ...nomineeFormData, fullName: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Email Address</label>
                    <input
                      type="email"
                      className={styles.formInput}
                      placeholder="e.g. sarah@example.com"
                      value={nomineeFormData.email}
                      onChange={(e) => setNomineeFormData({ ...nomineeFormData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Relationship</label>
                    <select
                      className={styles.formInput}
                      value={nomineeFormData.relationship}
                      onChange={(e) => setNomineeFormData({ ...nomineeFormData, relationship: e.target.value })}
                      required
                    >
                      {RELATIONSHIPS.map((rel) => (
                        <option key={rel} value={rel}>{rel}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Phone Number (Optional)</label>
                  <input
                    type="tel"
                    className={styles.formInput}
                    placeholder="e.g. +91 98765 43210"
                    value={nomineeFormData.phone}
                    onChange={(e) => setNomineeFormData({ ...nomineeFormData, phone: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Notes / Instructions (Optional)</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="e.g. Primary emergency contact, legal guardian"
                    value={nomineeFormData.notes}
                    onChange={(e) => setNomineeFormData({ ...nomineeFormData, notes: e.target.value })}
                  />
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={handleCloseNomineeModal}
                    disabled={isSubmittingNominee}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={isSubmittingNominee || !nomineeFormData.fullName.trim() || !nomineeFormData.email.trim()}
                  >
                    {editingNominee ? <Pencil size={12} /> : <Plus size={12} />}
                    {isSubmittingNominee ? (editingNominee ? 'Saving...' : 'Adding...') : (editingNominee ? 'Save Changes' : 'Save Nominee')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================
            DELETE NOMINEE CONFIRMATION MODAL
            ========================================================= */}
        {nomineeToDelete && (
          <div className={styles.uploadModalOverlay} onClick={handleCloseDeleteNomineeConfirm}>
            <div className={styles.uploadModal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHead}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={17} color="#dc2626" />
                  <h3>Delete nominee?</h3>
                </div>
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={handleCloseDeleteNomineeConfirm}
                  disabled={isDeletingNominee}
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>

              {deleteNomineeError && <div className={styles.formError}>{deleteNomineeError}</div>}

              <p className={styles.confirmBody}>
                Are you sure you want to delete <strong>"{nomineeToDelete.full_name}"</strong>? This will permanently remove them from your nominee directory and revoke any beneficiary allocations they currently hold across your assets.
              </p>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={handleCloseDeleteNomineeConfirm}
                  disabled={isDeletingNominee}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.destructiveBtn}
                  onClick={handleConfirmDeleteNominee}
                  disabled={isDeletingNominee}
                >
                  <Trash2 size={12} /> {isDeletingNominee ? 'Deleting...' : 'Delete Nominee'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className={styles.bottomNav}>
        <Link to="/dashboard">DV.</Link>
        <Link className={section === 'vault' ? styles.active : ''} to="/vault">Vault</Link>
        <Link className={section === 'nominees' ? styles.active : ''} to="/nominees">Nominees</Link>
        <Link className={section === 'activity' ? styles.active : ''} to="/activity">Activity</Link>
        <Link className={section === 'documents' ? styles.active : ''} to="/documents">Documents</Link>
        <Link className={section === 'calendar' ? styles.active : ''} to="/calendar">Calendar</Link>
        <Link className={section === 'settings' ? styles.active : ''} to="/settings">Settings</Link>
      </nav>
    </div>
  );
}
