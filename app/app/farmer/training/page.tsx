'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GraduationCap, CheckCircle2, Clock, PlayCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const moduleTypeLabels: Record<string, string> = {
  gap: 'Good Agricultural Practices',
  safety: 'Farm Safety',
  sustainability: 'Sustainability',
  organic: 'Organic Farming',
  child_labor: 'Child Labor Prevention',
  eudr_awareness: 'EUDR Awareness',
};

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  not_started: { icon: PlayCircle, color: 'text-muted-foreground', label: 'Not Started' },
  in_progress: { icon: Clock, color: 'text-amber-600', label: 'In Progress' },
  completed: { icon: CheckCircle2, color: 'text-green-600', label: 'Completed' },
};

export default function FarmerTrainingPage() {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/farmer/training')
      .then(r => r.json())
      .then(d => setModules(d.modules || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updateModule = async (moduleId: string, status: string) => {
    try {
      const res = await fetch('/api/farmer/training', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, status }),
      });
      if (res.ok) {
        const { module } = await res.json();
        setModules(prev => prev.map(m => m.id === moduleId ? module : m));
        toast({ title: status === 'completed' ? 'Module Completed!' : 'Progress Updated' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading training...</div>;
  }

  const completedCount = modules.filter(m => m.status === 'completed').length;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2" data-testid="text-training-title">
        <GraduationCap className="h-5 w-5 text-[#2E7D6B]" />
        Training Modules
      </h2>

      {modules.length > 0 && (
        <Card className="bg-[#2E7D6B]/5 border-[#2E7D6B]/20">
          <CardContent className="py-3 flex justify-between items-center">
            <span className="text-sm text-[#1F5F52] font-medium">Progress</span>
            <span className="text-lg font-bold text-[#1F5F52]" data-testid="text-training-progress">
              {completedCount}/{modules.length} completed
            </span>
          </CardContent>
        </Card>
      )}

      {modules.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <GraduationCap className="h-10 w-10 text-muted-foreground mx-auto" />
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <GraduationCap className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-sm">No training modules yet</p>
            <p className="text-xs text-muted-foreground mt-1">Compliance training assigned by your aggregator will appear here.</p>
          </div>
          <p className="text-xs text-muted-foreground">Your organization will assign training modules for you to complete.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map(mod => {
            const config = statusConfig[mod.status] || statusConfig.not_started;
            const StatusIcon = config.icon;
            return (
              <Card key={mod.id} data-testid={`training-module-${mod.id}`}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium text-sm">{mod.module_name}</h3>
                      <p className="text-xs text-muted-foreground">{moduleTypeLabels[mod.module_type] || mod.module_type}</p>
                    </div>
                    <Badge variant="outline" className={`${config.color} text-xs`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                  </div>
                  {mod.score !== null && mod.score !== undefined && (
                    <div className="text-xs text-muted-foreground mb-2">Score: {mod.score}%</div>
                  )}
                  {mod.completed_at && (
                    <div className="text-xs text-muted-foreground mb-2">
                      Completed: {new Date(mod.completed_at).toLocaleDateString()}
                    </div>
                  )}
                  {mod.status !== 'completed' && (
                    <div className="flex gap-2 mt-2">
                      {mod.status === 'not_started' && (
                        <Button size="sm" variant="outline" onClick={() => updateModule(mod.id, 'in_progress')} data-testid={`button-start-${mod.id}`}>
                          Start
                        </Button>
                      )}
                      {mod.status === 'in_progress' && (
                        <Button size="sm" onClick={() => updateModule(mod.id, 'completed')} data-testid={`button-complete-${mod.id}`}>
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
