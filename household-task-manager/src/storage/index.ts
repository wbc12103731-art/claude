import AsyncStorage from '@react-native-async-storage/async-storage';
import { HouseholdTask, TaskHistory } from '../types';

const TASKS_KEY = '@household_tasks';
const HISTORY_KEY = '@task_history';

// 家事タスクマスタの操作
export const TaskStorage = {
  // すべてのタスクを取得
  async getTasks(): Promise<HouseholdTask[]> {
    try {
      const data = await AsyncStorage.getItem(TASKS_KEY);
      if (!data) return [];
      const tasks = JSON.parse(data);
      // Date型に変換
      return tasks.map((task: any) => ({
        ...task,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
      }));
    } catch (error) {
      console.error('Error getting tasks:', error);
      return [];
    }
  },

  // タスクを保存
  async saveTasks(tasks: HouseholdTask[]): Promise<void> {
    try {
      await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error('Error saving tasks:', error);
      throw error;
    }
  },

  // タスクを追加
  async addTask(task: HouseholdTask): Promise<void> {
    const tasks = await this.getTasks();
    tasks.push(task);
    await this.saveTasks(tasks);
  },

  // タスクを更新
  async updateTask(updatedTask: HouseholdTask): Promise<void> {
    const tasks = await this.getTasks();
    const index = tasks.findIndex(t => t.id === updatedTask.id);
    if (index !== -1) {
      tasks[index] = updatedTask;
      await this.saveTasks(tasks);
    }
  },

  // タスクを削除
  async deleteTask(taskId: string): Promise<void> {
    const tasks = await this.getTasks();
    const filtered = tasks.filter(t => t.id !== taskId);
    await this.saveTasks(filtered);
    // タスクに関連する履歴も削除
    const history = await HistoryStorage.getHistory();
    const filteredHistory = history.filter(h => h.taskId !== taskId);
    await HistoryStorage.saveHistory(filteredHistory);
  },
};

// 実施履歴の操作
export const HistoryStorage = {
  // すべての履歴を取得
  async getHistory(): Promise<TaskHistory[]> {
    try {
      const data = await AsyncStorage.getItem(HISTORY_KEY);
      if (!data) return [];
      const history = JSON.parse(data);
      // Date型に変換
      return history.map((h: any) => ({
        ...h,
        completedAt: new Date(h.completedAt),
      }));
    } catch (error) {
      console.error('Error getting history:', error);
      return [];
    }
  },

  // 履歴を保存
  async saveHistory(history: TaskHistory[]): Promise<void> {
    try {
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving history:', error);
      throw error;
    }
  },

  // 履歴を追加
  async addHistory(history: TaskHistory): Promise<void> {
    const allHistory = await this.getHistory();
    allHistory.push(history);
    await this.saveHistory(allHistory);
  },

  // 特定のタスクの履歴を取得
  async getTaskHistory(taskId: string): Promise<TaskHistory[]> {
    const allHistory = await this.getHistory();
    return allHistory
      .filter(h => h.taskId === taskId)
      .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
  },

  // 特定のタスクの最終実施日を取得
  async getLastCompletedDate(taskId: string): Promise<Date | null> {
    const taskHistory = await this.getTaskHistory(taskId);
    return taskHistory.length > 0 ? taskHistory[0].completedAt : null;
  },
};
