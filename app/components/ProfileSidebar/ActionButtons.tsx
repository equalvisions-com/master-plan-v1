'use client';

import { Button } from "@/app/components/ui/button";
import { Heart, MoreHorizontal } from "lucide-react";

export function ActionButtons() {
  const handleSubscribe = () => {
    // TODO: Implement newsletter subscription
    console.log('Subscribe clicked');
  };

  return (
    <div className="flex gap-2 mt-2">
      <Button 
        className="hover:bg-primary/90 transition-colors w-full sm:w-auto rounded-full" 
        size="sm" 
        onClick={handleSubscribe}
      >
        Subscribe
      </Button>
      <Button 
        variant="outline" 
        size="icon"
        className="rounded-full h-9 w-9"
        onClick={() => console.log('Like clicked')}
      >
        <Heart className="h-4 w-4" />
      </Button>
      <Button 
        variant="outline" 
        size="icon"
        className="rounded-full h-9 w-9"
        onClick={() => console.log('Menu clicked')}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </div>
  );
} 