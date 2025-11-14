import { HouseholdTask, Interval, TaskWithStatus } from '../types';

// 間隔を日数に変換
export const intervalToDays = (interval: Interval): number => {
  if (interval.unit === 'days') {
    return interval.value;
  } else if (interval.unit === 'weeks') {
    return interval.value * 7;
  }
  return 0;
};

// 期限切れかどうかを判定
export const isTaskOverdue = (
  task: HouseholdTask,
  lastCompletedAt?: Date
): { isOverdue: boolean; daysOverdue: number } => {
  const now = new Date();

  // 一度も実施していない場合、作成日から判定
  const baseDate = lastCompletedAt || task.createdAt;

  const intervalDays = intervalToDays(task.interval);
  const daysSinceLastCompleted = Math.floor(
    (now.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const daysOverdue = daysSinceLastCompleted - intervalDays;

  return {
    isOverdue: daysOverdue > 0,
    daysOverdue: Math.max(0, daysOverdue),
  };
};

// タスクにステータス情報を追加
export const addTaskStatus = (
  task: HouseholdTask,
  lastCompletedAt?: Date
): TaskWithStatus => {
  const { isOverdue, daysOverdue } = isTaskOverdue(task, lastCompletedAt);

  return {
    ...task,
    lastCompletedAt,
    isOverdue,
    daysOverdue,
  };
};

// 日付を読みやすい形式に整形
export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}年${month}月${day}日`;
};

// 間隔を読みやすい形式に整形
export const formatInterval = (interval: Interval): string => {
  if (interval.unit === 'days') {
    return `${interval.value}日に1回`;
  } else if (interval.unit === 'weeks') {
    return `${interval.value}週間に1回`;
  }
  return '';
};

// 次回実施予定日を計算
export const getNextDueDate = (
  task: HouseholdTask,
  lastCompletedAt?: Date
): Date => {
  const baseDate = lastCompletedAt || task.createdAt;
  const intervalDays = intervalToDays(task.interval);
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + intervalDays);
  return nextDate;
};
