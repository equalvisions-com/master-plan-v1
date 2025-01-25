'use client';

import { Button } from "@/app/components/ui/button";

export function SubscribeButton() {
  const handleSubscribe = () => {
    console.log('Subscribe clicked');
  };

  return (
    <Button 
      className="hover:bg-primary/90 transition-colors w-full sm:w-auto rounded-full" 
      size="sm" 
      onClick={handleSubscribe}
    >
      Subscribe
    </Button>
  );
} 