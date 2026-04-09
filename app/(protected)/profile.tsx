import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';
import { useAuth } from '@/app/features/auth/store/auth.context';

export default function ProfileScreen() {
  const { user } = useAuth();
  const isCounselor = user?.role === 'counselor';

  return (
    <PlaceholderScreen
      title="Profile"
      subtitle={isCounselor ? 'Counselor Profile' : 'Student Profile'}
      description="Structure for viewing and editing academic, personal, and preference info."
      links={[
        { href: '/(protected)/settings', label: 'Open Settings' },
        {
          href: isCounselor
            ? '/(protected)/(counselor-tabs)/overview'
            : '/(protected)/(tabs)/dashboard',
          label: 'Back to Dashboard',
        },
      ]}
    />
  );
}
