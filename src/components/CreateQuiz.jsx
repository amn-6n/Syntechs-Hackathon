import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../utils/authStore";
import { supabase } from "../utils/supabaseClient";
import { generateQuestions } from "../utils/gorqai";
import { AlertCircle, FileText, Loader2 } from "lucide-react";

export function CreateQuiz() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [title, setTitle] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(10);
  const [sourceText, setSourceText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isMissingTimeLimitColumnError = (message) => {
    if (!message) return false;
    const text = message.toLowerCase();
    return (
      text.includes("time_limit_minutes") &&
      text.includes("could not find") &&
      text.includes("schema cache")
    );
  };

  const handleNumQuestionsChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1 && value <= 50) {
      setNumQuestions(value);
    }
  };

  const handleTimeLimitChange = (e) => {
    const value = Number(e.target.value);
    if (!Number.isFinite(value)) return;

    const clampedValue = Math.min(180, Math.max(1, value));
    setTimeLimitMinutes(clampedValue);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Generate questions using Google AI
      let generatedQuestions;
      try {
        generatedQuestions = await generateQuestions(sourceText, numQuestions);
      } catch (err) {
        setError(err.message);
        setLoading(false);
        return;
      }

      // Create the quiz. If the DB schema is not yet migrated, retry without time_limit_minutes.
      const baseQuizPayload = {
        title,
        user_id: user?.id,
        source_text: sourceText,
        num_questions: numQuestions,
      };

      let quiz;
      let quizError;

      ({ data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          ...baseQuizPayload,
          time_limit_minutes: timeLimitMinutes,
        })
        .select()
        .single());

      if (quizError && isMissingTimeLimitColumnError(quizError.message)) {
        ({ data: quiz, error: quizError } = await supabase
          .from("quizzes")
          .insert(baseQuizPayload)
          .select()
          .single());

        if (!quizError) {
          setError(
            "Quiz created, but timer is disabled until your database migration is applied.",
          );
        }
      }

      if (quizError) throw quizError;
      if (!quiz) throw new Error("Failed to create quiz");

      // Insert the generated questions
      const questionsToInsert = generatedQuestions.map((q) => ({
        quiz_id: quiz.id,
        question_text: q.question_text,
        correct_answer: q.correct_answer,
        options: q.options,
      }));

      const { error: questionsError } = await supabase
        .from("questions")
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      // Navigate directly to take the quiz
      navigate(`/quiz/${quiz.id}`);
    } catch (err) {
      console.error("Error creating quiz:", err);
      setError(err.message || "Failed to create quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mb-4 inline-block rounded-full bg-indigo-100 p-4">
            <FileText className="h-8 w-8 text-indigo-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">Create New Quiz</h1>
          <p className="mt-3 text-lg text-gray-600">
            Generate AI-powered questions from your content in seconds
          </p>
        </div>

        {/* Main Form Card */}
        <div className="rounded-2xl bg-white shadow-xl">
          <div className="px-6 py-10 sm:px-10">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Error Alert */}
              {error && (
                <div className="rounded-xl border-l-4 border-red-500 bg-red-50 p-5">
                  <div className="flex gap-3">
                    <div className="mt-0.5">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-900">Error</h3>
                      <p className="mt-1 text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Quiz Title Input */}
              <div>
                <label
                  htmlFor="title"
                  className="mb-2 block text-sm font-semibold text-gray-900"
                >
                  Quiz Title
                </label>
                <input
                  type="text"
                  id="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 placeholder-gray-500 transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  placeholder="e.g., JavaScript Fundamentals"
                  disabled={loading}
                />
                <p className="mt-2 text-sm text-gray-500">
                  Give your quiz a descriptive name
                </p>
              </div>

              {/* Number of Questions Slider */}
              <div>
                <label
                  htmlFor="numQuestions"
                  className="mb-2 block text-sm font-semibold text-gray-900"
                >
                  Number of Questions
                </label>
                <div className="space-y-4">
                  <input
                    type="range"
                    id="numQuestions"
                    min="1"
                    max="50"
                    value={numQuestions}
                    onChange={handleNumQuestionsChange}
                    className="h-3 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-indigo-600 disabled:opacity-50"
                    disabled={loading}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">1 question</span>
                    <span className="rounded-lg bg-indigo-100 px-3 py-1 font-semibold text-indigo-700">
                      {numQuestions}{" "}
                      {numQuestions === 1 ? "question" : "questions"}
                    </span>
                    <span className="text-sm text-gray-500">50 questions</span>
                  </div>
                </div>
              </div>

              {/* Time Limit Slider */}
              <div>
                <label
                  htmlFor="timeLimit"
                  className="mb-2 block text-sm font-semibold text-gray-900"
                >
                  Quiz Time Limit
                </label>
                <div className="space-y-4">
                  <input
                    type="range"
                    id="timeLimit"
                    min="1"
                    max="180"
                    step="1"
                    value={timeLimitMinutes}
                    onInput={handleTimeLimitChange}
                    onChange={handleTimeLimitChange}
                    className="h-3 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-indigo-600 disabled:opacity-50"
                    disabled={loading}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">1 min</span>
                    <span className="rounded-lg bg-indigo-100 px-3 py-1 font-semibold text-indigo-700">
                      {timeLimitMinutes}{" "}
                      {timeLimitMinutes === 1 ? "minute" : "minutes"}
                    </span>
                    <span className="text-sm text-gray-500">180 min</span>
                  </div>
                </div>
              </div>

              {/* Source Text Textarea */}
              <div>
                <label
                  htmlFor="sourceText"
                  className="mb-2 block text-sm font-semibold text-gray-900"
                >
                  Source Content
                </label>
                <textarea
                  id="sourceText"
                  rows={8}
                  required
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 placeholder-gray-500 transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  placeholder="Paste your learning material, lecture notes, books, articles, or any text content here. The AI will generate questions based on this content..."
                  disabled={loading}
                />
                <div className="mt-2 flex justify-between text-sm">
                  <p className="text-gray-500">
                    Paste content that will be analyzed to generate questions
                  </p>
                  <p className="text-gray-500">
                    {sourceText.length > 0
                      ? `${sourceText.length} characters`
                      : "0 characters"}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  disabled={loading}
                  className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 rounded-lg bg-linear-to-r from-indigo-600 to-indigo-700 px-6 py-3 font-medium text-white transition hover:from-indigo-700 hover:to-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating Questions...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      <span>Create Quiz</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-6">
          <h3 className="mb-2 font-semibold text-blue-900">
            💡 Tips for Best Results
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• Use clear, well-structured content for better questions</li>
            <li>• Include headings and key points in your source material</li>
            <li>• Longer content generates more diverse questions</li>
            <li>• AI will create multiple-choice questions automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
