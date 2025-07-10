"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Zap,
  Accessibility,
  Search,
  ImageIcon,
  Link,
  Clock,
} from "lucide-react"
import { runQAChecks } from "./actions"

interface QAResult {
  url: string
  timestamp: string
  screenshots: {
    desktop: string
    tablet: string
    mobile: string
  }
  checks: {
    accessibility: {
      passed: boolean
      issues: Array<{
        type: string
        element: string
        message: string
        severity: "error" | "warning" | "info"
      }>
      score: number
    }
    performance: {
      passed: boolean
      metrics: {
        loadTime: number
        firstContentfulPaint: number
        largestContentfulPaint: number
        cumulativeLayoutShift: number
      }
      score: number
    }
    seo: {
      passed: boolean
      issues: Array<{
        type: string
        message: string
        severity: "error" | "warning" | "info"
      }>
      score: number
    }
    brokenLinks: {
      passed: boolean
      brokenLinks: Array<{
        url: string
        status: number
        text: string
      }>
      totalLinks: number
    }
    images: {
      passed: boolean
      issues: Array<{
        src: string
        issue: string
        severity: "error" | "warning" | "info"
      }>
      totalImages: number
    }
    wordCount: {
      [word: string]: number
    }
  }
  overallScore: number
}

export default function QAToolPage() {
  const [urls, setUrls] = useState("")
  const [searchWords, setSearchWords] = useState("")
  const [selectedChecks, setSelectedChecks] = useState({
    accessibility: true,
    performance: true,
    seo: true,
    brokenLinks: true,
    images: true,
    wordCount: true,
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
    if (!urls.trim()) return

    setIsRunning(true)
    setProgress(0)
    setResults([])

    const urlList = urls.split("\n").filter((url) => url.trim())
    const wordsToSearch = searchWords
      .split(",")
      .map((word) => word.trim())
      .filter((word) => word)

    try {
      for (let i = 0; i < urlList.length; i++) {
        const url = urlList[i].trim()
        setProgress(((i + 1) / urlList.length) * 100)

        const result = await runQAChecks(url, selectedChecks, wordsToSearch)
        setResults((prev) => [...prev, result])
      }
    } catch (error) {
      console.error("Error running QA checks:", error)
    } finally {
      setIsRunning(false)
      setProgress(0)
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />
      case "warning":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      default:
        return <CheckCircle className="w-4 h-4 text-blue-500" />
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600"
    if (score >= 70) return "text-yellow-600"
    return "text-red-600"
  }

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

              <div className="space-y-3">
                <Label>Checks to Run</Label>
                <div className="space-y-2">
                  {[
                    { key: "accessibility", label: "Accessibility", icon: Accessibility },
                    { key: "performance", label: "Performance", icon: Zap },
                    { key: "seo", label: "SEO", icon: Search },
                    { key: "brokenLinks", label: "Broken Links", icon: Link },
                    { key: "images", label: "Image Issues", icon: ImageIcon },
                    { key: "wordCount", label: "Word Count", icon: Eye },
                  ].map(({ key, label, icon: Icon }) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={key}
                        checked={selectedChecks[key as keyof typeof selectedChecks]}
                        onCheckedChange={(checked) => handleCheckChange(key, checked as boolean)}
                      />
                      <Label htmlFor={key} className="flex items-center space-x-2 cursor-pointer">
                        <Icon className="w-4 h-4" />
                        <span>{label}</span>
                      </Label>
                    </div>
                  ))}
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
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getScoreColor(result.overallScore)}`}>
                          {result.overallScore}/100
                        </div>
                        <div className="text-sm text-muted-foreground">Overall Score</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="overview" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="issues">Issues</TabsTrigger>
                        <TabsTrigger value="screenshots">Screenshots</TabsTrigger>
                        <TabsTrigger value="words">Words</TabsTrigger>
                      </TabsList>

                      <TabsContent value="overview" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center">
                                <Accessibility className="w-4 h-4 mr-2" />
                                Accessibility
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className={`text-xl font-bold ${getScoreColor(result.checks.accessibility.score)}`}>
                                {result.checks.accessibility.score}/100
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {result.checks.accessibility.issues.length} issues found
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center">
                                <Zap className="w-4 h-4 mr-2" />
                                Performance
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className={`text-xl font-bold ${getScoreColor(result.checks.performance.score)}`}>
                                {result.checks.performance.score}/100
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {result.checks.performance.metrics.loadTime}ms load time
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center">
                                <Link className="w-4 h-4 mr-2" />
                                Links
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-xl font-bold">
                                {result.checks.brokenLinks.totalLinks - result.checks.brokenLinks.brokenLinks.length}/
                                {result.checks.brokenLinks.totalLinks}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {result.checks.brokenLinks.brokenLinks.length} broken links
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center">
                                <ImageIcon className="w-4 h-4 mr-2" />
                                Images
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-xl font-bold">
                                {result.checks.images.totalImages - result.checks.images.issues.length}/
                                {result.checks.images.totalImages}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {result.checks.images.issues.length} image issues
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>

                      <TabsContent value="issues" className="space-y-4">
                        {result.checks.accessibility.issues.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2 flex items-center">
                              <Accessibility className="w-4 h-4 mr-2" />
                              Accessibility Issues
                            </h4>
                            <div className="space-y-2">
                              {result.checks.accessibility.issues.map((issue, i) => (
                                <div key={i} className="flex items-start space-x-2 p-2 border rounded">
                                  {getSeverityIcon(issue.severity)}
                                  <div className="flex-1">
                                    <div className="font-medium">{issue.type}</div>
                                    <div className="text-sm text-muted-foreground">{issue.message}</div>
                                    <div className="text-xs text-muted-foreground mt-1">{issue.element}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {result.checks.brokenLinks.brokenLinks.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2 flex items-center">
                              <Link className="w-4 h-4 mr-2" />
                              Broken Links
                            </h4>
                            <div className="space-y-2">
                              {result.checks.brokenLinks.brokenLinks.map((link, i) => (
                                <div key={i} className="flex items-start space-x-2 p-2 border rounded">
                                  <XCircle className="w-4 h-4 text-red-500 mt-0.5" />
                                  <div className="flex-1">
                                    <div className="font-medium">{link.text || "Untitled Link"}</div>
                                    <div className="text-sm text-muted-foreground">{link.url}</div>
                                    <Badge variant="destructive" className="text-xs mt-1">
                                      Status: {link.status}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {result.checks.images.issues.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2 flex items-center">
                              <ImageIcon className="w-4 h-4 mr-2" />
                              Image Issues
                            </h4>
                            <div className="space-y-2">
                              {result.checks.images.issues.map((issue, i) => (
                                <div key={i} className="flex items-start space-x-2 p-2 border rounded">
                                  {getSeverityIcon(issue.severity)}
                                  <div className="flex-1">
                                    <div className="font-medium">{issue.issue}</div>
                                    <div className="text-sm text-muted-foreground break-all">{issue.src}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="screenshots" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <h4 className="font-semibold mb-2">Desktop (1920x1080)</h4>
                            <img
                              src={result.screenshots.desktop || "/placeholder.svg"}
                              alt="Desktop screenshot"
                              className="w-full border rounded cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(result.screenshots.desktop || "/placeholder.svg", '_blank')}
                            />
                            <p className="text-xs text-muted-foreground mt-1">Click to view full size</p>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">Tablet (768x1024)</h4>
                            <img
                              src={result.screenshots.tablet || "/placeholder.svg"}
                              alt="Tablet screenshot"
                              className="w-full border rounded cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(result.screenshots.tablet || "/placeholder.svg", '_blank')}
                            />
                            <p className="text-xs text-muted-foreground mt-1">Click to view full size</p>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">Mobile (375x667)</h4>
                            <img
                              src={result.screenshots.mobile || "/placeholder.svg"}
                              alt="Mobile screenshot"
                              className="w-full border rounded cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(result.screenshots.mobile || "/placeholder.svg", '_blank')}
                            />
                            <p className="text-xs text-muted-foreground mt-1">Click to view full size</p>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="words" className="space-y-4">
                        {Object.keys(result.checks.wordCount).length > 0 ? (
                          <div className="grid gap-2 md:grid-cols-2">
                            {Object.entries(result.checks.wordCount).map(([word, count]) => (
                              <div key={word} className="flex justify-between items-center p-2 border rounded">
                                <span className="font-medium">&quot;{word}&quot;</span>
                                <Badge variant="secondary">{count} occurrences</Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center text-muted-foreground py-8">
                            No search words specified or found
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
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