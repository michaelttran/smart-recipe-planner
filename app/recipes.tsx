import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';
import { analyzeIngredientsAndGetRecipes } from '@/lib/claude';
import { getStore, setRecipes } from '@/lib/store';
import { Recipe } from '@/types/recipe';

const DIFFICULTY_COLORS: Record<Recipe['difficulty'], string> = {
  easy: '#22c55e',
  medium: '#f59e0b',
  hard: '#ef4444',
};

export default function RecipesScreen() {
  const store = getStore();
  const [recipes, setLocalRecipes] = useState<Recipe[]>(store.recipes);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={handleRefresh}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginRight: 4 })}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator color="#F97316" size="small" />
          ) : (
            <Text style={styles.refreshIcon}>↻</Text>
          )}
        </Pressable>
      ),
    });
  }, [refreshing]);

  async function handleRefresh() {
    const { imageBase64, imageMediaType, allShownRecipeNames } = getStore();
    if (!imageBase64) return;

    setRefreshing(true);
    try {
      const newRecipes = await analyzeIngredientsAndGetRecipes(
        imageBase64,
        imageMediaType,
        allShownRecipeNames
      );
      setRecipes(newRecipes);
      setLocalRecipes(newRecipes);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to refresh recipes.'
      );
    } finally {
      setRefreshing(false);
    }
  }

  function openRecipe(index: number) {
    router.push(`/recipe/${index}`);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {store.imageUri && (
        <View style={styles.photoRow}>
          <Image source={{ uri: store.imageUri }} style={styles.thumbnail} />
          <View style={styles.photoInfo}>
            <Text style={styles.photoLabel}>Your ingredients</Text>
            <Text style={styles.recipeCount}>
              {recipes.length} recipe{recipes.length !== 1 ? 's' : ''} found
            </Text>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>What you can make</Text>

      {recipes.map((recipe, index) => (
        <Pressable
          key={recipe.id}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => openRecipe(index)}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>{recipe.name}</Text>
              <Text style={styles.cardArrow}>›</Text>
            </View>
            <View style={styles.badges}>
              <View
                style={[
                  styles.difficultyBadge,
                  { backgroundColor: DIFFICULTY_COLORS[recipe.difficulty] + '20' },
                ]}
              >
                <View
                  style={[
                    styles.difficultyDot,
                    { backgroundColor: DIFFICULTY_COLORS[recipe.difficulty] },
                  ]}
                />
                <Text
                  style={[
                    styles.difficultyText,
                    { color: DIFFICULTY_COLORS[recipe.difficulty] },
                  ]}
                >
                  {recipe.difficulty.charAt(0).toUpperCase() +
                    recipe.difficulty.slice(1)}
                </Text>
              </View>
              <View style={styles.timeBadge}>
                <Text style={styles.timeBadgeText}>⏱ {recipe.totalTime}</Text>
              </View>
              <View style={styles.timeBadge}>
                <Text style={styles.timeBadgeText}>
                  🍽 {recipe.servings} serving
                  {recipe.servings !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.cardDescription} numberOfLines={2}>
            {recipe.description}
          </Text>

          {recipe.tags.length > 0 && (
            <View style={styles.tags}>
              {recipe.tags.slice(0, 4).map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </Pressable>
      ))}

      <View style={styles.refreshHint}>
        <Text style={styles.refreshHintText}>
          Tap the refresh button ↻ in the top right to get 5 new recipes
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf8',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
  },
  photoInfo: {
    marginLeft: 12,
  },
  photoLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  recipeCount: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  cardHeader: {
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  cardArrow: {
    fontSize: 22,
    color: '#F97316',
    fontWeight: '300',
    marginTop: -2,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  difficultyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  timeBadgeText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  cardDescription: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 10,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  tagText: {
    fontSize: 11,
    color: '#c2410c',
    fontWeight: '500',
  },
  refreshHint: {
    marginTop: 8,
    alignItems: 'center',
  },
  refreshHintText: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
  },
  refreshIcon: {
    fontSize: 24,
    color: '#F97316',
    fontWeight: '400',
  },
});
