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
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6">
        <div className="mb-4 flex items-center">
          <AlertCircle className="mr-2 h-6 w-6 text-red-600" />
          <h3 className="text-lg font-medium">Delete Quiz</h3>
        </div>

        {error ? (
          <div className="mb-4 text-red-600">{error}</div>
        ) : (
          <p className="mb-4">
            Are you sure you want to delete "{quiz.title}"?
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={isDeleting}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded bg-red-600 px-3 py-1 text-white"
          >
            {isDeleting ? "Deleting..." : "Delete"}
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

  if (loading) return <p className="mt-10 text-center">Loading...</p>;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button onClick={handleSignOut}>
          <LogOut />
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div>Total Quizzes: {stats.totalQuizzes}</div>
        <div>Attempts: {stats.totalAttempts}</div>
        <div>Avg Score: {stats.averageScore.toFixed(1)}%</div>
      </div>

      {/* Quiz List */}
      <div>
        <button onClick={() => navigate("/create-quiz")}>
          <Plus /> Create Quiz
        </button>

        {recentQuizzes.map((quiz) => (
          <div key={quiz.id} className="mt-2 flex justify-between border p-3">
            <div onClick={() => navigate(`/quiz/${quiz.id}`)}>{quiz.title}</div>

            <div className="flex gap-2">
              <button onClick={() => navigate(`/quiz/${quiz.id}/edit`)}>
                <Pencil />
              </button>

              <button onClick={() => setQuizToDelete(quiz)}>
                <Trash2 />
              </button>
            </div>
          </div>
        ))}
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
