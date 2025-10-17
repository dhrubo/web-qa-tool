"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReportPage;
const react_1 = require("react");
const card_1 = require("@/components/ui/card");
const table_1 = require("@/components/ui/table");
const lucide_react_1 = require("lucide-react");
function ReportPage() {
    const [report, setReport] = (0, react_1.useState)(null);
    const categories = [
        { key: 'performance', label: 'Performance' },
        { key: 'accessibility', label: 'Accessibility' },
        { key: 'best-practices', label: 'Best Practices' },
        { key: 'seo', label: 'SEO' },
    ];
    (0, react_1.useEffect)(() => {
        const reportData = JSON.parse(localStorage.getItem("lighthouseResult") || "{}");
        setReport(reportData);
    }, []);
    function renderScore(score) {
        if (score === null || score === undefined) {
            return <span className="text-gray-500">N/A</span>;
        }
        if (score >= 0.9) {
            return (<span className="text-green-500">
          <lucide_react_1.CheckCircle className="inline-block mr-2"/>
          {(score * 100).toFixed(0)}
        </span>);
        }
        if (score >= 0.5) {
            return (<span className="text-yellow-500">
          <lucide_react_1.AlertTriangle className="inline-block mr-2"/>
          {(score * 100).toFixed(0)}
        </span>);
        }
        return (<span className="text-red-500">
        <lucide_react_1.XCircle className="inline-block mr-2"/>
        {(score * 100).toFixed(0)}
      </span>);
    }
    function getFailingAudits(catKey) {
        var _a;
        if (!((_a = report.categories) === null || _a === void 0 ? void 0 : _a[catKey]) || !report.audits)
            return [];
        const auditRefs = report.categories[catKey].auditRefs || [];
        return auditRefs
            .map((ref) => report.audits[ref.id])
            .filter((audit) => audit && audit.score !== null && audit.score < 1);
    }
    if (!report) {
        return <div>Loading...</div>;
    }
    const handleDownloadCSV = () => {
        if (!report)
            return;
        const rows = categories.map(cat => {
            var _a, _b, _c, _d;
            return [
                cat.label,
                ((_b = (_a = report.categories) === null || _a === void 0 ? void 0 : _a[cat.key]) === null || _b === void 0 ? void 0 : _b.score) !== undefined && ((_d = (_c = report.categories) === null || _c === void 0 ? void 0 : _c[cat.key]) === null || _d === void 0 ? void 0 : _d.score) !== null
                    ? (report.categories[cat.key].score * 100).toFixed(0)
                    : 'N/A',
            ];
        });
        let csv = 'Category,Score\n';
        rows.forEach(row => {
            csv += row.join(',') + '\n';
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lighthouse-summary.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    if (!report) {
        return <div>Loading...</div>;
    }
    const highlightSnippet = (snippet, explanation) => {
        if (!snippet || !explanation) {
            return snippet;
        }
        const match = explanation.match(/ARIA attribute is not allowed: (.*)/);
        if (match && match[1]) {
            const attribute = match[1].split('=')[0];
            return snippet.replace(attribute, `<span className="bg-red-200 text-red-800 p-1">${attribute}</span>`);
        }
        return snippet;
    };
    // CSV download handler (now inside component)
    if (!report) {
        return <div>Loading...</div>;
    }
    // Extract main category scores
    // Helper: get failing audits for a category
    return (<div className="container mx-auto p-4">
      <card_1.Card className="mb-4">
        <card_1.CardHeader>
          <card_1.CardTitle>Lighthouse Report</card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent>
          <p>
            <strong>Requested URL:</strong> {report.requestedUrl}
          </p>
          <p>
            <strong>Fetch Time:</strong> {report.fetchTime ? new Date(report.fetchTime).toLocaleString() : 'N/A'}
          </p>
        </card_1.CardContent>
      </card_1.Card>

      <card_1.Card>
        <card_1.CardHeader className="flex flex-row items-center justify-between">
          <card_1.CardTitle>Summary Table</card_1.CardTitle>
          <button onClick={handleDownloadCSV} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">
            Download CSV
          </button>
        </card_1.CardHeader>
        <card_1.CardContent>
          <table_1.Table>
            <table_1.TableHeader>
              <table_1.TableRow>
                <table_1.TableHead>Category</table_1.TableHead>
                <table_1.TableHead>Score</table_1.TableHead>
              </table_1.TableRow>
            </table_1.TableHeader>
            <table_1.TableBody>
              {categories.map((cat) => {
            var _a, _b, _c;
            return (<table_1.TableRow key={cat.key}>
                  <table_1.TableCell>{cat.label}</table_1.TableCell>
                  <table_1.TableCell>
                    {renderScore((_c = (_b = (_a = report.categories) === null || _a === void 0 ? void 0 : _a[cat.key]) === null || _b === void 0 ? void 0 : _b.score) !== null && _c !== void 0 ? _c : null)}
                  </table_1.TableCell>
                </table_1.TableRow>);
        })}
            </table_1.TableBody>
          </table_1.Table>
        </card_1.CardContent>
      </card_1.Card>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Detailed Failing Audits</h2>
        {categories.map((cat) => {
            const failing = getFailingAudits(cat.key);
            if (!failing.length)
                return null;
            return (<div key={cat.key} className="mb-8">
              <h3 className="text-lg font-semibold mb-2">{cat.label}</h3>
              <table_1.Table>
                <table_1.TableHeader>
                  <table_1.TableRow>
                    <table_1.TableHead>Audit</table_1.TableHead>
                    <table_1.TableHead>Description</table_1.TableHead>
                    <table_1.TableHead>Score</table_1.TableHead>
                  </table_1.TableRow>
                </table_1.TableHeader>
                <table_1.TableBody>
                  {failing.map((audit) => (<table_1.TableRow key={audit.id}>
                      <table_1.TableCell>{audit.title}</table_1.TableCell>
                      <table_1.TableCell>{audit.description}</table_1.TableCell>
                      <table_1.TableCell>{renderScore(audit.score)}</table_1.TableCell>
                    </table_1.TableRow>))}
                </table_1.TableBody>
              </table_1.Table>
            </div>);
        })}
      </div>
    </div>);
}
