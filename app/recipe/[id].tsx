import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getStore } from '@/lib/store';
import { Recipe } from '@/types/recipe';

const DIFFICULTY_COLORS: Record<Recipe['difficulty'], string> = {
  easy: '#22c55e',
  medium: '#f59e0b',
  hard: '#ef4444',
};

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const store = getStore();
  const recipe = store.recipes[Number(id)];

  useLayoutEffect(() => {
    if (recipe) {
      navigation.setOptions({ title: recipe.name });
    }
  }, [recipe?.name]);

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
      {/* Hero section */}
      <View style={styles.hero}>
        <Text style={styles.recipeName}>{recipe.name}</Text>
        <Text style={styles.description}>{recipe.description}</Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <Stat label="Prep" value={recipe.prepTime} />
        <View style={styles.statDivider} />
        <Stat label="Cook" value={recipe.cookTime} />
        <View style={styles.statDivider} />
        <Stat label="Total" value={recipe.totalTime} />
        <View style={styles.statDivider} />
        <Stat label="Serves" value={String(recipe.servings)} />
      </View>

      {/* Difficulty & tags */}
      <View style={styles.metaRow}>
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
        {recipe.tags.map((tag) => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      {/* Ingredients */}
      <SectionHeader title="Ingredients" count={recipe.ingredients.length} />
      <View style={styles.card}>
        {recipe.ingredients.map((ingredient, i) => (
          <View
            key={i}
            style={[
              styles.ingredientRow,
              i < recipe.ingredients.length - 1 && styles.ingredientRowBorder,
            ]}
          >
            <View style={styles.ingredientBullet} />
            <View style={styles.ingredientInfo}>
              <Text style={styles.ingredientName}>{ingredient.name}</Text>
              {ingredient.notes ? (
                <Text style={styles.ingredientNotes}>{ingredient.notes}</Text>
              ) : null}
            </View>
            <Text style={styles.ingredientAmount}>
              {ingredient.amount}
              {ingredient.unit ? ` ${ingredient.unit}` : ''}
            </Text>
          </View>
        ))}
      </View>

      {/* Instructions */}
      <SectionHeader
        title="Instructions"
        count={recipe.instructions.length}
        label="steps"
      />
      <View style={styles.instructionsList}>
        {recipe.instructions.map((step, i) => (
          <View key={i} style={styles.instructionRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({
  title,
  count,
  label = 'items',
}: {
  title: string;
  count: number;
  label?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCount}>
        {count} {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf8',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 48,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
  },
  hero: {
    marginBottom: 20,
  },
  recipeName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 10,
    lineHeight: 34,
  },
  description: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 23,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 4,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 24,
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  difficultyDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  difficultyText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tag: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  tagText: {
    fontSize: 12,
    color: '#c2410c',
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  sectionCount: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  ingredientRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
  },
  ingredientBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F97316',
    marginRight: 12,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  ingredientNotes: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 1,
  },
  ingredientAmount: {
    fontSize: 14,
    color: '#F97316',
    fontWeight: '600',
    marginLeft: 8,
  },
  instructionsList: {
    gap: 12,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 1,
    flexShrink: 0,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
});
