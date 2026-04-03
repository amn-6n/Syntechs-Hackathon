import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../utils/authStore";
import { supabase } from "../utils/supabaseClient";
import { Loader2, Save, ArrowLeft, AlertCircle, Copy } from "lucide-react";

export function EditQuiz() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        if (!user) throw new Error("Please login");

        const { data: quizData } = await supabase
          .from("quizzes")
          .select("*")
          .eq("id", id)
          .eq("user_id", user.id)
          .single();

        if (!quizData) throw new Error("Quiz not found");

        const { data: questionData } = await supabase
          .from("questions")
          .select("*")
          .eq("quiz_id", id)
          .order("id", { ascending: true });

        setQuiz(quizData);
        setQuestions(questionData || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, user]);

  const handleQuestionChange = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex, oIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);

    try {
      await supabase.from("questions").upsert(
        questions.map((q) => ({
          ...q,
          quiz_id: id,
        })),
      );

      navigate("/dashboard");
    } catch (err) {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );

  if (!quiz)
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="rounded-xl bg-white p-8 shadow-lg">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <p className="text-lg font-semibold text-gray-900">Quiz not found</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-2 text-white transition hover:bg-indigo-700"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate("/dashboard")}
              className="mb-4 flex items-center gap-2 text-indigo-600 transition hover:text-indigo-700"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
            <h1 className="text-4xl font-bold text-gray-900">Edit Quiz</h1>
            <p className="mt-1 text-lg text-gray-600">{quiz.title}</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 rounded-xl border-l-4 border-red-500 bg-red-50 p-5">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">Error</h3>
                <p className="mt-1 text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Questions List */}
        <div className="space-y-6">
          {questions.length === 0 ? (
            <div className="rounded-xl bg-white p-12 text-center shadow-md">
              <AlertCircle size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-lg text-gray-600">No questions found</p>
            </div>
          ) : (
            questions.map((q, i) => (
              <div key={q.id} className="rounded-xl bg-white p-6 shadow-md">
                {/* Question Number */}
                <div className="mb-4 flex items-center justify-between">
                  <span className="inline-block rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
                    Question {i + 1}
                  </span>
                </div>

                {/* Question Text */}
                <div className="mb-6">
                  <label className="mb-2 block text-sm font-semibold text-gray-900">
                    Question
                  </label>
                  <textarea
                    value={q.question_text}
                    onChange={(e) =>
                      handleQuestionChange(i, "question_text", e.target.value)
                    }
                    rows={3}
                    className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 placeholder-gray-500 transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    placeholder="Enter the question text..."
                  />
                </div>

                {/* Correct Answer */}
                <div className="mb-6">
                  <label className="mb-2 block text-sm font-semibold text-gray-900">
                    Correct Answer
                  </label>
                  <input
                    type="text"
                    value={q.correct_answer}
                    onChange={(e) =>
                      handleQuestionChange(i, "correct_answer", e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 placeholder-gray-500 transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    placeholder="Enter the correct answer..."
                  />
                </div>

                {/* Options */}
                <div>
                  <label className="mb-3 block text-sm font-semibold text-gray-900">
                    Options
                  </label>
                  <div className="space-y-3">
                    {q.options &&
                      q.options.map((opt, j) => (
                        <div key={j} className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-700">
                            {String.fromCharCode(65 + j)}
                          </span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) =>
                              handleOptionChange(i, j, e.target.value)
                            }
                            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 placeholder-gray-500 transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                            placeholder={`Option ${String.fromCharCode(65 + j)}`}
                          />
                          {opt === q.correct_answer && (
                            <span className="inline-block rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                              ✓ Correct
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-10 flex justify-end gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            disabled={saving}
            className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-linear-to-r from-indigo-600 to-indigo-700 px-6 py-3 font-medium text-white transition hover:from-indigo-700 hover:to-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
