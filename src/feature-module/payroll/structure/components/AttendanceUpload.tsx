/**
 * Attendance Upload Component
 * Upload Excel file for attendance and generate payroll
 */

import React, { useState, useRef, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getAdminIdForApi } from "../../../../core/utils/apiHelpers";
import { attendanceUploadAPI, runPayrollAPI } from "../utils/api";

interface AttendanceUploadProps {
  onCancel?: () => void;
  onSuccess?: () => void; // Callback after successful generation
  month?: number; // Month for payroll generation
  year?: number; // Year for payroll generation
}

const AttendanceUpload: React.FC<AttendanceUploadProps> = ({ onCancel, onSuccess, month, year }) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(month || currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(year || currentYear);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validExtensions = [".xlsx", ".xls", ".csv"];
      const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      
      if (!validExtensions.includes(fileExtension)) {
        toast.error("Please upload a valid Excel file (.xlsx, .xls, or .csv)");
        return;
      }
      
      setSelectedFile(file);
      toast.success(`File selected: ${file.name}`);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first");
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

      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await attendanceUploadAPI.uploadAttendance(admin_id, formData);

      if (response?.status === 200 || response?.status === 201) {
        toast.success(response?.message || "Attendance file uploaded successfully");
        // Optionally clear the file selection
        // setSelectedFile(null);
        // if (fileInputRef.current) {
        //   fileInputRef.current.value = "";
        // }
      } else {
        toast.error(response?.message || "Failed to upload attendance file");
      }
    } catch (error: any) {
      console.error("Error uploading attendance file:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to upload attendance file";
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleGeneratePayroll = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first");
      return;
    }

    setGenerating(true);
    try {
      const admin_id = getAdminIdForApi();
      if (!admin_id) {
        toast.error("Admin ID not found");
        setGenerating(false);
        return;
      }

      const response = await runPayrollAPI.generatePayrollFromAttendance(
        admin_id,
        selectedMonth,
        selectedYear,
        selectedFile
      );

      if (response?.status === true || response?.status === 200 || response?.status === 201) {
        const successCount = response?.data?.success_count || 0;
        const errorCount = response?.data?.error_count || 0;
        
        if (successCount > 0) {
          toast.success(response?.message || `Payroll generated successfully for ${successCount} employee(s)`);
        // Clear file selection after successful generation
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
          }
          // Call onSuccess callback if provided
          if (onSuccess) {
            onSuccess();
          }
          // Close modal after a short delay
          if (onCancel) {
            setTimeout(() => {
              onCancel();
            }, 1500);
          }
        } else {
          toast.warning(response?.message || "No payroll records were generated");
        }
        
        if (errorCount > 0) {
          toast.warning(`${errorCount} error(s) occurred. Check console for details.`);
        }
      } else {
        toast.error(response?.message || "Failed to generate payroll");
      }
    } catch (error: any) {
      console.error("Error generating payroll:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to generate payroll";
      toast.error(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const admin_id = getAdminIdForApi();
      if (!admin_id) {
        toast.error("Admin ID not found");
        return;
      }

      const response = await attendanceUploadAPI.downloadDemoSheet(admin_id);
      
      // Create a blob from the response
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'demo_attendance_sheet.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("Demo attendance sheet downloaded successfully");
    } catch (error: any) {
      console.error("Error downloading demo attendance sheet:", error);
      toast.error(error.response?.data?.message || "Failed to download demo attendance sheet");
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.info("File removed");
  };

  const handleGeneratePayrollSuccess = () => {
    // Close modal after successful generation
    if (onCancel) {
      setTimeout(() => {
        onCancel();
      }, 1500); // Close after showing success message
    }
  };

  const handleGeneratePayrollWithClose = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first");
      return;
    }

    setGenerating(true);
    try {
      const admin_id = getAdminIdForApi();
      if (!admin_id) {
        toast.error("Admin ID not found");
        setGenerating(false);
        return;
      }

      const response = await runPayrollAPI.generatePayrollFromAttendance(
        admin_id,
        selectedMonth,
        selectedYear,
        selectedFile
      );

      if (response?.status === true || response?.status === 200 || response?.status === 201) {
        const successCount = response?.data?.success_count || 0;
        const errorCount = response?.data?.error_count || 0;
        
        if (successCount > 0) {
          toast.success(response?.message || `Payroll generated successfully for ${successCount} employee(s)`);
          // Clear file selection after successful generation
          setSelectedFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          // Call onSuccess callback if provided
          if (onSuccess) {
            onSuccess();
          }
          // Close modal after a short delay
          if (onCancel) {
            setTimeout(() => {
              onCancel();
            }, 1500);
          }
        } else {
          toast.warning(response?.message || "No payroll records were generated");
        }
        
        if (errorCount > 0) {
          toast.warning(`${errorCount} error(s) occurred. Check console for details.`);
        }
      } else {
        toast.error(response?.message || "Failed to generate payroll");
      }
    } catch (error: any) {
      console.error("Error generating payroll:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to generate payroll";
      toast.error(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

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
          className="modal-dialog modal-dialog-centered" 
          role="document"
          style={{ zIndex: 1051, pointerEvents: "auto" }}
        >
          <div 
            className="modal-content"
            style={{ zIndex: 1051, pointerEvents: "auto" }}
          >
            <div className="modal-header bg-white border-bottom">
              <h5 className="modal-title fw-semibold">
                  <i className="ti ti-upload me-2 text-primary" />
                  Upload Attendance Sheet
                </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onCancel}
                aria-label="Close"
              ></button>
              </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label fw-semibold mb-2">
                        <i className="ti ti-file-spreadsheet me-2 text-muted" />
                        Select Excel File
                      </label>
                <div 
                  className="upload-area border rounded p-3 text-center" 
                  style={{ 
                        borderStyle: "dashed", 
                        borderColor: "#ddd",
                        backgroundColor: "#f9f9f9",
                    minHeight: "120px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer"
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      >
                        {selectedFile ? (
                          <div className="w-100">
                      <i className="ti ti-file-check text-success" style={{ fontSize: "32px" }} />
                      <p className="mt-2 mb-1 fw-semibold small">{selectedFile.name}</p>
                      <p className="text-muted mb-2 small">
                              {(selectedFile.size / 1024).toFixed(2)} KB
                            </p>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFile();
                              }}
                            >
                              <i className="ti ti-x me-1" />
                        Remove
                            </button>
                          </div>
                        ) : (
                          <div>
                      <i className="ti ti-cloud-upload text-muted" style={{ fontSize: "40px" }} />
                      <p className="mt-2 mb-1 fw-semibold small">Click to upload</p>
                      <p className="text-muted mb-0 small">
                        Excel files (.xlsx, .xls, .csv)
                            </p>
                          </div>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleFileSelect}
                          style={{ display: "none" }}
                        />
                      </div>
                    </div>

              {/* Month and Year Selectors */}
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold mb-2">
                    <i className="ti ti-calendar me-2 text-muted" />
                    Month
                  </label>
                  <select
                    className="form-select"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  >
                    {months.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold mb-2">
                    <i className="ti ti-calendar me-2 text-muted" />
                    Year
                  </label>
                  <select
                    className="form-select"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                    </div>

              <div className="alert alert-info small mb-3">
                      <i className="ti ti-info-circle me-2" />
                <strong>Note:</strong> Upload Excel file with Employee ID, Name, Mobile Number, and Payable Days columns.
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
                onClick={handleGeneratePayrollWithClose}
                        disabled={!selectedFile || generating}
                type="button"
              >
                {generating ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" />
                    Generating...
                  </>
                ) : (
                  <>
                    <i className="ti ti-calendar-check me-1" />
                    Generate Payroll
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

export default AttendanceUpload;
