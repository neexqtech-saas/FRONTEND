import React, { useState } from "react";
import { Link } from "react-router-dom";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import RunPayrollTab from "./components/RunPayrollTab";
import EarningsUploadTab from "./components/EarningsUploadTab";
import DeductionsUploadTab from "./components/DeductionsUploadTab";
import PayslipListView from "./components/PayslipListView";
import "./index.scss";


const RunPayroll: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("run-payroll");
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [showDeductionsModal, setShowDeductionsModal] = useState(false);

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-4">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Run Payroll</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to="/">
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">
                    <Link to="/payroll">Payroll</Link>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Run Payroll
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="card">
            <div className="card-header border-0 pb-0">
              <ul className="nav nav-tabs card-header-tabs" role="tablist">
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === "run-payroll" ? "active" : ""}`}
                    onClick={() => setActiveTab("run-payroll")}
                    type="button"
                  >
                    <i className="ti ti-calendar-check me-1"></i>
                    Run Payroll
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === "earnings-upload" ? "active" : ""}`}
                    onClick={() => setActiveTab("earnings-upload")}
                    type="button"
                  >
                    <i className="ti ti-upload me-1"></i>
                    Earnings Upload
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === "deductions-upload" ? "active" : ""}`}
                    onClick={() => setActiveTab("deductions-upload")}
                    type="button"
                  >
                    <i className="ti ti-download me-1"></i>
                    Deductions Upload
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === "payslips" ? "active" : ""}`}
                    onClick={() => setActiveTab("payslips")}
                    type="button"
                  >
                    <i className="ti ti-file-invoice me-1"></i>
                    View Payslips
                  </button>
                </li>
              </ul>
            </div>
            <div className="card-body">
              {activeTab === "run-payroll" && <RunPayrollTab onNavigateToPayslips={() => setActiveTab("payslips")} />}
              {activeTab === "payslips" && <PayslipListView />}
              {activeTab === "earnings-upload" && (
                <div className="text-center py-5">
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowEarningsModal(true)}
                    type="button"
                  >
                    <i className="ti ti-upload me-2" />
                    Upload Earnings
                  </button>
                </div>
              )}
              {activeTab === "deductions-upload" && (
                <div className="text-center py-5">
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowDeductionsModal(true)}
                    type="button"
                  >
                    <i className="ti ti-upload me-2" />
                    Upload Deductions
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Earnings Upload Modal */}
      {showEarningsModal && (
        <EarningsUploadTab onCancel={() => setShowEarningsModal(false)} />
      )}

      {/* Deductions Upload Modal */}
      {showDeductionsModal && (
        <DeductionsUploadTab onCancel={() => setShowDeductionsModal(false)} />
      )}
    </>
  );
};

export default RunPayroll;
