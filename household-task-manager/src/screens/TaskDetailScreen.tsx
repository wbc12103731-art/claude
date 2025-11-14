import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  FlatList,
} from 'react-native';
import { TaskDetailScreenProps } from '../navigation/types';
import { TaskHistory } from '../types';
import { HistoryStorage } from '../storage';
import { formatDate, formatInterval, getNextDueDate } from '../utils/dateUtils';

export default function TaskDetailScreen({ navigation, route }: TaskDetailScreenProps) {
  const { task } = route.params;
  const [history, setHistory] = useState<TaskHistory[]>([]);
  const [lastCompletedAt, setLastCompletedAt] = useState<Date | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const taskHistory = await HistoryStorage.getTaskHistory(task.id);
    setHistory(taskHistory);

    const lastDate = await HistoryStorage.getLastCompletedDate(task.id);
    setLastCompletedAt(lastDate);
  };

  const handleComplete = async () => {
    try {
      const newHistory: TaskHistory = {
        id: Date.now().toString(),
        taskId: task.id,
        completedAt: new Date(),
      };

      await HistoryStorage.addHistory(newHistory);
      await loadHistory();

      Alert.alert('完了', 'タスクの実施を記録しました');
    } catch (error) {
      Alert.alert('エラー', '記録に失敗しました');
    }
  };

  const handleEdit = () => {
    navigation.navigate('AddEditTask', { task });
  };

  const nextDueDate = getNextDueDate(task, lastCompletedAt || undefined);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{task.name}</Text>
        {task.description && (
          <Text style={styles.description}>{task.description}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>実施間隔</Text>
        <Text style={styles.sectionContent}>{formatInterval(task.interval)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>最終実施日</Text>
        <Text style={styles.sectionContent}>
          {lastCompletedAt ? formatDate(lastCompletedAt) : 'まだ実施していません'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>次回予定日</Text>
        <Text style={styles.sectionContent}>{formatDate(nextDueDate)}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
          <Text style={styles.completeButtonText}>✓ 完了を記録</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
          <Text style={styles.editButtonText}>編集</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>実施履歴</Text>
        {history.length === 0 ? (
          <Text style={styles.noHistory}>履歴がありません</Text>
        ) : (
          <View style={styles.historyList}>
            {history.map((item, index) => (
              <View key={item.id} style={styles.historyItem}>
                <Text style={styles.historyNumber}>{index + 1}.</Text>
                <Text style={styles.historyDate}>
                  {formatDate(item.completedAt)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionContent: {
    fontSize: 18,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  completeButton: {
    flex: 2,
    backgroundColor: '#4caf50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  editButton: {
    flex: 1,
    backgroundColor: '#4a90e2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  noHistory: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  historyList: {
    marginTop: 8,
  },
  historyItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyNumber: {
    fontSize: 16,
    color: '#999',
    marginRight: 8,
    width: 30,
  },
  historyDate: {
    fontSize: 16,
    color: '#333',
  },
});
