import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { TaskListScreenProps } from '../navigation/types';
import { TaskStorage, HistoryStorage } from '../storage';
import { TaskWithStatus } from '../types';
import { addTaskStatus } from '../utils/dateUtils';
import TaskItem from '../components/TaskItem';

export default function TaskListScreen({ navigation }: TaskListScreenProps) {
  const [tasks, setTasks] = useState<TaskWithStatus[]>([]);
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadTasks = async () => {
    try {
      const allTasks = await TaskStorage.getTasks();

      // 各タスクの最終実施日を取得してステータスを追加
      const tasksWithStatus = await Promise.all(
        allTasks.map(async (task) => {
          const lastCompletedAt = await HistoryStorage.getLastCompletedDate(task.id);
          return addTaskStatus(task, lastCompletedAt || undefined);
        })
      );

      // 期限切れの日数でソート（期限切れが多い順）
      tasksWithStatus.sort((a, b) => b.daysOverdue - a.daysOverdue);

      setTasks(tasksWithStatus);
    } catch (error) {
      console.error('Error loading tasks:', error);
      Alert.alert('エラー', 'タスクの読み込みに失敗しました');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  // 画面がフォーカスされたときにタスクを再読み込み
  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [])
  );

  const handleTaskPress = (task: TaskWithStatus) => {
    navigation.navigate('TaskDetail', { task });
  };

  const handleAddTask = () => {
    navigation.navigate('AddEditTask', {});
  };

  const handleDeleteTask = async (taskId: string) => {
    Alert.alert(
      '削除確認',
      'このタスクを削除してもよろしいですか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await TaskStorage.deleteTask(taskId);
              await loadTasks();
            } catch (error) {
              Alert.alert('エラー', 'タスクの削除に失敗しました');
            }
          },
        },
      ]
    );
  };

  const filteredTasks = showOverdueOnly
    ? tasks.filter(task => task.isOverdue)
    : tasks;

  const overdueCount = tasks.filter(task => task.isOverdue).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>家事タスク管理</Text>
        {overdueCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{overdueCount}件期限切れ</Text>
          </View>
        )}
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, !showOverdueOnly && styles.filterButtonActive]}
          onPress={() => setShowOverdueOnly(false)}
        >
          <Text style={[styles.filterText, !showOverdueOnly && styles.filterTextActive]}>
            すべて
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, showOverdueOnly && styles.filterButtonActive]}
          onPress={() => setShowOverdueOnly(true)}
        >
          <Text style={[styles.filterText, showOverdueOnly && styles.filterTextActive]}>
            期限切れのみ
          </Text>
        </TouchableOpacity>
      </View>

      {filteredTasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {showOverdueOnly
              ? '期限切れのタスクはありません'
              : 'タスクがありません\n下のボタンから追加してください'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TaskItem
              task={item}
              onPress={() => handleTaskPress(item)}
              onDelete={() => handleDeleteTask(item.id)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      <TouchableOpacity style={styles.addButton} onPress={handleAddTask}>
        <Text style={styles.addButtonText}>+ タスクを追加</Text>
      </TouchableOpacity>
    </View>
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
  },
  badge: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  filterButtonActive: {
    backgroundColor: '#4a90e2',
  },
  filterText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
  },
  addButton: {
    backgroundColor: '#4a90e2',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
