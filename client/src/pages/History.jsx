import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import StatusBadge from '@/components/common/StatusBadge';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { History as HistoryIcon, PlusCircle } from 'lucide-react';

export default function HistoryPage() {
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState([]);

  useEffect(() => {
    async function loadAttempts() {
      try {
        setLoading(true);
        const res = await apiClient.get('/attempts');
        if (res.data?.ok) {
          setAttempts(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load attempts:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAttempts();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attempt History"
        description="All your past and in-progress mock test attempts."
        actions={
          <Button asChild>
            <Link to="/create-mock" className="gap-2">
              <PlusCircle className="h-4 w-4" />
              New Mock Test
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Practice Sessions</CardTitle>
          <CardDescription>
            {attempts.length} total attempt{attempts.length === 1 ? '' : 's'} recorded
          </CardDescription>
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
              icon={HistoryIcon}
              title="No test history"
              description="You haven't attempted any mock tests yet."
              action={
                <Button asChild>
                  <Link to="/create-mock">Create Mock Test</Link>
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test Title</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Accuracy</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map((att) => (
                  <TableRow key={att._id}>
                    <TableCell className="font-medium">
                      {att.mockTestId?.title || `Mock Test #${att._id.slice(-6)}`}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(att.startedAt || att.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={att.status} />
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {att.result?.score !== undefined ? Number(att.result.score).toFixed(2) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {att.result?.accuracy !== undefined
                        ? `${(att.result.accuracy * 100).toFixed(1)}%`
                        : '—'}
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

