import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useLayoutEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getStore, isFavorite, addToFavorites, removeFromFavorites } from '@/lib/store';
import { addFavorite, removeFavorite } from '@/lib/api-client';
import { Recipe } from '@/types/recipe';

const BRAND = '#2D4A1E';

const DIFFICULTY_LABEL: Record<Recipe['difficulty'], string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Advanced',
};

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const store = getStore();

  const recipe = id.startsWith('fav-')
    ? store.favorites.find((r) => r.id === id.slice(4))
    : store.recipes[Number(id)];

  const [favorited, setFavorited] = useState(
    recipe ? isFavorite(recipe.name) : false
  );
  const [toggling, setToggling] = useState(false);

  useLayoutEffect(() => {
    if (!recipe) return;
    navigation.setOptions({
      title: '',
      headerRight: () => (
        <Pressable onPress={handleToggleFavorite} hitSlop={12} style={{ marginRight: 4 }} disabled={toggling}>
          <Ionicons
            name={favorited ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={favorited ? BRAND : '#AAAAAA'}
          />
        </Pressable>
      ),
    });
  }, [recipe?.name, favorited, toggling]);

  async function handleToggleFavorite() {
    if (!recipe || toggling) return;
    setToggling(true);
    try {
      if (favorited) {
        removeFromFavorites(recipe.name);
        setFavorited(false);
        await removeFavorite(recipe.name);
      } else {
        const { id: supabaseId } = await addFavorite(recipe);
        addToFavorites(recipe, supabaseId);
        setFavorited(true);
      }
    } catch (err) {
      // Revert optimistic update on failure
      setFavorited(favorited);
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not update saved recipes.');
    } finally {
      setToggling(false);
    }
  }

  if (!recipe) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Recipe not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero title */}
      <View style={styles.titleSection}>
        <View style={styles.titleRow}>
          <Text style={styles.recipeName}>{recipe.name}</Text>
          <Pressable onPress={handleToggleFavorite} hitSlop={12} style={styles.bookmarkInline} disabled={toggling}>
            <Ionicons
              name={favorited ? 'bookmark' : 'bookmark-outline'}
              size={26}
              color={favorited ? BRAND : '#CCCCCC'}
            />
          </Pressable>
        </View>
        <View style={[styles.titleRule, favorited && styles.titleRuleActive]} />
        <Text style={styles.description}>{recipe.description}</Text>

        {recipe.tags.length > 0 && (
          <View style={styles.tags}>
            {recipe.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Macros bar */}
      {recipe.macros && (
        <View style={styles.macrosBar}>
          <MacroStat label="Calories" value={String(recipe.macros.calories)} unit="" />
          <View style={styles.macroDivider} />
          <MacroStat label="Protein" value={String(recipe.macros.proteinG)} unit="g" />
          <View style={styles.macroDivider} />
          <MacroStat label="Carbs" value={String(recipe.macros.carbsG)} unit="g" />
          <View style={styles.macroDivider} />
          <MacroStat label="Fat" value={String(recipe.macros.fatG)} unit="g" />
          <View style={styles.macroDivider} />
          <MacroStat label="Fiber" value={String(recipe.macros.fiberG)} unit="g" />
        </View>
      )}

      {/* At-a-glance bar */}
      <View style={styles.glanceBar}>
        <GlanceStat label="Prep time" value={recipe.prepTime} />
        <View style={styles.glanceDivider} />
        <GlanceStat label="Cook time" value={recipe.cookTime} />
        <View style={styles.glanceDivider} />
        <GlanceStat label="Total time" value={recipe.totalTime} />
        <View style={styles.glanceDivider} />
        <GlanceStat label="Serves" value={String(recipe.servings)} />
        <View style={styles.glanceDivider} />
        <GlanceStat label="Difficulty" value={DIFFICULTY_LABEL[recipe.difficulty]} />
      </View>

      {/* Ingredients */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          <Text style={styles.sectionCount}>{recipe.ingredients.length} items</Text>
        </View>
        {recipe.ingredients.map((ingredient, i) => (
          <View
            key={i}
            style={[styles.ingredientRow, i === 0 && styles.ingredientFirst]}
          >
            <View style={styles.ingredientCheck} />
            <Text style={styles.ingredientAmount}>
              {ingredient.amount} {ingredient.unit}
            </Text>
            <Text style={styles.ingredientName}>
              {ingredient.name}
              {ingredient.notes ? (
                <Text style={styles.ingredientNotes}>, {ingredient.notes}</Text>
              ) : null}
            </Text>
          </View>
        ))}
      </View>

      {/* Shop ingredients */}
      <Pressable
        style={({ pressed }) => [styles.shopBtn, pressed && { opacity: 0.75 }]}
        onPress={() => {
          const lines = recipe.ingredients.map(
            (ing) => `• ${ing.amount} ${ing.unit} ${ing.name}${ing.notes ? ` (${ing.notes})` : ''}`.trim()
          );
          Share.share({
            message: `Ingredients for ${recipe.name} (serves ${recipe.servings})\n\n${lines.join('\n')}`,
            title: `${recipe.name} — Shopping List`,
          });
        }}
      >
        <Ionicons name="cart-outline" size={18} color={BRAND} />
        <Text style={styles.shopBtnText}>Shop ingredients</Text>
      </Pressable>

      {/* Instructions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Preparation</Text>
          <Text style={styles.sectionCount}>{recipe.instructions.length} steps</Text>
        </View>
        {recipe.instructions.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepLeft}>
              <Text style={styles.stepNum}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function MacroStat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.macroStat}>
      <Text style={styles.macroValue}>{value}<Text style={styles.macroUnit}>{unit}</Text></Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

function GlanceStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.glanceStat}>
      <Text style={styles.glanceLabel}>{label}</Text>
      <Text style={styles.glanceValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  content: { paddingBottom: 64 },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F0E8',
  },
  errorText: { fontSize: 15, color: '#6B6B6B' },

  titleSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  recipeName: {
    flex: 1,
    fontSize: 30,
    fontWeight: '800',
    color: '#1A1A1A',
    lineHeight: 37,
    letterSpacing: -0.5,
    marginRight: 12,
  },
  bookmarkInline: {
    paddingTop: 4,
  },
  titleRule: {
    width: 40,
    height: 3,
    backgroundColor: '#DDDDDD',
    marginBottom: 12,
  },
  titleRuleActive: {
    backgroundColor: BRAND,
  },
  description: {
    fontSize: 16,
    color: '#444444',
    lineHeight: 25,
    marginBottom: 16,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: '#F5F5F2',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 2,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  tagText: { fontSize: 12, color: '#555555', fontWeight: '500' },

  macrosBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  macroStat: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  macroValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 3,
  },
  macroUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B6B6B',
  },
  macroLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#AAAAAA',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  macroDivider: {
    width: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 4,
  },
  glanceBar: {
    flexDirection: 'row',
    backgroundColor: '#1E3612',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  glanceStat: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  glanceLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
    textAlign: 'center',
  },
  glanceValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  glanceDivider: {
    width: 1,
    backgroundColor: '#2A2A2A',
    marginVertical: 4,
  },

  section: { marginTop: 28, paddingHorizontal: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#2D4A1E',
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.2,
  },
  sectionCount: { fontSize: 13, color: '#6B6B6B', fontWeight: '500' },

  ingredientFirst: { borderTopWidth: 0 },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: '#EFEFED',
    gap: 10,
  },
  ingredientCheck: {
    width: 8,
    height: 8,
    borderWidth: 1.5,
    borderColor: '#AAAAAA',
    borderRadius: 1,
    marginTop: 4,
    flexShrink: 0,
  },
  ingredientAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: BRAND,
    width: 88,
    flexShrink: 0,
    lineHeight: 21,
  },
  ingredientName: { flex: 1, fontSize: 15, color: '#1A1A1A', lineHeight: 22 },
  ingredientNotes: { color: '#888888', fontStyle: 'italic' },

  stepRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#EFEFED',
    gap: 16,
  },
  stepLeft: { alignItems: 'center', width: 28, flexShrink: 0, paddingTop: 2 },
  stepNum: { fontSize: 14, fontWeight: '800', color: BRAND },
  stepText: { flex: 1, fontSize: 15, color: '#333333', lineHeight: 24 },

  shopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: BRAND,
    borderRadius: 4,
  },
  shopBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: BRAND,
    letterSpacing: 0.2,
  },
});
