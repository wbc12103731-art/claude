import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './src/navigation/types';
import TaskListScreen from './src/screens/TaskListScreen';
import AddEditTaskScreen from './src/screens/AddEditTaskScreen';
import TaskDetailScreen from './src/screens/TaskDetailScreen';
import {
  requestNotificationPermissions,
  scheduleDailyCheck,
  updateBadgeCount,
} from './src/utils/notifications';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  useEffect(() => {
    // 初期化処理
    const initialize = async () => {
      // 通知の権限をリクエスト
      const hasPermission = await requestNotificationPermissions();

      if (hasPermission) {
        // 毎日のチェック通知をスケジュール
        await scheduleDailyCheck();
        // バッジ数を更新
        await updateBadgeCount();
      }
    };

    initialize();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="TaskList" component={TaskListScreen} />
        <Stack.Screen name="AddEditTask" component={AddEditTaskScreen} />
        <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
