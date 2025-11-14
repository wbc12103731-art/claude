// 実施間隔の単位
export type IntervalUnit = 'days' | 'weeks';

// 実施間隔の設定
export interface Interval {
  value: number;
  unit: IntervalUnit;
}

// 実施履歴
export interface TaskHistory {
  id: string;
  taskId: string;
  completedAt: Date;
}

// 家事タスクマスタ
export interface HouseholdTask {
  id: string;
  name: string;
  description?: string;
  interval: Interval;
  createdAt: Date;
  updatedAt: Date;
}

// 家事タスクと最終実施日を含む情報
export interface TaskWithStatus extends HouseholdTask {
  lastCompletedAt?: Date;
  isOverdue: boolean;
  daysOverdue: number;
}
