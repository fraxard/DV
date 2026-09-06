import React, { useState } from 'react';
import { Calendar, Clock, FileText, Check, X, AlertCircle } from 'lucide-react';
import styles from './TaskModal.module.css';

export default function TaskForm({
  task = null,
  initialDate = '',
  assets = [],
  onSubmit,
  onCancel,
  isSubmitting = false,
}) {
  const [title, setTitle] = useState(task ? task.title : '');
  const [description, setDescription] = useState(task ? task.description || '' : '');
  const [dueDate, setDueDate] = useState(task ? task.dueDate : initialDate || '');
  const [dueTime, setDueTime] = useState(task ? task.dueTime || '' : '');
  const [assetId, setAssetId] = useState(task ? task.assetId || '' : '');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }
    if (!dueDate) {
      setError('Due date is required.');
      return;
    }

    setError('');
    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      dueDate,
      dueTime: dueTime || null,
      assetId: assetId || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.taskForm}>
      {error && (
        <div className={styles.formError}>
          <AlertCircle size={13} /> {error}
        </div>
      )}

      <div className={styles.fieldGroup}>
        <label className={styles.label}>Task Title *</label>
        <input
          type="text"
          className={styles.input}
          placeholder="e.g. Review property deed, Insurance renewal"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Due Date *</label>
          <input
            type="date"
            className={styles.input}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Due Time (Optional)</label>
          <input
            type="time"
            className={styles.input}
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>Related Asset (Optional)</label>
        <select
          className={styles.input}
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
        >
          <option value="">-- General Task (No Asset) --</option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.name} ({asset.category})
            </option>
          ))}
        </select>
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>Description & Notes (Optional)</label>
        <textarea
          className={styles.textarea}
          placeholder="Add details, contact persons, or next steps..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className={styles.formActions}>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={isSubmitting || !title.trim() || !dueDate}
        >
          {isSubmitting ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
        </button>
      </div>
    </form>
  );
}
