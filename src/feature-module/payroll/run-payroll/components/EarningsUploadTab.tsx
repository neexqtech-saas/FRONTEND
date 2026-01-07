/**
 * Earnings Upload Tab Component
 * Download template and upload earnings Excel
 * Component for managing employee earnings Excel uploads
 */

import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getAdminIdForApi } from "../../../../core/utils/apiHelpers";
import { employeeEarningsExcelAPI } from "../../structure/utils/api";

interface EarningsUploadTabProps {
  onCancel?: () => void;
}

const EarningsUploadTab: React.FC<EarningsUploadTabProps> = ({ onCancel }) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Prevent body scroll when modal is open
    if (onCancel) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "unset";
      };
    }
  }, [onCancel]);

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const years = [];
  for (let i = currentYear - 5; i <= currentYear + 5; i++) {
    years.push(i);
  }

  const handleDownloadTemplate = async () => {
    try {
      const admin_id = getAdminIdForApi();
      if (!admin_id) {
        toast.error("Admin ID not found");
        return;
      }

      const response = await employeeEarningsExcelAPI.downloadTemplate(
        admin_id,
        selectedMonth,
        selectedYear
      );

      // Create blob and download
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `earnings_upload_template_${selectedMonth}_${selectedYear}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Template downloaded successfully");
    } catch (error: any) {
      console.error("Error downloading template:", error);
      toast.error(error.response?.data?.message || "Failed to download template");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
        toast.error("Please select an Excel file (.xlsx or .xls)");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    setUploading(true);
    try {
      const admin_id = getAdminIdForApi();
      if (!admin_id) {
        toast.error("Admin ID not found");
        setUploading(false);
        return;
      }

      const response = await employeeEarningsExcelAPI.uploadExcel(
        admin_id,
        selectedMonth,
        selectedYear,
        selectedFile
      );

      if (response.status) {
        const successCount = response.data?.success_count || 0;
        const errorCount = response.data?.error_count || 0;
        
        if (errorCount === 0) {
          toast.success(`Successfully uploaded ${successCount} records`);
        } else {
          toast.warning(
            `Uploaded ${successCount} records. ${errorCount} errors occurred. Check console for details.`
          );
          if (response.data?.errors && response.data.errors.length > 0) {
            console.error("Upload errors:", response.data.errors);
          }
        }
        setSelectedFile(null);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        // Close modal after successful upload
        if (onCancel && errorCount === 0) {
          setTimeout(() => {
            onCancel();
          }, 1500);
        }
      } else {
        toast.error(response.message || "Failed to upload file");
      }
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast.error(error.response?.data?.message || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  if (!onCancel) {
    // If no onCancel prop, render as regular tab (backward compatibility)
    return (
      <div className="earnings-upload-tab">
        <ToastContainer />
        <div className="text-center py-5">
          <p className="text-muted">Click the button to upload earnings</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer />
      <div 
        className="modal fade show" 
        style={{ display: "block", zIndex: 1050 }} 
        tabIndex={-1} 
        role="dialog"
      >
        <div 
          className="modal-dialog modal-dialog-centered modal-lg" 
          role="document"
          style={{ zIndex: 1051, pointerEvents: "auto" }}
        >
          <div 
            className="modal-content"
            style={{ zIndex: 1051, pointerEvents: "auto" }}
          >
            <div className="modal-header bg-white border-bottom">
              <h5 className="modal-title fw-semibold">
                <i className="ti ti-file-upload me-2 text-primary" />
                Upload Employee Earnings
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onCancel}
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">Month</label>
                  <select
                    className="form-select"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  >
                    {months.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Year</label>
                  <select
                    className="form-select"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Select Excel File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="form-control"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                />
                {selectedFile && (
                  <small className="text-muted mt-1 d-block">
                    Selected: {selectedFile.name}
                  </small>
                )}
              </div>

              <div className="alert alert-info small mb-0">
                <i className="ti ti-info-circle me-2" />
                <strong>Note:</strong> Download the template, fill in employee earnings data, select month/year, and upload the file.
              </div>
            </div>
            <div className="modal-footer bg-white border-top">
              <button
                className="btn btn-outline-primary"
                onClick={handleDownloadTemplate}
                type="button"
              >
                <i className="ti ti-download me-1" />
                Download Template
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={onCancel}
                type="button"
              >
                <i className="ti ti-x me-1" />
                Cancel
              </button>
              <button
                className="btn btn-success"
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                type="button"
              >
                {uploading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <i className="ti ti-upload me-1" />
                    Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div 
        className="modal-backdrop fade show" 
        onClick={onCancel}
        style={{ zIndex: 1049 }}
      ></div>
    </>
  );
};

export default EarningsUploadTab;
