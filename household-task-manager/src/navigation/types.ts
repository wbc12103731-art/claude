import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HouseholdTask } from '../types';

// ナビゲーションパラメータの型定義
export type RootStackParamList = {
  TaskList: undefined;
  AddEditTask: { task?: HouseholdTask };
  TaskDetail: { task: HouseholdTask };
};

// 各画面のProps型
export type TaskListScreenProps = NativeStackScreenProps<RootStackParamList, 'TaskList'>;
export type AddEditTaskScreenProps = NativeStackScreenProps<RootStackParamList, 'AddEditTask'>;
export type TaskDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'TaskDetail'>;
