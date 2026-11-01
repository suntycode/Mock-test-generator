import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/api/client';
import MathText from '@/components/MathText';
import PageHeader from '@/components/common/PageHeader';
import SectionBadge from '@/components/common/SectionBadge';
import StatusBadge from '@/components/common/StatusBadge';
import FormField from '@/components/common/FormField';
import EmptyState from '@/components/common/EmptyState';
import ErrorState from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sparkles,
  Bot,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Loader2,
  Trash2,
  Check,
  RotateCcw,
  BookOpen,
  ArrowRight,
  ExternalLink,
  Layers,
  CheckCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const FALLBACK_TAXONOMY = {
  'General Awareness': {
    'General Science': ['Physics', 'Chemistry', 'Biology'],
    'Polity and Constitution': ['Constitutional Provisions', 'Amendments', 'Parliament and Governance', 'Judiciary'],
    'History': ['Ancient India', 'Medieval India', 'Modern India', 'World History'],
    'Geography': ['Indian Geography', 'World Geography', 'Agriculture'],
    'Current Affairs': ['National', 'International', 'Science and Tech'],
    'Static GK': ['Art and Culture', 'Books and Authors', 'Miscellaneous']
  },
  'Mathematics': {
    'Arithmetic': ['Percentage', 'Profit and Loss', 'Simple Interest', 'Compound Interest', 'Ratio and Proportion', 'Time and Work', 'Time Speed Distance'],
    'Number System': ['LCM and HCF', 'Simplification', 'Divisibility', 'BODMAS'],
    'Algebra': ['Linear Equations', 'Identities', 'Surds and Indices'],
    'Geometry': ['Lines and Angles', 'Triangles', 'Circles'],
    'Mensuration': ['2D', '3D'],
    'Trigonometry': ['Ratios and Identities']
  },
  'General Intelligence and Reasoning': {
    'Verbal Reasoning': ['Analogy', 'Classification (Odd One Out)', 'Series (Number)', 'Coding-Decoding', 'Blood Relations', 'Direction and Distance', 'Syllogism'],
    'Non-Verbal Reasoning': ['Figure Series', 'Mirror and Water Image', 'Paper Folding']
  }
};

const DIFFICULTY_VARIANTS = {
  easy: { label: 'Easy', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  medium: { label: 'Medium', color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' },
  hard: { label: 'Hard', color: 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20' }
};

export default function CreateQuestion() {
  const [taxonomy, setTaxonomy] = useState(FALLBACK_TAXONOMY);
  const [loadingTaxonomy, setLoadingTaxonomy] = useState(true);

  // Form Filter State
  const [examKey] = useState('rrb-ntpc-ug-cbt2');
  const [selectedSection, setSelectedSection] = useState('General Awareness');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [language, setLanguage] = useState('hi');
  const [count, setCount] = useState(3);
  const [autoApprove, setAutoApprove] = useState(false);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [recentAiQuestions, setRecentAiQuestions] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [error, setError] = useState('');

  // Fetch Taxonomy from backend
  useEffect(() => {
    async function loadTaxonomyData() {
      try {
        setLoadingTaxonomy(true);
        const { data } = await apiClient.get('/questions/taxonomy');
        if (data?.ok && data.data) {
          setTaxonomy(data.data);
          const firstSection = Object.keys(data.data)[0];
          if (firstSection) {
            setSelectedSection(firstSection);
            const firstCategory = Object.keys(data.data[firstSection] || {})[0] || '';
            setSelectedCategory(firstCategory);
            const firstSub = (data.data[firstSection]?.[firstCategory] || [])[0] || '';
            setSelectedSubcategory(firstSub);
          }
        }
      } catch {
        // Fallback already set
        const firstSection = Object.keys(FALLBACK_TAXONOMY)[0];
        setSelectedSection(firstSection);
        const firstCat = Object.keys(FALLBACK_TAXONOMY[firstSection] || {})[0] || '';
        setSelectedCategory(firstCat);
        setSelectedSubcategory((FALLBACK_TAXONOMY[firstSection]?.[firstCat] || [])[0] || '');
      } finally {
        setLoadingTaxonomy(false);
      }
    }
    loadTaxonomyData();
    fetchRecentAiQuestions();
  }, []);

  // Fetch recently generated AI questions
  const fetchRecentAiQuestions = async () => {
    try {
      setLoadingRecent(true);
      const { data } = await apiClient.get('/questions', {
        params: { origin: 'ai_generated', limit: 10 }
      });
      if (data?.ok && data.data?.items) {
        setRecentAiQuestions(data.data.items);
      }
    } catch {
      // silently ignore
    } finally {
      setLoadingRecent(false);
    }
  };

  // Section options
  const sectionsList = useMemo(() => Object.keys(taxonomy), [taxonomy]);

  // Categories under selected section
  const categoriesList = useMemo(() => {
    if (!selectedSection || !taxonomy[selectedSection]) return [];
    return Object.keys(taxonomy[selectedSection]);
  }, [taxonomy, selectedSection]);

  // Subcategories under selected category
  const subcategoriesList = useMemo(() => {
    if (!selectedSection || !selectedCategory || !taxonomy[selectedSection]?.[selectedCategory]) return [];
    return taxonomy[selectedSection][selectedCategory];
  }, [taxonomy, selectedSection, selectedCategory]);

  // Handle section change
  const handleSectionChange = (newSec) => {
    setSelectedSection(newSec);
    const availableCats = Object.keys(taxonomy[newSec] || {});
    const firstCat = availableCats[0] || '';
    setSelectedCategory(firstCat);
    const availableSubs = taxonomy[newSec]?.[firstCat] || [];
    setSelectedSubcategory(availableSubs[0] || '');
  };

  // Handle category change
  const handleCategoryChange = (newCat) => {
    setSelectedCategory(newCat);
    const availableSubs = taxonomy[selectedSection]?.[newCat] || [];
    setSelectedSubcategory(availableSubs[0] || '');
  };

  // Handle AI generation request
  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedSection) {
      toast.error('Please select a section.');
      return;
    }
    if (!selectedCategory) {
      toast.error('Please select a category.');
      return;
    }
    if (!selectedSubcategory) {
      toast.error('Please select a subcategory.');
      return;
    }

    const payload = {
      examKey,
      section: selectedSection,
      category: selectedCategory,
      subcategory: selectedSubcategory,
      difficulty,
      language,
      count: Number(count) || 1,
      autoApprove
    };

    setGenerating(true);
    const toastId = toast.loading(`Generating ${payload.count} question(s) with AI & verifying answers...`);

    try {
      const response = await apiClient.post('/questions/generate', payload);
      if (response.data?.ok) {
        const created = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
        setGeneratedQuestions((prev) => [...created, ...prev]);
        toast.success(`Successfully generated ${created.length} question(s)!`, { id: toastId });
        fetchRecentAiQuestions();
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'AI Question Generation failed.';
      setError(msg);
      toast.error(msg, { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  // Approve a single question
  const handleApprove = async (questionId) => {
    try {
      const { data } = await apiClient.patch(`/questions/${questionId}`, {
        verified: true,
        needsReview: false,
        reviewReasons: []
      });
      if (data?.ok) {
        toast.success('Question verified and approved into Question Bank!');
        setGeneratedQuestions((prev) =>
          prev.map((q) => (q._id === questionId ? { ...q, verified: true, needsReview: false } : q))
        );
        fetchRecentAiQuestions();
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to approve question.');
    }
  };

  // Delete a single question
  const handleDelete = async (questionId) => {
    try {
      const { data } = await apiClient.delete(`/questions/${questionId}`);
      if (data?.ok) {
        toast.success('Question deleted.');
        setGeneratedQuestions((prev) => prev.filter((q) => q._id !== questionId));
        setRecentAiQuestions((prev) => prev.filter((q) => q._id !== questionId));
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete question.');
    }
  };

  // Approve all currently displayed questions
  const handleApproveAll = async () => {
    const unverified = generatedQuestions.filter((q) => !q.verified);
    if (!unverified.length) {
      toast.info('All questions are already verified.');
      return;
    }
    let successCount = 0;
    for (const q of unverified) {
      try {
        await apiClient.patch(`/questions/${q._id}`, {
          verified: true,
          needsReview: false,
          reviewReasons: []
        });
        successCount += 1;
      } catch {}
    }
    toast.success(`Approved ${successCount} question(s)!`);
    setGeneratedQuestions((prev) =>
      prev.map((q) => ({ ...q, verified: true, needsReview: false }))
    );
    fetchRecentAiQuestions();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Questions with AI"
        description="Generate curriculum-accurate questions with independent, double-verified answer solving."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/review">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Review Bank
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/create-mock">
                <Sparkles className="h-4 w-4 text-primary" />
                Create Mock
              </Link>
            </Button>
          </div>
        }
      />

      {error && (
        <ErrorState
          title="Generation Error"
          message={error}
          onRetry={() => setError('')}
        />
      )}

      {/* Main Grid: Left Controls Form, Right Generated Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-lg">Target Criteria</CardTitle>
                  <CardDescription>Select topic and difficulty filters</CardDescription>
                </div>
              </div>
            </CardHeader>

            <form onSubmit={handleGenerate}>
              <CardContent className="space-y-4">
                {/* Section Filter */}
                <FormField label="Section" required hint="Primary exam section">
                  <Select
                    value={selectedSection}
                    onValueChange={handleSectionChange}
                    disabled={generating || loadingTaxonomy}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Section" />
                    </SelectTrigger>
                    <SelectContent>
                      {sectionsList.map((sec) => (
                        <SelectItem key={sec} value={sec}>
                          {sec}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                {/* Category Filter */}
                <FormField label="Subject / Category" required hint="Broad topic category">
                  <Select
                    value={selectedCategory}
                    onValueChange={handleCategoryChange}
                    disabled={generating || !categoriesList.length}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriesList.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                {/* Subcategory Filter */}
                <FormField label="Topic / Subcategory" required hint="Specific syllabus subcategory">
                  <Select
                    value={selectedSubcategory}
                    onValueChange={setSelectedSubcategory}
                    disabled={generating || !subcategoriesList.length}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategoriesList.map((sub) => (
                        <SelectItem key={sub} value={sub}>
                          {sub}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <div className="grid grid-cols-2 gap-3">
                  {/* Difficulty */}
                  <FormField label="Difficulty" required>
                    <Select
                      value={difficulty}
                      onValueChange={setDifficulty}
                      disabled={generating}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>

                  {/* Language */}
                  <FormField label="Language" required>
                    <Select
                      value={language}
                      onValueChange={setLanguage}
                      disabled={generating}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hi">Hindi (हिंदी)</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="bilingual">Bilingual</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>

                {/* Number of Questions */}
                <FormField
                  label="Number of Questions"
                  required
                  hint="How many questions to generate (1 - 20)"
                >
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={count}
                      onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                      disabled={generating}
                      className="w-24 text-center font-bold"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {[1, 3, 5, 10].map((num) => (
                        <Button
                          key={num}
                          type="button"
                          variant={count === num ? 'default' : 'outline'}
                          size="sm"
                          className="h-8 px-2.5 text-xs"
                          onClick={() => setCount(num)}
                          disabled={generating}
                        >
                          {num}
                        </Button>
                      ))}
                    </div>
                  </div>
                </FormField>

                {/* Auto Approve Toggle */}
                <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3 mt-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="autoApproveToggle" className="text-xs font-semibold cursor-pointer">
                      Auto-Verify Questions
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      If enabled, approved immediately into question bank without review.
                    </p>
                  </div>
                  <Switch
                    id="autoApproveToggle"
                    checked={autoApprove}
                    onCheckedChange={setAutoApprove}
                    disabled={generating}
                  />
                </div>
              </CardContent>

              <CardFooter className="pt-2">
                <Button
                  type="submit"
                  size="lg"
                  disabled={generating || !selectedSubcategory}
                  className="w-full gap-2 shadow-sm font-semibold"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating & Double-Solving…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate {count} Question{count > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Validation & Double-Check Architecture Card */}
          <Card className="border-border/80 shadow-none bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CheckCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Dual-LLM Blind Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground leading-relaxed">
              <p>
                Every generated question goes through <strong>two independent AI calls</strong>:
              </p>
              <div className="space-y-1.5 pl-2 border-l-2 border-primary/40">
                <p>
                  <strong>Call 1:</strong> An author LLM crafts the question, 4 plausible options, and suggests an answer.
                </p>
                <p>
                  <strong>Call 2:</strong> A separate blind solver receives only the question and options without the answer, independently solving it from first principles.
                </p>
              </div>
              <p className="text-[11px] italic">
                If both solutions agree, the question is saved. If they disagree, the question is discarded to protect test accuracy.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Generated Questions Output (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Header Action Bar when results exist */}
          {generatedQuestions.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-semibold text-xs gap-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  {generatedQuestions.length} Generated This Session
                </Badge>
                <Badge
                  variant="secondary"
                  className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
                >
                  {generatedQuestions.filter((q) => q.verified).length} Verified
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                {generatedQuestions.some((q) => !q.verified) && (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={handleApproveAll}
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Approve All
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setGeneratedQuestions([])}
                >
                  Clear Feed
                </Button>
              </div>
            </div>
          )}

          {/* Loading Indicator Card */}
          {generating && (
            <Card className="border-primary/30 bg-primary/5 animate-pulse">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="space-y-1">
                  <h4 className="font-semibold text-foreground text-sm">
                    Synthesizing & Independently Verifying Questions…
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-md">
                    Targeting <strong>{selectedSection}</strong> › <strong>{selectedSubcategory}</strong> ({difficulty.toUpperCase()}).
                    Running dual-solver verification to guarantee correctness.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State when no questions generated yet */}
          {!generating && generatedQuestions.length === 0 && (
            <Card className="border-border/80 shadow-none">
              <CardContent className="p-8">
                <EmptyState
                  icon={Bot}
                  title="No Questions Created in This Session"
                  description="Use the filters on the left to configure your target syllabus area, language, and difficulty, then click Generate to create new questions."
                  action={
                    recentAiQuestions.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {recentAiQuestions.length} previous AI questions are stored in your bank.
                      </p>
                    )
                  }
                />
              </CardContent>
            </Card>
          )}

          {/* Generated Questions List */}
          <div className="space-y-4">
            {generatedQuestions.map((q, index) => {
              const diffInfo = DIFFICULTY_VARIANTS[q.difficulty] || DIFFICULTY_VARIANTS.medium;
              return (
                <Card
                  key={q._id || index}
                  className={cn(
                    'border shadow-none transition-all',
                    q.verified ? 'border-border/80' : 'border-amber-500/40 bg-amber-500/[0.02]'
                  )}
                >
                  <CardHeader className="pb-3 space-y-3">
                    {/* Badges row */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="font-mono text-xs font-semibold">
                          Q#{q.qNo || index + 1}
                        </Badge>
                        <SectionBadge section={q.section} />
                        <Badge variant="secondary" className="text-xs">
                          {q.category} › {q.subcategory}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn('text-xs font-medium border capitalize', diffInfo.color)}
                        >
                          {q.difficulty}
                        </Badge>
                        <Badge variant="outline" className="text-xs uppercase text-muted-foreground">
                          {q.language}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {q.verified ? (
                          <StatusBadge status="verified" />
                        ) : (
                          <StatusBadge status="needs review" />
                        )}
                      </div>
                    </div>

                    {/* Question Text */}
                    <div className="text-sm font-medium text-foreground leading-relaxed pt-1">
                      <MathText text={q.text} />
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    {/* 4 Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {['A', 'B', 'C', 'D'].map((key) => {
                        const optVal = q.options?.[key];
                        const isCorrect = q.correctOption === key;
                        return (
                          <div
                            key={key}
                            className={cn(
                              'flex items-start gap-2.5 p-2.5 rounded-lg border text-xs transition-colors',
                              isCorrect
                                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 font-medium'
                                : 'border-border/80 bg-background text-foreground'
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-5 w-5 shrink-0 items-center justify-center rounded font-bold text-[11px]',
                                isCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-muted text-muted-foreground'
                              )}
                            >
                              {key}
                            </span>
                            <div className="flex-1 min-w-0 break-words leading-relaxed">
                              <MathText text={optVal || '—'} />
                            </div>
                            {isCorrect && (
                              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 ml-1" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="rounded-lg border border-border/80 bg-muted/30 p-3 text-xs space-y-1">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          Explanation & Solver Solution:
                        </span>
                        <div className="text-muted-foreground leading-relaxed pl-5">
                          <MathText text={q.explanation} />
                        </div>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="flex items-center justify-between border-t bg-muted/10 py-2.5 px-4">
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-primary" />
                      Origin: AI Generated
                    </div>

                    <div className="flex items-center gap-2">
                      {!q.verified && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                          onClick={() => handleApprove(q._id)}
                        >
                          <Check className="h-3 w-3" />
                          Approve Question
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(q._id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          {/* Recent AI Questions Section */}
          {recentAiQuestions.length > 0 && (
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  Recent AI Questions in Bank ({recentAiQuestions.length})
                </h3>
                <Button asChild variant="link" size="sm" className="text-xs p-0 h-auto">
                  <Link to="/review" className="gap-1">
                    View in Question Bank <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {recentAiQuestions.slice(0, 5).map((q) => (
                  <div
                    key={q._id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/70 bg-card text-xs hover:border-border transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                        Q#{q.qNo}
                      </Badge>
                      <span className="font-medium text-foreground truncate">
                        {q.text}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-[10px]">
                        {q.subcategory || q.category}
                      </Badge>
                      {q.verified ? (
                        <StatusBadge status="verified" className="text-[10px] py-0" />
                      ) : (
                        <StatusBadge status="review" className="text-[10px] py-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

