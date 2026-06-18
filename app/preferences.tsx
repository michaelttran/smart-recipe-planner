import { useState, useEffect } from 'react';
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
import { fetchRecipes } from '@/lib/api-client';
import { getStore, setPreferences, setRecipes } from '@/lib/store';
import { UserPreferences, DEFAULT_PREFERENCES } from '@/types/preferences';

const BRAND = '#2D4A1E';

const TIME_OPTIONS = [
  { key: 'quick' as const, label: 'Under 30 min', sub: 'Fast & simple' },
  { key: 'medium' as const, label: '30–60 min', sub: 'A bit of effort' },
  { key: 'leisurely' as const, label: 'No rush', sub: 'Worth the wait' },
];

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'];

const FLAVOR_PROFILES = [
  'Savory', 'Sweet', 'Spicy', 'Fresh & Light',
  'Smoky', 'Comforting', 'Umami', 'Tangy',
];

const DIETARY_NEEDS = [
  'Vegetarian', 'Vegan', 'Gluten-Free',
  'Dairy-Free', 'Low-Carb', 'Keto',
];

const CUISINE_TYPES = [
  'Italian', 'Asian', 'Mexican', 'Mediterranean',
  'American', 'Indian', 'Surprise Me',
];

export default function PreferencesScreen() {
  const [prefs, setPrefs] = useState<UserPreferences>({ ...DEFAULT_PREFERENCES });
  const [loading, setLoading] = useState(false);
  const hasRecipes = getStore().recipes.length > 0;

  useEffect(() => {
    const stored = getStore().preferences;
    if (stored) setPrefs({ ...stored });
  }, []);

  function toggleMulti(field: 'flavorProfiles' | 'dietaryNeeds' | 'cuisineTypes', value: string) {
    setPrefs((prev) => {
      const current = prev[field];
      return {
        ...prev,
        [field]: current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value],
      };
    });
  }

  function selectSingle(field: 'mealType', value: string) {
    setPrefs((prev) => ({
      ...prev,
      [field]: prev[field] === value ? null : value,
    }));
  }

  async function findRecipes() {
    const store = getStore();
    if (!store.imageBase64) return;

    setLoading(true);
    setPreferences(prefs);

    try {
      const recipes = await fetchRecipes(
        store.ingredients,
        store.allShownRecipeNames,
        prefs
      );
      setRecipes(recipes);
      router.push('/recipes');
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Time available */}
      <Section title="How much time do you have?">
        <View style={styles.timeRow}>
          {TIME_OPTIONS.map((opt) => {
            const selected = prefs.timeAvailable === opt.key;
            return (
              <Pressable
                key={opt.key}
                style={[styles.timeCard, selected && styles.timeCardSelected]}
                onPress={() => setPrefs((p) => ({ ...p, timeAvailable: opt.key }))}
              >
                <Text style={[styles.timeLabel, selected && styles.timeLabelSelected]}>
                  {opt.label}
                </Text>
                <Text style={[styles.timeSub, selected && styles.timeSubSelected]}>
                  {opt.sub}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      {/* Ingredient usage */}
      <Section title="How should we use your ingredients?">
        <View style={styles.timeRow}>
          {([
            {
              value: false,
              label: 'These ingredients only',
              sub: 'No extra shopping needed',
            },
            {
              value: true,
              label: 'Open to more',
              sub: 'Recipes may need extras',
            },
          ] as const).map(({ value, label, sub }) => {
            const selected = prefs.useAllIngredients === value;
            return (
              <Pressable
                key={label}
                style={[styles.timeCard, selected && styles.timeCardSelected]}
                onPress={() => setPrefs((p) => ({ ...p, useAllIngredients: value }))}
              >
                <Text style={[styles.timeLabel, selected && styles.timeLabelSelected]}>
                  {label}
                </Text>
                <Text style={[styles.timeSub, selected && styles.timeSubSelected]}>
                  {sub}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      {/* Meal type */}
      <Section title="What are you cooking?">
        <View style={styles.chipRow}>
          {MEAL_TYPES.map((meal) => {
            const selected = prefs.mealType === meal;
            return (
              <Chip
                key={meal}
                label={meal}
                selected={selected}
                onPress={() => selectSingle('mealType', meal)}
              />
            );
          })}
        </View>
      </Section>

      {/* Flavor profile */}
      <Section title="What flavors are you after?" subtitle="Pick any that apply">
        <View style={styles.chipRow}>
          {FLAVOR_PROFILES.map((flavor) => {
            const selected = prefs.flavorProfiles.includes(flavor);
            return (
              <Chip
                key={flavor}
                label={flavor}
                selected={selected}
                onPress={() => toggleMulti('flavorProfiles', flavor)}
              />
            );
          })}
        </View>
      </Section>

      {/* Dietary needs */}
      <Section title="Any dietary needs?" subtitle="Pick any that apply">
        <View style={styles.chipRow}>
          {DIETARY_NEEDS.map((need) => {
            const selected = prefs.dietaryNeeds.includes(need);
            return (
              <Chip
                key={need}
                label={need}
                selected={selected}
                onPress={() => toggleMulti('dietaryNeeds', need)}
              />
            );
          })}
        </View>
      </Section>

      {/* Cuisine direction */}
      <Section title="Any cuisine in mind?" subtitle="Pick any that apply">
        <View style={styles.chipRow}>
          {CUISINE_TYPES.map((cuisine) => {
            const selected = prefs.cuisineTypes.includes(cuisine);
            return (
              <Chip
                key={cuisine}
                label={cuisine}
                selected={selected}
                onPress={() => toggleMulti('cuisineTypes', cuisine)}
              />
            );
          })}
        </View>
      </Section>

      {/* Extra ingredients */}
      <Section title="Anything else in your pantry?">
        <TextInput
          style={styles.textInput}
          placeholder="e.g. pasta, garlic, olive oil, soy sauce…"
          placeholderTextColor="#AAAAAA"
          value={prefs.extraIngredients}
          onChangeText={(text) => setPrefs((p) => ({ ...p, extraIngredients: text }))}
          multiline
          numberOfLines={2}
          returnKeyType="done"
        />
      </Section>

      {/* CTA */}
      {hasRecipes && (
        <Pressable
          style={styles.backBtn}
          onPress={() => router.replace('/recipes')}
          disabled={loading}
        >
          <Text style={styles.backBtnText}>Back to recipes →</Text>
        </Pressable>
      )}
      <Pressable
        style={[styles.findBtn, loading && styles.findBtnDisabled]}
        onPress={findRecipes}
        disabled={loading}
      >
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.findBtnText}>Finding your recipes…</Text>
          </View>
        ) : (
          <Text style={styles.findBtnText}>{hasRecipes ? 'Find New Recipes' : 'Find My Recipes'}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
      {children}
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  content: {
    paddingBottom: 48,
  },

  // Sections
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFED',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#2D4A1E',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.2,
    flex: 1,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6B6B6B',
    fontWeight: '500',
    marginLeft: 8,
  },

  // Time cards
  timeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  timeCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#DDDDDD',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderRadius: 2,
  },
  timeCardSelected: {
    borderColor: BRAND,
    backgroundColor: BRAND,
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 2,
  },
  timeLabelSelected: {
    color: '#FFFFFF',
  },
  timeSub: {
    fontSize: 11,
    color: '#6B6B6B',
    textAlign: 'center',
  },
  timeSubSelected: {
    color: 'rgba(255,255,255,0.75)',
  },

  // Chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: '#DDDDDD',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 2,
  },
  chipSelected: {
    borderColor: BRAND,
    backgroundColor: BRAND,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },

  // Text input
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DDDDDD',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A1A1A',
    marginBottom: 16,
    borderRadius: 2,
    minHeight: 64,
    textAlignVertical: 'top',
  },

  // CTA
  backBtn: {
    marginHorizontal: 20,
    marginTop: 28,
    paddingVertical: 15,
    borderRadius: 4,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: BRAND,
  },
  backBtnText: {
    color: BRAND,
    fontSize: 15,
    fontWeight: '600',
  },
  findBtn: {
    backgroundColor: BRAND,
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 17,
    borderRadius: 4,
    alignItems: 'center',
  },
  findBtnDisabled: {
    backgroundColor: '#7BAE6A',
  },
  findBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
