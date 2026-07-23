import { getAllData } from '@/lib/repo';
import AppShell from '@/components/AppShell';

export const dynamic = 'force-dynamic';

export default function Home() {
  const data = getAllData();
  return <AppShell data={data} />;
}
