'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, LayoutGrid, Upload as UploadIcon, LogOut, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { signOut } from '@/lib/supabase/auth';
import Image from 'next/image';
interface AppHeaderProps {
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export function AppHeader({ email, name, avatarUrl }: AppHeaderProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  };

  const displayName = name ?? email;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="border-b border-ink-rule">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="font-display text-lg italic text-paper">
          Lectern
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-full border border-ink-rule py-1 pl-1 pr-3 transition-colors hover:border-highlighter/40"
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                className="h-7 w-7 rounded-full"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                width={28}
                height={28}
              />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-highlighter/10 font-mono text-xs text-highlighter">
                {initial}
              </span>
            )}
            <ChevronDown
              className={`h-3 w-3 text-paper-dim transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </button>

          {open && (
            <Card className="absolute right-0 top-full z-50 mt-2 w-52 animate-rise overflow-hidden !p-0">
              <div className="border-b border-ink-rule px-4 py-3">
                <p className="truncate text-sm text-paper">{displayName}</p>
                <p className="truncate font-mono text-xs text-paper-dim">{email}</p>
              </div>
              <nav className="p-1">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-paper hover:bg-highlighter/10"
                  onClick={() => setOpen(false)}
                >
                  <LayoutGrid className="h-4 w-4" aria-hidden />
                  My Lectures
                </Link>
                <Link
                  href="/upload"
                  className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-paper hover:bg-highlighter/10"
                  onClick={() => setOpen(false)}
                >
                  <UploadIcon className="h-4 w-4" aria-hidden />
                  Upload new
                </Link>
                <Link
                    href="/trash"
                    className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-paper hover:bg-highlighter/10"
                    onClick={() => setOpen(false)}
                    >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Trash
                    </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-highlighter hover:bg-highlighter/10"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  Log out
                </button>
              </nav>
            </Card>
          )}
        </div>
      </div>
    </header>
  );
}