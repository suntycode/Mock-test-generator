import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { apiClient } from '../api/client.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Clock,
  HelpCircle,
  Award,
  AlertCircle,
  CheckCircle2,
  Bookmark,
  ArrowRight,
  ShieldAlert,
  ChevronLeft,
  BookOpen,
  FileText
} from 'lucide-react';

const PALETTE_LEGEND = [
  {
    key: 'not_visited',
    label: 'Not Visited',
    desc: 'You have not visited the question yet.',
    badgeClass: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700'
  },
  {
    key: 'not_answered',
    label: 'Not Answered',
    desc: 'You have visited the question but not answered it.',
    badgeClass: 'bg-red-500 text-white border-red-600'
  },
  {
    key: 'answered',
    label: 'Answered',
    desc: 'You have answered the question.',
    badgeClass: 'bg-emerald-600 text-white border-emerald-700'
  },
  {
    key: 'marked',
    label: 'Marked for Review',
    desc: 'You have marked the question for review without answering.',
    badgeClass: 'bg-purple-600 text-white border-purple-700'
  },
  {
    key: 'answered_marked',
    label: 'Answered & Marked',
    desc: 'You answered the question and marked it for review (will be evaluated).',
    badgeClass: 'bg-purple-700 text-white border-purple-800 relative'
  }
];

export default function Instructions() {
  const { mockTestId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const [mock, setMock] = useState(state?.mockTest || null);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Fallback: fetch mock if navigated directly
  useEffect(() => {
    if (!mock && mockTestId) {
      apiClient
        .get('/mocktests')
        .then(({ data }) => {
          const list = data?.data || [];
          const found = list.find((m) => m._id === mockTestId);
          if (found) setMock(found);
          else {
            // Provide realistic preview mock
            setMock({
              _id: mockTestId,
              title: 'RRB NTPC CBT-2 Full Mock Exam (Practice Set #1)',
              questions: new Array(120).fill(null),
              durationMinutes: 90,
              sections: ['General Awareness', 'Mathematics', 'General Intelligence & Reasoning']
            });
          }
        })
        .catch(() => {
          setMock({
            _id: mockTestId,
            title: 'RRB NTPC CBT-2 Full Mock Exam (Practice Set #1)',
            questions: new Array(120).fill(null),
            durationMinutes: 90,
            sections: ['General Awareness', 'Mathematics', 'General Intelligence & Reasoning']
          });
        });
    }
  }, [mock, mockTestId]);

  async function start() {
    setBusy(true);
    setError('');
    try {
      await document.documentElement.requestFullscreen?.().catch(() => {});
      const { data } = await apiClient.post('/attempts', { mockTestId });
      navigate(`/exam/${data.data.attemptId}`);
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
    } finally {
      setBusy(false);
    }
  }

  const questionCount = mock?.questions?.length || 120;
  const duration = mock?.durationMinutes || 90;

  return (
    <div className="content-container max-w-4xl mx-auto py-8">
      {/* Breadcrumb / Back button */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground hover:text-foreground">
          <Link to="/create-mock">
            <ChevronLeft className="h-4 w-4" />
            Back to Mock Selection
          </Link>
        </Button>
        <Badge variant="outline" className="font-mono text-xs">
          EXAM-ID: {mockTestId?.slice(-6) || 'PREVIEW'}
        </Badge>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="space-y-2 pb-6 border-b">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <FileText className="h-3 w-3" /> CBT Mode
            </Badge>
            <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
              Verified Mock
            </Badge>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {mock?.title || 'Examination Instructions & Guidelines'}
          </CardTitle>
          <CardDescription className="text-sm">
            Please read the instructions carefully before starting the exam. The test environment mirrors the official RRB / TCS iON portal.
          </CardDescription>

          {/* Key Parameters Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/40">
              <Clock className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">Duration</p>
                <p className="text-sm font-semibold tabular-nums">{duration} Minutes</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/40">
              <HelpCircle className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">Questions</p>
                <p className="text-sm font-semibold tabular-nums">{questionCount} Total</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/40">
              <Award className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">Marking</p>
                <p className="text-sm font-semibold tabular-nums">+1.00 / −0.33</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/40">
              <BookOpen className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">Language</p>
                <p className="text-sm font-semibold">Bilingual (हि/En)</p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Rules and Guidelines */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold tracking-tight flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" />
              General Instructions
            </h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <span className="font-semibold text-foreground shrink-0 tabular-nums">1.</span>
                <span>
                  The clock will be set at the server. The countdown timer in the top right corner of the screen will display the remaining time available for you to complete the examination. When the timer reaches zero, the examination ends automatically.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="font-semibold text-foreground shrink-0 tabular-nums">2.</span>
                <span>
                  You can navigate between questions at any time using the Question Palette on the right or the keyboard arrow keys.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="font-semibold text-foreground shrink-0 tabular-nums">3.</span>
                <span>
                  To select your answer, click on the button of one of the options or press keys <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono text-xs text-foreground">1-4</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono text-xs text-foreground">A-D</kbd>. To deselect your chosen answer, click on the <strong>Clear Response</strong> button.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="font-semibold text-foreground shrink-0 tabular-nums">4.</span>
                <span>
                  To save your answer, you MUST click on the <strong>Save & Next</strong> button (<kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono text-xs text-foreground">N</kbd>).
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="font-semibold text-foreground shrink-0 tabular-nums">5.</span>
                <span>
                  To mark the question for review, click on the <strong>Mark for Review & Next</strong> button (<kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono text-xs text-foreground">M</kbd>). If an answer is selected for a question that is Marked for Review, that answer will be considered in the final evaluation.
                </span>
              </li>
            </ul>
          </div>

          <Separator />

          {/* Palette Legend */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold tracking-tight">Question Palette Legend</h3>
            <p className="text-xs text-muted-foreground">
              The Question Palette displayed on the right side of the screen will show the status of each question using one of the following symbols:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PALETTE_LEGEND.map((item) => (
                <div key={item.key} className="flex items-center gap-3 p-3 rounded-lg border bg-card/60">
                  <div
                    className={`h-7 w-7 rounded flex items-center justify-center font-bold text-xs shrink-0 ${item.badgeClass}`}
                  >
                    01
                    {item.key === 'answered_marked' && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-white" />
                    )}
                  </div>
                  <div className="text-xs leading-snug">
                    <p className="font-semibold text-foreground">{item.label}</p>
                    <p className="text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Unable to start exam</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Declaration Checkbox */}
          <div className="rounded-lg border p-4 bg-muted/20 space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="declaration"
                checked={accepted}
                onCheckedChange={(checked) => setAccepted(Boolean(checked))}
                className="mt-0.5"
              />
              <label
                htmlFor="declaration"
                className="text-sm font-medium leading-relaxed cursor-pointer select-none text-foreground"
              >
                I have read and understood all the instructions given above. I undertake that I will abide by all examination rules and conduct guidelines. I understand that unauthorized navigation or closing the window does not pause the server timer.
              </label>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-6 bg-muted/10">
          <p className="text-xs text-muted-foreground">
            {accepted ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Declaration accepted. Ready to proceed.
              </span>
            ) : (
              'You must accept the declaration to unlock the start button.'
            )}
          </p>
          <Button
            size="lg"
            disabled={!accepted || busy}
            onClick={start}
            className="w-full sm:w-auto gap-2 px-8 shadow-sm font-semibold"
          >
            {busy ? (
              <>
                <span className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Initializing Attempt…
              </>
            ) : (
              <>
                I am ready to begin
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
