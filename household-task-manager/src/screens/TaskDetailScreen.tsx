import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
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

  const handleDeleteHistory = async (historyId: string) => {
    console.log('handleDeleteHistory called with historyId:', historyId);

    if (Platform.OS === 'web') {
      // Web版ではwindow.confirmを使用
      const confirmed = window.confirm('この履歴を削除してもよろしいですか？');
      if (confirmed) {
        console.log('Delete history confirmed');
        try {
          await HistoryStorage.deleteHistory(historyId);
          await loadHistory();
          window.alert('履歴を削除しました');
        } catch (error) {
          console.error('Delete history error:', error);
          window.alert('履歴の削除に失敗しました');
        }
      }
    } else {
      // iOS/AndroidではAlert.alertを使用
      Alert.alert(
        '削除確認',
        'この履歴を削除してもよろしいですか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '削除',
            style: 'destructive',
            onPress: async () => {
              console.log('Delete history button pressed');
              try {
                await HistoryStorage.deleteHistory(historyId);
                await loadHistory();
                Alert.alert('成功', '履歴を削除しました');
              } catch (error) {
                console.error('Delete history error:', error);
                Alert.alert('エラー', '履歴の削除に失敗しました');
              }
            },
          },
        ]
      );
    }
  };

  const handleEditHistory = async (item: TaskHistory) => {
    console.log('handleEditHistory called with item:', item.id);

    const currentDate = item.completedAt;
    const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

    if (Platform.OS === 'web') {
      // Web版ではwindow.promptを使用
      const inputDate = window.prompt('日付を入力してください（形式: YYYY-MM-DD）', dateString);

      if (!inputDate) return;

      const dateParts = inputDate.split('-');
      if (dateParts.length !== 3) {
        window.alert('正しい形式で入力してください（例: 2025-01-15）');
        return;
      }

      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1;
      const day = parseInt(dateParts[2]);

      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        window.alert('正しい日付を入力してください');
        return;
      }

      const newDate = new Date(year, month, day);

      try {
        const updatedHistory = {
          ...item,
          completedAt: newDate,
        };
        await HistoryStorage.updateHistory(updatedHistory);
        await loadHistory();
        window.alert('日付を更新しました');
      } catch (error) {
        console.error('Update history error:', error);
        window.alert('日付の更新に失敗しました');
      }
    } else if (Platform.OS === 'ios') {
      // iOS版ではAlert.promptを使用
      Alert.prompt(
        '日付を編集',
        '日付を入力してください（形式: YYYY-MM-DD）',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '更新',
            onPress: async (inputDate) => {
              if (!inputDate) return;

              const dateParts = inputDate.split('-');
              if (dateParts.length !== 3) {
                Alert.alert('エラー', '正しい形式で入力してください（例: 2025-01-15）');
                return;
              }

              const year = parseInt(dateParts[0]);
              const month = parseInt(dateParts[1]) - 1;
              const day = parseInt(dateParts[2]);

              if (isNaN(year) || isNaN(month) || isNaN(day)) {
                Alert.alert('エラー', '正しい日付を入力してください');
                return;
              }

              const newDate = new Date(year, month, day);

              try {
                const updatedHistory = {
                  ...item,
                  completedAt: newDate,
                };
                await HistoryStorage.updateHistory(updatedHistory);
                await loadHistory();
                Alert.alert('成功', '日付を更新しました');
              } catch (error) {
                Alert.alert('エラー', '日付の更新に失敗しました');
              }
            },
          },
        ],
        'plain-text',
        dateString
      );
    } else {
      // Android版は未対応
      Alert.alert('お知らせ', '日付の編集機能は現在Web/iOSのみで利用可能です');
    }
  };

  const nextDueDate = getNextDueDate(task, lastCompletedAt || undefined);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← 戻る</Text>
        </TouchableOpacity>
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
                <TouchableOpacity
                  style={styles.historyDateContainer}
                  onPress={() => handleEditHistory(item)}
                >
                  <Text style={styles.historyDate}>
                    {formatDate(item.completedAt)}
                  </Text>
                  <Text style={styles.editIcon}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteHistoryButton}
                  onPress={() => handleDeleteHistory(item.id)}
                >
                  <Text style={styles.deleteHistoryText}>削除</Text>
                </TouchableOpacity>
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
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4a90e2',
    fontWeight: 'bold',
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
    fontWeight: 'bold',
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
    marginRight: 12,
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  historyNumber: {
    fontSize: 16,
    color: '#999',
    marginRight: 8,
    width: 30,
  },
  historyDateContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  historyDate: {
    fontSize: 16,
    color: '#333',
    marginRight: 8,
  },
  editIcon: {
    fontSize: 14,
  },
  deleteHistoryButton: {
    backgroundColor: '#ff6b6b',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  deleteHistoryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
