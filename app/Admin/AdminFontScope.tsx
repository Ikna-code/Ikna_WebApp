'use client';

import { useEffect } from 'react';

type AdminFontScopeProps = {
  fontVariableClass: string;
};

export default function AdminFontScope({ fontVariableClass }: AdminFontScopeProps) {
  useEffect(() => {
    document.body.classList.add('admin-font-scope', fontVariableClass);

    return () => {
      document.body.classList.remove('admin-font-scope', fontVariableClass);
    };
  }, [fontVariableClass]);

  return null;
}