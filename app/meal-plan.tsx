import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getStore } from '@/lib/store';
import { DayPlan, MealPlanRecipe } from '@/types/meal-plan';

const BRAND = '#2D4A1E';

const DIFFICULTY_LABEL: Record<MealPlanRecipe['difficulty'], string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Advanced',
};

const DAY_ABBREV: Record<string, string> = {
  Monday: 'MON',
  Tuesday: 'TUE',
  Wednesday: 'WED',
  Thursday: 'THU',
  Friday: 'FRI',
  Saturday: 'SAT',
  Sunday: 'SUN',
};

export default function MealPlanScreen() {
  const mealPlan = getStore().mealPlan;
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!mealPlan) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No meal plan available.</Text>
      </View>
    );
  }

  async function shareShoppingList() {
    const lines = mealPlan!.shoppingList.map(
      (item) => `• ${item.amount} ${item.unit} ${item.name}`.trim()
    );
    try {
      await Share.share({ message: `Weekly Shopping List\n\n${lines.join('\n')}` });
    } catch {}
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Week</Text>
        <Text style={styles.headerSub}>
          {mealPlan.days.length} dinners · ingredients shared across meals
        </Text>
      </View>

      {/* Day cards */}
      {mealPlan.days.map((day: DayPlan) => {
        const isOpen = expanded === day.day;
        return (
          <View key={day.day}>
            <Pressable
              style={({ pressed }) => [styles.dayCard, pressed && { opacity: 0.8 }]}
              onPress={() => setExpanded(isOpen ? null : day.day)}
            >
              <View style={styles.dayBadge}>
                <Text style={styles.dayBadgeText}>{DAY_ABBREV[day.day] ?? day.day.slice(0, 3).toUpperCase()}</Text>
              </View>

              <View style={styles.dayContent}>
                <Text style={styles.dayRecipeName}>{day.recipe.name}</Text>
                <View style={styles.dayMeta}>
                  <Text style={styles.dayMetaText}>{day.recipe.totalTime}</Text>
                  <Text style={styles.dayMetaDot}>·</Text>
                  <Text style={styles.dayMetaText}>{DIFFICULTY_LABEL[day.recipe.difficulty]}</Text>
                  <Text style={styles.dayMetaDot}>·</Text>
                  <Text style={styles.dayMetaText}>{day.recipe.macros.calories} cal</Text>
                </View>
              </View>

              <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
            </Pressable>

            {isOpen && (
              <View style={styles.expanded}>
                <Text style={styles.expandedDesc}>{day.recipe.description}</Text>

                {/* Macros row */}
                <View style={styles.macroRow}>
                  {[
                    { label: 'Protein', value: `${day.recipe.macros.proteinG}g` },
                    { label: 'Carbs', value: `${day.recipe.macros.carbsG}g` },
                    { label: 'Fat', value: `${day.recipe.macros.fatG}g` },
                    { label: 'Fiber', value: `${day.recipe.macros.fiberG}g` },
                  ].map((m) => (
                    <View key={m.label} style={styles.macroItem}>
                      <Text style={styles.macroValue}>{m.value}</Text>
                      <Text style={styles.macroLabel}>{m.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Ingredients */}
                <Text style={styles.sectionLabel}>Ingredients</Text>
                {day.recipe.ingredients.map((ing, i) => (
                  <Text key={i} style={styles.ingredient}>
                    • {ing.amount} {ing.unit} {ing.name}
                    {ing.notes ? ` (${ing.notes})` : ''}
                  </Text>
                ))}

                {/* Instructions */}
                <Text style={styles.sectionLabel}>Instructions</Text>
                {day.recipe.instructions.map((step, i) => (
                  <View key={i} style={styles.step}>
                    <Text style={styles.stepNum}>{i + 1}</Text>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.divider} />
          </View>
        );
      })}

      {/* Shopping list */}
      <View style={styles.shoppingSection}>
        <View style={styles.shoppingHeader}>
          <Text style={styles.shoppingTitle}>Shopping List</Text>
          <Pressable onPress={shareShoppingList} style={styles.shareBtn}>
            <Text style={styles.shareBtnText}>Share</Text>
          </Pressable>
        </View>
        <Text style={styles.shoppingNote}>Items you'll need beyond your current ingredients</Text>
        {mealPlan.shoppingList.length === 0 ? (
          <Text style={styles.shoppingEmpty}>You already have everything you need!</Text>
        ) : (
          mealPlan.shoppingList.map((item, i) => (
            <Text key={i} style={styles.shoppingItem}>
              • {item.amount} {item.unit} {item.name}
            </Text>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  content: { paddingBottom: 64 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15, color: '#6B6B6B' },

  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: BRAND,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  headerSub: { fontSize: 13, color: '#6B6B6B', fontWeight: '500' },

  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#F5F0E8',
    gap: 14,
  },
  dayBadge: {
    width: 44,
    height: 44,
    borderRadius: 2,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dayBadgeText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  dayContent: { flex: 1 },
  dayRecipeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.1,
    marginBottom: 4,
  },
  dayMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dayMetaText: { fontSize: 12, color: '#6B6B6B', fontWeight: '500' },
  dayMetaDot: { fontSize: 12, color: '#CCCCCC' },
  chevron: { fontSize: 10, color: '#AAAAAA', paddingLeft: 4 },

  expanded: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  expandedDesc: {
    fontSize: 14,
    color: '#6B6B6B',
    lineHeight: 21,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  macroRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 0,
  },
  macroItem: { flex: 1, alignItems: 'center' },
  macroValue: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  macroLabel: { fontSize: 11, color: '#6B6B6B', marginTop: 2 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: BRAND,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 10,
  },
  ingredient: { fontSize: 14, color: '#1A1A1A', lineHeight: 22 },
  step: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  stepNum: {
    fontSize: 12,
    fontWeight: '800',
    color: BRAND,
    width: 18,
    marginTop: 2,
  },
  stepText: { flex: 1, fontSize: 14, color: '#1A1A1A', lineHeight: 22 },

  divider: { height: 1, backgroundColor: '#E5E5E5', marginLeft: 20 },

  shoppingSection: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
    borderTopWidth: 2,
    borderTopColor: BRAND,
  },
  shoppingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  shoppingTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.2 },
  shareBtn: {
    borderWidth: 1.5,
    borderColor: BRAND,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 4,
  },
  shareBtnText: { fontSize: 13, fontWeight: '600', color: BRAND },
  shoppingNote: { fontSize: 12, color: '#6B6B6B', marginBottom: 16 },
  shoppingItem: { fontSize: 14, color: '#1A1A1A', lineHeight: 26 },
  shoppingEmpty: { fontSize: 14, color: '#6B6B6B', fontStyle: 'italic' },
});
