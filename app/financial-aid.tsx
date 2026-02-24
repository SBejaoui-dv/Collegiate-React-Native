import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';

export default function FinancialAidScreen() {
  return (
    <PlaceholderScreen
      title="Financial Aid"
      subtitle="Scholarships + Aid Planning"
      description="Structure for aid calculators, recommendations, and funding opportunities."
      links={[
        { href: '/(public)', label: 'Back to Landing' },
        { href: '/(protected)/(tabs)/search', label: 'Back to Search' },
      ]}
    />
  );
}
