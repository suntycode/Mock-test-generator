import React, { useState } from 'react';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import EmptyState from '@/components/common/EmptyState';
import ErrorState from '@/components/common/ErrorState';
import StatusBadge from '@/components/common/StatusBadge';
import FormField from '@/components/common/FormField';
import FileDropzone from '@/components/common/FileDropzone';
import SectionBadge from '@/components/common/SectionBadge';
import { CardGridSkeleton, TableSkeleton } from '@/components/common/LoadingSkeletons';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle2, PlayCircle, Trophy, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function ComponentsDemo() {
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Shared Components Showcase"
        description="Design system tokens, common UI components, and state representations."
        badge={<StatusBadge status="verified" />}
        actions={
          <Button onClick={() => toast.success('Sonner toast works!')} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Trigger Toast
          </Button>
        }
      />

      {/* 1. StatCards */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          1. StatCards
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Papers"
            value="3"
            hint="2 fully approved"
            icon={FileText}
          />
          <StatCard
            label="Verified Questions"
            value="360"
            hint="Ready for mocks"
            icon={CheckCircle2}
            trend={{ value: '+12% this week', isPositive: true }}
          />
          <StatCard
            label="Practice Attempts"
            value="14"
            hint="5 full, 9 sectional"
            icon={PlayCircle}
          />
          <StatCard
            label="Top Accuracy"
            value="84.5%"
            hint="General Intelligence"
            icon={Trophy}
          />
        </div>
      </section>

      {/* 2. Badges */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          2. Status & Section Badges
        </h2>
        <Card className="border-border/80 shadow-none">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">StatusBadges</p>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status="approved" />
                <StatusBadge status="extracting" />
                <StatusBadge status="review" />
                <StatusBadge status="in_progress" />
                <StatusBadge status="failed" />
                <StatusBadge status="uploaded" />
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">SectionBadges</p>
              <div className="flex flex-wrap gap-2">
                <SectionBadge section="General Awareness" />
                <SectionBadge section="Mathematics" />
                <SectionBadge section="General Intelligence and Reasoning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 3. FormField & FileDropzone */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          3. FormField & FileDropzone
        </h2>
        <Card className="border-border/80 shadow-none">
          <CardContent className="p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Paper Title"
                hint="Human-readable title for this question set"
                required
              >
                <Input placeholder="e.g. RRB NTPC CBT-II 17-Sep Shift 1" />
              </FormField>
              <FormField
                label="Exam Date"
                error="Date must be within the last 5 years"
              >
                <Input type="date" defaultValue="2026-09-17" />
              </FormField>
            </div>

            <FormField label="Exam Paper PDF" hint="Accepts PDF up to 50 MB">
              <FileDropzone
                file={file}
                error={fileError}
                onChange={(f, err) => {
                  setFile(f);
                  setFileError(err);
                }}
              />
            </FormField>
          </CardContent>
        </Card>
      </section>

      {/* 4. ErrorState & EmptyState */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          4. ErrorState & EmptyState
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">ErrorState (with Network Error mapping)</p>
            <ErrorState
              title="Connection Failed"
              message="Network Error: AxiosError: connect ECONNREFUSED 127.0.0.1:5000"
              onRetry={() => toast.info('Retrying connection...')}
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">EmptyState</p>
            <EmptyState
              icon={PlayCircle}
              title="No Practice Attempts"
              description="Start your first AI mock exam to generate personalized performance analytics."
              action={<Button size="sm">Create First Mock</Button>}
            />
          </div>
        </div>
      </section>

      {/* 5. Loading Skeletons */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          5. Loading Skeletons
        </h2>
        <TableSkeleton rows={3} cols={4} />
      </section>
    </div>
  );
}

