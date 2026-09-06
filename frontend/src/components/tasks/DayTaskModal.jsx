import React, { useState } from 'react';
import {
  X, Plus, Check, Clock, CalendarDays, Pencil, Trash2, AlertCircle, CheckCircle2, ShieldCheck
} from 'lucide-react';
import TaskForm from './TaskForm';
import { formatTaskTime } from './taskUtils';
import styles from './TaskModal.module.css';

export default function DayTaskModal({
  isOpen,
  onClose,
  selectedDate, // 'YYYY-MM-DD'
  tasks = [],
  assets = [],
  onToggleStatus,
  onDeleteTask,
  onSaveTask,
}) {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !selectedDate) return null;

  const [y, m, d] = selectedDate.split('-');
  const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  const formattedDateTitle = dateObj.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const dayTasks = tasks.filter((t) => t.dueDate === selectedDate);
  // Sort: timed tasks first, then untimed; then by creation
  dayTasks.sort((a, b) => {
    if (a.dueTime && b.dueTime) return a.dueTime.localeCompare(b.dueTime);
    if (a.dueTime && !b.dueTime) return -1;
    if (!a.dueTime && b.dueTime) return 1;
    return 0;
  });

  const handleFormSubmit = async (formData) => {
    try {
      setIsSubmitting(true);
      await onSaveTask(formData, editingTask ? editingTask.id : null);
      setIsAddingTask(false);
      setEditingTask(null);
    } catch (err) {
      console.error('Failed to save task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <span className={styles.modalKicker}>SCHEDULED TASKS</span>
            <h3 className={styles.dayTitle}>{formattedDateTitle}</h3>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {isAddingTask || editingTask ? (
          <div style={{ marginTop: '12px' }}>
            <div className={styles.subHeader}>
              <span>{editingTask ? 'Edit Task' : 'Add Task for This Date'}</span>
              <button
                type="button"
                className={styles.textLinkBtn}
                onClick={() => { setIsAddingTask(false); setEditingTask(null); }}
              >
                Back to list
              </button>
            </div>
            <TaskForm
              task={editingTask}
              initialDate={selectedDate}
              assets={assets}
              onSubmit={handleFormSubmit}
              onCancel={() => { setIsAddingTask(false); setEditingTask(null); }}
              isSubmitting={isSubmitting}
            />
          </div>
        ) : (
          <div className={styles.dayTaskList}>
            {dayTasks.length === 0 ? (
              <div className={styles.emptyDay}>
                <CalendarDays size={24} className={styles.mutedIcon} />
                <p>No tasks scheduled for this date.</p>
                <button
                  type="button"
                  className={styles.submitBtn}
                  onClick={() => setIsAddingTask(true)}
                  style={{ display: 'inline-flex', margin: '8px auto 0' }}
                >
                  <Plus size={12} /> Add Task
                </button>
              </div>
            ) : (
              <>
                <div className={styles.taskListScroll}>
                  {dayTasks.map((t) => {
                    const isCompleted = t.status === 'completed';
                    const isMissed = t.status === 'missed';

                    return (
                      <div
                        key={t.id}
                        className={`${styles.taskItem} ${isCompleted ? styles.taskItemCompleted : ''} ${isMissed ? styles.taskItemMissed : ''}`}
                      >
                        <button
                          type="button"
                          className={`${styles.checkbox} ${isCompleted ? styles.checkboxChecked : ''}`}
                          onClick={() => onToggleStatus(t.id, isCompleted ? 'scheduled' : 'completed')}
                          title={isCompleted ? 'Mark incomplete' : 'Mark complete'}
                        >
                          {isCompleted && <Check size={11} strokeWidth={3} />}
                        </button>

                        <div className={styles.taskDetails}>
                          <div className={styles.taskTitleRow}>
                            <span className={styles.taskTitle}>{t.title}</span>
                            {t.dueTime && (
                              <span className={styles.taskTimeBadge}>
                                <Clock size={10} /> {formatTaskTime(t.dueTime)}
                              </span>
                            )}
                          </div>

                          <div className={styles.taskMetaRow}>
                            {t.assetName && (
                              <span className={styles.assetBadge}>
                                {t.assetName}
                              </span>
                            )}
                            <span className={`${styles.statusBadge} ${styles['status_' + t.status]}`}>
                              {t.status.toUpperCase()}
                            </span>
                            {t.description && (
                              <span className={styles.taskDescSnippet}>
                                {t.description}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className={styles.taskActions}>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() => setEditingTask(t)}
                            title="Edit task"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            className={`${styles.iconBtn} ${styles.dangerIconBtn}`}
                            onClick={() => onDeleteTask(t.id)}
                            title="Delete task"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className={styles.dayFooter}>
                  <button
                    type="button"
                    className={styles.addTaskBtn}
                    onClick={() => setIsAddingTask(true)}
                  >
                    <Plus size={12} /> Add another task
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
