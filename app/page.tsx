"use client"

import { useState, useEffect, useRef } from "react"
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
    mobileOriginal?: string, 
    mobileAlpha?: string 
  };
  mode?: "single-alpha" | "multi-desktop";
}

export default function QAToolPage() {
  const [urls, setUrls] = useState("");
  const [searchWords, setSearchWords] = useState("");
  const [viewportWidth, setViewportWidth] = useState(1280);
  const [queryMode, setQueryMode] = useState<"single-alpha" | "multi-desktop">("single-alpha");
  const [selectedChecks, setSelectedChecks] = useState({
    brokenLinks: false,
    imageAlt: false,
    spellingGrammar: false,
  });

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<QAResult[]>([]);
  const [currentStage, setCurrentStage] = useState('');
  const [screenshotProgress, setScreenshotProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTakingScreenshots, setIsTakingScreenshots] = useState(false);
  const [activityLog, setActivityLog] = useState<string[]>([]);
  const [currentSection, setCurrentSection] = useState('');
  
  const screenshotTimerRef = useRef<NodeJS.Timeout | null>(null);
  const screenshotStartTimeRef = useRef<number>(0);
  const activityLogRef = useRef<HTMLDivElement>(null);

  // Track progress stages per URL
  const progressStages = {
    'Taking screenshots': 0.3,
    'Performing visual diff': 0.6,
    'Checking image alt tags': 0.75,
    'Checking for broken links': 0.85,
    'Checking spelling and grammar': 0.95,
  };

  // Screenshot timing constants (PARALLEL EXECUTION - 2x faster!)
  const SCREENSHOT_TIMINGS = {
    'single-alpha': {
      // Desktop and Mobile now run in parallel (both original + alpha simultaneously)
      desktop: 27500,  // Max of (20s original, 35s alpha) = 35s / 2 contexts ≈ 27.5s
      mobile: 27500,   // Max of (20s original, 35s alpha) = 35s / 2 contexts ≈ 27.5s
      total: 55000     // 27.5s desktop + 27.5s mobile = 55s (was 110s sequential!)
    },
    'multi-desktop': {
      // Original and Alpha now run in parallel
      parallel: 20000, // Max of (12s original, 20s alpha) = 20s
      total: 20000     // Just 20s total (was 32s sequential!)
    }
  };

  // Clear screenshot timer on unmount
  useEffect(() => {
    return () => {
      if (screenshotTimerRef.current) {
        clearInterval(screenshotTimerRef.current);
      }
    };
  }, []);

  // Start screenshot progress animation
  const startScreenshotTimer = (mode: "single-alpha" | "multi-desktop", completedCount: number, totalUrls: number) => {
    const totalTime = SCREENSHOT_TIMINGS[mode].total;
    screenshotStartTimeRef.current = Date.now();
    setIsTakingScreenshots(true);
    setScreenshotProgress(0);
    setTimeRemaining(totalTime / 1000);

    // Clear any existing timer
    if (screenshotTimerRef.current) {
      clearInterval(screenshotTimerRef.current);
    }

    // Update progress every 100ms for smooth animation
    screenshotTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - screenshotStartTimeRef.current;
      const progressPercent = Math.min((elapsed / totalTime) * 100, 100);
      const remainingSeconds = Math.max(Math.ceil((totalTime - elapsed) / 1000), 0);

      setScreenshotProgress(progressPercent);
      setTimeRemaining(remainingSeconds);

      // Clear timer when complete
      if (elapsed >= totalTime) {
        if (screenshotTimerRef.current) {
          clearInterval(screenshotTimerRef.current);
          screenshotTimerRef.current = null;
        }
        setIsTakingScreenshots(false);
      }
    }, 100);
  };

  // Stop screenshot progress animation
  const stopScreenshotTimer = () => {
    if (screenshotTimerRef.current) {
      clearInterval(screenshotTimerRef.current);
      screenshotTimerRef.current = null;
    }
    setIsTakingScreenshots(false);
    setScreenshotProgress(100);
    setTimeRemaining(0);
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
    setActivityLog([]); // Clear activity log

    let urlList = urls.split("\n").filter((url) => url.trim());
    
    // Validate URL count based on mode
    if (queryMode === "single-alpha" && urlList.length > 1) {
      alert("Single Alpha Mode: Only 1 URL allowed. Processing first URL only.");
      urlList = urlList.slice(0, 1);
    } else if (queryMode === "multi-desktop" && urlList.length > 4) {
      alert("Multi Desktop Mode: Maximum 4 URLs allowed to prevent timeout. Processing first 4 URLs only.");
      urlList = urlList.slice(0, 4);
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
            
            // Detect section headers
            if (message.includes('🖥️  DESKTOP SCREENSHOTS') || message.includes('DESKTOP SCREENSHOTS')) {
              setCurrentSection('🖥️ Desktop Screenshots');
            } else if (message.includes('📱 MOBILE SCREENSHOTS') || message.includes('MOBILE SCREENSHOTS')) {
              setCurrentSection('📱 Mobile Screenshots');
            } else if (message.includes('visual diff') || message.includes('Visual diff')) {
              setCurrentSection('');
            }
            
            // Add to activity log
            setActivityLog(prev => {
              const newLog = [...prev, `${new Date().toLocaleTimeString()}: ${message}`];
              // Keep last 20 messages
              return newLog.slice(-20);
            });

            // Auto-scroll to bottom of activity log
            setTimeout(() => {
              if (activityLogRef.current) {
                activityLogRef.current.scrollTop = activityLogRef.current.scrollHeight;
              }
            }, 100);
            
            // Start screenshot timer when taking screenshots begins
            if (message.includes('Taking screenshots') || message.includes('DESKTOP SCREENSHOTS')) {
              startScreenshotTimer(queryMode, completedCount, totalUrls);
            }
            // Stop screenshot timer when screenshots are complete
            else if (message.includes('visual diff complete') || 
                     message.includes('Screenshot generation complete') ||
                     message.includes('Checking image alt') ||
                     message.includes('Checking for broken links') ||
                     message.includes('Checking spelling')) {
              stopScreenshotTimer();
              setCurrentSection('');
            }
            
            // Calculate progress based on completed URLs + current URL's phase
            const baseProgress = (completedCount / totalUrls) * 100;
            const currentUrlProgress = (1 / totalUrls) * 100;
            
            // Determine stage multiplier with more granular phases
            let stageMultiplier = 0;
            
            // Screenshot phase is broken into sub-phases for single-alpha mode
            if (queryMode === 'single-alpha') {
              if (message.includes('Taking FULL screenshots') || message.includes('DESKTOP SCREENSHOTS')) {
                stageMultiplier = 0.05; // Just started (5%)
              } else if (message.includes('Taking desktop original')) {
                stageMultiplier = 0.10; // 10%
              } else if (message.includes('Taking desktop alpha')) {
                stageMultiplier = 0.20; // 20%
              } else if (message.includes('MOBILE SCREENSHOTS') || message.includes('Setting viewport to mobile')) {
                stageMultiplier = 0.50; // 50% - Mobile starts here!
              } else if (message.includes('Taking mobile original')) {
                stageMultiplier = 0.60; // 60%
              } else if (message.includes('Taking mobile alpha')) {
                stageMultiplier = 0.70; // 70%
              } else if (message.includes('Screenshot generation complete')) {
                stageMultiplier = 0.80; // 80%
              } else if (message.includes('visual diff')) {
                stageMultiplier = 0.85; // 85%
              } else if (message.includes('Checking image alt')) {
                stageMultiplier = 0.90; // 90%
              } else if (message.includes('Checking for broken links')) {
                stageMultiplier = 0.93; // 93%
              } else if (message.includes('Checking spelling')) {
                stageMultiplier = 0.96; // 96%
              }
            } else {
              // Multi-desktop mode (simpler)
              if (message.includes('Taking screenshots') || message.includes('Navigating to original')) {
                stageMultiplier = 0.10;
              } else if (message.includes('Taking desktop original')) {
                stageMultiplier = 0.25;
              } else if (message.includes('Taking desktop alpha')) {
                stageMultiplier = 0.50;
              } else if (message.includes('Desktop screenshot generation complete')) {
                stageMultiplier = 0.70;
              } else if (message.includes('visual diff')) {
                stageMultiplier = 0.80;
              } else if (message.includes('Checking image alt')) {
                stageMultiplier = 0.88;
              } else if (message.includes('Checking for broken links')) {
                stageMultiplier = 0.93;
              } else if (message.includes('Checking spelling')) {
                stageMultiplier = 0.97;
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
                mode: queryMode,
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

        runQAChecks(url, wordsToSearch, selectedChecks, viewportWidth, queryMode, onUpdate, onError, onComplete);
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
            <CardDescription>Choose your query mode and configure QA checks</CardDescription>
          </CardHeader>
            <CardContent className="space-y-6">
              {/* Query Mode Selector */}
              <div className="space-y-3">
                <Label>Query Mode</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card 
                    className={`cursor-pointer transition-all ${queryMode === "single-alpha" ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setQueryMode("single-alpha")}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 mt-1 flex items-center justify-center ${queryMode === "single-alpha" ? "border-primary" : "border-gray-300"}`}>
                          {queryMode === "single-alpha" && <div className="w-2 h-2 rounded-full bg-primary"></div>}
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">Single URL - Full Alpha Test</h4>
                          <p className="text-sm text-muted-foreground">1 URL, 4 screenshots (Desktop + Mobile, Original + Alpha)</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card 
                    className={`cursor-pointer transition-all ${queryMode === "multi-desktop" ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setQueryMode("multi-desktop")}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 mt-1 flex items-center justify-center ${queryMode === "multi-desktop" ? "border-primary" : "border-gray-300"}`}>
                          {queryMode === "multi-desktop" && <div className="w-2 h-2 rounded-full bg-primary"></div>}
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">Multi URL - Desktop Only</h4>
                          <p className="text-sm text-muted-foreground">Up to 4 URLs, 2 screenshots each (Desktop Original + Alpha)</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="urls">
                  {queryMode === "single-alpha" ? "URL to Check" : "URLs to Check (one per line)"}
                </Label>
                {queryMode === "single-alpha" ? (
                  <Input
                    id="urls"
                    placeholder="https://example.com"
                    value={urls}
                    onChange={(e) => setUrls(e.target.value)}
                  />
                ) : (
                  <Textarea
                    id="urls"
                    placeholder="https://example.com&#10;https://example.com/page2&#10;https://example.com/page3"
                    value={urls}
                    onChange={(e) => setUrls(e.target.value)}
                    rows={5}
                  />
                )}
                <p className="text-sm text-muted-foreground">
                  {queryMode === "single-alpha" 
                    ? "Enter 1 URL (generates 4 screenshots: desktop + mobile)" 
                    : "Enter up to 4 URLs, one per line (2 desktop screenshots per URL)"}
                </p>
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
                <div className="space-y-4">
                  {/* Current Section Header */}
                  {currentSection && (
                    <div className="flex items-center justify-center p-3 bg-primary/10 rounded-lg border-2 border-primary/20">
                      <span className="text-lg font-bold text-primary">{currentSection}</span>
                    </div>
                  )}

                  {/* Overall Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Overall Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} />
                    {currentStage && (
                      <p className="text-xs text-muted-foreground text-center">{currentStage}</p>
                    )}
                  </div>

                  {/* Screenshot Progress Timer */}
                  {isTakingScreenshots && (
                    <div className="space-y-2 p-4 bg-muted/50 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-primary animate-pulse" />
                          <span className="text-sm font-medium">
                            Taking Screenshots ({queryMode === 'single-alpha' ? '4 images' : '2 images'})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-mono font-semibold">
                            {timeRemaining}s
                          </span>
                        </div>
                      </div>
                      <Progress value={screenshotProgress} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {queryMode === 'single-alpha' 
                            ? 'Desktop + Mobile | Original + Alpha' 
                            : 'Desktop Only | Original + Alpha'}
                        </span>
                        <span>{Math.round(screenshotProgress)}%</span>
                      </div>
                    </div>
                  )}

                  {/* Activity Log */}
                  {isRunning && activityLog.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-border"></div>
                        <span className="text-xs font-medium text-muted-foreground">Activity Log</span>
                        <div className="h-px flex-1 bg-border"></div>
                      </div>
                      <div 
                        ref={activityLogRef}
                        className="max-h-48 overflow-y-auto bg-muted/30 rounded-md p-3 border font-mono text-xs space-y-1"
                      >
                        {activityLog.map((log, idx) => (
                          <div key={idx} className="text-muted-foreground">
                            {log}
                          </div>
                        ))}
                      </div>
                    </div>
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

                        {/* Mobile Screenshots - Only in single-alpha mode */}
                        {result.visualDiff.mobileOriginal && result.visualDiff.mobileAlpha && (
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
                        )}
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