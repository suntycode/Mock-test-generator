import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiClient } from '@/api/client';
import MathText from '@/components/MathText';
import PageHeader from '@/components/common/PageHeader';
import SectionBadge from '@/components/common/SectionBadge';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import ErrorState from '@/components/common/ErrorState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  BookOpen,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Bookmark,
  BookmarkCheck,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Award,
  FileText,
  Check,
  X,
  SlidersHorizontal,
  PlusCircle,
  HelpCircle,
  BookMarked
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const DIFFICULTY_VARIANTS = {
  easy: { label: 'Easy', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  medium: { label: 'Medium', color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' },
  hard: { label: 'Hard', color: 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20' }
};

export default function Textbook() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters state
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [sectionFilter, setSectionFilter] = useState(searchParams.get('section') || 'all');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || 'all');
  const [subcategoryFilter, setSubcategoryFilter] = useState(searchParams.get('subcategory') || 'all');
  const [difficultyFilter, setDifficultyFilter] = useState(searchParams.get('difficulty') || 'all');
  const [languageFilter, setLanguageFilter] = useState(searchParams.get('language') || 'all');
  const [originFilter, setOriginFilter] = useState(searchParams.get('origin') || 'all');
  const [verifiedFilter, setVerifiedFilter] = useState(searchParams.get('verified') || 'all');
  const [paperFilter, setPaperFilter] = useState(searchParams.get('paperId') || 'all');
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);

  // Pagination & Display state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Questions data
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Taxonomy & Papers metadata
  const [taxonomy, setTaxonomy] = useState({});
  const [papersList, setPapersList] = useState([]);

  // Study & Interactive Mode toggles
  const [showAllAnswers, setShowAllAnswers] = useState(false);
  const [practiceMode, setPracticeMode] = useState(true); // interactive clicking
  const [revealedAnswers, setRevealedAnswers] = useState({}); // { [questionId]: boolean }
  const [userSelectedOptions, setUserSelectedOptions] = useState({}); // { [questionId]: 'A' | 'B' | 'C' | 'D' }

  // Session practice score tracker
  const [practiceScore, setPracticeScore] = useState({ correct: 0, wrong: 0 });

  // Bookmarks saved in localStorage
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const saved = localStorage.getItem('mocktest_textbook_bookmarks');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Toggle bookmark for a question
  const toggleBookmark = (qId) => {
    setBookmarks((prev) => {
      const next = { ...prev };
      if (next[qId]) {
        delete next[qId];
        toast.info('Removed from bookmarks');
      } else {
        next[qId] = true;
        toast.success('Question bookmarked for study');
      }
      try {
        localStorage.setItem('mocktest_textbook_bookmarks', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Load taxonomy and papers list once
  useEffect(() => {
    async function loadMeta() {
      try {
        const [taxRes, papersRes] = await Promise.allSettled([
          apiClient.get('/questions/taxonomy'),
          apiClient.get('/papers')
        ]);
        if (taxRes.status === 'fulfilled' && taxRes.value.data?.ok) {
          setTaxonomy(taxRes.value.data.data || {});
        }
        if (papersRes.status === 'fulfilled' && papersRes.value.data?.ok) {
          setPapersList(papersRes.value.data.data || []);
        }
      } catch {}
    }
    loadMeta();
  }, []);

  // Fetch questions from backend
  const fetchQuestions = async () => {
    setLoading(true);
    setError('');

    const params = {
      page,
      limit
    };

    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (sectionFilter !== 'all') params.section = sectionFilter;
    if (categoryFilter !== 'all') params.category = categoryFilter;
    if (subcategoryFilter !== 'all') params.subcategory = subcategoryFilter;
    if (difficultyFilter !== 'all') params.difficulty = difficultyFilter;
    if (languageFilter !== 'all') params.language = languageFilter;
    if (originFilter !== 'all') params.origin = originFilter;
    if (verifiedFilter !== 'all') params.verified = verifiedFilter === 'verified' ? 'true' : 'false';
    if (paperFilter !== 'all') params.paperId = paperFilter;

    try {
      const { data } = await apiClient.get('/questions', { params });
      if (data?.ok) {
        let items = data.data.items || [];
        setQuestions(items);
        setTotalQuestions(data.data.total || 0);
        setTotalPages(data.data.pages || 1);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to load textbook questions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [
    page,
    limit,
    sectionFilter,
    categoryFilter,
    subcategoryFilter,
    difficultyFilter,
    languageFilter,
    originFilter,
    verifiedFilter,
    paperFilter
  ]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchQuestions();
  };

  // Sections list from taxonomy
  const sectionsList = useMemo(() => Object.keys(taxonomy), [taxonomy]);

  // Categories under selected section
  const categoriesList = useMemo(() => {
    if (sectionFilter === 'all' || !taxonomy[sectionFilter]) {
      // Collect unique categories across all sections
      const allCats = new Set();
      Object.values(taxonomy).forEach((sec) => {
        Object.keys(sec || {}).forEach((c) => allCats.add(c));
      });
      return Array.from(allCats);
    }
    return Object.keys(taxonomy[sectionFilter] || {});
  }, [taxonomy, sectionFilter]);

  // Subcategories under selected category
  const subcategoriesList = useMemo(() => {
    if (categoryFilter === 'all') return [];
    if (sectionFilter !== 'all' && taxonomy[sectionFilter]?.[categoryFilter]) {
      return taxonomy[sectionFilter][categoryFilter] || [];
    }
    // Search across sections
    for (const sec of Object.values(taxonomy)) {
      if (sec[categoryFilter]) return sec[categoryFilter];
    }
    return [];
  }, [taxonomy, sectionFilter, categoryFilter]);

  // Cascading section change
  const handleSectionChange = (val) => {
    setSectionFilter(val);
    setCategoryFilter('all');
    setSubcategoryFilter('all');
    setPage(1);
  };

  // Cascading category change
  const handleCategoryChange = (val) => {
    setCategoryFilter(val);
    setSubcategoryFilter('all');
    setPage(1);
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setSectionFilter('all');
    setCategoryFilter('all');
    setSubcategoryFilter('all');
    setDifficultyFilter('all');
    setLanguageFilter('all');
    setOriginFilter('all');
    setVerifiedFilter('all');
    setPaperFilter('all');
    setBookmarkedOnly(false);
    setPage(1);
  };

  // Handle option selection in interactive practice mode
  const handleSelectOption = (q, optionKey) => {
    if (!practiceMode) return;
    if (userSelectedOptions[q._id]) return; // already answered

    const isCorrect = q.correctOption === optionKey;
    setUserSelectedOptions((prev) => ({ ...prev, [q._id]: optionKey }));
    setRevealedAnswers((prev) => ({ ...prev, [q._id]: true }));

    setPracticeScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      wrong: prev.wrong + (isCorrect ? 0 : 1)
    }));

    if (isCorrect) {
      toast.success('Correct answer! +1.00', { duration: 1500 });
    } else {
      toast.error(`Wrong answer! Correct was (${q.correctOption})`, { duration: 2000 });
    }
  };

  // Toggle single answer reveal
  const toggleAnswerReveal = (qId) => {
    setRevealedAnswers((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  // Reset session practice score
  const resetPracticeScore = () => {
    setPracticeScore({ correct: 0, wrong: 0 });
    setUserSelectedOptions({});
    setRevealedAnswers({});
    toast.info('Session practice score reset');
  };

  // Filter questions if bookmarkedOnly is toggled
  const displayedQuestions = useMemo(() => {
    if (!bookmarkedOnly) return questions;
    return questions.filter((q) => bookmarks[q._id]);
  }, [questions, bookmarkedOnly, bookmarks]);

  // Overall session metrics
  const totalAttempted = practiceScore.correct + practiceScore.wrong;
  const accuracyPct = totalAttempted > 0 ? Math.round((practiceScore.correct / totalAttempted) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Textbook Practice"
        description="Comprehensive question bank textbook. Filter by section, topic, or difficulty, and study with instant solution reveals."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={bookmarkedOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBookmarkedOnly(!bookmarkedOnly)}
              className="gap-1.5 text-xs"
            >
              <Bookmark className="h-4 w-4" />
              {bookmarkedOnly ? 'Showing Bookmarks' : `Bookmarks (${Object.keys(bookmarks).length})`}
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
              <Link to="/create-question">
                <Sparkles className="h-4 w-4 text-primary" />
                Add Questions
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
              <Link to="/create-mock">
                <GraduationCap className="h-4 w-4 text-primary" />
                Start Test
              </Link>
            </Button>
          </div>
        }
      />

      {error && (
        <ErrorState
          title="Textbook Error"
          message={error}
          onRetry={fetchQuestions}
        />
      )}

      {/* Top Interactive Toolbar & Session Score Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center rounded-xl border bg-card p-4 shadow-sm">
        {/* Practice Modes */}
        <div className="md:col-span-7 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="practiceModeSwitch"
              checked={practiceMode}
              onCheckedChange={setPracticeMode}
            />
            <Label htmlFor="practiceModeSwitch" className="text-xs font-semibold cursor-pointer">
              Interactive Quiz Mode
            </Label>
          </div>

          <Separator orientation="vertical" className="h-5 hidden sm:block" />

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAllAnswers(!showAllAnswers)}
              className="h-8 gap-1.5 text-xs"
            >
              {showAllAnswers ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showAllAnswers ? 'Hide All Solutions' : 'Reveal All Solutions'}
            </Button>
          </div>
        </div>

        {/* Live Practice Score Tracker */}
        <div className="md:col-span-5 flex items-center justify-start md:justify-end gap-3 text-xs">
          {totalAttempted > 0 ? (
            <div className="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-lg border">
              <Award className="h-4 w-4 text-primary shrink-0" />
              <span>
                Score:{' '}
                <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {practiceScore.correct}
                </strong>
                /{totalAttempted} ({accuracyPct}%)
              </span>
              <button
                type="button"
                onClick={resetPracticeScore}
                title="Reset session score"
                className="text-muted-foreground hover:text-foreground ml-1"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <span className="text-muted-foreground text-[11px] italic">
              Click any option in Quiz Mode to test yourself
            </span>
          )}

          <Badge variant="outline" className="text-xs font-mono font-medium">
            {totalQuestions} Question{totalQuestions !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Main Filter Section */}
      <Card className="border-border/80 shadow-none bg-card/60">
        <CardContent className="p-4 space-y-4">
          {/* Keyword Search Row */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search formulas, concepts, or question keywords (e.g. Baking Soda, Percentage, Syllogism)..."
                className="pl-9 text-xs"
              />
            </div>
            <Button type="submit" size="sm" className="gap-1.5 text-xs">
              Search
            </Button>
            {(searchQuery ||
              sectionFilter !== 'all' ||
              categoryFilter !== 'all' ||
              subcategoryFilter !== 'all' ||
              difficultyFilter !== 'all' ||
              languageFilter !== 'all' ||
              paperFilter !== 'all' ||
              originFilter !== 'all' ||
              verifiedFilter !== 'all') && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </Button>
            )}
          </form>

          {/* Filter Dropdowns Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-1">
            {/* Section */}
            <div>
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Section
              </Label>
              <Select value={sectionFilter} onValueChange={handleSectionChange}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {sectionsList.map((sec) => (
                    <SelectItem key={sec} value={sec}>
                      {sec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div>
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Category
              </Label>
              <Select value={categoryFilter} onValueChange={handleCategoryChange}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categoriesList.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subcategory */}
            <div>
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Topic
              </Label>
              <Select
                value={subcategoryFilter}
                onValueChange={(val) => {
                  setSubcategoryFilter(val);
                  setPage(1);
                }}
                disabled={categoryFilter === 'all' || !subcategoriesList.length}
              >
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="All Topics" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Topics</SelectItem>
                  {subcategoriesList.map((sub) => (
                    <SelectItem key={sub} value={sub}>
                      {sub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Difficulty */}
            <div>
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Difficulty
              </Label>
              <Select
                value={difficultyFilter}
                onValueChange={(val) => {
                  setDifficultyFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="All Difficulties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Language */}
            <div>
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Language
              </Label>
              <Select
                value={languageFilter}
                onValueChange={(val) => {
                  setLanguageFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="All Languages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  <SelectItem value="hi">Hindi (हिंदी)</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="bilingual">Bilingual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Source Paper */}
            <div>
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Paper / Source
              </Label>
              <Select
                value={paperFilter}
                onValueChange={(val) => {
                  setPaperFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="All Papers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Papers</SelectItem>
                  {papersList.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse border-border/80 p-6 space-y-4">
              <div className="h-4 w-1/3 bg-muted rounded" />
              <div className="h-10 w-full bg-muted/60 rounded" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-10 bg-muted/40 rounded" />
                <div className="h-10 bg-muted/40 rounded" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && displayedQuestions.length === 0 && (
        <Card className="border-border/80 shadow-none">
          <CardContent className="p-12">
            <EmptyState
              icon={BookOpen}
              title={bookmarkedOnly ? 'No Bookmarked Questions Found' : 'No Questions Match Your Filter'}
              description={
                bookmarkedOnly
                  ? 'You haven’t bookmarked any questions yet. Click the bookmark icon on any question to save it here.'
                  : 'Try adjusting your search criteria, section filters, or clear search queries to view more questions.'
              }
              action={
                <Button variant="outline" size="sm" onClick={resetFilters} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Reset All Filters
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Textbook Questions List */}
      {!loading && displayedQuestions.length > 0 && (
        <div className="space-y-5">
          {displayedQuestions.map((q, idx) => {
            const isBookmarked = !!bookmarks[q._id];
            const isRevealed = showAllAnswers || !!revealedAnswers[q._id];
            const selectedOpt = userSelectedOptions[q._id];
            const hasAnswered = !!selectedOpt;
            const diffInfo = DIFFICULTY_VARIANTS[q.difficulty] || DIFFICULTY_VARIANTS.medium;
            const itemNumber = (page - 1) * limit + idx + 1;

            return (
              <Card
                key={q._id}
                className={cn(
                  'border shadow-none transition-all',
                  isBookmarked
                    ? 'border-primary/40 bg-primary/[0.015]'
                    : 'border-border/80 bg-card hover:border-border'
                )}
              >
                {/* Card Header & Metadata */}
                <CardHeader className="pb-3 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-serif font-bold text-base text-foreground mr-1">
                        Q.{itemNumber}
                      </span>
                      <SectionBadge section={q.section} />
                      {q.category && (
                        <Badge variant="secondary" className="text-xs">
                          {q.category} {q.subcategory ? `› ${q.subcategory}` : ''}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={cn('text-xs font-medium border capitalize', diffInfo.color)}
                      >
                        {q.difficulty}
                      </Badge>
                      <Badge variant="outline" className="text-xs uppercase text-muted-foreground">
                        {q.language}
                      </Badge>
                      {q.origin === 'ai_generated' ? (
                        <Badge variant="outline" className="text-[11px] gap-1 text-primary border-primary/20">
                          <Sparkles className="h-3 w-3" />
                          AI
                        </Badge>
                      ) : (
                        q.paperId?.title && (
                          <Badge variant="outline" className="text-[11px] text-muted-foreground max-w-[200px] truncate">
                            {q.paperId.title}
                          </Badge>
                        )
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {q.verified ? (
                        <StatusBadge status="verified" className="text-[11px]" />
                      ) : (
                        <StatusBadge status="needs review" className="text-[11px]" />
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => toggleBookmark(q._id)}
                        title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Question'}
                      >
                        {isBookmarked ? (
                          <BookmarkCheck className="h-4 w-4 text-primary fill-primary" />
                        ) : (
                          <Bookmark className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="text-sm font-medium text-foreground leading-relaxed pt-1">
                    <MathText text={q.text} />
                  </div>
                </CardHeader>

                {/* Card Content & Options */}
                <CardContent className="space-y-4 pt-0">
                  {/* Options Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {['A', 'B', 'C', 'D'].map((key) => {
                      const optVal = q.options?.[key];
                      const isCorrect = q.correctOption === key;
                      const isSelected = selectedOpt === key;

                      // Visual styling based on state
                      let optionClasses = 'border-border/80 bg-background text-foreground hover:bg-muted/40';

                      if (isRevealed || hasAnswered) {
                        if (isCorrect) {
                          optionClasses =
                            'border-emerald-500/50 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 font-medium ring-1 ring-emerald-500/20';
                        } else if (isSelected && !isCorrect) {
                          optionClasses =
                            'border-red-500/50 bg-red-500/10 text-red-950 dark:text-red-200 line-through';
                        } else {
                          optionClasses = 'border-border/60 bg-muted/10 text-muted-foreground opacity-75';
                        }
                      }

                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={hasAnswered}
                          onClick={() => handleSelectOption(q, key)}
                          className={cn(
                            'flex items-start gap-2.5 p-3 rounded-lg border text-xs text-left transition-all',
                            practiceMode && !hasAnswered && 'cursor-pointer hover:border-primary/50',
                            optionClasses
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-5 w-5 shrink-0 items-center justify-center rounded font-bold text-[11px] transition-colors',
                              isRevealed || hasAnswered
                                ? isCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : isSelected
                                  ? 'bg-red-600 text-white'
                                  : 'bg-muted text-muted-foreground'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {key}
                          </span>
                          <div className="flex-1 min-w-0 break-words leading-relaxed pt-0.5">
                            <MathText text={optVal || '—'} />
                          </div>
                          {(isRevealed || hasAnswered) && isCorrect && (
                            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 ml-1 mt-0.5" />
                          )}
                          {(isRevealed || hasAnswered) && isSelected && !isCorrect && (
                            <X className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 ml-1 mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Solution & Explanation Box */}
                  {isRevealed && (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs space-y-2 mt-3 animate-in fade-in-50 duration-200">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5 text-xs">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          Correct Answer: Option ({q.correctOption})
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {q.options?.[q.correctOption]}
                        </span>
                      </div>

                      {q.explanation && (
                        <div className="pt-1 text-muted-foreground leading-relaxed border-t border-emerald-500/20">
                          <strong className="text-foreground">Explanation: </strong>
                          <MathText text={q.explanation} />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>

                {/* Card Footer with Solution Toggle */}
                <CardFooter className="flex items-center justify-between border-t bg-muted/10 py-2.5 px-4 text-xs">
                  <div className="text-muted-foreground flex items-center gap-1.5">
                    {hasAnswered ? (
                      selectedOpt === q.correctOption ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> Answered Correctly
                        </span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                          <X className="h-3.5 w-3.5" /> Answered Incorrectly
                        </span>
                      )
                    ) : (
                      <span>Select an option to test your knowledge</span>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1.5 font-medium text-primary hover:text-primary"
                    onClick={() => toggleAnswerReveal(q._id)}
                  >
                    {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {isRevealed ? 'Hide Solution' : 'View Solution'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Showing{' '}
                <strong className="text-foreground">
                  {(page - 1) * limit + 1} - {Math.min(page * limit, totalQuestions)}
                </strong>{' '}
                of <strong className="text-foreground">{totalQuestions}</strong> questions
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="h-8 gap-1 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </Button>

                <div className="text-xs font-medium px-2">
                  Page {page} of {totalPages}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => {
                    setPage((p) => Math.min(totalPages, p + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="h-8 gap-1 text-xs"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
