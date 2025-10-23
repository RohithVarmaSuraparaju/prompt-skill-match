import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filePath } = await req.json();

    if (!filePath) {
      throw new Error("File path is required");
    }

    console.log("Parsing resume file:", filePath);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("resumes")
      .download(filePath);

    if (downloadError) {
      console.error("Download error:", downloadError);
      throw new Error("Failed to download file");
    }

    console.log("File downloaded, size:", fileData.size, "type:", fileData.type);

    let extractedText = "";

    // Handle different file types
    if (fileData.type === "text/plain") {
      // Plain text file
      extractedText = await fileData.text();
    } else if (fileData.type === "application/pdf") {
      // PDF file - use simple text extraction
      const arrayBuffer = await fileData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const textContent = new TextDecoder().decode(uint8Array);
      
      // Simple PDF text extraction (extracts visible text between parentheses)
      const pdfTextMatches = textContent.match(/\(([^)]+)\)/g);
      if (pdfTextMatches) {
        extractedText = pdfTextMatches
          .map((match) => match.slice(1, -1))
          .join(" ")
          .replace(/\\r\\n|\\n|\\r/g, " ");
      }

      // Fallback: extract any readable text
      if (!extractedText || extractedText.length < 50) {
        extractedText = textContent
          .replace(/[^\x20-\x7E\n\r]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      }
    } else if (
      fileData.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      // DOCX file - extract from XML
      const arrayBuffer = await fileData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Simple DOCX text extraction from XML content
      const textContent = new TextDecoder().decode(uint8Array);
      const xmlMatches = textContent.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
      
      if (xmlMatches) {
        extractedText = xmlMatches
          .map((match) => match.replace(/<w:t[^>]*>|<\/w:t>/g, ""))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
      }
    } else {
      throw new Error("Unsupported file type");
    }

    if (!extractedText || extractedText.length < 10) {
      throw new Error(
        "Could not extract text from file. Please try uploading a different format or paste the text directly."
      );
    }

    console.log("Text extracted, length:", extractedText.length);

    return new Response(
      JSON.stringify({ text: extractedText }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in parse-resume:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
