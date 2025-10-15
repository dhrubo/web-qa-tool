"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

export default function ReportPage() {
  const [report, setReport] = useState<any>(null);
  const categories = [
    { key: 'performance', label: 'Performance' },
    { key: 'accessibility', label: 'Accessibility' },
    { key: 'best-practices', label: 'Best Practices' },
    { key: 'seo', label: 'SEO' },
  ];

  useEffect(() => {
    const reportData = JSON.parse(
      localStorage.getItem("lighthouseResult") || "{}"
    );
    setReport(reportData);
  }, []);

  function renderScore(score: number | null) {
    if (score === null || score === undefined) {
      return <span className="text-gray-500">N/A</span>;
    }
    if (score >= 0.9) {
      return (
        <span className="text-green-500">
          <CheckCircle className="inline-block mr-2" />
          {(score * 100).toFixed(0)}
        </span>
      );
    }
    if (score >= 0.5) {
      return (
        <span className="text-yellow-500">
          <AlertTriangle className="inline-block mr-2" />
          {(score * 100).toFixed(0)}
        </span>
      );
    }
    return (
      <span className="text-red-500">
        <XCircle className="inline-block mr-2" />
        {(score * 100).toFixed(0)}
      </span>
    );
  }


  function getFailingAudits(catKey: string) {
    if (!report.categories?.[catKey] || !report.audits) return [];
    const auditRefs = report.categories[catKey].auditRefs || [];
    return auditRefs
      .map((ref: any) => report.audits[ref.id])
      .filter((audit: any) => audit && audit.score !== null && audit.score < 1);
  }

  if (!report) {
    return <div>Loading...</div>;
  }

  const handleDownloadCSV = () => {
    if (!report) return;
    const rows = categories.map(cat => [
      cat.label,
      report.categories?.[cat.key]?.score !== undefined && report.categories?.[cat.key]?.score !== null
        ? (report.categories[cat.key].score * 100).toFixed(0)
        : 'N/A',
    ]);
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

  const highlightSnippet = (snippet: string, explanation: string) => {
    if (!snippet || !explanation) {
      return snippet;
    }

    const match = explanation.match(/ARIA attribute is not allowed: (.*)/);
    if (match && match[1]) {
      const attribute = match[1].split('=')[0];
      return snippet.replace(
        attribute,
        `<span className="bg-red-200 text-red-800 p-1">${attribute}</span>`
      );
    }

    return snippet;
  };

  // CSV download handler (now inside component)

  if (!report) {
    return <div>Loading...</div>;
  }

  // Extract main category scores

  // Helper: get failing audits for a category

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Lighthouse Report</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            <strong>Requested URL:</strong> {report.requestedUrl}
          </p>
          <p>
            <strong>Fetch Time:</strong> {report.fetchTime ? new Date(report.fetchTime).toLocaleString() : 'N/A'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Summary Table</CardTitle>
          <button
            onClick={handleDownloadCSV}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
          >
            Download CSV
          </button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.key}>
                  <TableCell>{cat.label}</TableCell>
                  <TableCell>
                    {renderScore(report.categories?.[cat.key]?.score ?? null)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Detailed Failing Audits</h2>
        {categories.map((cat) => {
          const failing = getFailingAudits(cat.key);
          if (!failing.length) return null;
          return (
            <div key={cat.key} className="mb-8">
              <h3 className="text-lg font-semibold mb-2">{cat.label}</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Audit</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failing.map((audit: any) => (
                    <TableRow key={audit.id}>
                      <TableCell>{audit.title}</TableCell>
                      <TableCell>{audit.description}</TableCell>
                      <TableCell>{renderScore(audit.score)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
