import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("Missing Google AI API key");
}

const ai = new GoogleGenAI({ apiKey });

export async function generateQuestions(sourceText, numQuestions) {
  const model = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
  });

  // Limit text size
  if (sourceText.length > 30000) {
    throw new Error("Source text is too long. Please provide a shorter text.");
  }

  const prompt = `
You are a quiz generator. Create exactly ${numQuestions} multiple choice questions based on the following text.

Rules:
- Each question must have exactly 4 options
- One correct answer
- Options must be unique
- Shuffle options randomly

Return ONLY JSON in this format:
{
  "questions": [
    {
      "question_text": "Question here?",
      "correct_answer": "Correct answer here",
      "options": ["A", "B", "C", "D"]
    }
  ]
}

Text:
${sourceText}
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Extract JSON safely
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}") + 1;
    const jsonString = text.slice(jsonStart, jsonEnd);

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (err) {
      console.error("JSON parse error:", err);
      throw new Error("Invalid JSON response from AI");
    }

    if (!parsed || !Array.isArray(parsed.questions)) {
      throw new Error("Invalid response format");
    }

    const validated = parsed.questions.map((q) => {
      if (
        !q.question_text ||
        !q.correct_answer ||
        !Array.isArray(q.options) ||
        q.options.length !== 4
      ) {
        throw new Error("Invalid question format");
      }

      // Ensure correct answer exists in options
      if (!q.options.includes(q.correct_answer)) {
        q.options[0] = q.correct_answer;
      }

      // Remove duplicates
      q.options = [...new Set(q.options)];

      if (q.options.length < 4) {
        throw new Error("Not enough unique options");
      }

      return {
        question_text: q.question_text,
        correct_answer: q.correct_answer,
        options: q.options,
      };
    });

    if (validated.length !== numQuestions) {
      throw new Error("Incorrect number of questions generated");
    }

    return validated;
  } catch (error) {
    console.error("Gemini error:", error);
    throw new Error("Failed to generate questions");
  }
}
