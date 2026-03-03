import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  createTask,
  deleteTask,
  listTasks,
  updateTask,
} from '@/app/features/tasks/services/task.service';
import { Task, TaskPriority, TaskStatus } from '@/app/features/tasks/types/task.types';
import { Screen } from '@/components/ui/Screen';
import { colors } from '@/constants/theme';

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [submitting, setSubmitting] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await listTasks();
      setTasks(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadTasks();
    }, [loadTasks]),
  );

  const pendingCount = useMemo(
    () => tasks.filter((task) => task.status !== 'completed').length,
    [tasks],
  );

  const sortedTasks = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        const aDate = a.due_date || '';
        const bDate = b.due_date || '';
        return aDate.localeCompare(bDate);
      }),
    [tasks],
  );

  const onCreateTask = async () => {
    if (!title.trim() || !dueDate.trim()) {
      setError('Title and due date are required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createTask({
        title: title.trim(),
        due_date: dueDate.trim(),
        description: description.trim() || undefined,
        priority,
      });
      setTitle('');
      setDueDate('');
      setDescription('');
      setPriority('medium');
      await loadTasks();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create task.');
    } finally {
      setSubmitting(false);
    }
  };

  const nextStatus = (status: TaskStatus): TaskStatus => {
    if (status === 'pending') {
      return 'in_progress';
    }
    if (status === 'in_progress') {
      return 'completed';
    }
    return 'pending';
  };

  const toggleTaskStatus = async (task: Task) => {
    try {
      await updateTask(task.id, { status: nextStatus(task.status) });
      await loadTasks();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update task.');
    }
  };

  const onDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      await loadTasks();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete task.');
    }
  };

  const calendarDays = useMemo(() => getCalendarDays(calendarMonth), [calendarMonth]);

  return (
    <Screen>
      <View style={styles.card}>
        <Text style={styles.title}>Tasks</Text>
        <Text style={styles.subtitle}>Pending: {pendingCount}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>New Task</Text>
        <TextInput
          style={styles.input}
          placeholder="Title"
          placeholderTextColor="#94A3B8"
          value={title}
          onChangeText={setTitle}
        />
        <Pressable
          style={styles.datePickerButton}
          onPress={() => {
            const selected = parseIsoDate(dueDate);
            const base = selected ?? new Date();
            setCalendarMonth(new Date(base.getFullYear(), base.getMonth(), 1));
            setIsCalendarOpen(true);
          }}
        >
          <Text style={styles.datePickerLabel}>Due date</Text>
          <Text style={styles.datePickerValue}>
            {dueDate ? formatDateLabel(dueDate) : 'Select date'}
          </Text>
        </Pressable>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description (optional)"
          placeholderTextColor="#94A3B8"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <View style={styles.priorityRow}>
          {(['low', 'medium', 'high'] as const).map((value) => (
            <Pressable
              key={value}
              style={[styles.priorityChip, priority === value && styles.priorityChipActive]}
              onPress={() => setPriority(value)}
            >
              <Text
                style={[styles.priorityChipText, priority === value && styles.priorityChipTextActive]}
              >
                {value}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.primaryButton} onPress={() => void onCreateTask()} disabled={submitting}>
          <Text style={styles.primaryButtonText}>{submitting ? 'Creating...' : 'Create Task'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>My Tasks</Text>
          <Pressable style={styles.secondaryButton} onPress={() => void loadTasks()}>
            <Text style={styles.secondaryButtonText}>Refresh</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {loading ? (
          <Text style={styles.body}>Loading tasks...</Text>
        ) : sortedTasks.length === 0 ? (
          <Text style={styles.body}>No tasks yet.</Text>
        ) : (
          sortedTasks.map((task) => (
            <View key={task.id} style={styles.taskCard}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Text style={styles.taskMeta}>
                Due: {task.due_date} • {task.priority} • {formatStatus(task.status)}
              </Text>
              {task.description ? <Text style={styles.body}>{task.description}</Text> : null}
              <View style={styles.taskActions}>
                <Pressable style={styles.secondaryButton} onPress={() => void toggleTaskStatus(task)}>
                  <Text style={styles.secondaryButtonText}>Next Status</Text>
                </Pressable>
                <Pressable style={styles.deleteButton} onPress={() => void onDeleteTask(task.id)}>
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>

      <Modal
        visible={isCalendarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCalendarOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Pressable
                style={styles.monthNavButton}
                onPress={() =>
                  setCalendarMonth(
                    (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                  )
                }
              >
                <Text style={styles.monthNavText}>Prev</Text>
              </Pressable>
              <Text style={styles.modalTitle}>{getMonthLabel(calendarMonth)}</Text>
              <Pressable
                style={styles.monthNavButton}
                onPress={() =>
                  setCalendarMonth(
                    (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                  )
                }
              >
                <Text style={styles.monthNavText}>Next</Text>
              </Pressable>
            </View>

            <View style={styles.weekdayRow}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
                <Text key={label} style={styles.weekdayLabel}>
                  {label}
                </Text>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {calendarDays.map((day, index) => {
                if (!day) {
                  return <View key={`empty-${index}`} style={styles.dayCell} />;
                }

                const selected = dueDate === toIsoDate(day);
                return (
                  <View key={toIsoDate(day)} style={styles.dayCell}>
                    <Pressable
                      style={[styles.dayButton, selected && styles.dayButtonActive]}
                      onPress={() => {
                        setDueDate(toIsoDate(day));
                        setIsCalendarOpen(false);
                      }}
                    >
                      <Text style={[styles.dayText, selected && styles.dayTextActive]}>
                        {day.getDate()}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.secondaryButton} onPress={() => setIsCalendarOpen(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  setDueDate('');
                  setIsCalendarOpen(false);
                }}
              >
                <Text style={styles.secondaryButtonText}>Clear</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function formatStatus(status: TaskStatus) {
  if (status === 'in_progress') {
    return 'in progress';
  }
  return status;
}

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLabel(value: string): string {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return value;
  }
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getMonthLabel(monthStart: Date): string {
  return monthStart.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function getCalendarDays(monthStart: Date): (Date | null)[] {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    color: colors.text,
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    gap: 2,
  },
  datePickerLabel: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '600',
  },
  datePickerValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  priorityChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  priorityChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  priorityChipTextActive: {
    color: colors.primary,
  },
  primaryButton: {
    borderRadius: 10,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
  },
  body: {
    color: colors.mutedText,
    fontSize: 14,
  },
  taskCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    gap: 6,
    backgroundColor: '#FFFFFF',
  },
  taskTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  taskMeta: {
    color: colors.mutedText,
    fontSize: 12,
  },
  taskActions: {
    flexDirection: 'row',
    gap: 8,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  deleteButtonText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  monthNavButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  monthNavText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayLabel: {
    width: '14.285%',
    textAlign: 'center',
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.285%',
    paddingVertical: 4,
    alignItems: 'center',
  },
  dayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  dayButtonActive: {
    backgroundColor: colors.primary,
  },
  dayText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  dayTextActive: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
