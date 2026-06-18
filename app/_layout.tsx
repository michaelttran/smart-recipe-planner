import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import TabBar from '@/components/TabBar';

export default function RootLayout() {
  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#2D4A1E',
          headerTitleStyle: {
            fontWeight: '800',
            color: '#1A1A1A',
            fontSize: 16,
          },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#F5F0E8' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="ingredients"
          options={{ title: 'Ingredients', headerBackTitle: 'Photo' }}
        />
        <Stack.Screen
          name="preferences"
          options={{ title: 'Customize', headerBackTitle: 'Ingredients' }}
        />
        <Stack.Screen
          name="recipes"
          options={{ title: 'mise', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="recipe/[id]"
          options={{ title: '', headerBackTitle: 'Recipes' }}
        />
      </Stack>
      <TabBar />
    </View>
  );
}
