import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { TaskWithStatus } from '../types';
import { formatDate, formatInterval, getNextDueDate } from '../utils/dateUtils';

interface TaskItemProps {
  task: TaskWithStatus;
  onPress: () => void;
  onDelete: () => void;
}

export default function TaskItem({ task, onPress, onDelete }: TaskItemProps) {
  const nextDueDate = getNextDueDate(task, task.lastCompletedAt);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{task.name}</Text>
          {task.isOverdue && (
            <View style={styles.overdueBadge}>
              <Text style={styles.overdueText}>{task.daysOverdue}日超過</Text>
            </View>
          )}
        </View>

        <Text style={styles.interval}>{formatInterval(task.interval)}</Text>

        <View style={styles.dateInfo}>
          {task.lastCompletedAt ? (
            <>
              <Text style={styles.label}>最終実施: </Text>
              <Text style={styles.date}>{formatDate(task.lastCompletedAt)}</Text>
            </>
          ) : (
            <Text style={styles.noHistory}>まだ実施していません</Text>
          )}
        </View>

        <View style={styles.dateInfo}>
          <Text style={styles.label}>次回予定: </Text>
          <Text style={[styles.date, task.isOverdue && styles.overdueDate]}>
            {formatDate(nextDueDate)}
          </Text>
        </View>

        {task.description && (
          <Text style={styles.description} numberOfLines={2}>
            {task.description}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Text style={styles.deleteButtonText}>削除</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  overdueBadge: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  overdueText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  interval: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  dateInfo: {
    flexDirection: 'row',
    marginTop: 4,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  date: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  overdueDate: {
    color: '#ff6b6b',
  },
  noHistory: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    lineHeight: 20,
  },
  deleteButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#ff6b6b',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
