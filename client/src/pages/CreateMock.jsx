import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import PageHeader from '@/components/common/PageHeader';
import FormField from '@/components/common/FormField';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import ErrorState from '@/components/common/ErrorState';
import {
  GraduationCap,
  Layers,
  Sliders,
  Sparkles,
  Clock,
  HelpCircle,
  RotateCcw,
  AlertTriangle,
  PlayCircle,
  ArrowRight,
  Loader2,
  Check,
  Search,
  BookOpen,
  Calculator,
  BrainCircuit,
  Minus,
  Plus,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function CreateMock() {
  const [mode, setMode] = useState('full');
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedLeaves, setSelectedLeaves] = useState({});
  const [mix, setMix] = useState({ easy: 0.3, medium: 0.5, hard: 0.2 });
  const [avoidSeen, setAvoidSeen] = useState(true);
  const [useAI, setUseAI] = useState(true);
  const [warnings, setWarnings] = useState([]);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingBlueprint, setLoadingBlueprint] = useState(true);

  // Custom Practice UI state
  const [customSectionFilter, setCustomSectionFilter] = useState('all');
  const [customSearchQuery, setCustomSearchQuery] = useState('');

  const navigate = useNavigate();

  const loadBlueprint = () => {
    setLoadingBlueprint(true);
    setError('');
    apiClient
      .get('/blueprints/latest', { params: { examKey: 'rrb-ntpc-ug-cbt2' } })
      .then(({ data }) => {
        const list = data.data?.sections || [];
        setSections(list);
        if (list.length > 0) {
          setSelectedSection((prev) => prev || list[0]?.name || '');
        }
      })
      .catch((e) => {
        setError(e.response?.data?.error?.message || e.message || 'Could not load blueprint from server.');
      })
      .finally(() => {
        setLoadingBlueprint(false);
      });
  };

  const loadHistory = () => {
    apiClient
      .get('/attempts')
      .then(({ data }) => setHistory(data.data || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadBlueprint();
    loadHistory();
  }, []);

  // When switching to sectional mode, guarantee a section is selected
  useEffect(() => {
    if (mode === 'sectional' && !selectedSection && sections.length > 0) {
      setSelectedSection(sections[0].name);
    }
  }, [mode, sections, selectedSection]);

  // Compute question counts and duration for the summary card
  const summary = useMemo(() => {
    if (mode === 'full') {
      return {
        questionCount: 120,
        durationMinutes: 90,
        sectionsSummary: [
          { name: 'General Awareness', count: 50 },
          { name: 'Mathematics', count: 35 },
          { name: 'General Intelligence and Reasoning', count: 35 },
        ],
      };
    }

    if (mode === 'sectional') {
      const sec = sections.find((s) => s.name === selectedSection);
      const count = sec?.total || (selectedSection.includes('Awareness') ? 50 : 35);
      const duration = count === 50 ? 38 : 26;
      return {
        questionCount: count,
        durationMinutes: duration,
        sectionsSummary: [{ name: selectedSection || 'Selected Section', count }],
      };
    }

    // Custom mode: aggregate counts per section and total
    const sectionCounts = {};
    let totalCustomQuestions = 0;
    for (const [key, val] of Object.entries(selectedLeaves)) {
      const count = Number(val) || 0;
      if (count > 0) {
        const [secName] = key.split('|');
        sectionCounts[secName] = (sectionCounts[secName] || 0) + count;
        totalCustomQuestions += count;
      }
    }

    const duration = totalCustomQuestions > 0 ? Math.max(5, Math.ceil((totalCustomQuestions * 45) / 60)) : 0;
    const sectionsSummary = Object.entries(sectionCounts).map(([name, count]) => ({
      name,
      count,
    }));

    return {
      questionCount: totalCustomQuestions,
      durationMinutes: duration,
      sectionsSummary: sectionsSummary.length > 0 ? sectionsSummary : [{ name: 'Custom Topics', count: 0 }],
    };
  }, [mode, selectedSection, sections, selectedLeaves]);

  // Helper for difficulty slider adjustments ensuring 100% sum
  const handleSliderChange = (changedKey, newPercentage) => {
    const p = Math.max(0, Math.min(100, Math.round(newPercentage)));
    const keys = ['easy', 'medium', 'hard'];
    const otherKeys = keys.filter((k) => k !== changedKey);

    const currentOtherTotal = (mix[otherKeys[0]] + mix[otherKeys[1]]) * 100;
    const remaining = 100 - p;

    let newOther1, newOther2;
    if (currentOtherTotal === 0) {
      newOther1 = Math.round(remaining / 2);
      newOther2 = remaining - newOther1;
    } else {
      const ratio = (mix[otherKeys[0]] * 100) / currentOtherTotal;
      newOther1 = Math.round(remaining * ratio);
      newOther2 = remaining - newOther1;
    }

    setMix({
      [changedKey]: Number((p / 100).toFixed(2)),
      [otherKeys[0]]: Number((newOther1 / 100).toFixed(2)),
      [otherKeys[1]]: Number((newOther2 / 100).toFixed(2)),
    });
  };

  const resetDifficulty = () => {
    setMix({ easy: 0.3, medium: 0.5, hard: 0.2 });
  };

  // Flattened topic list for custom practice
  const allCustomTopics = useMemo(() => {
    const items = [];
    for (const section of sections) {
      for (const category of section.categories || []) {
        for (const leaf of category.subcategories || []) {
          items.push({
            key: `${section.name}|${category.name}|${leaf.name}`,
            sectionName: section.name,
            categoryName: category.name,
            leafName: leaf.name,
            recommendedCount: leaf.count || 5,
          });
        }
      }
    }
    return items;
  }, [sections]);

  // Filtered topics according to active section tab and search query
  const filteredCustomTopics = useMemo(() => {
    return allCustomTopics.filter((t) => {
      const matchSection = customSectionFilter === 'all' || t.sectionName === customSectionFilter;
      const q = customSearchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        t.leafName.toLowerCase().includes(q) ||
        t.categoryName.toLowerCase().includes(q) ||
        t.sectionName.toLowerCase().includes(q);
      return matchSection && matchSearch;
    });
  }, [allCustomTopics, customSectionFilter, customSearchQuery]);

  const selectedTopicsCount = Object.keys(selectedLeaves).filter(
    (k) => Number(selectedLeaves[k]) > 0
  ).length;

  // Batch toggle filtered topics in Custom Practice
  const handleSelectAllFiltered = (countPerTopic = 5) => {
    setSelectedLeaves((prev) => {
      const next = { ...prev };
      for (const topic of filteredCustomTopics) {
        next[topic.key] = countPerTopic;
      }
      return next;
    });
  };

  const handleClearAllCustom = () => {
    setSelectedLeaves({});
  };

  async function generate(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setWarnings([]);

    try {
      const body = {
        examKey: 'rrb-ntpc-ug-cbt2',
        mode,
        difficultyMix: mix,
        avoidSeen,
        useAI,
      };

      if (mode === 'sectional') {
        if (!selectedSection) {
          throw new Error('Please choose a section to generate the sectional mock test.');
        }
        body.sections = [selectedSection];
      }

      if (mode === 'custom') {
        body.sections = sections
          .map((section) => ({
            name: section.name,
            subcategories: (section.categories || []).flatMap((category) =>
              (category.subcategories || [])
                .filter(
                  (leaf) => Number(selectedLeaves[`${section.name}|${category.name}|${leaf.name}`]) > 0
                )
                .map((leaf) => ({
                  category: category.name,
                  subcategory: leaf.name,
                  count: Number(
                    selectedLeaves[`${section.name}|${category.name}|${leaf.name}`]
                  ),
                }))
            ),
          }))
          .filter((section) => section.subcategories.length > 0);

        if (!body.sections.length) {
          throw new Error('Please select at least one topic for custom practice.');
        }
      }

      const { data } = await apiClient.post('/mocktests/generate', body);
      setWarnings(data.data.warnings || []);
      toast.success('Mock test generated successfully!');
      navigate(`/instructions/${data.data.mockTest._id}`, {
        state: { mockTest: data.data.mockTest, warnings: data.data.warnings },
      });
    } catch (e) {
      const msg = e.response?.data?.error?.message || e.message || 'Failed to generate mock test';
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  const easyPercent = Math.round(mix.easy * 100);
  const medPercent = Math.round(mix.medium * 100);
  const hardPercent = Math.max(0, 100 - easyPercent - medPercent);

  // Section icon helper
  const getSectionIcon = (name = '') => {
    if (name.includes('Awareness')) return <BookOpen className="h-4 w-4" />;
    if (name.includes('Math')) return <Calculator className="h-4 w-4" />;
    return <BrainCircuit className="h-4 w-4" />;
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Create Mock Test"
        description="Generate a practice exam from your verified question bank and official syllabus blueprint."
      />

      {error && (
        <ErrorState
          title="Generation Error"
          message={error}
          onRetry={() => {
            setError('');
            loadBlueprint();
          }}
        />
      )}

      {/* Main 2-Column Grid: Config (2 Cols) + Summary (1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Test Configuration (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <form id="mock-form" onSubmit={generate} className="space-y-6">
            {/* 1. Exam Mode Selection Cards */}
            <Card className="border-border/80 shadow-none">
              <CardHeader className="space-y-1">
                <CardTitle className="text-lg">1. Choose Exam Mode</CardTitle>
                <CardDescription>
                  Select full paper simulation, sectional focus, or customize individual topics.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <RadioGroup
                  value={mode}
                  onValueChange={setMode}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                >
                  {/* Option 1: Full Exam */}
                  <div
                    onClick={() => setMode('full')}
                    className={cn(
                      'relative flex flex-col justify-between rounded-xl border p-4 cursor-pointer transition-all',
                      mode === 'full'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border/80 hover:border-primary/40 hover:bg-muted/30'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <RadioGroupItem value="full" id="mode-full" />
                    </div>
                    <div className="mt-4">
                      <p className="font-semibold text-foreground text-sm">Full Exam</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        120 Qs · 90 min CBT-II standard
                      </p>
                    </div>
                  </div>

                  {/* Option 2: Sectional */}
                  <div
                    onClick={() => setMode('sectional')}
                    className={cn(
                      'relative flex flex-col justify-between rounded-xl border p-4 cursor-pointer transition-all',
                      mode === 'sectional'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border/80 hover:border-primary/40 hover:bg-muted/30'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Layers className="h-5 w-5" />
                      </div>
                      <RadioGroupItem value="sectional" id="mode-sectional" />
                    </div>
                    <div className="mt-4">
                      <p className="font-semibold text-foreground text-sm">Sectional</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Focus on a single subject
                      </p>
                    </div>
                  </div>

                  {/* Option 3: Custom Practice */}
                  <div
                    onClick={() => setMode('custom')}
                    className={cn(
                      'relative flex flex-col justify-between rounded-xl border p-4 cursor-pointer transition-all',
                      mode === 'custom'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border/80 hover:border-primary/40 hover:bg-muted/30'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Sliders className="h-5 w-5" />
                      </div>
                      <RadioGroupItem value="custom" id="mode-custom" />
                    </div>
                    <div className="mt-4">
                      <p className="font-semibold text-foreground text-sm">Custom Practice</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Pick specific syllabus topics
                      </p>
                    </div>
                  </div>
                </RadioGroup>

                {/* Section selection cards for Sectional Mode */}
                {mode === 'sectional' && (
                  <div className="pt-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Select Exam Section
                      </span>
                      {loadingBlueprint && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" /> Loading sections…
                        </span>
                      )}
                    </div>

                    {sections.length === 0 && !loadingBlueprint ? (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                        <span>Could not fetch sections from API.</span>
                        <Button size="sm" variant="outline" onClick={loadBlueprint} className="h-7 text-xs">
                          Retry
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {sections.map((s) => {
                          const isSelected = selectedSection === s.name;
                          const count = s.total || (s.name.includes('Awareness') ? 50 : 35);
                          const duration = count === 50 ? 38 : 26;

                          return (
                            <div
                              key={s.name}
                              onClick={() => setSelectedSection(s.name)}
                              className={cn(
                                'flex flex-col justify-between p-3.5 rounded-xl border cursor-pointer transition-all',
                                isSelected
                                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                  : 'border-border/80 hover:border-primary/40 hover:bg-muted/20'
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={cn(
                                      'flex h-7 w-7 items-center justify-center rounded-lg',
                                      isSelected
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-muted-foreground'
                                    )}
                                  >
                                    {getSectionIcon(s.name)}
                                  </div>
                                  <p className="font-semibold text-xs text-foreground line-clamp-1">{s.name}</p>
                                </div>
                                {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                              </div>

                              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                                <Badge variant="secondary" className="text-[10px] h-4 px-1 font-semibold">
                                  {count} Qs
                                </Badge>
                                <span>~{duration} mins</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Custom practice topic selection */}
                {mode === 'custom' && (
                  <div className="pt-2 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Select Syllabus Topics
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {selectedTopicsCount} topic{selectedTopicsCount === 1 ? '' : 's'} selected ({summary.questionCount} questions total)
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleSelectAllFiltered(5)}
                          className="h-7 text-xs"
                          disabled={filteredCustomTopics.length === 0}
                        >
                          Select Filtered (5 Qs each)
                        </Button>
                        {selectedTopicsCount > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleClearAllCustom}
                            className="h-7 text-xs text-muted-foreground hover:text-destructive"
                          >
                            Clear Selection
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Section filter pills + search input */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant={customSectionFilter === 'all' ? 'default' : 'outline'}
                          onClick={() => setCustomSectionFilter('all')}
                          className="h-7 text-xs px-2.5"
                        >
                          All Sections ({allCustomTopics.length})
                        </Button>
                        {sections.map((sec) => (
                          <Button
                            key={sec.name}
                            type="button"
                            size="sm"
                            variant={customSectionFilter === sec.name ? 'default' : 'outline'}
                            onClick={() => setCustomSectionFilter(sec.name)}
                            className="h-7 text-xs px-2.5 gap-1.5"
                          >
                            {getSectionIcon(sec.name)}
                            <span className="truncate max-w-[130px]">{sec.name}</span>
                          </Button>
                        ))}
                      </div>

                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search topics (e.g. History, Simplification, Coding-Decoding)..."
                          value={customSearchQuery}
                          onChange={(e) => setCustomSearchQuery(e.target.value)}
                          className="h-8 pl-8 text-xs"
                        />
                      </div>
                    </div>

                    {/* Topics List Box */}
                    {loadingBlueprint ? (
                      <div className="rounded-xl border p-8 text-center space-y-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                        <p className="text-xs text-muted-foreground">Loading syllabus topics from API…</p>
                      </div>
                    ) : filteredCustomTopics.length === 0 ? (
                      <div className="rounded-lg border p-6 text-center text-xs text-muted-foreground">
                        No topics match your search. Try adjusting the search text or section filter.
                      </div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto space-y-1.5 rounded-lg border p-2.5 bg-muted/20">
                        {filteredCustomTopics.map((topic) => {
                          const currentVal = selectedLeaves[topic.key];
                          const isChecked = Boolean(Number(currentVal) > 0);
                          const count = Number(currentVal) || 5;

                          return (
                            <div
                              key={topic.key}
                              className={cn(
                                'flex items-center justify-between p-2 rounded-lg border text-xs transition-colors gap-2',
                                isChecked
                                  ? 'bg-background border-primary/40 shadow-xs'
                                  : 'bg-card/50 border-border/60 hover:bg-background'
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Checkbox
                                  id={topic.key}
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    setSelectedLeaves((prev) => {
                                      const next = { ...prev };
                                      if (checked) next[topic.key] = count;
                                      else delete next[topic.key];
                                      return next;
                                    });
                                  }}
                                />
                                <label
                                  htmlFor={topic.key}
                                  className="cursor-pointer select-none font-medium text-foreground truncate"
                                >
                                  <span className="text-muted-foreground text-[11px] font-normal">
                                    {topic.categoryName} ·{' '}
                                  </span>
                                  {topic.leafName}
                                </label>
                              </div>

                              {isChecked && (
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                      const nextVal = Math.max(1, count - 1);
                                      setSelectedLeaves((prev) => ({
                                        ...prev,
                                        [topic.key]: nextVal,
                                      }));
                                    }}
                                    className="h-6 w-6"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <Input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={count}
                                    onChange={(e) => {
                                      const val = Math.max(1, Math.min(50, Number(e.target.value) || 1));
                                      setSelectedLeaves((prev) => ({
                                        ...prev,
                                        [topic.key]: val,
                                      }));
                                    }}
                                    className="h-6 w-12 text-center text-xs p-0 font-semibold"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                      const nextVal = Math.min(50, count + 1);
                                      setSelectedLeaves((prev) => ({
                                        ...prev,
                                        [topic.key]: nextVal,
                                      }));
                                    }}
                                    className="h-6 w-6"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                  <span className="text-[10px] text-muted-foreground ml-0.5">Qs</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. Difficulty Mix Card */}
            <Card className="border-border/80 shadow-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="space-y-1">
                  <CardTitle className="text-lg">2. Difficulty Mix</CardTitle>
                  <CardDescription>
                    Adjust proportions of easy, medium, and hard questions (sums to 100%).
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetDifficulty}
                  className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset to default
                </Button>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Thin Stacked Bar Preview */}
                <div className="space-y-1.5">
                  <div className="h-2 w-full rounded-full overflow-hidden flex bg-muted">
                    <div
                      style={{ width: `${easyPercent}%` }}
                      className="bg-emerald-500 transition-all duration-300"
                    />
                    <div
                      style={{ width: `${medPercent}%` }}
                      className="bg-amber-500 transition-all duration-300"
                    />
                    <div
                      style={{ width: `${hardPercent}%` }}
                      className="bg-rose-500 transition-all duration-300"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground font-medium pt-1">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Easy: {easyPercent}%
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Medium: {medPercent}%
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      Hard: {hardPercent}%
                    </span>
                  </div>
                </div>

                {/* Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-foreground">Easy</span>
                      <span className="text-muted-foreground tabular-nums">{easyPercent}%</span>
                    </div>
                    <Slider
                      value={[easyPercent]}
                      max={100}
                      step={5}
                      onValueChange={([val]) => handleSliderChange('easy', val)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-foreground">Medium</span>
                      <span className="text-muted-foreground tabular-nums">{medPercent}%</span>
                    </div>
                    <Slider
                      value={[medPercent]}
                      max={100}
                      step={5}
                      onValueChange={([val]) => handleSliderChange('medium', val)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-foreground">Hard</span>
                      <span className="text-muted-foreground tabular-nums">{hardPercent}%</span>
                    </div>
                    <Slider
                      value={[hardPercent]}
                      max={100}
                      step={5}
                      onValueChange={([val]) => handleSliderChange('hard', val)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. Question Avoidance & AI Fallback Switches */}
            <Card className="border-border/80 shadow-none">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-foreground">
                      Avoid questions from previous attempts
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Excludes questions you have already answered in previous mock tests so you practice fresh items.
                    </p>
                  </div>
                  <Switch
                    checked={avoidSeen}
                    onCheckedChange={setAvoidSeen}
                    id="avoid-seen"
                    aria-label="Avoid questions from previous attempts"
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-foreground">
                        AI Question Fill (Auto-fallback)
                      </p>
                      <Badge variant="outline" className="text-[10px] h-4 text-primary border-primary/30">
                        Smart Fill
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Automatically generates syllabus-aligned questions if your local question bank is short on items for a topic.
                    </p>
                  </div>
                  <Switch
                    checked={useAI}
                    onCheckedChange={setUseAI}
                    id="use-ai"
                    aria-label="Use AI question generation"
                  />
                </div>
              </CardContent>
            </Card>
          </form>
        </div>

        {/* Right Column: Sticky Summary Card (1/3) */}
        <div className="lg:sticky lg:top-20 space-y-4">
          <Card className="border-border/80 shadow-none bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Exam Summary
              </CardTitle>
              <CardDescription>
                Blueprint snapshot for this mock test
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between items-center py-1 border-b border-border/60">
                <span className="text-muted-foreground text-xs font-medium">Exam Profile</span>
                <span className="font-semibold text-foreground text-xs">RRB NTPC CBT-II</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-border/60">
                <span className="text-muted-foreground text-xs font-medium">Exam Mode</span>
                <Badge variant="outline" className="text-xs font-semibold capitalize">
                  {mode}
                </Badge>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-border/60">
                <span className="text-muted-foreground text-xs font-medium">Total Questions</span>
                <span className="font-bold text-foreground tabular-nums">
                  {summary.questionCount} Qs
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-border/60">
                <span className="text-muted-foreground text-xs font-medium">Duration</span>
                <span className="font-bold text-foreground tabular-nums">
                  {summary.durationMinutes} minutes
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-border/60">
                <span className="text-muted-foreground text-xs font-medium">Marking Scheme</span>
                <span className="text-xs font-medium text-foreground">
                  +1.0 / −0.33
                </span>
              </div>

              {/* Section Breakdown */}
              <div className="space-y-1.5 pt-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Sections & Counts
                </span>
                <div className="space-y-1">
                  {summary.sectionsSummary.map((sec, i) => (
                    <div key={i} className="flex justify-between text-xs py-0.5">
                      <span className="text-foreground truncate max-w-[180px]">{sec.name}</span>
                      <span className="text-muted-foreground tabular-nums font-semibold">{sec.count} Qs</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generator Warnings if any */}
              {warnings.length > 0 && (
                <Alert variant="warning" className="p-3 my-2 text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  <div className="space-y-1">
                    <AlertTitle className="text-xs font-semibold">Bank Shortage Warnings</AlertTitle>
                    <AlertDescription className="text-xs">
                      <ul className="list-disc pl-4 space-y-0.5">
                        {warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </div>
                </Alert>
              )}
            </CardContent>

            <CardFooter className="pt-2">
              <Button
                type="submit"
                form="mock-form"
                size="lg"
                disabled={
                  busy ||
                  (mode === 'sectional' && !selectedSection) ||
                  (mode === 'custom' && summary.questionCount === 0)
                }
                className="w-full gap-2"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating Test…
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4" />
                    Generate Mock Test
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Recent Attempts History Card */}
      <Card className="border-border/80 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">Recent Attempts</CardTitle>
            <CardDescription>
              Your past practice sessions and ongoing mock tests
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/history" className="text-xs gap-1">
              View all history <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>

        <CardContent>
          {history.length === 0 ? (
            <EmptyState
              icon={PlayCircle}
              title="No previous attempts"
              description="Generated mock tests will show up here so you can resume or review performance."
            />
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test Title</TableHead>
                      <TableHead>Started At</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.slice(0, 5).map((attempt) => (
                      <TableRow key={attempt._id}>
                        <TableCell className="font-medium text-foreground">
                          {attempt.title || `Mock Test #${attempt._id.slice(-6)}`}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {attempt.startedAt
                            ? new Date(attempt.startedAt).toLocaleString()
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={attempt.status} />
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {attempt.score !== undefined ? Number(attempt.score).toFixed(2) : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {attempt.status === 'in_progress' ? (
                            <Button size="sm" variant="default" asChild>
                              <Link to={`/exam/${attempt._id}`}>Resume</Link>
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" asChild>
                              <Link to={`/result/${attempt._id}`}>View result</Link>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Stacked Cards View */}
              <div className="md:hidden space-y-3">
                {history.slice(0, 5).map((attempt) => (
                  <div
                    key={attempt._id}
                    className="rounded-lg border p-3.5 space-y-2 bg-muted/20"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm text-foreground">
                        {attempt.title || `Mock Test #${attempt._id.slice(-6)}`}
                      </p>
                      <StatusBadge status={attempt.status} />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{attempt.startedAt ? new Date(attempt.startedAt).toLocaleDateString() : '—'}</span>
                      <span className="font-bold text-foreground">Score: {attempt.score ?? '—'}</span>
                    </div>
                    <div className="pt-1">
                      {attempt.status === 'in_progress' ? (
                        <Button size="sm" className="w-full" asChild>
                          <Link to={`/exam/${attempt._id}`}>Resume</Link>
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="w-full" asChild>
                          <Link to={`/result/${attempt._id}`}>View result</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
