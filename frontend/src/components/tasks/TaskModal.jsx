import React from 'react';
import { X, CalendarDays, Pencil } from 'lucide-react';
import TaskForm from './TaskForm';
import styles from './TaskModal.module.css';

export default function TaskModal({
  isOpen,
  onClose,
  task = null,
  initialDate = '',
  assets = [],
  onSubmit,
  isSubmitting = false,
}) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            {task ? <Pencil size={15} color="#1b4fd8" /> : <CalendarDays size={15} color="#1b4fd8" />}
            <h3>{task ? 'Edit Task' : 'New Legacy Task'}</h3>
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

        <TaskForm
          task={task}
          initialDate={initialDate}
          assets={assets}
          onSubmit={onSubmit}
          onCancel={onClose}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}
