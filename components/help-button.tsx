'use client';

import { useState } from 'react';
import { HelpCircle, PlayCircle, BookOpen, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useOnboarding } from '@/lib/hooks/use-onboarding';
import { useOrg } from '@/lib/contexts/org-context';
import Link from 'next/link';

export function HelpButton() {
  const { startAgentTour, startAggregatorTour, startAdminTour, resetTours } = useOnboarding();
  const { profile } = useOrg();
  const [open, setOpen] = useState(false);

  const handleStartTour = () => {
    setOpen(false);
    if (profile?.role === 'admin') {
      startAdminTour();
    } else if (profile?.role === 'aggregator') {
      startAggregatorTour();
    } else {
      startAgentTour();
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          data-tour="help-button"
          data-testid="button-help"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Help & Support</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleStartTour} className="cursor-pointer">
          <PlayCircle className="h-4 w-4 mr-2" />
          Restart Tour
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/app/guide">
            <BookOpen className="h-4 w-4 mr-2" />
            Getting Started Guide
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="cursor-pointer">
          <MessageCircle className="h-4 w-4 mr-2" />
          Contact Support
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
