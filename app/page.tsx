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
  message?: string;
  imageAltIssues?: { src: string; hasAlt: boolean; }[];
  brokenLinks?: { url: string; status: number; }[];
  wordCount?: number;
  spellingGrammarIssues?: { index: number; offset: number; reason: string; }[];
}

export default function QAToolPage() {
  const [urls, setUrls] = useState("")
  const [searchWords, setSearchWords] = useState("")
  const [viewportWidth, setViewportWidth] = useState(1280)
  const [selectedChecks, setSelectedChecks] = useState({
    brokenLinks: true,
    imageAlt: true,
    spellingGrammar: true,
  })

  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<QAResult[]>([])

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

    const urlList = urls.split("\n").filter((url) => url.trim());
    const wordsToSearch = searchWords.split(",").map((word) => word.trim()).filter((word) => word);

    const url = urlList[0];

    const onUpdate = (update: any) => {
      console.log('Received update:', update);
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
              break;          }
          newResults[existingResultIndex] = updatedResult;
        } else {
          const newResult: QAResult = { 
            url, 
            timestamp: new Date().toISOString(),
            ...(update.type === 'screenshot' && { screenshot: update.data.screenshot }),
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
      console.error("Error running QA checks:", error);
      setIsRunning(false);
    };

    const onComplete = () => {
      console.log('All checks complete.');
      setIsRunning(false);
      setProgress(100);
    };

    runQAChecks(url, wordsToSearch, selectedChecks, viewportWidth, onUpdate, onError, onComplete);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Web QA Tool</h1>
        <p className="text-muted-foreground">Automated quality assurance testing for web pages using Playwright</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>Set up your QA checks and target URLs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="urls">URLs to Check</Label>
                <Textarea
                  id="urls"
                  placeholder="https://example.com&#10;https://another-site.com"
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                  rows={4}
                />
                <p className="text-sm text-muted-foreground">Enter one URL per line</p>
              </div>

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

              <div className="space-y-4">
                <h4 className="font-semibold">Checks to Perform</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="broken-links" className="flex items-center gap-2">
                      <Link className="w-4 h-4" />
                      Broken Link Checker
                    </Label>
                    <Switch
                      id="broken-links"
                      checked={selectedChecks.brokenLinks}
                      onCheckedChange={(checked) => handleCheckChange("brokenLinks", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="image-alt" className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Image Alt Text
                    </Label>
                    <Switch
                      id="image-alt"
                      checked={selectedChecks.imageAlt}
                      onCheckedChange={(checked) => handleCheckChange("imageAlt", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="spelling-grammar" className="flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      Spelling & Grammar
                    </Label>
                    <Switch
                      id="spelling-grammar"
                      checked={selectedChecks.spellingGrammar}
                      onCheckedChange={(checked) => handleCheckChange("spellingGrammar", checked)}
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleRunChecks} disabled={isRunning || !urls.trim()} className="w-full">
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
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
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
                    {result.screenshot ? (
                      <div>
                        <h4 className="font-semibold mb-2">Screenshot</h4>
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            const byteCharacters = atob(result.screenshot!);
                            const byteNumbers = new Array(byteCharacters.length);
                            for (let i = 0; i < byteCharacters.length; i++) {
                              byteNumbers[i] = byteCharacters.charCodeAt(i);
                            }
                            const byteArray = new Uint8Array(byteNumbers);
                            const blob = new Blob([byteArray], { type: 'image/png' });
                            const imageUrl = URL.createObjectURL(blob);
                            window.open(imageUrl, '_blank');
                          }}
                        >
                          <img
                            src={`data:image/png;base64,${result.screenshot}`}
                            alt="Screenshot of the page with highlighted words"
                            className="border rounded"
                          />
                        </a>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        No screenshot available
                      </div>
                    )}

                    {result.imageAltIssues && result.imageAltIssues.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold mb-2">Images Missing Alt Text</h4>
                        <ul className="list-disc list-inside">
                          {result.imageAltIssues.map((issue, i) => (
                            <li key={i} className="truncate">
                              <a href={issue.src} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{issue.src}</a>
                            </li>
                          ))}
                        </ul>
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
                      <div className="mt-4">
                        <h4 className="font-semibold mb-2">Spelling & Grammar Suggestions</h4>
                        {result.spellingGrammarIssues.length === 0 ? (
                          <p>0 spelling mistakes</p>
                        ) : (
                          <ul className="list-disc list-inside">
                            {result.spellingGrammarIssues.map((issue, i) => (
                              <li key={i}>
                                {issue.reason}
                              </li>
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
    </div>
  )
}