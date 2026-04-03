import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("Missing Google AI API key");
}

const genAI = new GoogleGenerativeAI(apiKey);

export async function generateQuestions(sourceText, numQuestions) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
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

  const prompt = `You are an expert quiz generator. Create exactly ${numQuestions} multiple choice questions based on the following text.

Rules:
- Each question must have exactly 4 options
- One correct answer
- Options must be unique and different
- Shuffle options randomly (do NOT put correct answer first)
- Make questions clear, concise, and educational
- Questions should test understanding, not just memorization

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "questions": [
    {
      "question_text": "What is the question?",
      "correct_answer": "The correct option text",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"]
    }
  ]
}

Source Material:
${sourceText}`;

  try {
    // Use streaming for better performance
    const response = await model.generateContentStream({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    });

    let fullText = "";

    // Collect all streamed chunks
    for await (const chunk of response.stream) {
      if (chunk.text) {
        fullText += chunk.text;
      }
    }

    if (!fullText) {
      throw new Error("Empty response from AI model");
    }

    // Extract JSON from response
    const jsonStart = fullText.indexOf("{");
    const jsonEnd = fullText.lastIndexOf("}") + 1;

    if (jsonStart === -1 || jsonEnd === 0) {
      console.error("AI Response:", fullText);
      throw new Error("No valid JSON found in AI response");
    }

    const jsonString = fullText.slice(jsonStart, jsonEnd);

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (err) {
      console.error("JSON parse error:", err);
      console.error("Attempted to parse:", jsonString);
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

      // Ensure all options are strings and trim whitespace
      const cleanOptions = q.options.map((opt) => String(opt).trim());
      const cleanCorrectAnswer = String(q.correct_answer).trim();

      // Check if correct answer exists in options
      const normalizedOptions = cleanOptions.map((opt) =>
        opt.toLowerCase().trim(),
      );
      const normalizedCorrect = cleanCorrectAnswer.toLowerCase().trim();

      if (!normalizedOptions.includes(normalizedCorrect)) {
        throw new Error(
          `Question ${index + 1}: Correct answer not found in options`,
        );
      }

      // Check for duplicate options
      const uniqueOptions = new Set(normalizedOptions);
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
    if (error.message.includes("API_KEY")) {
      throw new Error("Invalid or missing Google AI API key");
    }

    if (error.message.includes("429")) {
      throw new Error(
        "Rate limit exceeded. Please wait a moment and try again.",
      );
    }

    if (error.message.includes("503")) {
      throw new Error("AI service temporarily unavailable. Please try again.");
    }

    throw new Error(
      error.message || "Failed to generate questions. Please try again.",
    );
  }
}
