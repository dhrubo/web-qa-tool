"use strict";
"use client";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = QAToolPage;
const react_1 = require("react");
const button_1 = require("@/components/ui/button");
const card_1 = require("@/components/ui/card");
const input_1 = require("@/components/ui/input");
const label_1 = require("@/components/ui/label");
const textarea_1 = require("@/components/ui/textarea");
const progress_1 = require("@/components/ui/progress");
const lucide_react_1 = require("lucide-react");
const actions_1 = require("./actions");
function QAToolPage() {
    const [urls, setUrls] = (0, react_1.useState)("");
    const [searchWords, setSearchWords] = (0, react_1.useState)("");
    const [viewportWidth, setViewportWidth] = (0, react_1.useState)(1280);
    const [selectedChecks, setSelectedChecks] = (0, react_1.useState)({
        brokenLinks: false,
        imageAlt: false,
        spellingGrammar: false,
    });
    const [isRunning, setIsRunning] = (0, react_1.useState)(false);
    const [progress, setProgress] = (0, react_1.useState)(0);
    const [results, setResults] = (0, react_1.useState)([]);
    // ...existing useState declarations...
    // Debug log for imageAltIssues
    // This will log every render, showing the latest results
    if (results.length > 0 && results[0].imageAltIssues) {
        console.log('imageAltIssues:', results[0].imageAltIssues);
    }
    // Debug log for imageAltIssues
    // This will log every render, showing the latest results
    if (results.length > 0 && results[0].imageAltIssues) {
        console.log('imageAltIssues:', results[0].imageAltIssues);
    }
    const handleCheckChange = (checkType, checked) => {
        setSelectedChecks((prev) => (Object.assign(Object.assign({}, prev), { [checkType]: checked })));
    };
    const handleRunChecks = () => __awaiter(this, void 0, void 0, function* () {
        if (!urls.trim())
            return;
        setIsRunning(true);
        setProgress(0);
        setResults([]);
        let urlList = urls.split("\n").filter((url) => url.trim());
        // Limit to 5 URLs maximum
        if (urlList.length > 5) {
            alert("Maximum 5 URLs allowed. Only the first 5 will be processed.");
            urlList = urlList.slice(0, 5);
        }
        const wordsToSearch = searchWords.split(",").map((word) => word.trim()).filter((word) => word);
        let completedCount = 0;
        const totalUrls = urlList.length;
        // Process URLs sequentially
        for (let i = 0; i < urlList.length; i++) {
            const url = urlList[i];
            yield new Promise((resolve) => {
                const onUpdate = (update) => {
                    console.log('Received update for', url, ':', update);
                    setResults(prevResults => {
                        const existingResultIndex = prevResults.findIndex(r => r.url === url);
                        let newResults = [...prevResults];
                        if (existingResultIndex > -1) {
                            const existingResult = newResults[existingResultIndex];
                            const updatedResult = Object.assign({}, existingResult);
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
                        }
                        else {
                            const newResult = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ url, timestamp: new Date().toISOString() }, (update.type === 'screenshot' && { screenshot: update.data.screenshot })), (update.type === 'screenshotAlpha' && { screenshotAlpha: update.data.screenshotAlpha })), (update.type === 'wordCount' && { wordCount: update.data.wordCount })), (update.type === 'imageAlt' && { imageAltIssues: update.data.imageAltIssues })), (update.type === 'brokenLinks' && { brokenLinks: update.data.brokenLinks }));
                            newResults.push(newResult);
                        }
                        return newResults;
                    });
                };
                const onError = (error) => {
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
                (0, actions_1.runQAChecks)(url, wordsToSearch, selectedChecks, viewportWidth, onUpdate, onError, onComplete);
            });
        }
        setIsRunning(false);
        setProgress(100);
    });
    return (<div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Web QA Tool</h1>
        <p className="text-muted-foreground">Automated quality assurance testing for web pages using Playwright</p>
      </div>

      <div className="grid gap-6">
        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>Configuration</card_1.CardTitle>
            <card_1.CardDescription>Set up your QA checks and target URLs (Max 5 URLs)</card_1.CardDescription>
          </card_1.CardHeader>
            <card_1.CardContent className="space-y-6">
              <div className="space-y-2">
                <label_1.Label htmlFor="urls">URLs to Check</label_1.Label>
                <textarea_1.Textarea id="urls" placeholder="https://example.com&#10;https://another-site.com" value={urls} onChange={(e) => setUrls(e.target.value)} rows={4}/>
                <p className="text-sm text-muted-foreground">Enter one URL per line</p>
              </div>

              <div className="space-y-2">
                <label_1.Label htmlFor="words">Words to Search</label_1.Label>
                <input_1.Input id="words" placeholder="error, warning, deprecated" value={searchWords} onChange={(e) => setSearchWords(e.target.value)}/>
                <p className="text-sm text-muted-foreground">Comma-separated words to count</p>
              </div>

              <div className="space-y-4">
                {/* Checks to Perform removed - options disabled by default */}
              </div>

              <button_1.Button onClick={handleRunChecks} className="w-full">
                {isRunning ? (<>
                    <lucide_react_1.Clock className="w-4 h-4 mr-2 animate-spin"/>
                    Running Checks...
                  </>) : ("Run QA Checks")}
              </button_1.Button>

              {isRunning && (<div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <progress_1.Progress value={progress}/>
                </div>)}
            </card_1.CardContent>
          </card_1.Card>

        {results.length > 0 && (<div className="space-y-6">
            {results.map((result, index) => (<card_1.Card key={index}>
                  <card_1.CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <card_1.CardTitle className="text-lg">{result.url}</card_1.CardTitle>
                        <card_1.CardDescription>Tested on {new Date(result.timestamp).toLocaleString()}</card_1.CardDescription>
                        {result.wordCount !== undefined && (<card_1.CardDescription>
                            Found {result.wordCount} occurrences of the searched words.
                          </card_1.CardDescription>)}
                      </div>
                    </div>
                  </card_1.CardHeader>
                  <card_1.CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2 text-center">Original URL</h4>
                        {result.screenshot ? (<div className="bg-gray-100 p-2 rounded border overflow-hidden">
                            <img src={`data:image/png;base64,${result.screenshot}`} alt="Screenshot of the original page" className="w-full h-auto border rounded shadow cursor-pointer hover:opacity-90 transition-opacity" onClick={() => {
                        const win = window.open();
                        if (win) {
                            win.document.write(`<img src="data:image/png;base64,${result.screenshot}" style="width:100%"/>`);
                        }
                    }}/>
                          </div>) : (<div className="text-center text-muted-foreground py-8 bg-gray-100 rounded border">No screenshot available</div>)}
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2 text-center">With ?d_alpha=true</h4>
                        {result.screenshotAlpha ? (<div className="bg-gray-100 p-2 rounded border overflow-hidden">
                            <img src={`data:image/png;base64,${result.screenshotAlpha}`} alt="Screenshot of the page with ?d_alpha=true" className="w-full h-auto border rounded shadow cursor-pointer hover:opacity-90 transition-opacity" onClick={() => {
                        const win = window.open();
                        if (win) {
                            win.document.write(`<img src="data:image/png;base64,${result.screenshotAlpha}" style="width:100%"/>`);
                        }
                    }}/>
                          </div>) : (<div className="text-center text-muted-foreground py-8 bg-gray-100 rounded border">No screenshot available</div>)}
                      </div>
                    </div>

                    {result.visualDiff && (<div className="mt-4">
                        <h4 className="font-semibold mb-2">Visual Difference</h4>
                        <p>{result.visualDiff.diffPixels} pixels differ</p>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <h5 className="font-semibold mb-2 text-center">Original</h5>
                            <img src={result.visualDiff.original} alt="Original screenshot" className="w-full h-auto border rounded shadow cursor-pointer hover:opacity-90 transition-opacity" onClick={() => {
                        const win = window.open();
                        if (win && result.visualDiff) {
                            win.document.write(`<img src="${result.visualDiff.original}" style="width:100%"/>`);
                        }
                    }}/>
                          </div>
                          <div>
                            <h5 className="font-semibold mb-2 text-center">Alpha</h5>
                            <img src={result.visualDiff.alpha} alt="Alpha screenshot" className="w-full h-auto border rounded shadow cursor-pointer hover:opacity-90 transition-opacity" onClick={() => {
                        const win = window.open();
                        if (win && result.visualDiff) {
                            win.document.write(`<img src="${result.visualDiff.alpha}" style="width:100%"/>`);
                        }
                    }}/>
                          </div>
                          <div>
                            <h5 className="font-semibold mb-2 text-center">Diff</h5>
                            <img src={result.visualDiff.diff} alt="Diff image" className="w-full h-auto border rounded shadow cursor-pointer hover:opacity-90 transition-opacity" onClick={() => {
                        const win = window.open();
                        if (win && result.visualDiff) {
                            win.document.write(`<img src="${result.visualDiff.diff}" style="width:100%"/>`);
                        }
                    }}/>
                          </div>
                        </div>
                      </div>)}

                    {result.brokenLinks && result.brokenLinks.length > 0 && (<div className="mt-4">
                        <h4 className="font-semibold mb-2">Broken Links</h4>
                        <ul className="list-disc list-inside">
                          {result.brokenLinks.map((link, i) => (<li key={i} className="truncate">
                              <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{link.url}</a>
                              <span className="ml-2 text-red-500">({link.status})</span>
                            </li>))}
                        </ul>
                      </div>)}

                    {result.spellingGrammarIssues && (<div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                      <h4 className="font-semibold mb-2 text-blue-800">Spelling & Grammar</h4>
                      {(result.spellingGrammarIssues && result.spellingGrammarIssues.length === 0) || !result.spellingGrammarIssues ? (<p className="text-green-700">No spelling or grammar issues found.</p>) : (<ul className="list-disc list-inside text-blue-900">
                          {result.spellingGrammarIssues.map((issue, i) => (<li key={i}>{issue.reason}</li>))}
                        </ul>)}
                    </div>)}
                  </card_1.CardContent>
                </card_1.Card>))}
          </div>)}

        {results.length === 0 && !isRunning && (<card_1.Card>
            <card_1.CardContent className="flex flex-col items-center justify-center py-12">
              <lucide_react_1.Eye className="w-12 h-12 text-muted-foreground mb-4"/>
              <h3 className="text-lg font-semibold mb-2">No Results Yet</h3>
              <p className="text-muted-foreground text-center">
                Configure your checks and enter URLs to get started with automated QA testing.
              </p>
            </card_1.CardContent>
          </card_1.Card>)}
      </div>
    </div>);
}
