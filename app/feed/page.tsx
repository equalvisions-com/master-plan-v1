import { Feed } from '@/app/components/Feed/Feed';
import { MainLayout } from '@/app/components/layouts/MainLayout';

export const dynamic = 'force-dynamic';

export default async function FeedPage() {
  return (
    <div className="container-fluid">
      <MainLayout>
        <Feed />
      </MainLayout>
    </div>
  );
} 