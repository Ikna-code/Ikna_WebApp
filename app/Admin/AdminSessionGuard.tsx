'use client';

import { useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function AdminSessionGuard() {
  useEffect(() => {
    let isMounted = true;

    const ensureSession = async () => {
      const { data, error } = await supabaseBrowser.auth.getUser();

      if (!isMounted) return;
      if (error || !data?.user) {
        window.location.replace('/');
      }
    };

    const handlePageShow = () => {
      void ensureSession();
    };

    void ensureSession();
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      isMounted = false;
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  return null;
}
