import { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { getStore, setFavorites, removeFromFavorites } from '@/lib/store';
import { getFavorites, removeFavorite } from '@/lib/api-client';
import { Recipe } from '@/types/recipe';

const BRAND = '#2D4A1E';

const DIFFICULTY_LABEL: Record<Recipe['difficulty'], string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Advanced',
};

export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const [favorites, setLocal] = useState<Recipe[]>(getStore().favorites);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      getFavorites()
        .then((data) => {
          setFavorites(data);
          setLocal([...getStore().favorites]);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [])
  );

  async function handleRemove(recipe: Recipe) {
    removeFromFavorites(recipe.name);
    setLocal([...getStore().favorites]);
    await removeFavorite(recipe.name);
  }

  const header = (
    <View style={[styles.stickyHeader, { paddingTop: insets.top }]}>
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Saved recipes</Text>
        {favorites.length > 0 && (
          <Text style={styles.listCount}>{favorites.length}</Text>
        )}
      </View>
    </View>
  );

  if (loading && favorites.length === 0) {
    return (
      <View style={[styles.emptyContainer, { paddingTop: insets.top }]}>
        {header}
        <View style={styles.emptyContent}>
          <ActivityIndicator size="large" color={BRAND} />
        </View>
      </View>
    );
  }

  if (favorites.length === 0) {
    return (
      <View style={[styles.emptyContainer, { paddingTop: insets.top }]}>
        {header}
        <View style={styles.emptyContent}>
          <Ionicons name="bookmark-outline" size={52} color="#CCCCCC" />
          <Text style={styles.emptyTitle}>No saved recipes yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the bookmark icon on any recipe to save it here.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.outer}>
      {header}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {favorites.map((recipe) => (
          <View key={recipe.id}>
            <Pressable
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}
              onPress={() => router.push(`/recipe/fav-${recipe.id}`)}
            >
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{recipe.name}</Text>
                <Text style={styles.cardDescription} numberOfLines={2}>
                  {recipe.description}
                </Text>
                <View style={styles.cardMeta}>
                  <Text style={styles.metaText}>{recipe.totalTime}</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaText}>Serves {recipe.servings}</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaText}>{DIFFICULTY_LABEL[recipe.difficulty]}</Text>
                </View>
              </View>
              <Pressable
                style={styles.removeBtn}
                onPress={() => handleRemove(recipe)}
                hitSlop={12}
              >
                <Ionicons name="bookmark" size={22} color={BRAND} />
              </Pressable>
            </Pressable>
            <View style={styles.divider} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  stickyHeader: {
    backgroundColor: '#F5F0E8',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  content: {
    paddingBottom: 48,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  emptyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B6B6B',
    textAlign: 'center',
    lineHeight: 22,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#2D4A1E',
  },
  listTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  listCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B6B6B',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    lineHeight: 24,
    letterSpacing: -0.2,
    marginBottom: 5,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B6B6B',
    lineHeight: 20,
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  metaDot: {
    fontSize: 13,
    color: '#AAAAAA',
  },
  removeBtn: {
    paddingTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginLeft: 20,
  },
});
