import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Briefcase, CheckCircle2, XCircle, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AnalysisResult {
  jdKeywords: string[];
  presentKeywords: string[];
  missingKeywords: string[];
  suggestions?: string[];
}

const Index = () => {
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    if (!resume.trim() || !jobDescription.trim()) {
      toast.error("Please provide both resume and job description");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-resume", {
        body: { resume, jobDescription, generateSuggestions: false },
      });

      if (error) throw error;

      setResult(data);
      toast.success("Analysis complete!");
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast.error(error.message || "Failed to analyze resume");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateSuggestions = async () => {
    if (!result) return;

    setIsGeneratingSuggestions(true);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-resume", {
        body: { resume, jobDescription, generateSuggestions: true },
      });

      if (error) throw error;

      setResult(data);
      toast.success("Suggestions generated!");
    } catch (error: any) {
      console.error("Suggestion generation error:", error);
      toast.error(error.message || "Failed to generate suggestions");
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Resume Analyzer
          </h1>
          <p className="text-muted-foreground text-lg">
            AI-powered analysis to match your resume with job descriptions
          </p>
        </div>

        {/* Input Section */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Resume
              </CardTitle>
              <CardDescription>Paste your resume text here</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Paste your resume content here..."
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                className="min-h-[300px] resize-none"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Job Description
              </CardTitle>
              <CardDescription>Paste the job description here</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Paste the job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="min-h-[300px] resize-none"
              />
            </CardContent>
          </Card>
        </div>

        {/* Analyze Button */}
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleAnalyze}
            disabled={isAnalyzing || !resume.trim() || !jobDescription.trim()}
            className="min-w-[200px]"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Analyze Resume"
            )}
          </Button>
        </div>

        {/* Results Section */}
        {result && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>Analysis Results</CardTitle>
              <CardDescription>
                Keywords comparison between your resume and the job description
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="present" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="present">
                    Present ({result.presentKeywords.length})
                  </TabsTrigger>
                  <TabsTrigger value="missing">
                    Missing ({result.missingKeywords.length})
                  </TabsTrigger>
                  <TabsTrigger value="jd">
                    Job Keywords ({result.jdKeywords.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="present" className="space-y-4">
                  <div className="flex items-start gap-2 p-4 bg-success/10 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-success-foreground">
                        Keywords Found in Your Resume
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        These keywords from the job description are present in your resume
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.presentKeywords.map((keyword, idx) => (
                      <Badge key={idx} variant="outline" className="bg-success/10 border-success text-success-foreground">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="missing" className="space-y-4">
                  <div className="flex items-start gap-2 p-4 bg-destructive/10 rounded-lg">
                    <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-destructive-foreground">
                        Missing Keywords
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        These keywords from the job description are missing from your resume
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.missingKeywords.map((keyword, idx) => (
                      <Badge key={idx} variant="outline" className="bg-destructive/10 border-destructive text-destructive-foreground">
                        {keyword}
                      </Badge>
                    ))}
                  </div>

                  {!result.suggestions && (
                    <div className="pt-4">
                      <Button
                        onClick={handleGenerateSuggestions}
                        disabled={isGeneratingSuggestions}
                        variant="outline"
                        className="w-full"
                      >
                        {isGeneratingSuggestions ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating AI Suggestions...
                          </>
                        ) : (
                          <>
                            <Lightbulb className="mr-2 h-4 w-4" />
                            Generate AI Suggestions
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {result.suggestions && (
                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">AI-Generated Suggestions</h3>
                      </div>
                      <ul className="space-y-2">
                        {result.suggestions.map((suggestion, idx) => (
                          <li key={idx} className="p-3 bg-card rounded-lg border text-sm">
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="jd" className="space-y-4">
                  <div className="flex items-start gap-2 p-4 bg-primary/10 rounded-lg">
                    <Briefcase className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-semibold">All Job Description Keywords</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Key skills and requirements extracted from the job description
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.jdKeywords.map((keyword, idx) => (
                      <Badge key={idx} variant="secondary">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
