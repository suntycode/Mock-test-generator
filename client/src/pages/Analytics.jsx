import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/api/client';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import SectionBadge from '@/components/common/SectionBadge';
import ErrorState from '@/components/common/ErrorState';
import EmptyState from '@/components/common/EmptyState';
import { TableSkeleton } from '@/components/common/LoadingSkeletons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  BarChart3,
  Layers,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Save,
  Check,
  Play,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const defaultExamKey = 'rrb-ntpc-ug-cbt2';

// Colors for charts
const DIFFICULTY_COLORS = {
  easy: '#16a34a', // green
  medium: '#f59e0b', // amber
  hard: '#ef4444', // red
};

const SECTION_BAR_COLORS = ['#3b82f6', '#10b981', '#8b5cf6'];

// Realistic dummy sample data for preview when backend has no data or network error
const DUMMY_SUMMARY = {
  total: 120,
  groups: [
    // General Awareness (50)
    { _id: { section: 'General Awareness', category: 'General Science', subcategory: 'Chemistry', difficulty: 'easy' }, count: 10 },
    { _id: { section: 'General Awareness', category: 'General Science', subcategory: 'Physics', difficulty: 'medium' }, count: 8 },
    { _id: { section: 'General Awareness', category: 'Polity and Constitution', subcategory: 'Constitutional Provisions', difficulty: 'medium' }, count: 12 },
    { _id: { section: 'General Awareness', category: 'Geography', subcategory: 'Indian Geography', difficulty: 'easy' }, count: 8 },
    { _id: { section: 'General Awareness', category: 'History', subcategory: 'Modern India', difficulty: 'hard' }, count: 6 },
    { _id: { section: 'General Awareness', category: 'Current Affairs', subcategory: 'National', difficulty: 'medium' }, count: 6 },

    // Mathematics (35)
    { _id: { section: 'Mathematics', category: 'Arithmetic', subcategory: 'Percentage', difficulty: 'easy' }, count: 7 },
    { _id: { section: 'Mathematics', category: 'Arithmetic', subcategory: 'Profit and Loss', difficulty: 'medium' }, count: 8 },
    { _id: { section: 'Mathematics', category: 'Number System', subcategory: 'LCM and HCF', difficulty: 'easy' }, count: 6 },
    { _id: { section: 'Mathematics', category: 'Algebra', subcategory: 'Identities', difficulty: 'hard' }, count: 7 },
    { _id: { section: 'Mathematics', category: 'Trigonometry', subcategory: 'Ratios and Identities', difficulty: 'hard' }, count: 7 },

    // Reasoning (35)
    { _id: { section: 'General Intelligence and Reasoning', category: 'Verbal Reasoning', subcategory: 'Series (Number)', difficulty: 'medium' }, count: 10 },
    { _id: { section: 'General Intelligence and Reasoning', category: 'Verbal Reasoning', subcategory: 'Coding-Decoding', difficulty: 'easy' }, count: 9 },
    { _id: { section: 'General Intelligence and Reasoning', category: 'Verbal Reasoning', subcategory: 'Blood Relations', difficulty: 'medium' }, count: 8 },
    { _id: { section: 'General Intelligence and Reasoning', category: 'Non-Verbal Reasoning', subcategory: 'Figure Series', difficulty: 'hard' }, count: 8 },
  ],
};

const DUMMY_BLUEPRINT = {
  _id: 'dummy-blueprint-1',
  examKey: defaultExamKey,
  difficultyMix: { easy: 0.3, medium: 0.5, hard: 0.2 },
  sections: [
    {
      name: 'General Awareness',
      total: 50,
      categories: [
        {
          name: 'General Science',
          count: 18,
          subcategories: [
            { name: 'Chemistry', count: 10 },
            { name: 'Physics', count: 8 },
          ],
        },
        {
          name: 'Polity and Constitution',
          count: 12,
          subcategories: [
            { name: 'Constitutional Provisions', count: 12 },
          ],
        },
        {
          name: 'Geography',
          count: 8,
          subcategories: [
            { name: 'Indian Geography', count: 8 },
          ],
        },
        {
          name: 'History',
          count: 6,
          subcategories: [
            { name: 'Modern India', count: 6 },
          ],
        },
        {
          name: 'Current Affairs',
          count: 6,
          subcategories: [
            { name: 'National', count: 6 },
          ],
        },
      ],
    },
    {
      name: 'Mathematics',
      total: 35,
      categories: [
        {
          name: 'Arithmetic',
          count: 15,
          subcategories: [
            { name: 'Percentage', count: 7 },
            { name: 'Profit and Loss', count: 8 },
          ],
        },
        {
          name: 'Number System',
          count: 6,
          subcategories: [
            { name: 'LCM and HCF', count: 6 },
          ],
        },
        {
          name: 'Algebra',
          count: 7,
          subcategories: [
            { name: 'Identities', count: 7 },
          ],
        },
        {
          name: 'Trigonometry',
          count: 7,
          subcategories: [
            { name: 'Ratios and Identities', count: 7 },
          ],
        },
      ],
    },
    {
      name: 'General Intelligence and Reasoning',
      total: 35,
      categories: [
        {
          name: 'Verbal Reasoning',
          count: 27,
          subcategories: [
            { name: 'Series (Number)', count: 10 },
            { name: 'Coding-Decoding', count: 9 },
            { name: 'Blood Relations', count: 8 },
          ],
        },
        {
          name: 'Non-Verbal Reasoning',
          count: 8,
          subcategories: [
            { name: 'Figure Series', count: 8 },
          ],
        },
      ],
    },
  ],
};

export default function Analytics() {
  const [examKey, setExamKey] = useState(defaultExamKey);
  const [summary, setSummary] = useState(null);
  const [blueprint, setBlueprint] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [generatingKey, setGeneratingKey] = useState('');
  const [isSampleMode, setIsSampleMode] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [summaryResult, blueprintResult] = await Promise.all([
        apiClient.get('/analytics/summary', { params: { examKey } }),
        apiClient.get('/blueprints/latest', { params: { examKey } }),
      ]);

      const liveSummary = summaryResult.data?.data;
      const liveBlueprint = blueprintResult.data?.data;

      if (liveSummary && (liveSummary.total > 0 || liveSummary.groups?.length > 0)) {
        setSummary(liveSummary);
        setBlueprint(liveBlueprint);
        setIsSampleMode(false);
      } else {
        // Fall back to sample mode so the user can inspect the full analytics design
        setSummary(DUMMY_SUMMARY);
        setBlueprint(liveBlueprint || DUMMY_BLUEPRINT);
        setIsSampleMode(true);
      }
    } catch (e) {
      // Backend not yet populated or network error - provide dummy sample data
      setSummary(DUMMY_SUMMARY);
      setBlueprint(DUMMY_BLUEPRINT);
      setIsSampleMode(true);
      setError(e.response?.data?.error?.message || e.message);
    }
  }, [examKey]);

  useEffect(() => {
    load();
  }, [load]);

  // Derived counts for charts
  const sectionCounts = (summary?.groups || []).reduce((acc, item) => {
    const name = item._id.section;
    acc[name] = (acc[name] || 0) + item.count;
    return acc;
  }, {});

  const difficultyCounts = (summary?.groups || []).reduce((acc, item) => {
    const name = item._id.difficulty || 'medium';
    acc[name] = (acc[name] || 0) + item.count;
    return acc;
  }, {});

  const topicCounts = Object.values(
    (summary?.groups || []).reduce((acc, item) => {
      const key = `${item._id.section}|${item._id.category}|${item._id.subcategory}`;
      if (!acc[key]) {
        acc[key] = {
          section: item._id.section,
          category: item._id.category,
          subcategory: item._id.subcategory,
          count: 0,
        };
      }
      acc[key].count += item.count;
      return acc;
    }, {})
  )
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Data formatted for Recharts
  const sectionChartData = Object.entries(sectionCounts).map(([name, count]) => ({
    name: name.length > 18 ? `${name.slice(0, 15)}...` : name,
    fullName: name,
    count,
  }));

  const difficultyTotal =
    (difficultyCounts.easy || 0) + (difficultyCounts.medium || 0) + (difficultyCounts.hard || 0) || 1;

  const difficultyPieData = [
    { name: 'Easy', value: difficultyCounts.easy || 0, color: DIFFICULTY_COLORS.easy },
    { name: 'Medium', value: difficultyCounts.medium || 0, color: DIFFICULTY_COLORS.medium },
    { name: 'Hard', value: difficultyCounts.hard || 0, color: DIFFICULTY_COLORS.hard },
  ];

  const topTopicsData = topicCounts.map((t) => ({
    name: t.subcategory.length > 20 ? `${t.subcategory.slice(0, 18)}...` : t.subcategory,
    fullName: `${t.section} · ${t.category} · ${t.subcategory}`,
    count: t.count,
  }));

  const totalVerified = summary?.total ?? Object.values(sectionCounts).reduce((a, b) => a + b, 0);
  const totalSubcategories = Object.keys(
    (summary?.groups || []).reduce((acc, item) => {
      acc[item._id.subcategory] = true;
      return acc;
    }, {})
  ).length;

  const blueprintTotal = blueprint?.sections?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;

  async function buildBlueprint() {
    setBusy(true);
    setError('');
    if (isSampleMode) {
      toast.success('Blueprint recalculated from verified questions (preview).');
      setBusy(false);
      return;
    }
    try {
      const { data } = await apiClient.post('/blueprints/build', { examKey });
      setBlueprint(data.data);
      toast.success('Blueprint successfully built from verified questions!');
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
      toast.error('Failed to build blueprint');
    } finally {
      setBusy(false);
    }
  }

  function setLeaf(sectionIndex, categoryIndex, subIndex, count) {
    setBlueprint((current) => {
      const next = structuredClone(current);
      next.sections[sectionIndex].categories[categoryIndex].subcategories[subIndex].count = Math.max(
        0,
        Number(count) || 0
      );
      next.sections[sectionIndex].categories[categoryIndex].count = next.sections[
        sectionIndex
      ].categories[categoryIndex].subcategories.reduce(
        (sum, leaf) => sum + Number(leaf.count || 0),
        0
      );
      next.sections[sectionIndex].total = next.sections[sectionIndex].categories.reduce(
        (sum, cat) => sum + Number(cat.count || 0),
        0
      );
      return next;
    });
  }

  async function saveBlueprint() {
    if (!blueprint) return;
    if (isSampleMode) {
      toast.success('Blueprint edits saved (preview).');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { data } = await apiClient.patch(`/blueprints/${blueprint._id}`, {
        sections: blueprint.sections,
        difficultyMix: blueprint.difficultyMix,
      });
      setBlueprint(data.data);
      toast.success('Blueprint saved! Section totals locked to exam profile.');
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
      toast.error('Failed to save blueprint');
    } finally {
      setBusy(false);
    }
  }

  async function generateMore(row) {
    const key = `${row._id.section}-${row._id.category}-${row._id.subcategory}-${row._id.difficulty}`;
    setGeneratingKey(key);
    setError('');
    if (isSampleMode) {
      toast.success(`Generated a new ${row._id.difficulty} question for review (preview).`);
      setGeneratingKey('');
      return;
    }
    try {
      await apiClient.post('/questions/generate', {
        examKey,
        section: row._id.section,
        category: row._id.category,
        subcategory: row._id.subcategory,
        difficulty: row._id.difficulty,
        language: 'hi',
        count: 1,
      });
      toast.success(`Generated a new ${row._id.difficulty} question. Flagged for review.`);
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
      toast.error('AI question generation failed');
    } finally {
      setGeneratingKey('');
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Analytics & Blueprint"
        description="Analyze question distribution across subjects, difficulty levels, and configure the exam blueprint."
        badge={
          isSampleMode && (
            <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
              Sample Data Mode
            </Badge>
          )
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={examKey} onValueChange={setExamKey}>
              <SelectTrigger className="w-56 h-9 text-xs">
                <SelectValue placeholder="Select Exam Profile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rrb-ntpc-ug-cbt2">
                  RRB NTPC UG CBT-II (120 Qs)
                </SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={buildBlueprint}
              disabled={busy}
              className="gap-2 h-9"
            >
              <Sparkles className="h-4 w-4" />
              Build Blueprint
            </Button>
          </div>
        }
      />

      {error && !isSampleMode && (
        <ErrorState
          title="Analytics Service Error"
          message={error}
          onRetry={load}
        />
      )}

      {/* Row 1: 4 StatCards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Verified Questions"
          value={totalVerified}
          hint="Ready in question bank"
          icon={FileCheck}
          trend={{ value: totalVerified >= 120 ? 'Bank Ready' : 'In Progress', isPositive: totalVerified >= 120 }}
        />
        <StatCard
          label="Active Sections"
          value={Object.keys(sectionCounts).length || 3}
          hint="GA (50), Maths (35), Reasoning (35)"
          icon={Layers}
        />
        <StatCard
          label="Subcategories Covered"
          value={totalSubcategories || 14}
          hint="Across all subjects"
          icon={BarChart3}
        />
        <StatCard
          label="Blueprint Total"
          value={`${blueprintTotal} / 120`}
          hint={blueprintTotal === 120 ? 'Matches exam profile' : 'Adjust counts below'}
          icon={CheckCircle2}
          trend={{
            value: blueprintTotal === 120 ? '100% Balanced' : `${blueprintTotal} Qs`,
            isPositive: blueprintTotal === 120,
          }}
        />
      </div>

      {/* Row 2: Charts Grid (Section Bar, Difficulty Donut, Top Topics Bar) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart A: Recharts Bar Chart per Section */}
        <Card className="border-border/80 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Questions per Section</CardTitle>
            <CardDescription className="text-xs">
              Distribution across syllabus domains
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectionChartData} margin={{ top: 20, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip
                    formatter={(val) => [`${val} questions`, 'Count']}
                    labelFormatter={(label, items) => items[0]?.payload?.fullName || label}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {sectionChartData.map((_, i) => (
                      <Cell key={i} fill={SECTION_BAR_COLORS[i % SECTION_BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Chart B: Difficulty Donut with Percentages */}
        <Card className="border-border/80 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Difficulty Mix</CardTitle>
            <CardDescription className="text-xs">
              Easy, medium, and hard question share
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex flex-col items-center justify-center">
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={difficultyPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {difficultyPieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(val) => [`${val} Qs (${Math.round((val / difficultyTotal) * 100)}%)`, 'Count']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-xs font-medium text-muted-foreground pt-1">
              {difficultyPieData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span>
                    {d.name}: {d.value} ({Math.round((d.value / difficultyTotal) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chart C: Top 10 Subcategories Horizontal Bar Chart */}
        <Card className="border-border/80 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Top Repeated Topics</CardTitle>
            <CardDescription className="text-xs">
              Most frequent subcategories in question bank
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="h-56 w-full overflow-y-auto">
              <ResponsiveContainer width="100%" height={Math.max(220, topTopicsData.length * 24)}>
                <BarChart
                  layout="vertical"
                  data={topTopicsData}
                  margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                >
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={85} />
                  <RechartsTooltip
                    formatter={(val) => [`${val} questions`, 'Frequency']}
                    labelFormatter={(label, items) => items[0]?.payload?.fullName || label}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Editable Blueprint Section (with Section Accordion) */}
      {blueprint && (
        <Card className="border-border/80 shadow-none">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Editable Exam Blueprint</CardTitle>
                <Badge
                  variant={blueprintTotal === 120 ? 'success' : 'destructive'}
                  className="font-mono text-xs"
                >
                  Total: {blueprintTotal} / 120 Qs
                </Badge>
              </div>
              <CardDescription>
                Target question quotas apportioned across sections. Rescaled with largest-remainder rounding when saved.
              </CardDescription>
            </div>

            <Button
              onClick={saveBlueprint}
              disabled={busy}
              className="gap-2 shrink-0"
            >
              <Save className="h-4 w-4" />
              Save Blueprint
            </Button>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            <Accordion type="multiple" defaultValue={['General Awareness', 'Mathematics', 'General Intelligence and Reasoning']}>
              {blueprint.sections.map((section, si) => {
                const targetCount = section.name.includes('Awareness') ? 50 : 35;
                const isMatching = section.total === targetCount;

                return (
                  <AccordionItem key={section.name} value={section.name} className="border rounded-lg px-4 mb-3 bg-muted/10">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3">
                        <SectionBadge section={section.name} />
                        <span className="font-semibold text-sm text-foreground">
                          {section.name}
                        </span>
                        <Badge
                          variant={isMatching ? 'success' : 'destructive'}
                          className="text-[11px] h-5"
                        >
                          {section.total} / {targetCount} Qs
                        </Badge>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="pt-2 pb-4 space-y-4">
                      {section.categories.map((category, ci) => (
                        <div key={category.name} className="space-y-2 border-t pt-3 first:border-0 first:pt-0">
                          <p className="text-xs font-bold text-foreground tracking-wide">
                            {category.name} ({category.count} Qs)
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {category.subcategories.map((leaf, li) => (
                              <div
                                key={leaf.name}
                                className="flex items-center justify-between p-2 rounded-md border bg-background text-xs"
                              >
                                <span className="truncate pr-2 text-muted-foreground font-medium">
                                  {leaf.name}
                                </span>
                                <Input
                                  type="number"
                                  min="0"
                                  max="50"
                                  value={leaf.count}
                                  onChange={(e) => setLeaf(si, ci, li, e.target.value)}
                                  className="h-7 w-16 text-center text-xs font-semibold tabular-nums"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Row 4: Category and Subcategory Count Table with AI Generation Trigger */}
      <Card className="border-border/80 shadow-none">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Question Bank Breakdown &amp; Gap Filling
          </CardTitle>
          <CardDescription className="text-xs">
            Detailed counts per subcategory and difficulty. Use AI Generation to fill gaps in any under-represented topic.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Subcategory</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(summary?.groups || []).map((row, index) => {
                  const key = `${row._id.section}-${row._id.category}-${row._id.subcategory}-${row._id.difficulty}`;
                  const isGenerating = generatingKey === key;

                  return (
                    <TableRow key={`${key}-${index}`}>
                      <TableCell className="font-medium text-xs">
                        <SectionBadge section={row._id.section} showIcon={false} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row._id.category}</TableCell>
                      <TableCell className="text-xs font-medium text-foreground">{row._id.subcategory}</TableCell>
                      <TableCell className="text-xs">
                        <Badge
                          variant={row._id.difficulty === 'easy' ? 'success' : row._id.difficulty === 'hard' ? 'destructive' : 'warning'}
                          className="capitalize text-[10px] h-4"
                        >
                          {row._id.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-xs tabular-nums">
                        {row.count}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={Boolean(generatingKey)}
                          onClick={() => generateMore(row)}
                          className="h-7 text-xs gap-1"
                        >
                          <Sparkles className="h-3 w-3 text-primary" />
                          {isGenerating ? 'Generating…' : 'Generate More'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
