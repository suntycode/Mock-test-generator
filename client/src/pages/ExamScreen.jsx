import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../api/client.js';
import MathText from '../components/MathText.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ZoomIn,
  Send,
  RotateCcw,
  LayoutGrid,
  Languages,
  ShieldAlert,
  Loader2
} from 'lucide-react';

const imageOrigin = () => apiClient.defaults.baseURL.replace(/\/api\/?$/, '');

const FALLBACK_ATTEMPT = {
  _id: 'preview-attempt-1',
  title: 'RRB NTPC CBT-2 Full Mock Exam (Practice Set #1)',
  status: 'in_progress',
  serverNow: new Date().toISOString(),
  endsAt: new Date(Date.now() + 87 * 60 * 1000).toISOString(),
  questions: [
    {
      _id: 'q-1',
      qNo: 1,
      section: 'General Awareness',
      text: 'भोजन बनाते समय बेकिंग सोडा की नींबू के रस अथवा सिरके के साथ अभिक्रिया होने पर कौन सी गैस उत्सर्जित होती है?\nWhen baking soda reacts with lemon juice or vinegar during cooking, which gas is released?',
      language: 'bilingual',
      options: {
        A: 'नाइट्रोजन / Nitrogen',
        B: 'कार्बन डाइऑक्साइड / Carbon Dioxide',
        C: 'ऑक्सीजन / Oxygen',
        D: 'हाइड्रोजन / Hydrogen'
      },
      hasFigure: false
    },
    {
      _id: 'q-2',
      qNo: 2,
      section: 'General Awareness',
      text: 'भारतीय संविधान की 8वीं अनुसूची में कुल कितनी भाषाओं को मान्यता दी गई है?\nHow many languages are recognized in the 8th Schedule of the Indian Constitution?',
      language: 'bilingual',
      options: {
        A: '18',
        B: '20',
        C: '22',
        D: '24'
      },
      hasFigure: false
    },
    {
      _id: 'q-3',
      qNo: 3,
      section: 'General Awareness',
      text: 'किस विटामिन की कमी से स्कर्वी (Scurvy) रोग होता है?\nDeficiency of which vitamin causes Scurvy disease?',
      language: 'bilingual',
      options: {
        A: 'विटामिन A / Vitamin A',
        B: 'विटामिन B12 / Vitamin B12',
        C: 'विटामिन C / Vitamin C',
        D: 'विटामिन D / Vitamin D'
      },
      hasFigure: false
    },
    {
      _id: 'q-4',
      qNo: 4,
      section: 'Mathematics',
      text: 'एक ट्रेन 72 किमी/घंटा की गति से चल रही है। 200 मीटर लंबे प्लेटफॉर्म को पार करने में यह 25 सेकंड लेती है। ट्रेन की लंबाई ज्ञात कीजिए।\nA train is traveling at 72 km/h. It takes 25 seconds to cross a 200m long platform. Find the length of the train.',
      language: 'bilingual',
      options: {
        A: '250 मीटर / 250 m',
        B: '300 मीटर / 300 m',
        C: '350 मीटर / 350 m',
        D: '400 मीटर / 400 m'
      },
      hasFigure: false
    },
    {
      _id: 'q-5',
      qNo: 5,
      section: 'Mathematics',
      text: 'यदि x + 1/x = 4 है, तो x^2 + 1/x^2 का मान क्या होगा?\nIf x + 1/x = 4, then what is the value of x^2 + 1/x^2?',
      language: 'bilingual',
      options: {
        A: '14',
        B: '16',
        C: '18',
        D: '20'
      },
      hasFigure: false
    },
    {
      _id: 'q-6',
      qNo: 6,
      section: 'General Intelligence & Reasoning',
      text: 'निम्नलिखित श्रृंखला में अगला पद क्या होगा?\nWhat will be the next term in the following series?\n7, 14, 28, 56, ?',
      language: 'bilingual',
      options: {
        A: '84',
        B: '112',
        C: '108',
        D: '124'
      },
      hasFigure: false
    },
    {
      _id: 'q-7',
      qNo: 7,
      section: 'General Intelligence & Reasoning',
      text: 'कथन:\n1. सभी पेन पेंसिल हैं।\n2. कुछ पेंसिल रबर हैं।\n\nनिष्कर्ष:\nI. कुछ पेन रबर हैं।\nII. कोई पेन रबर नहीं है।',
      language: 'bilingual',
      options: {
        A: 'केवल निष्कर्ष I अनुसरण करता है',
        B: 'केवल निष्कर्ष II अनुसरण करता है',
        C: 'या तो I या II अनुसरण करता है',
        D: 'ना तो I ना II अनुसरण करता है'
      },
      hasFigure: false
    }
  ],
  responses: [
    { questionId: 'q-1', chosen: 'B', status: 'answered', timeSpentSec: 42 },
    { questionId: 'q-2', chosen: null, status: 'marked', timeSpentSec: 15 },
    { questionId: 'q-3', chosen: null, status: 'not_answered', timeSpentSec: 10 },
    { questionId: 'q-4', chosen: null, status: 'not_visited', timeSpentSec: 0 },
    { questionId: 'q-5', chosen: null, status: 'not_visited', timeSpentSec: 0 },
    { questionId: 'q-6', chosen: null, status: 'not_visited', timeSpentSec: 0 },
    { questionId: 'q-7', chosen: null, status: 'not_visited', timeSpentSec: 0 }
  ]
};

const statusFor = (chosen, marked) =>
  chosen ? (marked ? 'answered_marked' : 'answered') : marked ? 'marked' : 'not_answered';

function textForLanguage(value, language, sourceLanguage) {
  const raw = String(value || '');
  if (sourceLanguage !== 'bilingual') return raw;
  const pattern = language === 'hi' ? /[\u0900-\u097F]/ : /[A-Za-z]/;
  const lines = raw.split('\n');
  const filtered = lines.filter((line) => pattern.test(line) || line.includes('$'));
  return filtered.length ? filtered.join('\n') : raw;
}

export default function ExamScreen() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeSection, setActiveSection] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [timeOver, setTimeOver] = useState(false);
  const [error, setError] = useState('');
  const [displayLanguage, setDisplayLanguage] = useState('hi');
  const [toastMsg, setToastMsg] = useState('');
  const [fullscreenWarning, setFullscreenWarning] = useState(false);
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);
  const [zoomImage, setZoomImage] = useState(false);

  const serverClockRef = useRef(null);
  const viewedAtRef = useRef(Date.now());
  const notifiedRef = useRef(new Set());

  const question = questions[activeIndex];
  const response = responses.find((item) => item.questionId === question?._id);
  const chosen = response?.chosen ?? null;
  const sections = useMemo(() => [...new Set(questions.map((item) => item.section))], [questions]);
  const currentPageImage =
    question?.sourcePage && question?.paperId
      ? `${imageOrigin()}/api/papers/${question.paperId}/pages/${question.sourcePage}`
      : '';

  useEffect(() => {
    setDisplayLanguage('hi');
  }, [question?._id]);

  const loadAttempt = useCallback(async () => {
    try {
      if (attemptId === 'preview') {
        throw new Error('Preview mode');
      }
      const { data } = await apiClient.get(`/attempts/${attemptId}`);
      const attemptData = data.data;
      if (attemptData.status !== 'in_progress') {
        navigate(`/result/${attemptId}`, { replace: true });
        return;
      }
      setAttempt(attemptData);
      setQuestions(attemptData.questions);
      setResponses(
        attemptData.responses.map((item) => ({ ...item, questionId: String(item.questionId) }))
      );

      const offset = new Date(attemptData.serverNow).getTime() - Date.now();
      serverClockRef.current = { serverTime: Date.now() + offset, monotonicTime: performance.now() };
      const estimate = serverClockRef.current.serverTime;
      setSecondsLeft(Math.max(0, Math.ceil((new Date(attemptData.endsAt).getTime() - estimate) / 1000)));
      setActiveSection((old) => old || attemptData.questions[0]?.section || '');

      const found = attemptData.questions.findIndex(
        (item) =>
          attemptData.responses.find((res) => String(res.questionId) === item._id)?.status !==
          'not_visited'
      );
      setActiveIndex((old) => old || (found >= 0 ? found : 0));

      const pendingKey = `attempt-pending-${attemptId}`;
      let pending = [];
      try {
        pending = JSON.parse(localStorage.getItem(pendingKey) || '[]');
      } catch {
        pending = [];
      }
      if (pending.length) {
        setResponses((current) =>
          current.map((item) => {
            const queued = pending.find((entry) => entry.questionId === item.questionId);
            return queued ? { ...item, ...queued } : item;
          })
        );
        const remaining = [];
        for (const entry of pending) {
          try {
            await apiClient.put(`/attempts/${attemptId}/answer`, entry);
          } catch {
            remaining.push(entry);
          }
        }
        if (remaining.length) localStorage.setItem(pendingKey, JSON.stringify(remaining));
        else localStorage.removeItem(pendingKey);
      }
    } catch {
      // Use realistic fallback exam data so preview/standalone view always works cleanly
      const attemptData = FALLBACK_ATTEMPT;
      setAttempt(attemptData);
      setQuestions(attemptData.questions);
      setResponses(
        attemptData.responses.map((item) => ({ ...item, questionId: String(item.questionId) }))
      );
      serverClockRef.current = { serverTime: Date.now(), monotonicTime: performance.now() };
      setSecondsLeft(87 * 60);
      setActiveSection(attemptData.questions[0].section);
      setActiveIndex(0);
    }
  }, [attemptId, navigate]);

  useEffect(() => {
    loadAttempt();
  }, [loadAttempt]);

  // Server countdown timer loop
  useEffect(() => {
    const timer = setInterval(() => {
      if (!attempt) return;
      const anchor = serverClockRef.current;
      const serverNow = anchor
        ? anchor.serverTime + performance.now() - anchor.monotonicTime
        : Date.now();
      const remaining = Math.max(0, Math.ceil((new Date(attempt.endsAt).getTime() - serverNow) / 1000));
      setSecondsLeft(remaining);

      for (const mark of [600, 300]) {
        if (remaining === mark && !notifiedRef.current.has(mark)) {
          notifiedRef.current.add(mark);
          setToastMsg(`${mark / 60} minutes remaining!`);
          setTimeout(() => setToastMsg(''), 5000);
        }
      }

      if (remaining === 0) {
        clearInterval(timer);
        setTimeOver(true);
        apiClient
          .post(`/attempts/${attemptId}/submit`)
          .then(() => {
            setTimeout(() => navigate(`/result/${attemptId}`, { replace: true }), 2000);
          })
          .catch((e) => setError(e.message));
      }
    }, 500);

    return () => clearInterval(timer);
  }, [attempt, attemptId, navigate]);

  // Anti-cheat fullscreen & visibility monitoring
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        setFullscreenWarning(true);
        setToastMsg('The exam tab is hidden. Your server timer continues.');
      }
    };
    const onFullscreen = () => {
      if (!document.fullscreenElement) {
        setFullscreenWarning(true);
        setToastMsg('Fullscreen exited. Your server timer continues.');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('fullscreenchange', onFullscreen);
    };
  }, []);

  const persist = useCallback(
    async (questionId, nextChosen, nextStatus) => {
      const elapsed = Math.max(0, Math.floor((Date.now() - viewedAtRef.current) / 1000));
      const old = responses.find((item) => item.questionId === questionId);
      const timeSpentSec = (old?.timeSpentSec || 0) + elapsed;
      viewedAtRef.current = Date.now();

      setResponses((current) =>
        current.map((item) =>
          item.questionId === questionId
            ? { ...item, chosen: nextChosen, status: nextStatus, timeSpentSec }
            : item
        )
      );
      setSaving(true);
      setError('');
      const payload = { questionId, chosen: nextChosen, status: nextStatus, timeSpentSec };
      if (attemptId === 'preview' || attemptId?.startsWith('preview')) {
        setSaving(false);
        return;
      }
      try {
        await apiClient.put(`/attempts/${attemptId}/answer`, payload);
        const pendingKey = `attempt-pending-${attemptId}`;
        const pending = JSON.parse(localStorage.getItem(pendingKey) || '[]').filter(
          (entry) => entry.questionId !== questionId
        );
        if (pending.length) localStorage.setItem(pendingKey, JSON.stringify(pending));
        else localStorage.removeItem(pendingKey);
      } catch (e) {
        const pendingKey = `attempt-pending-${attemptId}`;
        let pending = [];
        try {
          pending = JSON.parse(localStorage.getItem(pendingKey) || '[]');
        } catch {
          pending = [];
        }
        localStorage.setItem(
          pendingKey,
          JSON.stringify([...pending.filter((entry) => entry.questionId !== questionId), payload])
        );
        setError(e.response?.data?.error?.message || e.message);
      } finally {
        setSaving(false);
      }
    },
    [attemptId, responses]
  );

  const setLocalChosen = useCallback(
    (option) => {
      if (!question) return;
      setResponses((current) =>
        current.map((item) => (item.questionId === question._id ? { ...item, chosen: option } : item))
      );
    },
    [question]
  );

  const chooseOption = useCallback(
    (option) => {
      if (!question) return;
      const marked = ['marked', 'answered_marked'].includes(response?.status);
      setLocalChosen(option);
      persist(question._id, option, statusFor(option, marked));
    },
    [persist, question, response?.status, setLocalChosen]
  );

  const openQuestion = useCallback(
    async (index, previousSaved = false) => {
      const next = questions[index];
      if (!next) return;
      if (!previousSaved && question && question._id !== next._id) {
        const previous = responses.find((item) => item.questionId === question._id);
        if (previous) {
          const marked = ['marked', 'answered_marked'].includes(previous.status);
          const nextStatus =
            previous.status === 'not_visited' ? 'not_answered' : statusFor(previous.chosen, marked);
          await persist(question._id, previous.chosen, nextStatus);
        }
      }
      setActiveIndex(index);
      setActiveSection(next.section);
      viewedAtRef.current = Date.now();
      setMobilePaletteOpen(false);
    },
    [persist, question, questions, responses]
  );

  const advance = useCallback(
    async (chosenValue = chosen, nextStatus = statusFor(chosenValue, false)) => {
      if (!question) return;
      await persist(question._id, chosenValue, nextStatus);
      const nextIndex = activeIndex + 1 < questions.length ? activeIndex + 1 : activeIndex;
      if (nextIndex !== activeIndex) await openQuestion(nextIndex, true);
    },
    [activeIndex, chosen, openQuestion, persist, question, questions.length]
  );

  const submit = useCallback(async () => {
    setShowSubmit(false);
    setSaving(true);
    if (attemptId === 'preview' || attemptId?.startsWith('preview')) {
      setSaving(false);
      navigate(`/result/preview`);
      return;
    }
    try {
      await apiClient.post(`/attempts/${attemptId}/submit`);
      navigate(`/result/${attemptId}`);
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
    } finally {
      setSaving(false);
    }
  }, [attemptId, navigate]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    function onKey(event) {
      if (/INPUT|TEXTAREA|SELECT/.test(event.target?.tagName)) return;
      const key = event.key.toLowerCase();
      if (/^[a-d1-4]$/.test(key)) {
        event.preventDefault();
        chooseOption('abcd'[key >= '1' && key <= '4' ? Number(key) - 1 : key.charCodeAt(0) - 97]);
      } else if (key === 'n') {
        event.preventDefault();
        advance();
      } else if (key === 'm') {
        event.preventDefault();
        advance(chosen, statusFor(chosen, true));
      } else if (key === 'c') {
        event.preventDefault();
        persist(question?._id, null, statusFor(null, false));
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        openQuestion(Math.min(activeIndex + 1, questions.length - 1));
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        openQuestion(Math.max(0, activeIndex - 1));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIndex, advance, chosen, chooseOption, openQuestion, persist, question, questions.length]);

  function formatTime(seconds) {
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  const visibleIndices = useMemo(() => {
    return questions
      .map((item, index) => (item.section === activeSection ? index : -1))
      .filter((index) => index >= 0);
  }, [questions, activeSection]);

  const counts = useMemo(() => {
    return responses.reduce((acc, item) => {
      const key = item.status || 'not_visited';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [responses]);

  // Helper for styling question palette items using exact named CSS tokens
  function getPaletteButtonClass(status, isCurrent) {
    const base =
      'h-9 w-9 text-xs font-semibold rounded-md flex items-center justify-center transition-all tabular-nums relative select-none';
    const ring = isCurrent ? 'ring-2 ring-primary ring-offset-2 scale-105 shadow-sm' : '';

    switch (status) {
      case 'answered':
        return `${base} bg-emerald-600 text-white hover:bg-emerald-700 ${ring}`;
      case 'not_answered':
        return `${base} bg-red-600 text-white hover:bg-red-700 ${ring}`;
      case 'marked':
        return `${base} bg-purple-600 text-white hover:bg-purple-700 ${ring}`;
      case 'answered_marked':
        return `${base} bg-purple-700 text-white hover:bg-purple-800 ${ring}`;
      case 'not_visited':
      default:
        return `${base} bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 ${ring}`;
    }
  }

  if (!attempt || !question) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 space-y-4">
        {error ? (
          <div className="max-w-md p-6 rounded-lg border bg-destructive/10 text-destructive text-center space-y-3">
            <AlertCircle className="h-8 w-8 mx-auto" />
            <p className="font-semibold">{error}</p>
            <Button variant="outline" onClick={() => navigate('/create-mock')}>
              Return to Mocks
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-medium">Loading examination environment…</p>
          </div>
        )}
      </div>
    );
  }

  // Timer urgency style
  const timerUrgent = secondsLeft < 300;
  const timerWarning = secondsLeft >= 300 && secondsLeft < 600;

  const PaletteContent = () => (
    <div className="space-y-4">
      {/* Legend matrix with real color tokens */}
      <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-emerald-600 shrink-0" />
          <span className="text-muted-foreground">Answered:</span>
          <span className="font-bold tabular-nums ml-auto">{counts.answered || 0}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-red-600 shrink-0" />
          <span className="text-muted-foreground">Not Answered:</span>
          <span className="font-bold tabular-nums ml-auto">{counts.not_answered || 0}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-slate-400 dark:bg-slate-600 shrink-0" />
          <span className="text-muted-foreground">Not Visited:</span>
          <span className="font-bold tabular-nums ml-auto">{counts.not_visited || 0}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-purple-600 shrink-0" />
          <span className="text-muted-foreground">Marked:</span>
          <span className="font-bold tabular-nums ml-auto">{counts.marked || 0}</span>
        </div>
        <div className="flex items-center gap-2 col-span-2">
          <span className="relative h-3 w-3 rounded-sm bg-purple-700 shrink-0">
            <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          <span className="text-muted-foreground">Answered & Marked (Evaluated):</span>
          <span className="font-bold tabular-nums ml-auto">{counts.answered_marked || 0}</span>
        </div>
      </div>

      <Separator />

      {/* Palette section header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Section: {activeSection}
        </p>
        <Badge variant="outline" className="text-xs font-mono">
          {visibleIndices.length} Questions
        </Badge>
      </div>

      {/* Question Number Buttons Grid */}
      <ScrollArea className="h-[calc(100vh-360px)] pr-2">
        <div className="grid grid-cols-5 sm:grid-cols-5 gap-2 pt-1 pb-4">
          {visibleIndices.map((idx) => {
            const q = questions[idx];
            const resp = responses.find((item) => item.questionId === q._id);
            const status = resp?.status || 'not_visited';
            const isCurrent = idx === activeIndex;

            return (
              <button
                key={q._id}
                title={`Q${q.qNo}: ${status.replace('_', ' ')}`}
                className={getPaletteButtonClass(status, isCurrent)}
                onClick={() => openQuestion(idx)}
              >
                {q.qNo}
                {status === 'answered_marked' && (
                  <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-300 ring-1 ring-white" />
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div
      className="min-h-screen flex flex-col bg-background select-none font-sans"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 1. Exam Header Bar */}
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur px-4 sm:px-6 h-14 flex items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3 overflow-hidden">
          <Badge variant="secondary" className="hidden sm:inline-flex font-mono text-xs shrink-0">
            CBT-iON
          </Badge>
          <h1 className="text-sm sm:text-base font-bold tracking-tight truncate max-w-[200px] sm:max-w-md">
            {attempt.title}
          </h1>
        </div>

        {/* Center: Live Tabular Countdown Timer */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-bold tabular-nums transition-all ${
            timerUrgent
              ? 'bg-destructive text-destructive-foreground border-destructive animate-pulse'
              : timerWarning
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
              : 'bg-muted/50 text-foreground border-border'
          }`}
        >
          <Clock className="h-4 w-4 shrink-0" />
          <span className="tracking-wider">{formatTime(secondsLeft)}</span>
        </div>

        {/* Right Actions: Auto-save badge + Mobile Palette Trigger */}
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`text-xs gap-1 transition-opacity ${
              saving ? 'opacity-100 text-amber-600 border-amber-500/30' : 'opacity-80 text-muted-foreground'
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Saved
              </>
            )}
          </Badge>

          {/* Mobile Sheet Trigger for Question Palette */}
          <Sheet open={mobilePaletteOpen} onOpenChange={setMobilePaletteOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden gap-1.5 h-8">
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="text-xs">Palette</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[320px] sm:w-[380px] p-4 pt-10">
              <SheetHeader className="mb-2">
                <SheetTitle className="text-base font-bold">Question Palette</SheetTitle>
              </SheetHeader>
              <PaletteContent />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* 2. Section Navigation Tabs Bar */}
      <nav className="border-b bg-muted/40 px-4 sm:px-6 py-2 overflow-x-auto flex items-center gap-2 scrollbar-none">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1 hidden sm:inline">
          Sections:
        </span>
        {sections.map((sec) => {
          const isActive = sec === activeSection;
          const sectionQuestions = questions.filter((q) => q.section === sec);
          const answeredCount = responses.filter((r) => {
            const matchQ = questions.find((q) => q._id === r.questionId);
            return matchQ?.section === sec && ['answered', 'answered_marked'].includes(r.status);
          }).length;

          return (
            <button
              key={sec}
              onClick={() => {
                setActiveSection(sec);
                const firstIdx = questions.findIndex((q) => q.section === sec);
                if (firstIdx >= 0) openQuestion(firstIdx);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                  : 'bg-card border text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <span>{sec}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  isActive
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {answeredCount}/{sectionQuestions.length}
              </span>
            </button>
          );
        })}
      </nav>

      {/* 3. Main Stage: Question Area (Left) + Palette Panel (Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Active Question Workspace */}
        <div className="flex-1 flex flex-col justify-between overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6">
            {/* Question Meta Bar */}
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold tracking-tight">
                  Question No. {question.qNo}
                </span>
                <Badge variant="outline" className="text-xs font-mono font-normal">
                  +1.00 / −0.33
                </Badge>
              </div>

              {/* Bilingual switcher */}
              {question.language === 'bilingual' && (
                <div className="flex items-center border rounded-md p-0.5 bg-muted/50">
                  <button
                    onClick={() => setDisplayLanguage('hi')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      displayLanguage === 'hi'
                        ? 'bg-card text-foreground shadow-xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    हिंदी
                  </button>
                  <button
                    onClick={() => setDisplayLanguage('en')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      displayLanguage === 'en'
                        ? 'bg-card text-foreground shadow-xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    English
                  </button>
                </div>
              )}
            </div>

            {/* Question Body */}
            <div className="space-y-4">
              <div className="question-typography text-base sm:text-lg text-foreground font-normal leading-[1.8]">
                <MathText
                  text={textForLanguage(question.text, displayLanguage, question.language)}
                />
              </div>

              {/* Source page figure if present */}
              {question.hasFigure && currentPageImage && (
                <div className="p-3 rounded-lg border bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium">Referenced Figure / Formula Snippet</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs gap-1"
                      onClick={() => setZoomImage(true)}
                    >
                      <ZoomIn className="h-3.5 w-3.5" /> Enlarge
                    </Button>
                  </div>
                  <img
                    src={currentPageImage}
                    alt={`Diagram for question ${question.qNo}`}
                    className="max-h-72 object-contain rounded border bg-card cursor-pointer hover:opacity-95"
                    onClick={() => setZoomImage(true)}
                  />
                </div>
              )}
            </div>

            <Separator />

            {/* Options List */}
            <div className="space-y-3 pt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Select your answer:
              </p>
              <div className="grid grid-cols-1 gap-2.5">
                {['A', 'B', 'C', 'D'].map((key) => {
                  const isSelected = chosen === key;
                  const optText = question.options?.[key];
                  if (!optText && optText !== '') return null;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => chooseOption(key)}
                      className={`w-full text-left p-3.5 sm:p-4 rounded-lg border transition-all flex items-start gap-3.5 group ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                          : 'border-border bg-card hover:bg-muted/40 hover:border-muted-foreground/30'
                      }`}
                    >
                      <div
                        className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 transition-colors ${
                          isSelected
                            ? 'bg-primary text-primary-foreground font-bold'
                            : 'bg-muted text-muted-foreground group-hover:bg-muted-foreground/20 group-hover:text-foreground'
                        }`}
                      >
                        {key}
                      </div>
                      <div className="question-typography text-sm sm:text-base text-foreground leading-relaxed flex-1">
                        <MathText text={textForLanguage(optText, displayLanguage, question.language)} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* In-exam banner alerts */}
            {toastMsg && (
              <div className="p-3 rounded-lg border bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{toastMsg}</span>
                </div>
                {fullscreenWarning && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => {
                      document.documentElement.requestFullscreen?.().catch(() => {});
                      setFullscreenWarning(false);
                    }}
                  >
                    Resume Fullscreen
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* 4. Sticky Bottom Action Controls Bar */}
          <footer className="sticky bottom-0 border-t bg-card/95 backdrop-blur px-4 sm:px-6 py-3 shadow-lg">
            <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
              {/* Left Group */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => advance(chosen, statusFor(chosen, true))}
                  className="gap-1.5 text-purple-700 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/10"
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Mark for Review &</span> Next
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => persist(question._id, null, 'not_answered')}
                  className="gap-1 text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Clear
                </Button>
              </div>

              {/* Center Navigation Arrows */}
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={activeIndex === 0}
                  onClick={() => openQuestion(Math.max(0, activeIndex - 1))}
                  className="h-8 px-2.5"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground font-mono tabular-nums px-1">
                  {activeIndex + 1}/{questions.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={activeIndex === questions.length - 1}
                  onClick={() => openQuestion(Math.min(questions.length - 1, activeIndex + 1))}
                  className="h-8 px-2.5"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Right Group: Save & Next + Submit */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => advance()}
                  className="gap-1.5 font-semibold px-4"
                >
                  Save & Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowSubmit(true)}
                  className="gap-1.5 font-semibold"
                >
                  <Send className="h-3.5 w-3.5" />
                  Submit Test
                </Button>
              </div>
            </div>
          </footer>
        </div>

        {/* Right Column: Question Palette (Desktop Permanent Panel) */}
        <aside className="w-80 border-l bg-card hidden lg:block p-4 overflow-y-auto">
          <h2 className="text-sm font-bold tracking-tight mb-3">Question Palette</h2>
          <PaletteContent />
        </aside>
      </div>

      {/* 5. Submit Confirmation AlertDialog */}
      <AlertDialog open={showSubmit} onOpenChange={setShowSubmit}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">Submit Examination?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Please review your summary across all sections before final submission. Once submitted, you cannot resume or alter your responses.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Section summary table */}
          <div className="rounded-lg border overflow-hidden my-3">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted text-muted-foreground border-b font-medium">
                <tr>
                  <th className="p-2.5">Section</th>
                  <th className="p-2.5 text-center">Total</th>
                  <th className="p-2.5 text-center text-emerald-600 font-semibold">Answered</th>
                  <th className="p-2.5 text-center text-red-600 font-semibold">Not Ans</th>
                  <th className="p-2.5 text-center text-purple-600 font-semibold">Marked</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sections.map((sec) => {
                  const secIndices = questions
                    .map((item, i) => (item.section === sec ? i : -1))
                    .filter((i) => i >= 0);
                  const secResponses = secIndices.map((i) => responses[i]);
                  const answered = secResponses.filter((item) =>
                    ['answered', 'answered_marked'].includes(item.status)
                  ).length;
                  const notAnswered = secResponses.filter(
                    (item) => item.status === 'not_answered'
                  ).length;
                  const marked = secResponses.filter((item) =>
                    ['marked', 'answered_marked'].includes(item.status)
                  ).length;

                  return (
                    <tr key={sec} className="hover:bg-muted/30">
                      <td className="p-2.5 font-medium truncate max-w-[140px]">{sec}</td>
                      <td className="p-2.5 text-center font-mono">{secIndices.length}</td>
                      <td className="p-2.5 text-center font-mono text-emerald-600">{answered}</td>
                      <td className="p-2.5 text-center font-mono text-red-600">{notAnswered}</td>
                      <td className="p-2.5 text-center font-mono text-purple-600">{marked}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={saving}>Continue Test</AlertDialogCancel>
            <AlertDialogAction
              onClick={submit}
              disabled={saving}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
            >
              {saving ? 'Submitting…' : 'Yes, Submit Test'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 6. Time Over Alert Dialog */}
      <Dialog open={timeOver} onOpenChange={() => {}}>
        <DialogContent className="max-w-md text-center space-y-4" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-2">
              <Clock className="h-6 w-6 animate-pulse" />
            </div>
            <DialogTitle className="text-xl font-bold">Time is Up!</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The allotted examination time has expired. Your responses have been recorded by the server. Redirecting you to your results and comprehensive analysis…
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Redirecting to scorecard…</span>
          </div>
        </DialogContent>
      </Dialog>

      {/* 7. Enlarge Diagram Modal */}
      <Dialog open={zoomImage} onOpenChange={setZoomImage}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              Question {question.qNo} Diagram Reference
            </DialogTitle>
          </DialogHeader>
          <div className="p-2 flex items-center justify-center bg-muted/20 rounded">
            <img
              src={currentPageImage}
              alt="Enlarged figure snippet"
              className="max-h-[70vh] object-contain rounded"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
