import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../utils/authStore";
import { supabase } from "../utils/supabaseClient";
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  LogOut,
  Plus,
  Trash2,
  Trophy,
  Pencil,
} from "lucide-react";

function DeleteModal({ quiz, onClose, onConfirm, isDeleting, error }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-full bg-red-100 p-3">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900">Delete Quiz</h3>
        </div>

        {error ? (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700">
            {error}
          </div>
        ) : (
          <p className="mb-6 text-gray-600">
            Are you sure you want to delete{" "}
            <span className="font-semibold">"{quiz.title}"</span>? This action
            cannot be undone.
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={18} />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const [stats, setStats] = useState({
    totalQuizzes: 0,
    totalAttempts: 0,
    averageScore: 0,
  });

  const [recentQuizzes, setRecentQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quizToDelete, setQuizToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const fetchDashboardData = async () => {
    if (!user?.id) return;

    try {
      const { data: recent } = await supabase
        .from("quizzes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      const { data: attempts } = await supabase
        .from("quiz_attempts")
        .select("score")
        .eq("user_id", user.id);

      const totalQuizzes = recent?.length || 0;
      const totalAttempts = attempts?.length || 0;
      const averageScore =
        attempts?.reduce((acc, curr) => acc + curr.score, 0) / totalAttempts ||
        0;

      setStats({ totalQuizzes, totalAttempts, averageScore });
      setRecentQuizzes(recent || []);
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.id]);

  const handleDeleteQuiz = async () => {
    if (!quizToDelete) return;

    setIsDeleting(true);

    try {
      await supabase.from("questions").delete().eq("quiz_id", quizToDelete.id);
      await supabase
        .from("quiz_attempts")
        .delete()
        .eq("quiz_id", quizToDelete.id);

      await supabase.from("quizzes").delete().eq("id", quizToDelete.id);

      setRecentQuizzes((prev) => prev.filter((q) => q.id !== quizToDelete.id));

      setQuizToDelete(null);
    } catch (err) {
      setDeleteError("Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">
                Welcome back, {user?.user_metadata?.full_name || "User"}!
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-red-600 transition hover:bg-red-100"
            >
              <LogOut size={20} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Stats Cards */}
        <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Total Quizzes Card */}
          <div className="rounded-xl bg-white p-6 shadow-md transition hover:shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Quizzes
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {stats.totalQuizzes}
                </p>
              </div>
              <div className="rounded-full bg-blue-100 p-3">
                <BookOpen size={24} className="text-blue-600" />
              </div>
            </div>
          </div>

          {/* Total Attempts Card */}
          <div className="rounded-xl bg-white p-6 shadow-md transition hover:shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Attempts
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {stats.totalAttempts}
                </p>
              </div>
              <div className="rounded-full bg-green-100 p-3">
                <BarChart3 size={24} className="text-green-600" />
              </div>
            </div>
          </div>

          {/* Average Score Card */}
          <div className="rounded-xl bg-white p-6 shadow-md transition hover:shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Average Score
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {stats.averageScore.toFixed(1)}%
                </p>
              </div>
              <div className="rounded-full bg-yellow-100 p-3">
                <Trophy size={24} className="text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Create Quiz Button */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/create-quiz")}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-3 text-white transition hover:from-indigo-700 hover:to-indigo-800"
          >
            <Plus size={20} />
            <span className="font-medium">Create New Quiz</span>
          </button>
        </div>

        {/* Recent Quizzes Section */}
        <div>
          <h2 className="mb-6 text-2xl font-bold text-gray-900">
            Recent Quizzes
          </h2>

          {recentQuizzes.length === 0 ? (
            <div className="rounded-xl bg-white p-12 text-center shadow-md">
              <BookOpen size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">
                No quizzes yet. Create one to get started!
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {recentQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="group rounded-xl bg-white p-6 shadow-md transition hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => navigate(`/quiz/${quiz.id}`)}
                    >
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600">
                        {quiz.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {quiz.description || "No description"}
                      </p>
                      <p className="mt-2 text-xs text-gray-400">
                        Created{" "}
                        {new Date(quiz.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/quiz/${quiz.id}/edit`)}
                        className="rounded-lg bg-blue-50 p-2 text-blue-600 transition hover:bg-blue-100"
                        title="Edit Quiz"
                      >
                        <Pencil size={18} />
                      </button>

                      <button
                        onClick={() => setQuizToDelete(quiz)}
                        className="rounded-lg bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
                        title="Delete Quiz"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {quizToDelete && (
        <DeleteModal
          quiz={quizToDelete}
          onClose={() => setQuizToDelete(null)}
          onConfirm={handleDeleteQuiz}
          isDeleting={isDeleting}
          error={deleteError}
        />
      )}
    </div>
  );
}
