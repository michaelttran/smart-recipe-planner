import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#F97316',
          headerTitleStyle: { fontWeight: '700', color: '#1a1a1a' },
          contentStyle: { backgroundColor: '#fafaf8' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="recipes"
          options={{
            title: 'Your Recipes',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="recipe/[id]"
          options={{
            title: 'Recipe',
            headerBackTitle: 'Recipes',
          }}
        />
      </Stack>
    </>
  );
}
