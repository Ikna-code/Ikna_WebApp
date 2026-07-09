import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import Sidebar from './Analytics/Sidebar';
import { ensureCurrentDbUser } from '@/backend/lib/ensureDbUser';
import AdminSessionGuard from './AdminSessionGuard';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  let dbUser;

  try {
    dbUser = await ensureCurrentDbUser();
    if (dbUser.role !== Role.ADMIN) {
      redirect('/');
    }
  } catch {
    redirect('/');
  }

  return (
    <div className="flex min-h-dvh w-full bg-[#f8eef4] text-[#2f1126] antialiased overflow-x-hidden isolate">
      <AdminSessionGuard />
      
      <Sidebar adminUser={dbUser} />
      
      <main 
        className="min-w-0 min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-14 pt-20 sm:px-6 sm:pb-10 sm:pt-24 lg:ml-64 lg:px-8 lg:pb-10 lg:pt-8"
        style={{
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 'max(4rem, calc(env(safe-area-inset-bottom) + 2rem))',
        }}
      >
        <div className="mx-auto w-full max-w-400">{children}</div>
      </main>

    </div>
  );
}