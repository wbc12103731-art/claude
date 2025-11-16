import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { HouseholdTask } from '../types';
import { TaskStorage, HistoryStorage } from '../storage';
import { isTaskOverdue } from './dateUtils';

// 通知の設定（Web環境ではスキップ）
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// 通知の権限をリクエスト
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false; // Webでは通知をサポートしない
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

// 期限切れタスクの通知をスケジュール
export async function scheduleOverdueNotifications() {
  if (Platform.OS === 'web') {
    return; // Webでは通知をサポートしない
  }

  try {
    // 既存の通知をキャンセル
    await Notifications.cancelAllScheduledNotificationsAsync();

    const tasks = await TaskStorage.getTasks();

    for (const task of tasks) {
      const lastCompletedAt = await HistoryStorage.getLastCompletedDate(task.id);
      const { isOverdue } = isTaskOverdue(task, lastCompletedAt || undefined);

      if (isOverdue) {
        // 即座に通知を表示
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '家事タスクの期限切れ',
            body: `「${task.name}」の実施期限が過ぎています`,
            data: { taskId: task.id },
          },
          trigger: null, // すぐに表示
        });
      }
    }
  } catch (error) {
    console.error('Error scheduling notifications:', error);
  }
}

// 毎日チェックする通知をスケジュール
export async function scheduleDailyCheck() {
  if (Platform.OS === 'web') {
    return; // Webでは通知をサポートしない
  }

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    // 毎日午前9時に通知
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '家事タスクのチェック',
        body: '今日の家事タスクを確認しましょう',
      },
      trigger: {
        hour: 9,
        minute: 0,
        repeats: true,
      },
    });
  } catch (error) {
    console.error('Error scheduling daily check:', error);
  }
}

// バッジ数を更新
export async function updateBadgeCount() {
  if (Platform.OS === 'web') {
    return; // Webでは通知をサポートしない
  }

  try {
    const tasks = await TaskStorage.getTasks();
    let overdueCount = 0;

    for (const task of tasks) {
      const lastCompletedAt = await HistoryStorage.getLastCompletedDate(task.id);
      const { isOverdue } = isTaskOverdue(task, lastCompletedAt || undefined);

      if (isOverdue) {
        overdueCount++;
      }
    }

    await Notifications.setBadgeCountAsync(overdueCount);
  } catch (error) {
    console.error('Error updating badge count:', error);
  }
}
