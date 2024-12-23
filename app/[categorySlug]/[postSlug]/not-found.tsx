import { Button } from "@/app/components/ui/button";
import Link from "next/link";

export default function PostNotFound() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-bold mb-4">Post Not Found</h1>
      <p className="text-lg text-muted-foreground mb-8">
        We couldn&apos;t find the post you&apos;re looking for.
      </p>
      <Button asChild>
        <Link href="/">Return Home</Link>
      </Button>
    </div>
  );
} 