import { Redirect } from 'expo-router';

export default function CounselorDashboardRoute() {
  return <Redirect href="/(protected)/(counselor-tabs)/overview" />;
}
