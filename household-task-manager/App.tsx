import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  const [error, setError] = useState<string | null>(null);
  const [TaskListScreen, setTaskListScreen] = useState<any>(null);

  useEffect(() => {
    const loadComponents = async () => {
      try {
        // TaskListScreenを動的にインポート
        const module = await import('./src/screens/TaskListScreen');
        setTaskListScreen(() => module.default);
      } catch (err: any) {
        console.error('Error loading TaskListScreen:', err);
        setError(err.toString());
      }
    };

    loadComponents();
  }, []);

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>エラーが発生しました</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!TaskListScreen) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  const navigation = {
    navigate: (screen: string, params?: any) => {
      console.log('Navigate to:', screen, params);
    },
    goBack: () => {
      console.log('Go back');
    },
  };

  const route = {
    params: {},
  };

  return (
    <View style={{ flex: 1 }}>
      <TaskListScreen navigation={navigation} route={route} />
    </View>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffe6e6',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#cc0000',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
});
