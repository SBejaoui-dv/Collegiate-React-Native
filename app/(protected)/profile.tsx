import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';

export default function ProfileScreen() {
  return (
    <PlaceholderScreen
      title="Profile"
      subtitle="Student Profile"
      description="Structure for viewing and editing academic, personal, and preference info."
      links={[{ href: '/(protected)/(tabs)/dashboard', label: 'Back to Dashboard' }]}
    />
  );
}
