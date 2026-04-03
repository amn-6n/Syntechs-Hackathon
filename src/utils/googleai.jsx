import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("Missing Google AI API key");
}

const genAI = new GoogleGenerativeAI(apiKey);

export async function generateQuestions(sourceText, numQuestions) {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
  });

  // Validate inputs
  if (!sourceText || sourceText.trim().length === 0) {
    throw new Error("Source text cannot be empty");
  }

  if (sourceText.length > 30000) {
    throw new Error(
      "Source text is too long. Please provide a shorter text (max 30,000 characters).",
    );
  }

  if (!numQuestions || numQuestions < 1 || numQuestions > 50) {
    throw new Error("Number of questions must be between 1 and 50");
  }

  const prompt = `You are a quiz generator. Create exactly ${numQuestions} multiple choice questions based on the following text.

Rules:
- Each question must have exactly 4 options
- One correct answer
- Options must be unique and different from each other
- Shuffle options randomly (do NOT put correct answer first)
- Make questions clear and concise

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "question_text": "Question here?",
      "correct_answer": "The correct answer",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"]
    }
  ]
}

Text:
${sourceText}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Extract JSON safely
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}") + 1;

    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error("No JSON found in AI response");
    }

    const jsonString = text.slice(jsonStart, jsonEnd);

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (err) {
      console.error("JSON parse error:", err);
      throw new Error("Invalid JSON format from AI response");
    }

    // Validate response structure
    if (!parsed || !Array.isArray(parsed.questions)) {
      throw new Error("Response missing 'questions' array");
    }

    if (parsed.questions.length === 0) {
      throw new Error("No questions returned from AI");
    }

    // Validate each question
    const validated = parsed.questions.map((q, index) => {
      // Check required fields
      if (!q.question_text || typeof q.question_text !== "string") {
        throw new Error(
          `Question ${index + 1}: Missing or invalid question_text`,
        );
      }

      if (!q.correct_answer || typeof q.correct_answer !== "string") {
        throw new Error(
          `Question ${index + 1}: Missing or invalid correct_answer`,
        );
      }

      if (!Array.isArray(q.options)) {
        throw new Error(`Question ${index + 1}: options must be an array`);
      }

      if (q.options.length !== 4) {
        throw new Error(
          `Question ${index + 1}: Must have exactly 4 options, got ${q.options.length}`,
        );
      }

      // Ensure all options are strings
      const cleanOptions = q.options.map((opt) => String(opt).trim());
      const cleanCorrectAnswer = String(q.correct_answer).trim();

      // Check if correct answer exists in options
      if (!cleanOptions.includes(cleanCorrectAnswer)) {
        throw new Error(
          `Question ${index + 1}: Correct answer not found in options`,
        );
      }

      // Check for duplicate options
      const uniqueOptions = new Set(cleanOptions);
      if (uniqueOptions.size !== 4) {
        throw new Error(
          `Question ${index + 1}: Options must be unique (found duplicates)`,
        );
      }

      return {
        question_text: q.question_text.trim(),
        correct_answer: cleanCorrectAnswer,
        options: cleanOptions,
      };
    });

    // Check if we got the expected number of questions
    if (validated.length !== numQuestions) {
      throw new Error(
        `Expected ${numQuestions} questions but got ${validated.length}`,
      );
    }

    return validated;
  } catch (error) {
    console.error("Question generation error:", error);

    // Provide more helpful error messages
    if (error.message.includes("API")) {
      throw new Error("Google AI API error. Please check your API key.");
    }

    throw new Error(
      error.message || "Failed to generate questions. Please try again.",
    );
  }
}
