'use client';

import { SearchBar } from "@/app/components/SearchBar";

export default function SearchPage() {
  return (
    <div className="container max-w-screen-xl mx-auto px-4 py-8">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-3xl font-bold text-center">Search Newsletters</h1>
        <SearchBar />
      </div>
    </div>
  );
}
