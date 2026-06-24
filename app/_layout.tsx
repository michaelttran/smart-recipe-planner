import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import TabBar from '@/components/TabBar';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (session && inAuthGroup) {
      router.replace('/');
    }
  }, [session, loading, segments]);

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
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
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
      {session && <TabBar />}
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
