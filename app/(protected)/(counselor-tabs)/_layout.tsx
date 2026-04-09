import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';

import { useAuth } from '@/app/features/auth/store/auth.context';
import { colors } from '@/constants/theme';

export default function CounselorTabsLayout() {
  const { user } = useAuth();

  if (user?.role !== 'counselor') {
    return <Redirect href="/(protected)/(tabs)/dashboard" />;
  }

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerTitleAlign: 'center',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            overview: 'grid-outline',
            students: 'people-outline',
            checklists: 'checkmark-done-outline',
            documents: 'document-text-outline',
            invites: 'key-outline',
            settings: 'settings-outline',
          };
          return <Ionicons name={icons[route.name] ?? 'ellipse-outline'} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="overview" options={{ title: 'Overview' }} />
      <Tabs.Screen name="students" options={{ title: 'Students' }} />
      <Tabs.Screen name="checklists" options={{ title: 'Checklists' }} />
      <Tabs.Screen name="documents" options={{ title: 'Documents' }} />
      <Tabs.Screen name="invites" options={{ title: 'Invites' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
