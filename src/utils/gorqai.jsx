import Groq from "groq-sdk";

const apiKey = import.meta.env.VITE_GROQ_API_KEY;

if (!apiKey) {
  throw new Error("Missing Groq API key");
}

const groq = new Groq({
  apiKey,
  dangerouslyAllowBrowser: true,
});

export async function generateQuestions(sourceText, numQuestions) {
  if (!sourceText || sourceText.trim().length === 0) {
    throw new Error("Source text cannot be empty");
  }

  if (sourceText.length > 30000) {
    throw new Error("Source text too long (max 30,000 chars)");
  }

  if (!numQuestions || numQuestions < 1 || numQuestions > 50) {
    throw new Error("Questions must be between 1 and 50");
  }

  const prompt = `You are an expert quiz generator. Create exactly ${numQuestions} multiple choice questions based on the following text.

Rules:
- Each question must have exactly 4 options
- One correct answer
- Options must be unique
- Shuffle options randomly
- Keep it clear and conceptual

Return ONLY valid JSON:
{
  "questions": [
    {
      "question_text": "Question?",
      "correct_answer": "Answer",
      "options": ["A","B","C","D"]
    }
  ]
}

Source:
${sourceText}`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    const fullText = response.choices?.[0]?.message?.content;

    if (!fullText) {
      throw new Error("Empty response from AI");
    }

    // Extract JSON
    const jsonStart = fullText.indexOf("{");
    const jsonEnd = fullText.lastIndexOf("}") + 1;

    if (jsonStart === -1 || jsonEnd === 0) {
      console.error("AI Response:", fullText);
      throw new Error("Invalid JSON response");
    }

    const jsonString = fullText.slice(jsonStart, jsonEnd);

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (err) {
      console.error("JSON parse error:", err);
      throw new Error("Invalid JSON format");
    }

    if (!parsed || !Array.isArray(parsed.questions)) {
      throw new Error("Missing questions array");
    }

    const validated = parsed.questions.map((q, index) => {
      if (!q.question_text || !q.correct_answer || !Array.isArray(q.options)) {
        throw new Error(`Question ${index + 1} invalid`);
      }

      if (q.options.length !== 4) {
        throw new Error(`Question ${index + 1} must have 4 options`);
      }

      const cleanOptions = q.options.map((o) => String(o).trim());
      const correct = String(q.correct_answer).trim();

      if (
        !cleanOptions
          .map((o) => o.toLowerCase())
          .includes(correct.toLowerCase())
      ) {
        throw new Error(`Question ${index + 1}: correct answer missing`);
      }

      return {
        question_text: q.question_text.trim(),
        correct_answer: correct,
        options: cleanOptions,
      };
    });

    if (validated.length !== numQuestions) {
      throw new Error(`Expected ${numQuestions}, got ${validated.length}`);
    }

    return validated;
  } catch (error) {
    console.error("Groq error:", error);

    if (error.message?.includes("rate_limit")) {
      throw new Error("Rate limit hit. Try again in few seconds.");
    }

    throw new Error(error.message || "Failed to generate questions");
  }
}
