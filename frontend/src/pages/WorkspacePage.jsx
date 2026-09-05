import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, CalendarDays, Download, FileCheck, FileText,
  FolderOpen, Pencil, Plus, Search, Settings, ShieldCheck, Trash2, Upload, UploadCloud,
  UsersRound, WalletCards, X
} from 'lucide-react';
import styles from './WorkspacePage.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const configs = {
  vault: {
    eyebrow: 'ORGANISE',
    title: 'Your vault',
    description: 'A structured home for the assets, records and information that make up your digital legacy.',
    icon: FolderOpen,
    actions: [['Add asset', 'add-asset', WalletCards], ['Upload document', '/documents?upload=1', Upload]],
    stats: [['0', 'total assets'], ['0', 'categories'], ['0', 'need review']],
    rows: [],
  },
  nominees: {
    eyebrow: 'PEOPLE',
    title: 'Nominees',
    description: 'Manage the people who should receive or access the parts of your legacy you assign to them.',
    icon: UsersRound,
    actions: [['Add nominee', '/nominees?new=1', UsersRound]],
    stats: [['02', 'nominees'], ['50%', 'primary share'], ['100%', 'allocation']],
    rows: [
      ['Sarah', 'Spouse · 50%', 'Primary'],
      ['John', 'Son · 50%', 'Primary'],
    ],
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
    stats: [['0', 'documents'], ['0', 'attached to assets'], ['0', 'unattached']],
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

export default function WorkspacePage({ section }) {
  const location = useLocation();
  const navigate = useNavigate();
  const config = configs[section] || configs.vault;
  const Icon = config.icon;
  const hasNew = new URLSearchParams(location.search).get('new');
  const uploadParam = new URLSearchParams(location.search).get('upload');

  // Documents and Assets live state
  const [documents, setDocuments] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(section === 'documents');
  const [loadingAssets, setLoadingAssets] = useState(section === 'vault');

  // Add / Edit Asset modal state
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(hasNew === 'asset');
  const [editingAsset, setEditingAsset] = useState(null); // null = add, object = edit
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

  // Handle URL changes for modals
  useEffect(() => {
    if (hasNew === 'asset') {
      handleOpenAddAsset();
    }
  }, [hasNew]);

  // Handle Escape key to close any active modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isAddAssetOpen && !isSubmittingAsset) handleCloseAddAsset();
        if (assetToDelete && !isDeletingAsset) handleCloseDeleteAssetConfirm();
        if (editingDocument && !isUpdatingDoc) handleCloseEditDoc();
        if (documentToDelete && !isDeletingDoc) handleCloseDeleteConfirm();
        if (uploadParam && !isUploading) navigate('/documents');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddAssetOpen, isSubmittingAsset, assetToDelete, isDeletingAsset, editingDocument, isUpdatingDoc, documentToDelete, isDeletingDoc, uploadParam, isUploading]);

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

  useEffect(() => {
    if (isDocSection) {
      fetchDocuments();
      fetchAssets();
    } else if (isVaultSection) {
      fetchAssets();
    }
  }, [section]);

  // -------------------------------------------------------------
  // ASSET MODAL HANDLERS (ADD & EDIT)
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

      // Refresh assets list so both vault and document dropdown stay synchronized
      await fetchAssets();
      if (isDocSection) {
        await fetchDocuments();
      }
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

  // -------------------------------------------------------------
  // DELETE ASSET MODAL HANDLERS
  // -------------------------------------------------------------
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

      // Refresh assets
      await fetchAssets();
      // Also update documents list if in documents section (linked docs become standalone)
      if (isDocSection) {
        await fetchDocuments();
      }
      setAssetToDelete(null);
    } catch (err) {
      setDeleteAssetError(err.message);
    } finally {
      setIsDeletingAsset(false);
    }
  };

  // -------------------------------------------------------------
  // EDIT DOCUMENT MODAL HANDLERS
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

  // -------------------------------------------------------------
  // DELETE DOCUMENT MODAL HANDLERS
  // -------------------------------------------------------------
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

  // Compute stats
  const docStats = isDocSection
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

        {(hasNew && !isDocSection && !isVaultSection) && (
          <div className={styles.notice}>
            <strong>Create flow ready</strong>
            <span>
              This route is wired and ready for the real backend action when we build that feature.
            </span>
          </div>
        )}

        <section className={styles.stats}>
          {docStats.map(([value, label]) => (
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
              {config.actions
                .filter(([label, to]) => !(isVaultSection && to === 'add-asset'))
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

        {!isDocSection && !isVaultSection && (
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
            CUSTOM IN-APP DELETE DOCUMENT CONFIRMATION MODAL
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
            ADD / EDIT ASSET IN-APP MODAL
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
            CUSTOM IN-APP DELETE ASSET CONFIRMATION MODAL
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
