import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../utils/authStore";
import { supabase } from "../utils/supabaseClient";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  XCircle,
  LogIn,
  Pencil,
} from "lucide-react";

export function TakeQuiz() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchQuiz() {
      if (!id || !user) {
        setError("Invalid access");
        setLoading(false);
        return;
      }

      try {
        const { data: quizData } = await supabase
          .from("quizzes")
          .select("*")
          .eq("id", id)
          .single();

        if (!quizData) throw new Error("Quiz not found");

        setQuiz(quizData);

        const { data: questionData } = await supabase
          .from("questions")
          .select("*")
          .eq("quiz_id", id);

        if (!questionData || questionData.length === 0) {
          throw new Error("No questions found");
        }

        setQuestions(questionData);
        setSelectedAnswers(new Array(questionData.length).fill(""));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchQuiz();
  }, [id, user]);

  const handleAnswerSelect = (answer) => {
    if (submitting) return;

    const updated = [...selectedAnswers];
    updated[currentQuestion] = answer;
    setSelectedAnswers(updated);
  };

  const handleNext = async () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      await calculateScore();
    }
  };

  const calculateScore = async () => {
    setSubmitting(true);

    try {
      const correct = questions.filter(
        (q, i) => q.correct_answer === selectedAnswers[i],
      ).length;

      const finalScore = (correct / questions.length) * 100;

      await supabase.from("quiz_attempts").insert({
        quiz_id: id,
        user_id: user.id,
        score: finalScore,
        answers: selectedAnswers,
      });

      setScore(finalScore);
      setShowResults(true);
    } catch (err) {
      setError("Failed to save result");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="mt-10 text-center">Loading...</p>;

  if (!user) {
    return (
      <div className="mt-10 text-center">
        <LogIn />
        <p>Please login</p>
        <button onClick={() => navigate("/login")}>Login</button>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="mt-10 text-center">
        <AlertCircle />
        <p>{error}</p>
        <button onClick={() => navigate("/dashboard")}>Back</button>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="p-6">
        <h2>Result</h2>
        <h3>{score.toFixed(1)}%</h3>

        {questions.map((q, i) => (
          <div key={q.id}>
            <p>{q.question_text}</p>
            <p>Your: {selectedAnswers[i]}</p>
            <p>Correct: {q.correct_answer}</p>
          </div>
        ))}

        <button onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const question = questions[currentQuestion];

  return (
    <div className="p-6">
      <h2>{quiz.title}</h2>
      <p>
        {currentQuestion + 1} / {questions.length}
      </p>

      <h3>{question.question_text}</h3>

      {question.options.map((opt, i) => (
        <button key={i} onClick={() => handleAnswerSelect(opt)}>
          {opt}
        </button>
      ))}

      <button onClick={handleNext} disabled={!selectedAnswers[currentQuestion]}>
        {currentQuestion === questions.length - 1 ? "Finish" : "Next"}
      </button>
    </div>
  );
}
