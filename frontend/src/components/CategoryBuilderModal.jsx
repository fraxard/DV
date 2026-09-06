import React, { useState } from 'react';
import { X, Plus, Trash2, ArrowUp, ArrowDown, FolderPlus, AlertCircle } from 'lucide-react';
import styles from './CategoryBuilderModal.module.css';

const SUPPORTED_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'url', label: 'URL / Link' },
  { value: 'boolean', label: 'Boolean (Yes/No)' },
];

export default function CategoryBuilderModal({
  isOpen,
  onClose,
  onSave,
  editingCategory = null,
  isSubmitting = false,
}) {
  const [name, setName] = useState(editingCategory ? editingCategory.name : '');
  const [description, setDescription] = useState(editingCategory ? editingCategory.description || '' : '');
  const [fields, setFields] = useState(
    editingCategory && editingCategory.fields?.length
      ? editingCategory.fields.map((f, idx) => ({
          id: f.id,
          key: f.key,
          label: f.label,
          type: f.type,
          isRequired: Boolean(f.isRequired),
          orderIndex: idx,
        }))
      : [
          { label: 'Item Name / Reference', type: 'text', isRequired: true, orderIndex: 0 },
        ]
  );
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAddField = () => {
    if (fields.length >= 50) {
      setError('Maximum of 50 fields allowed per category.');
      return;
    }
    setFields([
      ...fields,
      { label: '', type: 'text', isRequired: false, orderIndex: fields.length },
    ]);
  };

  const handleRemoveField = (index) => {
    if (fields.length <= 1) {
      setError('A category must have at least one field definition.');
      return;
    }
    const updated = fields.filter((_, idx) => idx !== index);
    setFields(updated.map((f, idx) => ({ ...f, orderIndex: idx })));
  };

  const handleMoveField = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= fields.length) return;

    const copy = [...fields];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;

    setFields(copy.map((f, idx) => ({ ...f, orderIndex: idx })));
  };

  const handleFieldChange = (index, key, value) => {
    const copy = [...fields];
    copy[index] = { ...copy[index], [key]: value };
    setFields(copy);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Category name is required.');
      return;
    }

    for (let i = 0; i < fields.length; i++) {
      if (!fields[i].label.trim()) {
        setError(`Field #${i + 1} must have a label.`);
        return;
      }
    }

    setError('');
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        fields,
      }, editingCategory ? editingCategory.id : null);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save custom category.');
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <FolderPlus size={16} color="#1b4fd8" />
            <h3>{editingCategory ? 'Edit Custom Category' : 'Create Custom Category'}</h3>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <AlertCircle size={13} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Category Name *</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. Rare Books, Fine Art, Vehicles, Heirlooms"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Description (Optional)</label>
            <input
              type="text"
              className={styles.input}
              placeholder="Brief description of items tracked in this category"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.fieldsSection}>
            <div className={styles.fieldsHead}>
              <span className={styles.sectionTitle}>Category Information Fields</span>
              <span className={styles.countBadge}>{fields.length} / 50</span>
            </div>
            <p className={styles.helperText}>
              Define the attributes you want to track for each asset in this category.
            </p>

            <div className={styles.fieldsList}>
              {fields.map((field, idx) => (
                <div className={styles.fieldItem} key={field.id || `field-${idx}`}>
                  <div className={styles.fieldInputsRow}>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder={`Field #${idx + 1} Label (e.g. Author, Edition)`}
                      value={field.label}
                      onChange={(e) => handleFieldChange(idx, 'label', e.target.value)}
                      required
                      style={{ flex: 2 }}
                      disabled={isSubmitting}
                    />

                    <select
                      className={styles.input}
                      value={field.type}
                      onChange={(e) => handleFieldChange(idx, 'type', e.target.value)}
                      style={{ flex: 1.2 }}
                      disabled={isSubmitting}
                    >
                      {SUPPORTED_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>

                    <label className={styles.requiredCheckboxLabel}>
                      <input
                        type="checkbox"
                        checked={field.isRequired}
                        onChange={(e) => handleFieldChange(idx, 'isRequired', e.target.checked)}
                        disabled={isSubmitting}
                      />
                      <span>Required</span>
                    </label>

                    <div className={styles.orderControls}>
                      <button
                        type="button"
                        className={styles.miniBtn}
                        onClick={() => handleMoveField(idx, -1)}
                        disabled={idx === 0 || isSubmitting}
                        title="Move up"
                      >
                        <ArrowUp size={11} />
                      </button>
                      <button
                        type="button"
                        className={styles.miniBtn}
                        onClick={() => handleMoveField(idx, 1)}
                        disabled={idx === fields.length - 1 || isSubmitting}
                        title="Move down"
                      >
                        <ArrowDown size={11} />
                      </button>
                      <button
                        type="button"
                        className={`${styles.miniBtn} ${styles.deleteMiniBtn}`}
                        onClick={() => handleRemoveField(idx)}
                        disabled={fields.length <= 1 || isSubmitting}
                        title="Remove field"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className={styles.addFieldBtn}
              onClick={handleAddField}
              disabled={isSubmitting}
            >
              <Plus size={12} /> Add Field
            </button>
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
