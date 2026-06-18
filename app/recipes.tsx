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
import { fetchRecipes } from '@/lib/api-client';
import { getStore, setRecipes } from '@/lib/store';
import { Recipe } from '@/types/recipe';

const BRAND = '#2D4A1E';

const DIFFICULTY_LABEL: Record<Recipe['difficulty'], string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Advanced',
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
          style={({ pressed }) => [styles.refreshBtn, { opacity: pressed ? 0.5 : 1 }]}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator color={BRAND} size="small" />
          ) : (
            <Text style={styles.refreshBtnText}>New recipes</Text>
          )}
        </Pressable>
      ),
    });
  }, [refreshing]);

  async function handleRefresh() {
    const { imageBase64, allShownRecipeNames } = getStore();
    if (!imageBase64) return;
    setRefreshing(true);
    try {
      const newRecipes = await fetchRecipes(
        getStore().ingredients,
        allShownRecipeNames,
        getStore().preferences
      );
      setRecipes(newRecipes);
      setLocalRecipes(newRecipes);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to load new recipes.'
      );
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Source context strip */}
      {store.imageUri && (
        <View style={styles.contextStrip}>
          <Image source={{ uri: store.imageUri }} style={styles.thumbnail} />
          <View style={styles.contextText}>
            <Text style={styles.contextLabel}>Based on your ingredients</Text>
            <Text style={styles.contextCount}>{recipes.length} recipes</Text>
          </View>
        </View>
      )}

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>What to cook tonight</Text>
      </View>

      {recipes.map((recipe, index) => (
        <View key={recipe.id}>
          <Pressable
            onPress={() => router.push(`/recipe/${index}`)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}
          >
            {/* Recipe number badge */}
            <Text style={styles.recipeNumber}>{String(index + 1).padStart(2, '0')}</Text>

            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{recipe.name}</Text>
              <Text style={styles.cardDescription} numberOfLines={2}>
                {recipe.description}
              </Text>

              <View style={styles.cardMeta}>
                <Text style={styles.metaText}>{recipe.totalTime}</Text>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaText}>
                  Serves {recipe.servings}
                </Text>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaText}>
                  {DIFFICULTY_LABEL[recipe.difficulty]}
                </Text>
              </View>

              {recipe.tags.length > 0 && (
                <View style={styles.tags}>
                  {recipe.tags.slice(0, 3).map((tag) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </Pressable>
          <View style={styles.divider} />
        </View>
      ))}

      <Pressable onPress={handleRefresh} style={styles.refreshFooter} disabled={refreshing}>
        <Text style={styles.refreshFooterText}>
          {refreshing ? 'Loading new recipes…' : 'Get 5 new recipes →'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  content: {
    paddingBottom: 56,
  },
  contextStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    gap: 12,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#E5E5E5',
  },
  contextText: {
    flex: 1,
  },
  contextLabel: {
    fontSize: 12,
    color: '#6B6B6B',
    marginBottom: 2,
  },
  contextCount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  listHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#2D4A1E',
  },
  listTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  card: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#F5F0E8',
    gap: 14,
  },
  recipeNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: BRAND,
    marginTop: 3,
    letterSpacing: 0.5,
    width: 22,
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1A1A1A',
    lineHeight: 25,
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B6B6B',
    lineHeight: 21,
    marginBottom: 10,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 10,
  },
  metaText: {
    fontSize: 13,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  metaDot: {
    fontSize: 13,
    color: '#AAAAAA',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 11,
    color: '#6B6B6B',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginLeft: 20,
  },
  refreshBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  refreshBtnText: {
    fontSize: 14,
    color: BRAND,
    fontWeight: '600',
  },
  refreshFooter: {
    alignItems: 'center',
    paddingVertical: 28,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    marginTop: 8,
  },
  refreshFooterText: {
    fontSize: 14,
    color: BRAND,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
