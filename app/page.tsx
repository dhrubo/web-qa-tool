"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import {
  Eye,
  ImageIcon,
  Link,
  Clock,
  Search,
} from "lucide-react"
import { runQAChecks } from "./actions"
interface QAResult {
  url: string;
  timestamp: string;
  screenshot?: string;
  screenshotAlpha?: string;
  message?: string;
  imageAltIssues?: { src: string; outerHTML: string; xpath?: string | null; }[];
  brokenLinks?: { url: string; status: number; }[];
  wordCount?: number;
  spellingGrammarIssues?: { index: number; offset: number; reason: string; }[];
  visualDiff?: { 
    desktopOriginal: string, 
    desktopAlpha: string, 
    mobileOriginal: string, 
    mobileAlpha: string 
  };
}

export default function QAToolPage() {
  const [urls, setUrls] = useState("");
  const [searchWords, setSearchWords] = useState("");
  const [viewportWidth, setViewportWidth] = useState(1280);
  const [selectedChecks, setSelectedChecks] = useState({
    brokenLinks: false,
    imageAlt: false,
    spellingGrammar: false,
  });

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<QAResult[]>([]);
  const [currentStage, setCurrentStage] = useState('');

  // Track progress stages per URL
  const progressStages = {
    'Taking screenshots': 0.3,
    'Performing visual diff': 0.6,
    'Checking image alt tags': 0.75,
    'Checking for broken links': 0.85,
    'Checking spelling and grammar': 0.95,
  };

  const handleCheckChange = (checkType: string, checked: boolean) => {
    setSelectedChecks((prev) => ({
      ...prev,
      [checkType]: checked,
    }))
  }

  const handleRunChecks = async () => {
    if (!urls.trim()) return;

    setIsRunning(true);
    setProgress(0);
    setResults([]);

    let urlList = urls.split("\n").filter((url) => url.trim());
    
    // Limit to 1 URL only (due to 4 screenshots per URL)
    if (urlList.length > 1) {
      alert("Only 1 URL allowed at a time. Processing first URL only.");
      urlList = urlList.slice(0, 1);
    }

    const wordsToSearch = searchWords.split(",").map((word) => word.trim()).filter((word) => word);

    let completedCount = 0;
    const totalUrls = urlList.length;

    // Process URLs sequentially
    for (let i = 0; i < urlList.length; i++) {
      const url = urlList[i];
      
      await new Promise<void>((resolve) => {
        const onUpdate = (update: any) => {
          console.log('Received update for', url, ':', update);
          
          // Update progress based on status messages
          if (update.type === 'status' && update.data?.message) {
            const message = update.data.message;
            setCurrentStage(message);
            
            // Calculate progress based on completed URLs + current URL's stage
            const baseProgress = (completedCount / totalUrls) * 100;
            const currentUrlProgress = (1 / totalUrls) * 100;
            
            // Find stage progress multiplier
            let stageMultiplier = 0;
            for (const [stageName, multiplier] of Object.entries(progressStages)) {
              if (message.includes(stageName)) {
                stageMultiplier = multiplier;
                break;
              }
            }
            
            const newProgress = baseProgress + (currentUrlProgress * stageMultiplier);
            setProgress(newProgress);
          }
          
          setResults(prevResults => {
            const existingResultIndex = prevResults.findIndex(r => r.url === url);
            let newResults = [...prevResults];

            if (existingResultIndex > -1) {
              const existingResult = newResults[existingResultIndex];
              const updatedResult = { ...existingResult };

              switch (update.type) {
                case 'status':
                  break;
                case 'screenshot':
                  updatedResult.screenshot = update.data.screenshot;
                  break;
                case 'screenshotAlpha':
                  updatedResult.screenshotAlpha = update.data.screenshotAlpha;
                  break;
                case 'wordCount':
                  updatedResult.wordCount = update.data.wordCount;
                  break;
                case 'imageAlt':
                  updatedResult.imageAltIssues = update.data.imageAltIssues;
                  break;
                case 'brokenLinks':
                  updatedResult.brokenLinks = update.data.brokenLinks;
                  break;
                case 'spellingGrammar':
                  updatedResult.spellingGrammarIssues = update.data.spellingGrammarIssues;
                  break;
                case 'visual-diff':
                  updatedResult.visualDiff = update.data;
                  break;
              }
              newResults[existingResultIndex] = updatedResult;
            } else {
              const newResult: QAResult = { 
                url, 
                timestamp: new Date().toISOString(),
                ...(update.type === 'screenshot' && { screenshot: update.data.screenshot }),
                ...(update.type === 'screenshotAlpha' && { screenshotAlpha: update.data.screenshotAlpha }),
                ...(update.type === 'wordCount' && { wordCount: update.data.wordCount }),
                ...(update.type === 'imageAlt' && { imageAltIssues: update.data.imageAltIssues }),
                ...(update.type === 'brokenLinks' && { brokenLinks: update.data.brokenLinks }),
              };
              newResults.push(newResult);
            }
            return newResults;
          });
        };

        const onError = (error: any) => {
          console.error("Error running QA checks for", url, ":", error);
          completedCount++;
          setProgress((completedCount / totalUrls) * 100);
          resolve();
        };

        const onComplete = () => {
          console.log('Checks complete for', url);
          completedCount++;
          setProgress((completedCount / totalUrls) * 100);
          resolve();
        };

        runQAChecks(url, wordsToSearch, selectedChecks, viewportWidth, onUpdate, onError, onComplete);
      });
    }

    setIsRunning(false);
    setProgress(100);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Web QA Tool</h1>
        <p className="text-muted-foreground">Automated quality assurance testing for web pages using Playwright</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Set up your QA checks for 1 url to check the Alpha version</CardDescription>
          </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="urls">URL to Check</Label>
                <Input
                  id="urls"
                  placeholder="https://example.com"
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">Enter ONE URL (generates 4 screenshots: desktop + mobile)</p>
              </div>

              {/* Words to Search field - hidden 
              <div className="space-y-2">
                <Label htmlFor="words">Words to Search</Label>
                <Input
                  id="words"
                  placeholder="error, warning, deprecated"
                  value={searchWords}
                  onChange={(e) => setSearchWords(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">Comma-separated words to count</p>
              </div>
              */}

              <div className="space-y-4">
                {/* Checks to Perform removed - options disabled by default */}
              </div>

              <Button onClick={handleRunChecks} className="w-full">
                {isRunning ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Running Checks...
                  </>
                ) : (
                  "Run QA Checks"
                )}
              </Button>

              {isRunning && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} />
                  {currentStage && (
                    <p className="text-xs text-muted-foreground text-center">{currentStage}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

        {results.length > 0 && (
          <div className="space-y-6">
            {results.map((result, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{result.url}</CardTitle>
                        <CardDescription>Tested on {new Date(result.timestamp).toLocaleString()}</CardDescription>
                        {result.wordCount !== undefined && (
                          <CardDescription>
                            Found {result.wordCount} occurrences of the searched words.
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {result.visualDiff ? (
                      <div className="space-y-8">
                        {/* Desktop Screenshots */}
                        <div>
                          <h3 className="text-lg font-bold mb-4 text-center">Desktop Screenshots (1280px)</h3>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                              <h4 className="font-semibold mb-2 text-center">Original URL</h4>
                              <div className="border rounded-lg overflow-hidden shadow">
                                <img
                                  src={result.visualDiff.desktopOriginal}
                                  alt="Desktop Original screenshot"
                                  className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => window.open(result.visualDiff?.desktopOriginal)}
                                />
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2 text-center">With ?d_alpha=true</h4>
                              <div className="border rounded-lg overflow-hidden shadow">
                                <img
                                  src={result.visualDiff.desktopAlpha}
                                  alt="Desktop Alpha screenshot"
                                  className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => window.open(result.visualDiff?.desktopAlpha)}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Mobile Screenshots */}
                        <div>
                          <h3 className="text-lg font-bold mb-4 text-center">Mobile Screenshots (390x844px - iPhone 12/13/14 Pro)</h3>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                              <h4 className="font-semibold mb-2 text-center">Original URL</h4>
                              <div className="border rounded-lg overflow-hidden shadow">
                                <img
                                  src={result.visualDiff.mobileOriginal}
                                  alt="Mobile Original screenshot"
                                  className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => window.open(result.visualDiff?.mobileOriginal)}
                                />
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2 text-center">With ?d_alpha=true</h4>
                              <div className="border rounded-lg overflow-hidden shadow">
                                <img
                                  src={result.visualDiff.mobileAlpha}
                                  alt="Mobile Alpha screenshot"
                                  className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => window.open(result.visualDiff?.mobileAlpha)}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-8 bg-gray-100 rounded border">
                        No screenshots available
                      </div>
                    )}

                    {result.brokenLinks && result.brokenLinks.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold mb-2">Broken Links</h4>
                        <ul className="list-disc list-inside">
                          {result.brokenLinks.map((link, i) => (
                            <li key={i} className="truncate">
                              <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{link.url}</a>
                              <span className="ml-2 text-red-500">({link.status})</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.spellingGrammarIssues && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                      <h4 className="font-semibold mb-2 text-blue-800">Spelling & Grammar</h4>
                      {(result.spellingGrammarIssues && result.spellingGrammarIssues.length === 0) || !result.spellingGrammarIssues ? (
                        <p className="text-green-700">No spelling or grammar issues found.</p>
                      ) : (
                        <ul className="list-disc list-inside text-blue-900">
                          {result.spellingGrammarIssues.map((issue, i) => (
                            <li key={i}>{issue.reason}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
        )}

        {results.length === 0 && !isRunning && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Eye className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Results Yet</h3>
              <p className="text-muted-foreground text-center">
                Configure your checks and enter URLs to get started with automated QA testing.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}