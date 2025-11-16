import React, { useState } from 'react';
import { View } from 'react-native';
import TaskListScreen from './src/screens/TaskListScreen';
import AddEditTaskScreen from './src/screens/AddEditTaskScreen';
import TaskDetailScreen from './src/screens/TaskDetailScreen';

type Screen = 'TaskList' | 'AddEditTask' | 'TaskDetail';

interface NavigationState {
  screen: Screen;
  params?: any;
}

export default function App() {
  const [navState, setNavState] = useState<NavigationState>({ screen: 'TaskList' });

  const navigation = {
    navigate: (screen: Screen, params?: any) => {
      setNavState({ screen, params });
    },
    goBack: () => {
      setNavState({ screen: 'TaskList' });
    },
  };

  const route = {
    params: navState.params || {},
  };

  return (
    <View style={{ flex: 1 }}>
      {navState.screen === 'TaskList' && (
        <TaskListScreen navigation={navigation as any} route={route as any} />
      )}
      {navState.screen === 'AddEditTask' && (
        <AddEditTaskScreen navigation={navigation as any} route={route as any} />
      )}
      {navState.screen === 'TaskDetail' && (
        <TaskDetailScreen navigation={navigation as any} route={route as any} />
      )}
    </View>
  );
}
