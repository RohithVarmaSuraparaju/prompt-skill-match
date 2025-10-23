import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resume, jobDescription, generateSuggestions } = await req.json();

    if (!resume || !jobDescription) {
      throw new Error("Resume and job description are required");
    }

    console.log("Analyzing resume...", { generateSuggestions });

    // Extract keywords from job description and resume
    const jdKeywords = extractKeywords(jobDescription);
    const resumeKeywords = extractKeywords(resume);

    // Find present and missing keywords
    const presentKeywords = jdKeywords.filter((keyword) =>
      resumeKeywords.some((rk) => rk.toLowerCase() === keyword.toLowerCase())
    );
    const missingKeywords = jdKeywords.filter(
      (keyword) => !resumeKeywords.some((rk) => rk.toLowerCase() === keyword.toLowerCase())
    );

    console.log("Keywords extracted", {
      jdKeywords: jdKeywords.length,
      presentKeywords: presentKeywords.length,
      missingKeywords: missingKeywords.length,
    });

    let suggestions: string[] | undefined;

    // Generate AI suggestions if requested
    if (generateSuggestions && missingKeywords.length > 0) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        console.error("LOVABLE_API_KEY not found");
        throw new Error("AI service not configured");
      }

      console.log("Generating AI suggestions...");

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "You are a professional resume advisor. Generate 3-5 specific, actionable bullet points that the user can add to their resume to highlight the missing skills. Each bullet point should be in the format of a professional achievement or responsibility statement.",
            },
            {
              role: "user",
              content: `The job description requires these skills that are missing from the resume: ${missingKeywords.join(
                ", "
              )}. 

Based on these missing keywords, generate 3-5 professional resume bullet points that demonstrate experience with these skills. Each bullet point should:
- Start with a strong action verb
- Quantify achievements when possible
- Be specific and relevant to the missing keywords
- Follow standard resume formatting

Return only the bullet points, one per line.`,
            },
          ],
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("AI API error:", aiResponse.status, errorText);
        
        if (aiResponse.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        }
        if (aiResponse.status === 402) {
          throw new Error("AI credits exhausted. Please add credits to continue.");
        }
        
        throw new Error("Failed to generate suggestions");
      }

      const aiData = await aiResponse.json();
      const suggestionsText = aiData.choices?.[0]?.message?.content || "";
      suggestions = suggestionsText
        .split("\n")
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0 && !s.match(/^(Here|Based)/i))
        .slice(0, 5);

      console.log("AI suggestions generated:", suggestions?.length || 0);
    }

    return new Response(
      JSON.stringify({
        jdKeywords,
        presentKeywords,
        missingKeywords,
        suggestions,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in analyze-resume:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Simple keyword extraction using word frequency and filtering
function extractKeywords(text: string): string[] {
  // Common words to exclude
  const stopWords = new Set([
    "the",
    "be",
    "to",
    "of",
    "and",
    "a",
    "in",
    "that",
    "have",
    "i",
    "it",
    "for",
    "not",
    "on",
    "with",
    "he",
    "as",
    "you",
    "do",
    "at",
    "this",
    "but",
    "his",
    "by",
    "from",
    "they",
    "we",
    "say",
    "her",
    "she",
    "or",
    "an",
    "will",
    "my",
    "one",
    "all",
    "would",
    "there",
    "their",
    "what",
    "so",
    "up",
    "out",
    "if",
    "about",
    "who",
    "get",
    "which",
    "go",
    "me",
    "when",
    "make",
    "can",
    "like",
    "time",
    "no",
    "just",
    "him",
    "know",
    "take",
    "people",
    "into",
    "year",
    "your",
    "good",
    "some",
    "could",
    "them",
    "see",
    "other",
    "than",
    "then",
    "now",
    "look",
    "only",
    "come",
    "its",
    "over",
    "think",
    "also",
    "back",
    "after",
    "use",
    "two",
    "how",
    "our",
    "work",
    "first",
    "well",
    "way",
    "even",
    "new",
    "want",
    "because",
    "any",
    "these",
    "give",
    "day",
    "most",
    "us",
    "is",
    "was",
    "are",
    "been",
    "has",
    "had",
    "were",
    "said",
    "did",
    "having",
    "may",
    "should",
    "must",
  ]);

  // Extract words and n-grams
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));

  // Count word frequencies
  const wordFreq = new Map<string, number>();
  words.forEach((word) => {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  });

  // Extract 2-word phrases
  const phrases = new Set<string>();
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = `${words[i]} ${words[i + 1]}`;
    phrases.add(phrase);
  }

  // Combine single words and phrases, prioritizing by frequency
  const sortedWords = Array.from(wordFreq.entries())
    .filter(([_, freq]) => freq >= 1)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .slice(0, 30);

  const result = [...phrases, ...sortedWords].slice(0, 40);

  return result;
}
