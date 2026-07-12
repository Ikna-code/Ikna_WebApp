import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import Sidebar from './Analytics/Sidebar';
import { ensureCurrentDbUser } from '@/backend/lib/ensureDbUser';
import AdminSessionGuard from './AdminSessionGuard';
import AdminFontScope from './AdminFontScope';

export const dynamic = 'force-dynamic';

const adminFont = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-admin',
});

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
    <div className={`${adminFont.variable} [--font-sans:var(--font-admin)] flex min-h-dvh w-full overflow-x-hidden bg-[#f8eef4] font-sans text-[#2f1126] antialiased isolate`}>
      <AdminFontScope fontVariableClass={adminFont.variable} />
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