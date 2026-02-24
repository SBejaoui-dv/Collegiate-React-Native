import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { colors } from '@/constants/theme';

export default function ProtectedTabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerTitleAlign: 'center',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            dashboard: 'grid-outline',
            search: 'search-outline',
            tasks: 'checkmark-done-outline',
            'essay-guidance': 'create-outline',
            'resume-guidance': 'document-text-outline',
          };

          return <Ionicons name={icons[route.name] ?? 'ellipse-outline'} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} />
      <Tabs.Screen name="essay-guidance" options={{ title: 'Essay' }} />
      <Tabs.Screen name="resume-guidance" options={{ title: 'Resume' }} />
    </Tabs>
  );
}
