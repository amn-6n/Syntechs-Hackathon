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
  ArrowLeft,
  Home,
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

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
          <LogIn className="mx-auto mb-4 h-12 w-12 text-indigo-600" />
          <h2 className="mb-2 text-2xl font-bold text-gray-900">
            Sign in required
          </h2>
          <p className="mb-6 text-gray-600">Please log in to take this quiz</p>
          <button
            onClick={() => navigate("/login")}
            className="w-full rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-600" />
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Error</h2>
          <p className="mb-6 text-gray-600">{error || "Quiz not found"}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-700"
          >
            <Home size={18} />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (showResults) {
    const correct = questions.filter(
      (q, i) => q.correct_answer === selectedAnswers[i],
    ).length;
    const percentage = (correct / questions.length) * 100;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Result Header */}
          <div className="mb-10 rounded-2xl bg-white p-8 shadow-xl">
            <div className="mx-auto max-w-xs text-center">
              {percentage >= 80 ? (
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
              ) : percentage >= 60 ? (
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100">
                  <AlertCircle className="h-12 w-12 text-yellow-600" />
                </div>
              ) : (
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                  <XCircle className="h-12 w-12 text-red-600" />
                </div>
              )}

              <h2 className="text-4xl font-bold text-gray-900">
                {percentage.toFixed(1)}%
              </h2>
              <p className="mt-2 text-lg text-gray-600">
                {correct} out of {questions.length} correct
              </p>

              {percentage >= 80 && (
                <p className="mt-4 font-semibold text-green-600">
                  🎉 Excellent performance!
                </p>
              )}
              {percentage >= 60 && percentage < 80 && (
                <p className="mt-4 font-semibold text-yellow-600">
                  👍 Good job! Keep practicing.
                </p>
              )}
              {percentage < 60 && (
                <p className="mt-4 font-semibold text-red-600">
                  💪 Review the answers and try again.
                </p>
              )}
            </div>
          </div>

          {/* Review Section */}
          <div className="mb-8">
            <h3 className="mb-6 text-2xl font-bold text-gray-900">
              Review Answers
            </h3>
            <div className="space-y-4">
              {questions.map((q, i) => {
                const isCorrect = q.correct_answer === selectedAnswers[i];
                return (
                  <div
                    key={q.id}
                    className={`rounded-xl border-l-4 p-6 ${
                      isCorrect
                        ? "border-green-500 bg-green-50"
                        : "border-red-500 bg-red-50"
                    } bg-white shadow-md`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-lg font-semibold text-gray-900">
                        Question {i + 1}
                      </h4>
                      {isCorrect ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-600" />
                      )}
                    </div>

                    <p className="mb-4 text-gray-700">{q.question_text}</p>

                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold">Your answer:</span>{" "}
                        <span
                          className={
                            isCorrect
                              ? "font-medium text-green-700"
                              : "font-medium text-red-700"
                          }
                        >
                          {selectedAnswers[i] || "Not answered"}
                        </span>
                      </p>
                      {!isCorrect && (
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">Correct answer:</span>{" "}
                          <span className="font-medium text-green-700">
                            {q.correct_answer}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-600 px-6 py-3 font-medium text-white transition hover:bg-gray-700"
            >
              <Home size={18} />
              Back to Dashboard
            </button>
            <button
              onClick={() => {
                setCurrentQuestion(0);
                setSelectedAnswers(new Array(questions.length).fill(""));
                setShowResults(false);
              }}
              className="flex-1 rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-700"
            >
              Retake Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="mb-6 flex items-center gap-2 text-indigo-600 transition hover:text-indigo-700"
          >
            <ArrowLeft size={20} />
            <span>Exit Quiz</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{quiz.title}</h1>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow-md">
          <div className="mb-3 flex justify-between">
            <span className="text-sm font-semibold text-gray-700">
              Question {currentQuestion + 1} of {questions.length}
            </span>
            <span className="text-sm font-semibold text-indigo-600">
              {progress.toFixed(0)}%
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-gray-200">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-indigo-600 to-indigo-700 transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Question Card */}
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          {/* Question */}
          <div className="mb-8">
            <span className="mb-4 inline-block rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
              Question {currentQuestion + 1}
            </span>
            <h2 className="text-2xl font-bold text-gray-900">
              {question.question_text}
            </h2>
          </div>

          {/* Options */}
          <div className="mb-8 space-y-3">
            {question.options &&
              question.options.map((opt, i) => {
                const isSelected = selectedAnswers[currentQuestion] === opt;
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswerSelect(opt)}
                    disabled={submitting}
                    className={`w-full rounded-lg border-2 p-4 text-left transition ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50"
                        : "border-gray-200 bg-white hover:border-indigo-300"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full font-semibold ${
                          isSelected
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span className="font-medium text-gray-900">{opt}</span>
                    </div>
                  </button>
                );
              })}
          </div>

          {/* Next Button */}
          <div className="flex gap-4">
            <button
              onClick={() => {
                if (currentQuestion > 0) {
                  setCurrentQuestion((prev) => prev - 1);
                }
              }}
              disabled={currentQuestion === 0 || submitting}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={!selectedAnswers[currentQuestion] || submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-3 font-medium text-white transition hover:from-indigo-700 hover:to-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : currentQuestion === questions.length - 1 ? (
                "Finish Quiz"
              ) : (
                "Next Question"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
