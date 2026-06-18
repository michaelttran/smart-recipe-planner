import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, router } from 'expo-router';

const BRAND = '#2D4A1E';

export default function TabBar() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const savedActive = pathname === '/saved';
  const discoverActive = !savedActive;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Pressable style={styles.tab} onPress={() => router.navigate('/')}>
        <Ionicons
          name={discoverActive ? 'camera' : 'camera-outline'}
          size={24}
          color={discoverActive ? BRAND : '#AAAAAA'}
        />
        <Text style={[styles.label, discoverActive && styles.labelActive]}>Discover</Text>
      </Pressable>
      <Pressable style={styles.tab} onPress={() => router.navigate('/saved')}>
        <Ionicons
          name={savedActive ? 'bookmark' : 'bookmark-outline'}
          size={24}
          color={savedActive ? BRAND : '#AAAAAA'}
        />
        <Text style={[styles.label, savedActive && styles.labelActive]}>Saved</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    height: 60,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: '#AAAAAA',
  },
  labelActive: {
    color: BRAND,
  },
});
