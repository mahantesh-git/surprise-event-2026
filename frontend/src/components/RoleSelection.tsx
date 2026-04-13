import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Code2, Navigation, Zap } from 'lucide-react';

interface RoleSelectionProps {
  onSelect: (role: 'solver' | 'runner') => void;
}

export function RoleSelection({ onSelect }: RoleSelectionProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="h-8 w-8 text-amber-500 fill-amber-500" />
            <h1 className="text-3xl font-bold tracking-tight">QUEST</h1>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400">Collaborative Scavenger Hunt</p>
        </div>

        <div className="grid gap-4">
          <Card 
            className="cursor-pointer hover:border-blue-500 transition-colors group"
            onClick={() => onSelect('solver')}
          >
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                <Code2 className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>I am the Solver</CardTitle>
                <CardDescription>Solve code puzzles to unlock locations.</CardDescription>
              </div>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:border-emerald-500 transition-colors group"
            onClick={() => onSelect('runner')}
          >
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <Navigation className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>I am the Runner</CardTitle>
                <CardDescription>Travel to locations and scan QR codes.</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </div>

        <p className="text-center text-xs text-zinc-400">
          Choose a solver or runner page, then log in with your team name and password.
        </p>
        <div className="pt-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              window.history.pushState({}, '', '/admin');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
          >
            Open Admin Panel
          </Button>
        </div>
      </div>
    </div>
  );
}
