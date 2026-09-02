'use client';

import Link from 'next/link';
import { HelpCircle, PlayCircle, BookOpen, RotateCcw } from 'lucide-react';
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
import { useState } from 'react';

export function HelpButton() {
  const { startTourForRole, resetTours } = useOnboarding();
  const { profile } = useOrg();
  const [open, setOpen] = useState(false);

  const role = profile?.role ?? 'admin';

  const handleStartTour = () => {
    setOpen(false);
    startTourForRole(role);
  };

  const handleResetAndRestart = () => {
    setOpen(false);
    resetTours();
    // Small delay so state updates before tour starts
    setTimeout(() => startTourForRole(role), 200);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Help and onboarding"
          data-tour="help-button"
          data-testid="button-help"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          Help & Onboarding
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleStartTour} className="cursor-pointer gap-2">
          <PlayCircle className="h-4 w-4 text-primary" />
          <span>Start Guided Tour</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleResetAndRestart} className="cursor-pointer gap-2">
          <RotateCcw className="h-4 w-4 text-muted-foreground" />
          <span>Restart Tour from Beginning</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer gap-2">
          <Link href="/app/guide">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span>Getting Started Guide</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
