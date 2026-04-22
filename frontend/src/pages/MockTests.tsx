import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import {
  Award,
  CheckCircle,
  ChevronRight,
  Clock,
  FileQuestion,
  Flag,
  HelpCircle,
  Loader2,
  PlayCircle,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  X
} from 'lucide-react';

type Notice = { type: 'success' | 'error'; text: string } | null;

type Question = {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
};

type TestResult = {
  id: string;
  score: number;
  attemptedAt: string;
};

type MockTest = {
  id: string;
  title: string;
  description?: string | null;
  passingScore: number;
  timeLimitMinutes: number;
  questions: Question[];
  results: TestResult[];
};

type ReviewItem = {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  selectedAnswer: string | null;
  isCorrect: boolean;
};

type SubmissionResult = {
  score: number;
  passed: boolean;
  correctCount: number;
  totalQuestions: number;
  review: ReviewItem[];
};

const getErrorMessage = (err: any, fallback: string) =>
  err.response?.data?.error || err.response?.data?.details || err.message || fallback;

const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-sm font-medium text-slate-700 mb-1">
    {children} <span className="text-red-500">*</span>
  </label>
);

const QUESTION_SECONDS = 30;

export default function MockTests() {
  const { user } = useAuthStore();
  const [tests, setTests] = useState<MockTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', passingScore: '70', timeLimitMinutes: '30' });
  const [searchTerm, setSearchTerm] = useState('');
  const [notice, setNotice] = useState<Notice>(null);

  const [activeTest, setActiveTest] = useState<MockTest | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);

  const fetchTests = async () => {
    try {
      const res = await api.get('/mock-tests');
      setTests(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  useEffect(() => {
    if (!activeTest || submissionResult) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          const question = activeTest.questions[currentQuestionIndex];
          const isLast = currentQuestionIndex === activeTest.questions.length - 1;

          if (question && !answers[question.id]) {
            setAnswers((prev) => ({ ...prev, [question.id]: '' }));
          }

          if (isLast) {
            window.setTimeout(() => {
              void submitTest(activeTest, answers, true);
            }, 0);
          } else {
            setCurrentQuestionIndex((prev) => prev + 1);
            return QUESTION_SECONDS;
          }
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeTest, currentQuestionIndex, answers, submissionResult]);

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      await api.post('/mock-tests', formData);
      setIsCreateOpen(false);
      setFormData({ title: '', description: '', passingScore: '70', timeLimitMinutes: '30' });
      setNotice({ type: 'success', text: `${formData.title} was created successfully.` });
      fetchTests();
    } catch (err: any) {
      setNotice({ type: 'error', text: getErrorMessage(err, 'Cannot create mock test right now.') });
    } finally {
      setSaving(false);
    }
  };

  const seedRoadSafetyTest = async () => {
    setSeeding(true);
    setNotice(null);
    try {
      await api.post('/mock-tests/seed-road-safety');
      setNotice({ type: 'success', text: 'Road Safety Essentials has been added with 15 questions.' });
      await fetchTests();
    } catch (err: any) {
      setNotice({ type: 'error', text: getErrorMessage(err, 'Cannot seed the built-in mock test right now.') });
    } finally {
      setSeeding(false);
    }
  };

  const startTest = (test: MockTest) => {
    setActiveTest(test);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setSecondsLeft(QUESTION_SECONDS);
    setSubmissionResult(null);
    setNotice(null);
  };

  const closeTestPlayer = () => {
    setActiveTest(null);
    setSubmissionResult(null);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setSecondsLeft(QUESTION_SECONDS);
  };

  const chooseAnswer = (questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const goToQuestion = (nextIndex: number) => {
    setCurrentQuestionIndex(nextIndex);
    setSecondsLeft(QUESTION_SECONDS);
  };

  const submitTest = async (test: MockTest, currentAnswers: Record<string, string>, silent = false) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/mock-tests/${test.id}/submit`, { answers: currentAnswers });
      setSubmissionResult(res.data);
      await fetchTests();
      if (!silent) {
        setNotice({ type: 'success', text: 'Test submitted successfully.' });
      }
    } catch (err: any) {
      setNotice({ type: 'error', text: getErrorMessage(err, 'Cannot submit the mock test right now.') });
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(
    () => tests.filter((test) => test.title.toLowerCase().includes(searchTerm.toLowerCase())),
    [tests, searchTerm]
  );

  const activeQuestion = activeTest?.questions[currentQuestionIndex];
  const progressPct = activeTest ? Math.round(((currentQuestionIndex + 1) / activeTest.questions.length) * 100) : 0;
  const timerPct = Math.max((secondsLeft / QUESTION_SECONDS) * 100, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mock Tests</h1>
          <p className="text-slate-500">
            {user?.role === 'STUDENT'
              ? 'Take timed theory tests, review your answers, and track your progress.'
              : 'Manage theory tests and launch polished student practice sessions.'}
          </p>
        </div>
        {user?.role === 'ADMIN' && (
          <div className="flex items-center gap-3">
            <button
              onClick={seedRoadSafetyTest}
              disabled={seeding}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60"
            >
              {seeding ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              Add Road Safety Test
            </button>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2"
            >
              <Plus size={18} /> Create Test
            </button>
          </div>
        )}
      </div>

      {notice && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${
          notice.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {notice.text}
        </div>
      )}

      {user?.role === 'STUDENT' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Available Tests</p>
              <p className="text-2xl font-bold text-slate-800 mt-2">{tests.length}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Attempts Made</p>
              <p className="text-2xl font-bold text-emerald-800 mt-2">{tests.reduce((sum, test) => sum + (test.results?.length || 0), 0)}</p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Best Score</p>
              <p className="text-2xl font-bold text-amber-800 mt-2">
                {tests.flatMap((test) => test.results || []).length > 0
                  ? `${Math.max(...tests.flatMap((test) => test.results.map((result) => result.score)))}%`
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search tests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center text-emerald-500">
            <Loader2 className="animate-spin" size={32} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
            {filtered.map((test) => {
              const latestResult = test.results?.[0];
              return (
                <div key={test.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col">
                  <div className="p-6 flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-blue-600 text-white rounded-xl flex items-center justify-center shadow-sm">
                        {user?.role === 'STUDENT' ? <ShieldCheck size={22} /> : <FileQuestion size={22} />}
                      </div>
                      <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-md">
                        {test.questions?.length || 0} Qs
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-800 text-lg mb-2">{test.title}</h3>
                    <p className="text-slate-500 text-sm mb-4 min-h-[40px]">{test.description || 'No description provided.'}</p>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock size={15} className="text-slate-400" />
                        <span>{test.timeLimitMinutes} minute total test window</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle size={15} className="text-slate-400" />
                        <span>Passing score: {test.passingScore}%</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Award size={15} className="text-slate-400" />
                        <span>30 seconds per question</span>
                      </div>
                    </div>

                    {user?.role === 'STUDENT' && latestResult && (
                      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Latest Result</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-lg font-bold text-slate-800">{latestResult.score}%</p>
                          <p className="text-xs text-slate-400">{new Date(latestResult.attemptedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      {user?.role === 'STUDENT'
                        ? `${test.results?.length || 0} attempt${test.results?.length !== 1 ? 's' : ''}`
                        : `${test.results?.length || 0} student${test.results?.length !== 1 ? 's' : ''} attempted`}
                    </span>
                    {user?.role === 'STUDENT' && (
                      <button
                        onClick={() => startTest(test)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
                      >
                        <PlayCircle size={16} /> Start Test
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="col-span-full text-center p-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                <HelpCircle size={48} className="mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-bold text-slate-700">No Mock Tests Available</h3>
                <p className="text-slate-500 mt-2">
                  {user?.role === 'ADMIN'
                    ? 'Add the built-in road safety test or create one manually.'
                    : 'Check back later or ask your admin to add a mock test.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Create Mock Test</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateTest} className="p-6 space-y-4">
              <div>
                <RequiredLabel>Test Title</RequiredLabel>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="e.g. Traffic Signs & Signals"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                  placeholder="What does this test cover?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <RequiredLabel>Passing Score (%)</RequiredLabel>
                  <input
                    type="number"
                    required
                    min="1"
                    max="100"
                    value={formData.passingScore}
                    onChange={(e) => setFormData({ ...formData, passingScore: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <RequiredLabel>Time Limit (mins)</RequiredLabel>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.timeLimitMinutes}
                    onChange={(e) => setFormData({ ...formData, timeLimitMinutes: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors flex justify-center items-center">
                  {saving ? <Loader2 className="animate-spin" size={18} /> : 'Create Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTest && activeQuestion && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden max-h-[94vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 mb-3">
                    <Trophy size={14} /> Live Mock Test
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">{activeTest.title}</h2>
                  <p className="text-sm text-slate-500 mt-1">{activeTest.description}</p>
                </div>
                <button onClick={closeTestPlayer} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
                <div className="rounded-xl bg-white border border-slate-200 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Question</p>
                  <p className="text-lg font-bold text-slate-800 mt-2">
                    {currentQuestionIndex + 1} / {activeTest.questions.length}
                  </p>
                </div>
                <div className="rounded-xl bg-white border border-slate-200 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Progress</p>
                  <p className="text-lg font-bold text-slate-800 mt-2">{progressPct}%</p>
                </div>
                <div className="rounded-xl bg-white border border-slate-200 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Time Left</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className={`text-lg font-bold ${secondsLeft <= 10 ? 'text-red-600 animate-pulse' : 'text-slate-800'}`}>
                      {secondsLeft}s
                    </p>
                    <Clock size={18} className={secondsLeft <= 10 ? 'text-red-500' : 'text-slate-400'} />
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className={`h-full transition-all duration-1000 ${secondsLeft <= 10 ? 'bg-red-500' : 'bg-amber-400'}`} style={{ width: `${timerPct}%` }} />
                </div>
              </div>
            </div>

            {!submissionResult ? (
              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_320px] gap-6 p-6 overflow-y-auto">
                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6 animate-in fade-in duration-300">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Question {currentQuestionIndex + 1}</p>
                    <h3 className="text-2xl font-bold text-slate-800 leading-tight">{activeQuestion.text}</h3>
                  </div>

                  <div className="space-y-3">
                    {activeQuestion.options.map((option, index) => {
                      const selected = answers[activeQuestion.id] === option;
                      return (
                        <button
                          key={option}
                          onClick={() => chooseAnswer(activeQuestion.id, option)}
                          className={`w-full text-left rounded-2xl border px-5 py-4 transition-all duration-200 ${
                            selected
                              ? 'border-emerald-500 bg-emerald-50 shadow-sm scale-[1.01]'
                              : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                              selected ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {String.fromCharCode(65 + index)}
                            </div>
                            <span className="text-base font-medium text-slate-800">{option}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      onClick={() => goToQuestion(Math.max(currentQuestionIndex - 1, 0))}
                      disabled={currentQuestionIndex === 0}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Previous
                    </button>

                    {currentQuestionIndex === activeTest.questions.length - 1 ? (
                      <button
                        onClick={() => submitTest(activeTest, answers)}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {submitting ? <Loader2 size={18} className="animate-spin" /> : <Flag size={18} />}
                        Submit Test
                      </button>
                    ) : (
                      <button
                        onClick={() => goToQuestion(currentQuestionIndex + 1)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
                      >
                        Next Question <ChevronRight size={18} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 h-fit">
                  <h3 className="text-base font-bold text-slate-800 mb-4">Question Map</h3>
                  <div className="grid grid-cols-5 gap-2">
                    {activeTest.questions.map((question, index) => {
                      const answered = Object.prototype.hasOwnProperty.call(answers, question.id);
                      const current = index === currentQuestionIndex;
                      return (
                        <button
                          key={question.id}
                          onClick={() => goToQuestion(index)}
                          className={`aspect-square rounded-xl text-sm font-bold transition-colors ${
                            current
                              ? 'bg-blue-600 text-white'
                              : answered
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {index + 1}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-5 space-y-2 text-xs text-slate-500">
                    <p><span className="font-semibold text-blue-600">Blue</span> means current question.</p>
                    <p><span className="font-semibold text-emerald-600">Green</span> means answered.</p>
                    <p>Unanswered questions will be scored as incorrect.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 overflow-y-auto space-y-6">
                <div className={`rounded-2xl p-6 border ${
                  submissionResult.passed ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                        submissionResult.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {submissionResult.passed ? <Trophy size={14} /> : <Flag size={14} />}
                        {submissionResult.passed ? 'Passed' : 'Needs Practice'}
                      </div>
                      <h3 className="text-3xl font-bold text-slate-800 mt-4">{submissionResult.score}%</h3>
                      <p className="text-sm text-slate-600 mt-2">
                        You got {submissionResult.correctCount} out of {submissionResult.totalQuestions} questions correct.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Target</p>
                      <p className="text-lg font-bold text-slate-800 mt-2">{activeTest.passingScore}%</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Fees of Focus</p>
                    <p className="text-lg font-bold text-slate-800 mt-2">Road Rules</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Correct Answers</p>
                    <p className="text-lg font-bold text-slate-800 mt-2">{submissionResult.correctCount}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Questions Reviewed</p>
                    <p className="text-lg font-bold text-slate-800 mt-2">{submissionResult.review.length}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 p-5">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Answer Review</h3>
                  <div className="space-y-4">
                    {submissionResult.review.map((item, index) => (
                      <div key={item.id} className={`rounded-xl border p-4 ${
                        item.isCorrect ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
                      }`}>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Question {index + 1}</p>
                            <h4 className="text-base font-bold text-slate-800 mt-2">{item.text}</h4>
                          </div>
                          {item.isCorrect ? (
                            <CheckCircle className="text-emerald-600 shrink-0" size={20} />
                          ) : (
                            <X className="text-red-500 shrink-0" size={20} />
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-3">Your answer: <span className="font-semibold">{item.selectedAnswer || 'No answer selected'}</span></p>
                        <p className="text-sm text-slate-600 mt-1">Correct answer: <span className="font-semibold">{item.correctAnswer}</span></p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button onClick={closeTestPlayer} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">
                    Close
                  </button>
                  <button
                    onClick={() => startTest(activeTest)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                  >
                    <PlayCircle size={18} /> Try Again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
