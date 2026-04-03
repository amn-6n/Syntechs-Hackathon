import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../utils/authStore";
import { supabase } from "../utils/supabaseClient";
import { generateQuestions } from "../utils/googleai";
import { AlertCircle, FileText, Loader2 } from "lucide-react";

export function CreateQuiz() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [title, setTitle] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [sourceText, setSourceText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleNumQuestionsChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1 && value <= 50) {
      setNumQuestions(value);
    }
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

      // Create the quiz
      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          title,
          user_id: user?.id,
          source_text: sourceText,
          num_questions: numQuestions,
        })
        .select()
        .single();

      if (quizError) throw quizError;
      if (!quiz) throw new Error("Failed to create quiz");

      // Insert the generated questions
      const questionsToInsert = generatedQuestions.map((q) => ({
        quiz_id: quiz.id,
        question_text: q.question_text,
        correct_answer: q.correct_answer,
        options: q.options,
      }));

      const { error } = await supabase
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
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <FileText className="mx-auto h-12 w-12 text-indigo-600" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Create New Quiz
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Generate questions automatically from your content
          </p>
        </div>

        <div className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">{error}</div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700"
              >
                Quiz Title
              </label>
              <input
                type="text"
                id="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Enter quiz title"
              />
            </div>

            <div>
              <label
                htmlFor="numQuestions"
                className="block text-sm font-medium text-gray-700"
              >
                Number of Questions
              </label>
              <input
                type="number"
                id="numQuestions"
                min="1"
                max="50"
                value={numQuestions}
                onChange={handleNumQuestionsChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Choose between 1 and 50 questions
              </p>
            </div>

            <div>
              <label
                htmlFor="sourceText"
                className="block text-sm font-medium text-gray-700"
              >
                Source Content
              </label>
              <textarea
                id="sourceText"
                rows={6}
                required
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Paste your content here or write your own text..."
              />
              <p className="mt-1 text-sm text-gray-500">
                Questions will be generated based on this content using AI
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 -ml-1 h-4 w-4 animate-spin" />
                    Creating Quiz...
                  </>
                ) : (
                  "Create Quiz"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
