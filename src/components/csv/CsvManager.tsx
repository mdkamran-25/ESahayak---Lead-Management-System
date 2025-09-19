"use client";

import { useState, useRef } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface CsvValidationError {
  row: number;
  field: string;
  message: string;
  value: any;
}

interface CsvImportResult {
  totalRows: number;
  validRows: number;
  errorRows: number;
  errors: CsvValidationError[];
  importedIds: string[];
}

interface CsvManagerProps {
  currentFilters: URLSearchParams;
  onImportComplete: () => void;
}

export function CsvManager({
  currentFilters,
  onImportComplete,
}: CsvManagerProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importResult, setImportResult] = useState<CsvImportResult | null>(
    null
  );
  const [importError, setImportError] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError("");
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/buyers/import", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Import failed");
      }

      setImportResult(result);

      if (result.validRows > 0) {
        onImportComplete(); // Refresh the buyers list
      }
    } catch (error: any) {
      console.error("Import error:", error);
      setImportError(error.message || "Failed to import CSV");
    } finally {
      setIsImporting(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const exportUrl = `/api/buyers/export?${currentFilters.toString()}`;
      const response = await fetch(exportUrl);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Export failed");
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Get filename from response headers or use default
      const contentDisposition = response.headers.get("content-disposition");
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
        : `buyers-export-${new Date().toISOString().split("T")[0]}.csv`;

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error: any) {
      console.error("Export error:", error);
      alert(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        fullName: "John Doe",
        email: "john@example.com",
        phone: "9876543210",
        city: "Chandigarh",
        propertyType: "Apartment",
        bhk: "2",
        purpose: "Buy",
        budgetMin: "5000000",
        budgetMax: "7000000",
        timeline: "0-3m",
        source: "Website",
        notes: "Looking for 2BHK in Sector 22",
        tags: "urgent, first-time buyer",
        status: "New",
      },
    ];

    const csv = [
      "fullName,email,phone,city,propertyType,bhk,purpose,budgetMin,budgetMax,timeline,source,notes,tags,status",
      templateData
        .map((row) =>
          Object.values(row)
            .map((value) =>
              typeof value === "string" && value.includes(",")
                ? `"${value}"`
                : value
            )
            .join(",")
        )
        .join("\n"),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "buyers-template.csv";
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => setShowImportModal(true)}
          disabled={isImporting}
        >
          {isImporting ? "Importing..." : "Import CSV"}
        </Button>

        <Button variant="outline" onClick={handleExport} disabled={isExporting}>
          {isExporting ? "Exporting..." : "Export CSV"}
        </Button>

        <Button variant="outline" onClick={downloadTemplate}>
          Download Template
        </Button>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Import Buyers from CSV</h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportResult(null);
                  setImportError("");
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Upload a CSV file with buyer data. Maximum 200 rows allowed.
                </p>
                <div className="flex gap-2">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    disabled={isImporting}
                  />
                  <Button
                    variant="outline"
                    onClick={downloadTemplate}
                    disabled={isImporting}
                  >
                    Get Template
                  </Button>
                </div>
              </div>

              {/* Required headers info */}
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="font-medium mb-2">Required CSV Headers:</h3>
                <p className="text-sm text-gray-600">
                  fullName, email, phone, city, propertyType, bhk, purpose,
                  budgetMin, budgetMax, timeline, source, notes, tags, status
                </p>
              </div>

              {importError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-red-600 font-medium">Import Error:</p>
                  <p className="text-red-600 text-sm">{importError}</p>
                </div>
              )}

              {importResult && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h3 className="font-medium text-blue-900 mb-2">
                      Import Summary:
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Total Rows:</span>
                        <p className="text-lg">{importResult.totalRows}</p>
                      </div>
                      <div>
                        <span className="font-medium text-green-600">
                          Successfully Imported:
                        </span>
                        <p className="text-lg text-green-600">
                          {importResult.validRows}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-red-600">
                          Errors:
                        </span>
                        <p className="text-lg text-red-600">
                          {importResult.errorRows}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">Success Rate:</span>
                        <p className="text-lg">
                          {importResult.totalRows > 0
                            ? Math.round(
                                (importResult.validRows /
                                  importResult.totalRows) *
                                  100
                              )
                            : 0}
                          %
                        </p>
                      </div>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <h3 className="font-medium text-red-900 mb-2">
                        Validation Errors:
                      </h3>
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">Row</th>
                              <th className="text-left p-2">Field</th>
                              <th className="text-left p-2">Error</th>
                              <th className="text-left p-2">Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importResult.errors
                              .slice(0, 50)
                              .map((error, index) => (
                                <tr key={index} className="border-b">
                                  <td className="p-2">{error.row}</td>
                                  <td className="p-2">{error.field}</td>
                                  <td className="p-2 text-red-600">
                                    {error.message}
                                  </td>
                                  <td className="p-2 text-gray-600 truncate max-w-32">
                                    {String(error.value)}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                        {importResult.errors.length > 50 && (
                          <p className="text-xs text-gray-500 mt-2">
                            ... and {importResult.errors.length - 50} more
                            errors
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      onClick={() => {
                        setShowImportModal(false);
                        setImportResult(null);
                        setImportError("");
                      }}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
