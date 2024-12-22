'use client';

import Link from "next/link";

export function MainNav() {
  return (
    <nav className="flex items-center justify-between h-16">
      <div className="flex items-center gap-6">
        <Link 
          href="/" 
          className="text-lg font-semibold"
        >
          Your Site Name
        </Link>
      </div>
    </nav>
  );
} 