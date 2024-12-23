import Link from "next/link";
import { Button } from "@/app/components/ui/button";

export default function CategoryNotFound() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-bold mb-4">Category Not Found</h1>
      <p className="text-lg text-muted-foreground mb-8">
        We couldn&apos;t find the category you&apos;re looking for.
      </p>
      <Button asChild>
        <Link href="/">Return Home</Link>
      </Button>
    </div>
  );
} 