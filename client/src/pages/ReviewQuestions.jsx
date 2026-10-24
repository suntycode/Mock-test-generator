import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '@/api/client';
import MathText from '@/components/MathText';
import PageHeader from '@/components/common/PageHeader';
import SectionBadge from '@/components/common/SectionBadge';
import StatusBadge from '@/components/common/StatusBadge';
import ErrorState from '@/components/common/ErrorState';
import FormField from '@/components/common/FormField';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  Save,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileQuestion,
  HelpCircle,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const emptyForm = {
  section: '',
  category: '',
  subcategory: '',
  difficulty: 'medium',
  language: 'hi',
  text: '',
  options: { A: '', B: '', C: '', D: '' },
  correctOption: null,
  explanation: '',
  hasFigure: false,
  needsReview: false,
  reviewReasons: [],
  verified: false,
};

const origin = () => apiClient.defaults.baseURL.replace(/\/api\/?$/, '');

// Realistic dummy sample data for preview when backend has no papers yet
const DUMMY_PAPERS = [
  { _id: 'sample-paper-1', title: 'RRB NTPC UG CBT-II 17-Sep-2026 Shift 1 (Sample Preview)' },
];

const DUMMY_QUESTIONS = [
  {
    _id: 'q-sample-1',
    paperId: 'sample-paper-1',
    qNo: 1,
    section: 'General Awareness',
    category: 'General Science',
    subcategory: 'Chemistry',
    difficulty: 'easy',
    language: 'hi',
    text: 'बेकिंग सोडा (Baking Soda) का रासायनिक नाम निम्नलिखित में से क्या है?',
    options: {
      A: 'सोडियम कार्बोनेट',
      B: 'सोडियम हाइड्रोजनकार्बोनेट',
      C: 'कैल्शियम ऑक्सीक्लोराइड',
      D: 'सोडियम हाइड्रॉक्साइड',
    },
    correctOption: 'B',
    explanation: 'बेकिंग सोडा का रासायनिक नाम सोडियम हाइड्रोजनकार्बोनेट ($NaHCO_3$) है।',
    hasFigure: false,
    needsReview: false,
    reviewReasons: [],
    verified: true,
    confidence: 0.98,
    sourcePage: 1,
  },
  {
    _id: 'q-sample-2',
    paperId: 'sample-paper-1',
    qNo: 5,
    section: 'General Awareness',
    category: 'Geography',
    subcategory: 'Minerals and Resources',
    difficulty: 'medium',
    language: 'hi',
    text: 'झारखंड के पश्चिमी सिंहभूम जिले के गुआ और नोआमुंडी क्षेत्र किस खनिज के खनन के लिए प्रसिद्ध हैं?',
    options: {
      A: 'बॉक्साइट',
      B: 'तांबा अयस्क',
      C: 'लौह अयस्क',
      D: 'कोयला',
    },
    correctOption: 'C',
    explanation: 'गुआ और नोआमुंडी प्रसिद्ध लौह अयस्क (Iron Ore) खदानें हैं।',
    hasFigure: false,
    needsReview: true,
    reviewReasons: ['Broken conjuncts auto-healed', 'Check visual page'],
    verified: false,
    confidence: 0.85,
    sourcePage: 2,
  },
  {
    _id: 'q-sample-3',
    paperId: 'sample-paper-1',
    qNo: 51,
    section: 'Mathematics',
    category: 'Arithmetic',
    subcategory: 'Percentage',
    difficulty: 'medium',
    language: 'hi',
    text: 'यदि किसी वस्तु का विक्रय मूल्य उसके क्रय मूल्य का $\\frac{4}{3}$ गुना है, तो लाभ प्रतिशत ज्ञात कीजिए:\n$$\\text{Profit}\\% = \\frac{SP - CP}{CP} \\times 100$$',
    options: {
      A: '$25\\%$',
      B: '$33\\frac{1}{3}\\%$',
      C: '$20\\%$',
      D: '$30\\%$',
    },
    correctOption: 'B',
    explanation: 'माना $CP = 3$, तब $SP = 4$। $\\text{लाभ} = 4 - 3 = 1$। $\\text{लाभ}\\% = \\frac{1}{3} \\times 100 = 33.33\\%$।',
    hasFigure: false,
    needsReview: true,
    reviewReasons: ['Formula in LaTeX', 'Verify fraction notation'],
    verified: false,
    confidence: 0.91,
    sourcePage: 8,
  },
  {
    _id: 'q-sample-4',
    paperId: 'sample-paper-1',
    qNo: 88,
    section: 'General Intelligence and Reasoning',
    category: 'Verbal Reasoning',
    subcategory: 'Series (Alphabet)',
    difficulty: 'easy',
    language: 'hi',
    text: 'निम्नलिखित अक्षर श्रृंखला में अगला पद क्या होगा?\n$\\text{EKP, GMR, IOT, ?}$',
    options: {
      A: '$\\text{KQV}$',
      B: '$\\text{KQW}$',
      C: '$\\text{LQV}$',
      D: '$\\text{KRW}$',
    },
    correctOption: 'A',
    explanation: '$E(+2)\\rightarrow G(+2)\\rightarrow I(+2)\\rightarrow K$\n$K(+2)\\rightarrow M(+2)\\rightarrow O(+2)\\rightarrow Q$\n$P(+2)\\rightarrow R(+2)\\rightarrow T(+2)\\rightarrow V$',
    hasFigure: false,
    needsReview: false,
    reviewReasons: [],
    verified: true,
    confidence: 0.99,
    sourcePage: 14,
  },
];

export default function ReviewQuestions() {
  const [params] = useSearchParams();
  const [papers, setPapers] = useState([]);
  const [paperId, setPaperId] = useState(params.get('paperId') || '');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'needs_review' | 'verified'
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isSampleMode, setIsSampleMode] = useState(false);
  const [activeTabMobile, setActiveTabMobile] = useState('editor');

  const selected = items.find((item) => item._id === selectedId);

  const pageImage = useMemo(() => {
    if (isSampleMode) return '';
    return selected?.sourcePage ? `${origin()}/api/papers/${selected.paperId}/pages/${selected.sourcePage}` : '';
  }, [selected, isSampleMode]);

  // Load paper list
  useEffect(() => {
    apiClient
      .get('/papers')
      .then(({ data }) => {
        const livePapers = data.data || [];
        if (livePapers.length > 0) {
          setPapers(livePapers);
          setIsSampleMode(false);
          if (!paperId) setPaperId(livePapers[0]._id);
        } else {
          // Fall back to sample mode so the user can review the populated UI
          setPapers(DUMMY_PAPERS);
          setPaperId('sample-paper-1');
          setIsSampleMode(true);
        }
      })
      .catch(() => {
        setPapers(DUMMY_PAPERS);
        setPaperId('sample-paper-1');
        setIsSampleMode(true);
      });
  }, []);

  const loadList = useCallback(
    async (keepId = '') => {
      if (isSampleMode) {
        let filtered = DUMMY_QUESTIONS;
        if (filterTab === 'needs_review') filtered = DUMMY_QUESTIONS.filter((q) => q.needsReview);
        if (filterTab === 'verified') filtered = DUMMY_QUESTIONS.filter((q) => q.verified);

        setItems(filtered);
        setTotalQuestions(filtered.length);
        setPageCount(1);
        const nextId = filtered.some((item) => item._id === keepId) ? keepId : filtered[0]?._id || '';
        setSelectedId(nextId);
        const nextQ = filtered.find((item) => item._id === nextId);
        setForm(nextQ ? { ...emptyForm, ...nextQ, options: { ...emptyForm.options, ...nextQ.options } } : emptyForm);
        return;
      }

      if (!paperId) {
        setItems([]);
        setTotalQuestions(0);
        setPageCount(1);
        return;
      }

      const qParams = { page, limit: 100 };
      if (filterTab === 'needs_review') qParams.needsReview = 'true';
      if (filterTab === 'verified') qParams.verified = 'true';
      if (paperId === '__ai_generated__') qParams.origin = 'ai_generated';
      else qParams.paperId = paperId;

      try {
        const { data } = await apiClient.get('/questions', { params: qParams });
        const nextItems = data.data.items || [];
        setPageCount(data.data.pages || 1);
        setTotalQuestions(data.data.total || 0);
        setItems(nextItems);
        const nextId = nextItems.some((item) => item._id === keepId) ? keepId : nextItems[0]?._id || '';
        setSelectedId(nextId);
        const nextQuestion = nextItems.find((item) => item._id === nextId);
        setForm(
          nextQuestion
            ? { ...emptyForm, ...nextQuestion, options: { ...emptyForm.options, ...nextQuestion.options } }
            : emptyForm
        );
      } catch (err) {
        setError(err.response?.data?.error?.message || err.message);
      }
    },
    [paperId, filterTab, page, isSampleMode]
  );

  useEffect(() => {
    loadList().catch((e) => setError(e.response?.data?.error?.message || e.message));
  }, [loadList]);

  function choose(item) {
    setSelectedId(item._id);
    setForm({ ...emptyForm, ...item, options: { ...emptyForm.options, ...item.options } });
    setNotice('');
  }

  function change(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function changeOption(key, value) {
    setForm((prev) => ({
      ...prev,
      options: { ...prev.options, [key]: value },
    }));
  }

  async function saveQuestion(verify = false) {
    if (!selectedId) return;
    if (isSampleMode) {
      toast.success(verify ? `Question ${form.qNo} verified (preview).` : `Question ${form.qNo} saved (preview).`);
      setForm((prev) => ({ ...prev, verified: verify, needsReview: verify ? false : prev.needsReview }));
      return;
    }

    setBusy(true);
    setError('');
    try {
      const payload = {
        section: form.section,
        category: form.category,
        subcategory: form.subcategory,
        difficulty: form.difficulty,
        language: form.language,
        text: form.text,
        options: form.options,
        correctOption: form.correctOption || null,
        explanation: form.explanation,
        hasFigure: form.hasFigure,
        needsReview: verify ? false : form.needsReview,
        reviewReasons: verify ? [] : form.reviewReasons,
        verified: verify ? true : form.verified,
      };
      const { data } = await apiClient.patch(`/questions/${selectedId}`, payload);
      toast.success(verify ? `Question ${data.data.qNo} approved & verified!` : `Question ${data.data.qNo} saved.`);
      await loadList(data.data._id);
      if (verify && filterTab === 'needs_review') {
        const current = items.findIndex((item) => item._id === selectedId);
        const next = items[current + 1];
        if (next) choose(next);
      }
    } catch (e) {
      const msg = e.response?.data?.error?.message || e.message;
      setError(msg);
      toast.error('Failed to save question');
    } finally {
      setBusy(false);
    }
  }

  async function retag() {
    if (!selectedId) return;
    if (isSampleMode) {
      toast.info(`Retagged question ${form.qNo} with AI taxonomy (preview).`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { data } = await apiClient.post(`/questions/${selectedId}/retag`);
      setForm({ ...emptyForm, ...data.data, options: { ...emptyForm.options, ...data.data.options } });
      toast.success(`Question ${data.data.qNo} retagged with Gemini.`);
      await loadList(data.data._id);
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
      toast.error('Retag failed');
    } finally {
      setBusy(false);
    }
  }

  async function bulkApprove() {
    if (!paperId || isSampleMode) {
      toast.success('All non-flagged questions approved (preview).');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { data } = await apiClient.post(`/papers/${paperId}/approve`);
      toast.success(`${data.data.approvedCount} non-flagged questions approved.`);
      await loadList();
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
      toast.error('Bulk approval failed');
    } finally {
      setBusy(false);
    }
  }

  // Count helper
  const verifiedCount = items.filter((q) => q.verified).length;
  const needsReviewCount = items.filter((q) => q.needsReview).length;

  return (
    <div className="space-y-6">
      {/* Page Header with Bulk Approve Action */}
      <PageHeader
        title="Review Questions"
        description="Inspect each source page, correct extracted content, adjust taxonomy tags, and verify questions into your bank."
        badge={
          isSampleMode && (
            <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
              Sample Data Mode
            </Badge>
          )
        }
        actions={
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                disabled={!paperId || paperId === '__ai_generated__' || busy}
                className="gap-2"
              >
                <CheckCheck className="h-4 w-4 text-emerald-600" />
                Bulk Approve Non-Flagged
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Bulk Approve Non-Flagged Questions?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will mark all questions without active flags or warnings as verified and approve the paper.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={bulkApprove}>Approve All Non-Flagged</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        }
      />

      {error && (
        <ErrorState
          title="Review Service Error"
          message={error}
          onRetry={() => loadList(selectedId)}
        />
      )}

      {/* Toolbar Card: Paper Select + Filter Tabs + Verified Progress */}
      <Card className="border-border/80 shadow-none">
        <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
            <div className="w-full sm:w-72">
              <Select
                value={paperId}
                onValueChange={(val) => {
                  setPage(1);
                  setPaperId(val);
                }}
              >
                <SelectTrigger id="paper-select">
                  <SelectValue placeholder="Choose a paper to review" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ai_generated__">AI-generated questions</SelectItem>
                  {papers.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter Tabs */}
            <Tabs value={filterTab} onValueChange={(val) => { setPage(1); setFilterTab(val); }}>
              <TabsList className="grid grid-cols-3 h-9">
                <TabsTrigger value="all" className="text-xs gap-1.5">
                  All
                  <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                    {totalQuestions}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="needs_review" className="text-xs gap-1.5">
                  Needs Review
                  <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                    {needsReviewCount}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="verified" className="text-xs gap-1.5">
                  Verified
                  <Badge variant="outline" className="h-4 px-1 text-[10px] text-emerald-600 border-emerald-500/30">
                    {verifiedCount}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-3 min-w-[200px]">
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground">Verified Progress</span>
                <span className="font-semibold text-foreground">
                  {verifiedCount} / {totalQuestions || 1}
                </span>
              </div>
              <Progress
                value={totalQuestions ? Math.round((verifiedCount / totalQuestions) * 100) : 0}
                className="h-1.5"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Layout: 3 Columns on desktop (xl), Tabs on mobile / tablet */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Column 1: Question List Queue (xl: 3 cols / ~280-320px) */}
        <div className="xl:col-span-3">
          <Card className="border-border/80 shadow-none xl:h-[calc(100vh-220px)] flex flex-col">
            <CardHeader className="p-4 border-b pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Question Queue</CardTitle>
                <span className="text-xs text-muted-foreground font-medium">
                  {items.length} items
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-2 flex-1 overflow-hidden">
              <ScrollArea className="h-full pr-2">
                {items.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No questions match this filter.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {items.map((item) => {
                      const isSelected = item._id === selectedId;
                      return (
                        <div
                          key={item._id}
                          onClick={() => choose(item)}
                          className={cn(
                            'p-2.5 rounded-lg border text-left cursor-pointer transition-all space-y-1.5',
                            isSelected
                              ? 'border-primary bg-primary/10 shadow-sm'
                              : 'border-transparent bg-muted/30 hover:bg-muted/70 hover:border-border/50'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-foreground">
                              Q.{item.qNo}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {item.needsReview && (
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              )}
                              {item.verified && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              )}
                              <SectionBadge section={item.section} showIcon={false} className="text-[10px] py-0 px-1" />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1 font-hindi">
                            {item.text || 'No text'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Column 2: Question Editor (xl: 5 cols) */}
        <div className="xl:col-span-5">
          <Card className="border-border/80 shadow-none xl:h-[calc(100vh-220px)] flex flex-col">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-foreground">
                  Question {selected?.qNo || '—'}
                </span>
                <SectionBadge section={form.section} />
                {selected?.confidence !== undefined && (
                  <Badge
                    variant={selected.confidence < 0.8 ? 'destructive' : 'secondary'}
                    className="text-[10px] h-5"
                  >
                    AI Conf: {Math.round(selected.confidence * 100)}%
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <StatusBadge
                  status={form.needsReview ? 'needs_review' : form.verified ? 'verified' : 'unverified'}
                />
              </div>
            </CardHeader>

            <CardContent className="p-4 flex-1 overflow-y-auto space-y-5">
              {selected ? (
                <>
                  {/* Warning Badges for needsReview */}
                  {form.reviewReasons?.length > 0 && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Reasons Flagged for Review:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {form.reviewReasons.map((reason, i) => (
                          <Badge
                            key={i}
                            variant="warning"
                            className="text-[11px] py-0.5 border-amber-500/40"
                          >
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Question Textarea */}
                  <FormField label="Question Text (Devanagari & LaTeX allowed)" required>
                    <Textarea
                      rows={4}
                      value={form.text || ''}
                      onChange={(e) => change('text', e.target.value)}
                      className="font-hindi text-sm leading-relaxed"
                      placeholder="Type question in Hindi or English..."
                    />
                  </FormField>

                  {/* MathText / KaTeX Live Preview */}
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Eye className="h-3 w-3" /> Live Render Preview
                    </span>
                    <div className="text-sm font-hindi leading-relaxed text-foreground">
                      <MathText text={form.text} />
                    </div>
                  </div>

                  {/* Options A-D RadioGroup and Textareas */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">
                        Options & Correct Answer
                      </span>
                      {!form.correctOption && (
                        <span className="text-xs text-rose-600 font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" /> No answer detected
                        </span>
                      )}
                    </div>

                    <RadioGroup
                      value={form.correctOption || ''}
                      onValueChange={(val) => change('correctOption', val || null)}
                      className="space-y-2.5"
                    >
                      {['A', 'B', 'C', 'D'].map((optKey) => {
                        const isCorrect = form.correctOption === optKey;
                        return (
                          <div
                            key={optKey}
                            className={cn(
                              'flex items-start gap-3 p-2.5 rounded-lg border transition-colors',
                              isCorrect
                                ? 'border-emerald-500/60 bg-emerald-500/10'
                                : 'border-border/80 bg-background'
                            )}
                          >
                            <div className="flex items-center gap-2 pt-2 shrink-0">
                              <RadioGroupItem value={optKey} id={`opt-${optKey}`} />
                              <label
                                htmlFor={`opt-${optKey}`}
                                className="font-bold text-xs cursor-pointer select-none"
                              >
                                {optKey}.
                              </label>
                            </div>
                            <Textarea
                              rows={2}
                              value={form.options?.[optKey] || ''}
                              onChange={(e) => changeOption(optKey, e.target.value)}
                              className="text-xs font-hindi min-h-[50px] resize-none"
                              placeholder={`Option ${optKey} text or formula...`}
                            />
                          </div>
                        );
                      })}
                    </RadioGroup>
                  </div>

                  {/* Taxonomy Tags: Section, Category, Subcategory */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <FormField label="Section">
                      <Input
                        value={form.section || ''}
                        onChange={(e) => change('section', e.target.value)}
                        className="text-xs h-8"
                      />
                    </FormField>
                    <FormField label="Category">
                      <Input
                        value={form.category || ''}
                        onChange={(e) => change('category', e.target.value)}
                        className="text-xs h-8"
                      />
                    </FormField>
                    <FormField label="Subcategory">
                      <Input
                        value={form.subcategory || ''}
                        onChange={(e) => change('subcategory', e.target.value)}
                        className="text-xs h-8"
                      />
                    </FormField>
                  </div>

                  {/* Difficulty & Language */}
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Difficulty">
                      <Select
                        value={form.difficulty || 'medium'}
                        onValueChange={(val) => change('difficulty', val)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy (&lt;30s)</SelectItem>
                          <SelectItem value="medium">Medium (30-75s)</SelectItem>
                          <SelectItem value="hard">Hard (&gt;75s)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField label="Language">
                      <Select
                        value={form.language || 'hi'}
                        onValueChange={(val) => change('language', val)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hi">Hindi (Devanagari)</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="bilingual">Bilingual</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>

                  {/* Solution Explanation */}
                  <FormField label="Solution & Step-by-Step Explanation">
                    <Textarea
                      rows={3}
                      value={form.explanation || ''}
                      onChange={(e) => change('explanation', e.target.value)}
                      className="font-hindi text-xs"
                      placeholder="Explain the solution steps..."
                    />
                  </FormField>
                </>
              ) : (
                <EmptyState
                  icon={FileQuestion}
                  title="No Question Selected"
                  description="Choose a question from the queue on the left to review its content and source page."
                />
              )}
            </CardContent>

            {/* Action Bar Footer */}
            {selected && (
              <div className="p-3 border-t bg-muted/10 flex flex-wrap items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={retag}
                  className="gap-1.5 text-xs"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Retag with Gemini
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => saveQuestion(false)}
                    className="gap-1 text-xs"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save Edits
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => saveQuestion(true)}
                    className="gap-1 text-xs"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Approve &amp; Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Column 3: Source Page Viewer (xl: 4 cols) */}
        <div className="xl:col-span-4">
          <Card className="border-border/80 shadow-none xl:h-[calc(100vh-220px)] flex flex-col">
            <CardHeader className="p-3 border-b flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                Source Page {selected?.sourcePage ? `#${selected.sourcePage}` : ''}
              </CardTitle>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setZoomLevel((z) => Math.max(50, z - 20))}
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="text-[11px] font-mono text-muted-foreground tabular-nums w-10 text-center">
                  {zoomLevel}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setZoomLevel((z) => Math.min(200, z + 20))}
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setZoomLevel(100)}
                  aria-label="Reset zoom"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-2 flex-1 overflow-hidden bg-muted/30">
              <ScrollArea className="h-full rounded-md border bg-background">
                {pageImage ? (
                  <div className="p-2 flex justify-center">
                    <img
                      src={pageImage}
                      alt={`Source Page ${selected?.sourcePage}`}
                      style={{ width: `${zoomLevel}%` }}
                      className="max-w-none transition-all duration-150 rounded"
                    />
                  </div>
                ) : (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-6 text-center space-y-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-sm text-foreground">
                        Source Page Preview
                      </p>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        {isSampleMode
                          ? `Source page #${selected?.sourcePage || 1} image will be rendered here from original PDF.`
                          : 'Select a question to inspect the high-resolution source page.'}
                      </p>
                    </div>
                    {isSampleMode && (
                      <div className="w-full max-w-xs border rounded-lg p-3 bg-muted/40 text-left space-y-1 font-mono text-[11px] text-muted-foreground">
                        <p className="font-semibold text-foreground">Page #{selected?.sourcePage || 1} [Vision Scan]</p>
                        <p className="line-clamp-2">Q.{selected?.qNo} {selected?.text}</p>
                        <p className="text-emerald-600 font-bold">✔ [Green Tick: Opt {selected?.correctOption}]</p>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
