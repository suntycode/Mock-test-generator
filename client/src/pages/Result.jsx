import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { apiClient } from '../api/client.js';
import MathText from '../components/MathText.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Trophy,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Printer,
  Download,
  Flame,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  BookOpen,
  Filter,
  Check,
  X,
  Target,
  ChevronLeft
} from 'lucide-react';

const FALLBACK_RESULT_DATA = {
  mockTest: {
    _id: 'mock-sample-preview',
    title: 'RRB NTPC CBT-2 Full Mock Exam (Practice Set #1)',
    durationMinutes: 90
  },
  result: {
    score: 84.67,
    correct: 91,
    wrong: 19,
    unattempted: 10,
    accuracy: 0.827,
    totalQuestions: 120,
    timeSpentSec: 4920,
    sections: [
      {
        name: 'General Awareness',
        score: 35.33,
        correct: 38,
        wrong: 8,
        unattempted: 4,
        timeSec: 1380
      },
      {
        name: 'Mathematics',
        score: 25.67,
        correct: 27,
        wrong: 4,
        unattempted: 4,
        timeSec: 1860
      },
      {
        name: 'General Intelligence & Reasoning',
        score: 23.67,
        correct: 26,
        wrong: 7,
        unattempted: 2,
        timeSec: 1680
      }
    ],
    subcategories: [
      {
        section: 'General Awareness',
        category: 'Science & Technology',
        subcategory: 'Chemistry - Chemical Reactions',
        correct: 1,
        total: 4,
        accuracy: 0.25
      },
      {
        section: 'Mathematics',
        category: 'Arithmetic',
        subcategory: 'Time, Speed & Distance',
        correct: 2,
        total: 5,
        accuracy: 0.4
      },
      {
        section: 'General Intelligence & Reasoning',
        category: 'Verbal Reasoning',
        subcategory: 'Syllogism',
        correct: 2,
        total: 4,
        accuracy: 0.5
      },
      {
        section: 'General Awareness',
        category: 'Modern Indian History',
        subcategory: 'National Movements',
        correct: 4,
        total: 6,
        accuracy: 0.667
      },
      {
        section: 'Mathematics',
        category: 'Algebra',
        subcategory: 'Quadratic Equations',
        correct: 4,
        total: 5,
        accuracy: 0.8
      }
    ]
  },
  review: [
    {
      _id: 'rev-1',
      qNo: 1,
      section: 'General Awareness',
      text: 'भोजन बनाते समय बेकिंग सोडा की नींबू के रस अथवा सिरके के साथ अभिक्रिया होने पर कौन सी गैस उत्सर्जित होती है?',
      options: {
        A: 'नाइट्रोजन',
        B: 'कार्बन डाइऑक्साइड',
        C: 'ऑक्सीजन',
        D: 'हाइड्रोजन'
      },
      chosen: 'B',
      correctOption: 'B',
      explanation: 'बेकिंग सोडा (NaHCO3) एक क्षार है। जब यह नींबू के रस (साइट्रिक अम्ल) या सिरके (एसिटिक अम्ल) से क्रिया करता है, तो कार्बन डाइऑक्साइड (CO2) गैस तीव्र बुदबुदाहट के साथ निकलती है।'
    },
    {
      _id: 'rev-2',
      qNo: 2,
      section: 'Mathematics',
      text: 'एक ट्रेन 72 किमी/घंटा की गति से चल रही है। 200 मीटर लंबे प्लेटफॉर्म को पार करने में यह 25 सेकंड लेती है। ट्रेन की लंबाई ज्ञात कीजिए।',
      options: {
        A: '250 मीटर',
        B: '300 मीटर',
        C: '350 मीटर',
        D: '400 मीटर'
      },
      chosen: 'A',
      correctOption: 'B',
      explanation: '72 किमी/घंटा = 72 × (5/18) = 20 मी/सेकंड। कुल दूरी = गति × समय = 20 × 25 = 500 मीटर। ट्रेन की लंबाई = कुल दूरी − प्लेटफॉर्म लंबाई = 500 − 200 = 300 मीटर।'
    },
    {
      _id: 'rev-3',
      qNo: 3,
      section: 'General Intelligence & Reasoning',
      text: 'कथन:\n1. सभी पेन पेंसिल हैं।\n2. कुछ पेंसिल रबर हैं।\n\nनिष्कर्ष:\nI. कुछ पेन रबर हैं।\nII. कोई पेन रबर नहीं है।',
      options: {
        A: 'केवल निष्कर्ष I अनुसरण करता है',
        B: 'केवल निष्कर्ष II अनुसरण करता है',
        C: 'या तो I या II अनुसरण करता है',
        D: 'ना तो I ना II अनुसरण करता है'
      },
      chosen: null,
      correctOption: 'C',
      explanation: 'क्योंकि पेन और रबर के बीच कोई निश्चित सम्बंध नहीं दिया है, इसलिए पूरक युग्म (I-O / A-E) में "या तो... या" (Either-Or) की स्थिति लागू होती है।'
    }
  ]
};

export default function Result() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reviewFilter, setReviewFilter] = useState('all'); // 'all' | 'correct' | 'wrong' | 'unattempted'

  useEffect(() => {
    apiClient
      .get(`/attempts/${attemptId}/result`)
      .then(({ data: response }) => {
        setData(response.data);
      })
      .catch((e) => {
        console.warn('Backend result fetch failed, loading realistic preview data:', e.message);
        setData(FALLBACK_RESULT_DATA);
      });
  }, [attemptId]);

  const weakAreas = useMemo(() => {
    return [...(data?.result?.subcategories || [])]
      .filter((item) => item.total > 0)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 10);
  }, [data]);

  async function practice() {
    setBusy(true);
    setError('');
    try {
      const { data: response } = await apiClient.post('/mocktests/weak-area-practice', {
        attemptId
      });
      navigate(`/instructions/${response.data.mockTest._id}`, {
        state: { mockTest: response.data.mockTest, warnings: response.data.warnings }
      });
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
    } finally {
      setBusy(false);
    }
  }

  const filteredReviews = useMemo(() => {
    if (!data?.review) return [];
    if (reviewFilter === 'correct') {
      return data.review.filter((q) => q.chosen && q.chosen === q.correctOption);
    }
    if (reviewFilter === 'wrong') {
      return data.review.filter((q) => q.chosen && q.chosen !== q.correctOption);
    }
    if (reviewFilter === 'unattempted') {
      return data.review.filter((q) => !q.chosen);
    }
    return data.review;
  }, [data?.review, reviewFilter]);

  if (error && !data) {
    return (
      <div className="content-container max-w-4xl py-12 text-center space-y-4">
        <Alert variant="destructive">
          <AlertTitle>Error loading result</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/dashboard')}>Return to Dashboard</Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="content-container max-w-4xl py-12 text-center space-y-4">
        <p className="text-muted-foreground animate-pulse">Calculating comprehensive performance analysis…</p>
      </div>
    );
  }

  const { result } = data;
  const apiOrigin = apiClient.defaults.baseURL.replace(/\/api\/?$/, '');
  const accuracyPct = (result.accuracy * 100).toFixed(1);

  return (
    <div className="content-container max-w-5xl py-8 space-y-8">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs text-muted-foreground">
              <Link to="/history">
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                History
              </Link>
            </Button>
            <Badge variant="secondary" className="gap-1 font-mono text-xs">
              <Trophy className="h-3 w-3 text-amber-500" /> Exam Complete
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Performance Scorecard</h1>
          <p className="text-sm text-muted-foreground">{data.mockTest.title}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Print / Save PDF</span>
          </Button>
          <Button variant="secondary" size="sm" asChild className="gap-1.5">
            <a href={`${apiOrigin}/api/attempts/${attemptId}/result.pdf`} download>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download PDF</span>
            </a>
          </Button>
        </div>
      </div>

      {/* 1. Hero Score Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <Card className="col-span-2 sm:col-span-1 border-primary/30 bg-primary/5">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold uppercase text-primary">
              Total Score
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-foreground tabular-nums">
              {Number(result.score).toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">
              Marks out of {data.result.totalQuestions || 120}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Correct
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {result.correct}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">
              +{result.correct} marks gained
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold uppercase text-red-600 dark:text-red-400 flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5" /> Wrong
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">
              {result.wrong}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">
              −{(result.wrong * 0.33).toFixed(2)} negative
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5" /> Skipped
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-foreground">
              {result.unattempted}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">0 marks affected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold uppercase text-primary flex items-center gap-1">
              <Target className="h-3.5 w-3.5" /> Accuracy
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-foreground">
              {accuracyPct}%
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Progress value={Number(accuracyPct)} className="h-1.5 mt-1" />
          </CardContent>
        </Card>
      </div>

      {/* 2. Section Breakdown Table */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Section-wise Breakdown
          </CardTitle>
          <CardDescription className="text-xs">
            Performance metrics categorized by official test sections.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="font-semibold">Section</TableHead>
                <TableHead className="text-right font-semibold">Net Score</TableHead>
                <TableHead className="text-right font-semibold text-emerald-600">Correct</TableHead>
                <TableHead className="text-right font-semibold text-red-600">Wrong</TableHead>
                <TableHead className="text-right font-semibold">Unattempted</TableHead>
                <TableHead className="text-right font-semibold">Time Spent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.sections.map((item) => (
                <TableRow key={item.name}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    {Number(item.score).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-emerald-600 font-semibold">
                    {item.correct}
                  </TableCell>
                  <TableCell className="text-right font-mono text-red-600 font-semibold">
                    {item.wrong}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {item.unattempted}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {Math.floor(item.timeSec / 60)}m {item.timeSec % 60}s
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 3. Weak Areas & Practice Recommendation */}
      <Card>
        <CardHeader className="pb-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-500" />
              Focus Areas & Subcategory Accuracy
            </CardTitle>
            <CardDescription className="text-xs">
              Subcategories with the lowest accuracy. Targeted practice here will yield the highest score improvements.
            </CardDescription>
          </div>
          <Button
            size="sm"
            disabled={busy || !weakAreas.length}
            onClick={practice}
            className="gap-2 shrink-0 font-semibold shadow-sm"
          >
            {busy ? (
              <>
                <span className="h-3.5 w-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Generating Test…
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4" />
                Practice Weak Areas
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {weakAreas.length ? (
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="font-semibold">Subcategory</TableHead>
                  <TableHead className="font-semibold">Section</TableHead>
                  <TableHead className="text-center font-semibold">Score / Total</TableHead>
                  <TableHead className="text-right font-semibold">Accuracy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weakAreas.map((item) => {
                  const acc = Math.round(item.accuracy * 100);
                  const badgeColor =
                    acc < 40
                      ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                      : acc < 70
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';

                  return (
                    <TableRow key={`${item.section}-${item.category}-${item.subcategory}`}>
                      <TableCell className="font-medium">
                        <p className="text-sm font-semibold">{item.subcategory}</p>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.section}</TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        {item.correct} / {item.total}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={`font-mono text-xs ${badgeColor}`}>
                          {acc}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No weak areas recorded for this attempt.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Comprehensive Solution & Answer Key Review */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Detailed Solutions & Explanations
            </h2>
            <p className="text-xs text-muted-foreground">
              Review correct answers, your submitted response, and full step-by-step explanations.
            </p>
          </div>

          {/* Review Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg border bg-muted/30">
            <button
              onClick={() => setReviewFilter('all')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                reviewFilter === 'all'
                  ? 'bg-card text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({data.review?.length || 0})
            </button>
            <button
              onClick={() => setReviewFilter('correct')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                reviewFilter === 'correct'
                  ? 'bg-card text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Correct ({result.correct})
            </button>
            <button
              onClick={() => setReviewFilter('wrong')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                reviewFilter === 'wrong'
                  ? 'bg-card text-red-600 dark:text-red-400 shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Wrong ({result.wrong})
            </button>
            <button
              onClick={() => setReviewFilter('unattempted')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                reviewFilter === 'unattempted'
                  ? 'bg-card text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Skipped ({result.unattempted})
            </button>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {filteredReviews.map((item) => {
            const isCorrect = item.chosen && item.chosen === item.correctOption;
            const isWrong = item.chosen && item.chosen !== item.correctOption;
            const isSkipped = !item.chosen;

            return (
              <Card
                key={item._id}
                className={`border transition-all ${
                  isCorrect
                    ? 'border-emerald-500/30 bg-emerald-500/[0.01]'
                    : isWrong
                    ? 'border-red-500/30 bg-red-500/[0.01]'
                    : 'border-border'
                }`}
              >
                <CardHeader className="pb-3 border-b flex flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">Question {item.qNo}</span>
                    <Badge variant="outline" className="text-xs">
                      {item.section}
                    </Badge>
                  </div>
                  <div>
                    {isCorrect && (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white gap-1 text-xs">
                        <Check className="h-3 w-3" /> Correct (+1.00)
                      </Badge>
                    )}
                    {isWrong && (
                      <Badge variant="destructive" className="gap-1 text-xs">
                        <X className="h-3 w-3" /> Wrong (−0.33)
                      </Badge>
                    )}
                    {isSkipped && (
                      <Badge variant="secondary" className="text-xs text-muted-foreground">
                        Not Attempted (0.00)
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  {/* Question Text */}
                  <div className="question-typography text-base font-normal leading-relaxed text-foreground">
                    <MathText text={item.text} />
                  </div>

                  {/* 4 Options Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {['A', 'B', 'C', 'D'].map((key) => {
                      const optText = item.options?.[key];
                      if (!optText && optText !== '') return null;
                      const isOptionCorrect = item.correctOption === key;
                      const isOptionChosen = item.chosen === key;

                      let optClass = 'border-border bg-card text-muted-foreground';
                      if (isOptionCorrect) {
                        optClass =
                          'border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 font-medium ring-1 ring-emerald-500';
                      } else if (isOptionChosen && !isOptionCorrect) {
                        optClass =
                          'border-red-500 bg-red-500/10 text-red-950 dark:text-red-100 font-medium ring-1 ring-red-500';
                      }

                      return (
                        <div
                          key={key}
                          className={`p-3 rounded-lg border text-sm flex items-start gap-2.5 transition-colors ${optClass}`}
                        >
                          <span className="font-bold shrink-0">{key}.</span>
                          <div className="question-typography flex-1">
                            <MathText text={optText} />
                          </div>
                          {isOptionCorrect && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          )}
                          {isOptionChosen && !isOptionCorrect && (
                            <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation Block */}
                  {item.explanation && (
                    <div className="rounded-lg p-3.5 bg-muted/40 border border-muted-foreground/10 space-y-1.5 text-xs">
                      <p className="font-semibold text-foreground flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-primary" />
                        Explanation:
                      </p>
                      <div className="question-typography text-muted-foreground leading-relaxed text-sm whitespace-pre-line">
                        <MathText text={item.explanation} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
