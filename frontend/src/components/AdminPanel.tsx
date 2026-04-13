import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  adminLogin,
  createAdminQuestion,
  createAdminTeam,
  deleteAllAdminQuestions,
  deleteAllAdminTeams,
  deleteAdminQuestion,
  deleteAdminTeam,
  getAdminQuestions,
  getAdminTeams,
  type RoundQuestion,
  updateAdminQuestion,
  wipeAdminDatabase,
} from '@/lib/api';

const ADMIN_SESSION_KEY = 'quest-admin-session';

function createEmptyQuestion(nextRound: number): RoundQuestion {
  return {
    round: nextRound,
    p1: { title: '', code: '', hint: '', ans: '', output: '' },
    coord: { lat: '', lng: '', place: '' },
    volunteer: { name: '', initials: '', bg: 'bg-indigo-100', color: 'text-indigo-700' },
    p2: { title: '', code: '', hint: '', ans: '', output: '' },
    qrPasskey: '',
    cx: 0.5,
    cy: 0.5,
  };
}

interface AdminPanelProps {
  onBack: () => void;
}

export function AdminPanel({ onBack }: AdminPanelProps) {
  const [token, setToken] = useState<string | null>(() => window.localStorage.getItem(ADMIN_SESSION_KEY));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [teams, setTeams] = useState<Array<{ id: string; name: string; email: string; createdAt: string; lastLoginAt: string | null }>>([]);
  const [questions, setQuestions] = useState<RoundQuestion[]>([]);
  const [loading, setLoading] = useState(false);

  const [teamName, setTeamName] = useState('');
  const [teamEmail, setTeamEmail] = useState('');
  const [teamPassword, setTeamPassword] = useState('');

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [draftQuestion, setDraftQuestion] = useState<RoundQuestion>(createEmptyQuestion(1));

  const nextRoundNumber = useMemo(() => {
    return Math.max(1, ...questions.map((question) => question.round)) + 1;
  }, [questions]);

  const refreshData = async (sessionToken: string) => {
    const [teamsResponse, questionsResponse] = await Promise.all([
      getAdminTeams(sessionToken),
      getAdminQuestions(sessionToken),
    ]);
    setTeams(teamsResponse.teams);
    setQuestions(questionsResponse.questions);
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    refreshData(token)
      .catch((refreshError) => {
        setError(refreshError instanceof Error ? refreshError.message : 'Failed to load admin data');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleAdminLogin = async () => {
    setError(null);
    try {
      const response = await adminLogin(email, password);
      window.localStorage.setItem(ADMIN_SESSION_KEY, response.token);
      setToken(response.token);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed');
    }
  };

  const handleAdminLogout = () => {
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
    setToken(null);
    setError(null);
  };

  const handleCreateTeam = async () => {
    if (!token) return;
    setError(null);
    try {
      await createAdminTeam(token, { name: teamName, email: teamEmail, password: teamPassword });
      setTeamName('');
      setTeamEmail('');
      setTeamPassword('');
      await refreshData(token);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create team');
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!token) return;
    setError(null);
    try {
      await deleteAdminTeam(token, teamId);
      await refreshData(token);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete team');
    }
  };

  const handleDeleteAllTeams = async () => {
    if (!token) return;
    const confirmed = window.confirm('Delete all teams? This will clear all team progress.');
    if (!confirmed) return;

    setError(null);
    try {
      await deleteAllAdminTeams(token);
      await refreshData(token);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete all teams');
    }
  };

  const handleEditQuestion = (question: RoundQuestion) => {
    setEditingQuestionId(question.id || null);
    setDraftQuestion(question);
  };

  const handleSaveQuestion = async () => {
    if (!token) return;
    setError(null);
    try {
      if (editingQuestionId) {
        await updateAdminQuestion(token, editingQuestionId, draftQuestion);
      } else {
        await createAdminQuestion(token, draftQuestion);
      }

      setEditingQuestionId(null);
      setDraftQuestion(createEmptyQuestion(nextRoundNumber));
      await refreshData(token);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save question');
    }
  };

  const handleDeleteQuestion = async (questionId: string | undefined) => {
    if (!token || !questionId) return;
    setError(null);
    try {
      await deleteAdminQuestion(token, questionId);
      await refreshData(token);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete question');
    }
  };

  const handleDeleteAllQuestions = async () => {
    if (!token) return;
    const confirmed = window.confirm('Delete all questions? This cannot be undone.');
    if (!confirmed) return;

    setError(null);
    try {
      await deleteAllAdminQuestions(token);
      setEditingQuestionId(null);
      setDraftQuestion(createEmptyQuestion(1));
      await refreshData(token);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete all questions');
    }
  };

  const handleWipeDatabase = async () => {
    if (!token) return;
    const confirmed = window.confirm('Delete ALL teams and ALL questions from database? This is irreversible.');
    if (!confirmed) return;

    setError(null);
    try {
      await wipeAdminDatabase(token);
      setEditingQuestionId(null);
      setDraftQuestion(createEmptyQuestion(1));
      await refreshData(token);
    } catch (wipeError) {
      setError(wipeError instanceof Error ? wipeError.message : 'Failed to wipe database');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
            <CardDescription>Sign in to manage teams and questions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Admin email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <Input placeholder="Admin password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && handleAdminLogin()} />
            {error && <div className="rounded-md bg-red-50 text-red-700 p-3 text-sm">{error}</div>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onBack}>Back</Button>
              <Button className="flex-1" onClick={handleAdminLogin}>Login</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack}>Back</Button>
            <Button variant="outline" onClick={handleAdminLogout}>Logout</Button>
          </div>
        </div>

        {error && <div className="rounded-md bg-red-50 text-red-700 p-3 text-sm">{error}</div>}

        <Card>
          <CardHeader>
            <CardTitle>Create Team</CardTitle>
            <CardDescription>Add a team with email and password.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <Input placeholder="Team name" value={teamName} onChange={(event) => setTeamName(event.target.value)} />
            <Input placeholder="Team email" value={teamEmail} onChange={(event) => setTeamEmail(event.target.value)} />
            <Input placeholder="Team password" type="password" value={teamPassword} onChange={(event) => setTeamPassword(event.target.value)} />
            <Button onClick={handleCreateTeam}>Create Team</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teams</CardTitle>
            <CardDescription>Current teams in the system.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-end">
              <Button className="bg-red-600 text-white hover:bg-red-700" onClick={handleDeleteAllTeams}>Delete All Teams</Button>
            </div>
            {teams.map((team) => (
              <div key={team.id} className="flex flex-col md:flex-row md:items-center md:justify-between rounded-md border border-zinc-200 dark:border-zinc-800 p-3 gap-2">
                <div>
                  <div className="font-semibold">{team.name}</div>
                  <div className="text-xs text-zinc-500">{team.email || 'No email'}</div>
                </div>
                <Button variant="outline" onClick={() => handleDeleteTeam(team.id)}>Delete</Button>
              </div>
            ))}
            {!teams.length && !loading && <div className="text-sm text-zinc-500">No teams yet.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{editingQuestionId ? 'Edit Question' : 'Add Question'}</CardTitle>
            <CardDescription>Manage puzzle, answer, hint, location and metadata.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Round" type="number" value={draftQuestion.round} onChange={(event) => setDraftQuestion({ ...draftQuestion, round: Number(event.target.value) })} />
            <Input placeholder="QR Passkey" value={draftQuestion.qrPasskey} onChange={(event) => setDraftQuestion({ ...draftQuestion, qrPasskey: event.target.value })} />

            <Input placeholder="P1 Title" value={draftQuestion.p1.title} onChange={(event) => setDraftQuestion({ ...draftQuestion, p1: { ...draftQuestion.p1, title: event.target.value } })} />
            <Input placeholder="P1 Answer" value={draftQuestion.p1.ans} onChange={(event) => setDraftQuestion({ ...draftQuestion, p1: { ...draftQuestion.p1, ans: event.target.value } })} />
            <Input placeholder="P1 Code" value={draftQuestion.p1.code} onChange={(event) => setDraftQuestion({ ...draftQuestion, p1: { ...draftQuestion.p1, code: event.target.value } })} />
            <Input placeholder="P1 Hint" value={draftQuestion.p1.hint} onChange={(event) => setDraftQuestion({ ...draftQuestion, p1: { ...draftQuestion.p1, hint: event.target.value } })} />

            <Input placeholder="P2 Title" value={draftQuestion.p2.title} onChange={(event) => setDraftQuestion({ ...draftQuestion, p2: { ...draftQuestion.p2, title: event.target.value } })} />
            <Input placeholder="P2 Answer" value={draftQuestion.p2.ans} onChange={(event) => setDraftQuestion({ ...draftQuestion, p2: { ...draftQuestion.p2, ans: event.target.value } })} />
            <Input placeholder="P2 Code" value={draftQuestion.p2.code} onChange={(event) => setDraftQuestion({ ...draftQuestion, p2: { ...draftQuestion.p2, code: event.target.value } })} />
            <Input placeholder="P2 Hint" value={draftQuestion.p2.hint} onChange={(event) => setDraftQuestion({ ...draftQuestion, p2: { ...draftQuestion.p2, hint: event.target.value } })} />

            <Input placeholder="Latitude" value={draftQuestion.coord.lat} onChange={(event) => setDraftQuestion({ ...draftQuestion, coord: { ...draftQuestion.coord, lat: event.target.value } })} />
            <Input placeholder="Longitude" value={draftQuestion.coord.lng} onChange={(event) => setDraftQuestion({ ...draftQuestion, coord: { ...draftQuestion.coord, lng: event.target.value } })} />
            <Input placeholder="Place" value={draftQuestion.coord.place} onChange={(event) => setDraftQuestion({ ...draftQuestion, coord: { ...draftQuestion.coord, place: event.target.value } })} />
            <Input placeholder="Volunteer Name" value={draftQuestion.volunteer.name} onChange={(event) => setDraftQuestion({ ...draftQuestion, volunteer: { ...draftQuestion.volunteer, name: event.target.value } })} />

            <Input placeholder="Volunteer Initials" value={draftQuestion.volunteer.initials} onChange={(event) => setDraftQuestion({ ...draftQuestion, volunteer: { ...draftQuestion.volunteer, initials: event.target.value } })} />
            <Input placeholder="Volunteer BG class" value={draftQuestion.volunteer.bg} onChange={(event) => setDraftQuestion({ ...draftQuestion, volunteer: { ...draftQuestion.volunteer, bg: event.target.value } })} />
            <Input placeholder="Volunteer color class" value={draftQuestion.volunteer.color} onChange={(event) => setDraftQuestion({ ...draftQuestion, volunteer: { ...draftQuestion.volunteer, color: event.target.value } })} />
            <Input placeholder="Map X (0..1)" type="number" step="0.01" value={draftQuestion.cx} onChange={(event) => setDraftQuestion({ ...draftQuestion, cx: Number(event.target.value) })} />
            <Input placeholder="Map Y (0..1)" type="number" step="0.01" value={draftQuestion.cy} onChange={(event) => setDraftQuestion({ ...draftQuestion, cy: Number(event.target.value) })} />

            <div className="md:col-span-2 flex gap-2">
              <Button onClick={handleSaveQuestion}>{editingQuestionId ? 'Update Question' : 'Add Question'}</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingQuestionId(null);
                  setDraftQuestion(createEmptyQuestion(nextRoundNumber));
                }}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Questions</CardTitle>
            <CardDescription>Add, edit, remove rounds.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-end">
              <Button className="bg-red-600 text-white hover:bg-red-700" onClick={handleDeleteAllQuestions}>Delete All Questions</Button>
            </div>
            {questions
              .slice()
              .sort((a, b) => a.round - b.round)
              .map((question) => (
                <div key={question.id || question.round} className="rounded-md border border-zinc-200 dark:border-zinc-800 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <div className="font-semibold">Round {question.round}: {question.p1.title}</div>
                    <div className="text-xs text-zinc-500">Hint: {question.p1.hint}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleEditQuestion(question)}>Edit</Button>
                    <Button variant="outline" onClick={() => handleDeleteQuestion(question.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            {!questions.length && !loading && <div className="text-sm text-zinc-500">No questions yet.</div>}
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-900/40">
          <CardHeader>
            <CardTitle>Danger Zone</CardTitle>
            <CardDescription>Remove all collections from database in one action.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="bg-red-700 text-white hover:bg-red-800" onClick={handleWipeDatabase}>Delete All Data From DB</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
