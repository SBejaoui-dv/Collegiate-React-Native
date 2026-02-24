import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';

export default function SearchScreen() {
  return (
    <PlaceholderScreen
      title="College Search"
      subtitle="Filters + Results"
      description="Structure for search filters, sorting, and college cards."
      links={[{ href: '/financial-aid', label: 'Financial Aid' }]}
    />
  );
}
