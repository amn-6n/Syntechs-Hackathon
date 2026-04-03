import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../utils/authStore";
import { supabase } from "../utils/supabaseClient";
import { Loader2, Save } from "lucide-react";

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

  if (loading) return <p className="mt-10 text-center">Loading...</p>;

  if (!quiz)
    return (
      <div className="mt-10 text-center">
        <p>Quiz not found</p>
        <button onClick={() => navigate("/dashboard")}>Back</button>
      </div>
    );

  return (
    <div className="p-6">
      <h2>Edit Quiz: {quiz.title}</h2>

      {error && <p className="text-red-500">{error}</p>}

      {questions.map((q, i) => (
        <div key={q.id} className="mt-4 border p-4">
          <input
            value={q.question_text}
            onChange={(e) =>
              handleQuestionChange(i, "question_text", e.target.value)
            }
          />

          <input
            value={q.correct_answer}
            onChange={(e) =>
              handleQuestionChange(i, "correct_answer", e.target.value)
            }
          />

          {q.options.map((opt, j) => (
            <input
              key={j}
              value={opt}
              onChange={(e) => handleOptionChange(i, j, e.target.value)}
            />
          ))}
        </div>
      ))}

      <button onClick={() => navigate("/dashboard")}>Cancel</button>

      <button onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
