import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { extractIngredients } from '@/lib/api-client';
import { getStore, setIngredients } from '@/lib/store';

const BRAND = '#2D4A1E';

export default function IngredientsScreen() {
  const store = getStore();
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    // If we already confirmed ingredients (e.g. back-navigation), use them
    if (store.ingredients.length > 0) {
      setItems(store.ingredients);
      setLoading(false);
      return;
    }

    if (!store.imageBase64) {
      router.replace('/');
      return;
    }

    extractIngredients(store.imageBase64, store.imageMediaType)
      .then((extracted) => {
        setItems(extracted);
        setLoading(false);
      })
      .catch((err) => {
        Alert.alert('Error', err.message ?? 'Could not identify ingredients.');
        router.back();
      });
  }, []);

  function remove(item: string) {
    setItems((prev) => prev.filter((i) => i !== item));
  }

  function addItem() {
    const trimmed = newItem.trim().toLowerCase();
    if (!trimmed || items.includes(trimmed)) return;
    setItems((prev) => [...prev, trimmed].sort());
    setNewItem('');
  }

  function confirm() {
    if (items.length === 0) {
      Alert.alert('No ingredients', 'Add at least one ingredient to continue.');
      return;
    }
    setIngredients(items);
    router.push('/preferences');
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND} />
          <Text style={styles.loadingText}>Identifying ingredients…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>
            Tap any ingredient to remove it, or add ones that were missed.
          </Text>

          <View style={styles.chips}>
            {items.map((item) => (
              <Pressable
                key={item}
                style={styles.chip}
                onPress={() => remove(item)}
              >
                <Text style={styles.chipText}>{item}</Text>
                <Text style={styles.chipRemove}>×</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.addRow}>
            <TextInput
              style={styles.input}
              placeholder="Add an ingredient…"
              placeholderTextColor="#AAAAAA"
              value={newItem}
              onChangeText={setNewItem}
              onSubmitEditing={addItem}
              returnKeyType="done"
              autoCapitalize="none"
            />
            <Pressable style={styles.addBtn} onPress={addItem}>
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable>
          </View>

          <Pressable style={styles.continueBtn} onPress={confirm}>
            <Text style={styles.continueBtnText}>
              Looks good — Continue →
            </Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B6B6B',
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 48,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B6B6B',
    lineHeight: 21,
    marginBottom: 20,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 2,
    gap: 6,
  },
  chipText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  chipRemove: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DDDDDD',
    borderRadius: 2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A1A1A',
  },
  addBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: BRAND,
    borderRadius: 2,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 14,
    color: BRAND,
    fontWeight: '700',
  },
  continueBtn: {
    backgroundColor: BRAND,
    paddingVertical: 17,
    borderRadius: 4,
    alignItems: 'center',
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
