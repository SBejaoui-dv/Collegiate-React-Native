import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';

export default function CounselorDashboardScreen() {
  return (
    <PlaceholderScreen
      title="Counselor Dashboard"
      subtitle="Counselor Tools"
      description="Structure for student progress, at-risk alerts, and document management."
      links={[{ href: '/(protected)/(tabs)/dashboard', label: 'Back to Dashboard' }]}
    />
  );
}
