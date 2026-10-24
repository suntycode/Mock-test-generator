import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import StatCard from '@/components/common/StatCard';
import StatusBadge from '@/components/common/StatusBadge';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { FileText, CheckCircle2, PlayCircle, Trophy, PlusCircle, ArrowRight } from 'lucide-react';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [papers, setPapers] = useState([]);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [attempts, setAttempts] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [papersRes, questionsRes, attemptsRes] = await Promise.allSettled([
          apiClient.get('/papers'),
          apiClient.get('/questions?verified=true&limit=1'),
          apiClient.get('/attempts'),
        ]);

        if (papersRes.status === 'fulfilled' && papersRes.value.data?.ok) {
          setPapers(papersRes.value.data.data || []);
        }
        if (questionsRes.status === 'fulfilled' && questionsRes.value.data?.ok) {
          setVerifiedCount(questionsRes.value.data.data?.total || 0);
        }
        if (attemptsRes.status === 'fulfilled' && attemptsRes.value.data?.ok) {
          setAttempts(attemptsRes.value.data.data || []);
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const bestScore = attempts.reduce((max, a) => {
    const s = a?.result?.score ?? 0;
    return s > max ? s : max;
  }, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Overview of your question bank, blueprints, and recent practice attempts."
        actions={
          <Button asChild>
            <Link to="/create-mock" className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Create Mock
            </Link>
          </Button>
        }
      />

      {/* Totals Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatCard
              title="Uploaded Papers"
              value={papers.length}
              description={`${papers.filter((p) => p.status === 'approved').length} fully approved`}
              icon={FileText}
            />
            <StatCard
              title="Verified Questions"
              value={verifiedCount}
              description="Ready in question bank"
              icon={CheckCircle2}
            />
            <StatCard
              title="Mock Attempts"
              value={attempts.length}
              description="Completed or in progress"
              icon={PlayCircle}
            />
            <StatCard
              title="Best Score"
              value={attempts.length > 0 ? Number(bestScore).toFixed(2) : '—'}
              description="Highest attempt score"
              icon={Trophy}
            />
          </>
        )}
      </div>

      {/* Recent Attempts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Attempts</CardTitle>
            <CardDescription>Your latest mock test practice sessions</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/history" className="gap-1 text-xs">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : attempts.length === 0 ? (
            <EmptyState
              icon={PlayCircle}
              title="No mock test attempts yet"
              description="Generate and take your first AI mock test to start tracking performance."
              action={
                <Button asChild>
                  <Link to="/create-mock">Create First Mock</Link>
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test / Attempt</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.slice(0, 5).map((att) => (
                  <TableRow key={att._id}>
                    <TableCell className="font-medium">
                      {att.mockTestId?.title || `Mock Test #${att._id.slice(-6)}`}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(att.startedAt || att.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={att.status} />
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {att.result?.score !== undefined ? Number(att.result.score).toFixed(2) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {att.status === 'in_progress' ? (
                        <Button size="sm" variant="default" asChild>
                          <Link to={`/exam/${att._id}`}>Resume</Link>
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/result/${att._id}`}>View Result</Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

