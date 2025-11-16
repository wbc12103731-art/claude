import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AddEditTaskScreenProps } from '../navigation/types';
import { HouseholdTask, IntervalUnit } from '../types';
import { TaskStorage } from '../storage';

export default function AddEditTaskScreen({ navigation, route }: AddEditTaskScreenProps) {
  const { task } = route.params;
  const isEditing = !!task;

  const [name, setName] = useState(task?.name || '');
  const [description, setDescription] = useState(task?.description || '');
  const [intervalValue, setIntervalValue] = useState(task?.interval.value.toString() || '7');
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>(task?.interval.unit || 'days');

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('入力エラー', 'タスク名を入力してください');
      return;
    }

    const value = parseInt(intervalValue);
    if (isNaN(value) || value <= 0) {
      Alert.alert('入力エラー', '正しい間隔を入力してください');
      return;
    }

    try {
      const now = new Date();

      if (isEditing && task) {
        const updatedTask: HouseholdTask = {
          ...task,
          name: name.trim(),
          description: description.trim(),
          interval: {
            value,
            unit: intervalUnit,
          },
          updatedAt: now,
        };
        await TaskStorage.updateTask(updatedTask);
        Alert.alert('成功', 'タスクを更新しました');
      } else {
        const newTask: HouseholdTask = {
          id: Date.now().toString(),
          name: name.trim(),
          description: description.trim(),
          interval: {
            value,
            unit: intervalUnit,
          },
          createdAt: now,
          updatedAt: now,
        };
        await TaskStorage.addTask(newTask);
        Alert.alert('成功', 'タスクを追加しました');
      }

      navigation.goBack();
    } catch (error) {
      Alert.alert('エラー', 'タスクの保存に失敗しました');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {isEditing ? 'タスクを編集' : 'タスクを追加'}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>タスク名 *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="例: 洗濯機の掃除"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>説明（任意）</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="例: 洗濯槽クリーナーを使用して掃除する"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>実施間隔 *</Text>
            <View style={styles.intervalContainer}>
              <TextInput
                style={styles.intervalInput}
                value={intervalValue}
                onChangeText={setIntervalValue}
                keyboardType="number-pad"
                placeholder="7"
                placeholderTextColor="#999"
              />

              <View style={styles.unitSelector}>
                <TouchableOpacity
                  style={[
                    styles.unitButton,
                    intervalUnit === 'days' && styles.unitButtonActive,
                  ]}
                  onPress={() => setIntervalUnit('days')}
                >
                  <Text
                    style={[
                      styles.unitButtonText,
                      intervalUnit === 'days' && styles.unitButtonTextActive,
                    ]}
                  >
                    日
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.unitButton,
                    intervalUnit === 'weeks' && styles.unitButtonActive,
                  ]}
                  onPress={() => setIntervalUnit('weeks')}
                >
                  <Text
                    style={[
                      styles.unitButtonText,
                      intervalUnit === 'weeks' && styles.unitButtonTextActive,
                    ]}
                  >
                    週間
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.intervalSuffix}>に1回</Text>
            </View>
          </View>

          <View style={styles.exampleBox}>
            <Text style={styles.exampleTitle}>例:</Text>
            <Text style={styles.exampleText}>• 洗濯機の掃除 - 1ヶ月に1回</Text>
            <Text style={styles.exampleText}>• お風呂のカビ取り - 2週間に1回</Text>
            <Text style={styles.exampleText}>• エアコンフィルター掃除 - 3ヶ月に1回</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>キャンセル</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>
            {isEditing ? '更新' : '追加'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  intervalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  intervalInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    width: 80,
    textAlign: 'center',
    marginRight: 12,
  },
  unitSelector: {
    flexDirection: 'row',
    marginRight: 12,
  },
  unitButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  unitButtonActive: {
    backgroundColor: '#4a90e2',
    borderColor: '#4a90e2',
  },
  unitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  unitButtonTextActive: {
    color: '#fff',
  },
  intervalSuffix: {
    fontSize: 16,
    color: '#333',
  },
  exampleBox: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  saveButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#4a90e2',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});
