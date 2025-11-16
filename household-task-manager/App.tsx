import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Task {
  id: string;
  name: string;
  intervalDays: number;
  lastCompletedAt?: string;
  createdAt: string;
}

interface History {
  id: string;
  taskId: string;
  completedAt: string;
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [histories, setHistories] = useState<History[]>([]);
  const [screen, setScreen] = useState<'list' | 'add' | 'detail'>('list');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDays, setNewTaskDays] = useState('7');
  const [showOnlyOverdue, setShowOnlyOverdue] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const tasksData = await AsyncStorage.getItem('tasks');
      const historiesData = await AsyncStorage.getItem('histories');
      if (tasksData) setTasks(JSON.parse(tasksData));
      if (historiesData) setHistories(JSON.parse(historiesData));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const saveTasks = async (newTasks: Task[]) => {
    try {
      await AsyncStorage.setItem('tasks', JSON.stringify(newTasks));
      setTasks(newTasks);
    } catch (error) {
      console.error('Error saving tasks:', error);
    }
  };

  const saveHistories = async (newHistories: History[]) => {
    try {
      await AsyncStorage.setItem('histories', JSON.stringify(newHistories));
      setHistories(newHistories);
    } catch (error) {
      console.error('Error saving histories:', error);
    }
  };

  const addTask = () => {
    const newTask: Task = {
      id: Date.now().toString(),
      name: newTaskName,
      intervalDays: parseInt(newTaskDays) || 7,
      createdAt: new Date().toISOString(),
    };
    saveTasks([...tasks, newTask]);
    setNewTaskName('');
    setNewTaskDays('7');
    setScreen('list');
  };

  const deleteTask = (taskId: string) => {
    Alert.alert(
      '削除確認',
      'このタスクを削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            saveTasks(tasks.filter(t => t.id !== taskId));
            setScreen('list');
          },
        },
      ]
    );
  };

  const completeTask = (taskId: string) => {
    const newHistory: History = {
      id: Date.now().toString(),
      taskId,
      completedAt: new Date().toISOString(),
    };
    saveHistories([...histories, newHistory]);

    const updatedTasks = tasks.map(t =>
      t.id === taskId ? { ...t, lastCompletedAt: new Date().toISOString() } : t
    );
    saveTasks(updatedTasks);
  };

  const isOverdue = (task: Task): boolean => {
    const lastDate = task.lastCompletedAt || task.createdAt;
    const daysSince = Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
    return daysSince > task.intervalDays;
  };

  const getDaysOverdue = (task: Task): number => {
    const lastDate = task.lastCompletedAt || task.createdAt;
    const daysSince = Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysSince - task.intervalDays);
  };

  const overdueTasks = tasks.filter(isOverdue);
  const displayTasks = showOnlyOverdue ? overdueTasks : tasks;

  // タスクリスト画面
  if (screen === 'list') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>家事タスク管理</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setScreen('add')}>
            <Text style={styles.addButtonText}>+ タスク追加</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterContainer}>
          <Text style={styles.subtitle}>
            全タスク: {tasks.length}件 / 期限切れ: {overdueTasks.length}件
          </Text>
          <TouchableOpacity
            style={[styles.filterButton, showOnlyOverdue ? styles.filterButtonActive : null]}
            onPress={() => setShowOnlyOverdue(!showOnlyOverdue)}
          >
            <Text style={[styles.filterButtonText, showOnlyOverdue ? styles.filterButtonTextActive : null]}>
              {showOnlyOverdue ? '全て表示' : '期限切れのみ'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.taskList}>
          {displayTasks.length === 0 && (
            <Text style={styles.emptyText}>
              {showOnlyOverdue ? '期限切れのタスクはありません' : 'タスクを追加してください'}
            </Text>
          )}
          {displayTasks.map(task => {
            const taskIsOverdue = isOverdue(task);
            return (
            <TouchableOpacity
              key={task.id}
              style={[styles.taskItem, taskIsOverdue ? styles.taskItemOverdue : null]}
              onPress={() => {
                setSelectedTask(task);
                setScreen('detail');
              }}
            >
              <View>
                <Text style={styles.taskName}>{task.name}</Text>
                <Text style={styles.taskInfo}>
                  {taskIsOverdue ? `${getDaysOverdue(task)}日超過` : '期限内'} (実施間隔: {task.intervalDays}日)
                </Text>
              </View>
              <TouchableOpacity
                style={styles.completeButton}
                onPress={(e) => {
                  e.stopPropagation();
                  completeTask(task.id);
                }}
              >
                <Text style={styles.completeButtonText}>完了</Text>
              </TouchableOpacity>
            </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  // タスク追加画面
  if (screen === 'add') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setScreen('list')}>
            <Text style={styles.backButton}>← 戻る</Text>
          </TouchableOpacity>
          <Text style={styles.title}>タスク追加</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>タスク名</Text>
          <TextInput
            style={styles.input}
            value={newTaskName}
            onChangeText={setNewTaskName}
            placeholder="例: 洗濯機の掃除"
          />

          <Text style={styles.label}>実施間隔（日数）</Text>
          <TextInput
            style={styles.input}
            value={newTaskDays}
            onChangeText={setNewTaskDays}
            keyboardType="numeric"
            placeholder="7"
          />

          <TouchableOpacity
            style={[styles.button, !newTaskName ? styles.buttonDisabled : null]}
            onPress={addTask}
            disabled={newTaskName.length === 0}
          >
            <Text style={styles.buttonText}>追加</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // タスク詳細画面
  if (screen === 'detail' && selectedTask) {
    const taskHistories = histories.filter(h => h.taskId === selectedTask.id);

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setScreen('list')}>
            <Text style={styles.backButton}>← 戻る</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{selectedTask.name}</Text>
        </View>

        <View style={styles.detail}>
          <Text style={styles.detailLabel}>実施間隔: {selectedTask.intervalDays}日</Text>
          <Text style={styles.detailLabel}>期限超過: {getDaysOverdue(selectedTask)}日</Text>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteTask(selectedTask.id)}
          >
            <Text style={styles.deleteButtonText}>タスクを削除</Text>
          </TouchableOpacity>

          <Text style={styles.historyTitle}>実施履歴 ({taskHistories.length}件)</Text>

          <ScrollView>
            {taskHistories.map(history => (
              <View key={history.id} style={styles.historyItem}>
                <Text>{new Date(history.completedAt).toLocaleDateString()}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4a90e2',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    padding: 15,
    backgroundColor: '#fff',
  },
  filterContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterButton: {
    backgroundColor: '#e0e0e0',
    padding: 8,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 5,
  },
  filterButtonActive: {
    backgroundColor: '#4a90e2',
  },
  filterButtonText: {
    color: '#666',
    fontWeight: 'bold',
    fontSize: 14,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  emptyText: {
    textAlign: 'center',
    padding: 40,
    fontSize: 16,
    color: '#999',
  },
  addButton: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#4a90e2',
    fontWeight: 'bold',
  },
  backButton: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  taskList: {
    flex: 1,
  },
  taskItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskItemOverdue: {
    backgroundColor: '#fff5f5',
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  taskName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  taskInfo: {
    fontSize: 14,
    color: '#666',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
  },
  completeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    marginTop: 15,
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#4a90e2',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  detail: {
    padding: 20,
  },
  detailLabel: {
    fontSize: 16,
    marginBottom: 10,
  },
  deleteButton: {
    backgroundColor: '#f44336',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  historyItem: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 5,
    borderRadius: 5,
  },
});
