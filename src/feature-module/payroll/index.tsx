/**
 * Payroll Management - Custom Payslip Generator
 */

import React from "react";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import PayslipGenerator from "./payslip-generator/index";
import "./index.scss";

const Payroll: React.FC = () => {
  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Custom Payslip Generator</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <a href="#">
                      <i className="ti ti-smart-home" />
                    </a>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Payroll
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

          {/* Payslip Generator Component */}
          <PayslipGenerator />
        </div>
      </div>
    </>
  );
};

export default Payroll;
