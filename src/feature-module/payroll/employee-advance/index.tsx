import React from "react";
import { Link } from "react-router-dom";
import EmployeeAdvanceList from "./components/EmployeeAdvanceList";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";

const EmployeeAdvance: React.FC = () => {
  return (
    <div className="page-wrapper">
      <div className="content">
        {/* Breadcrumb */}
        <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-4">
          <div className="my-auto mb-2">
            <h2 className="mb-1">Employee Advance</h2>
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
                  Employee Advance
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

        {/* Employee Advance Content */}
        <EmployeeAdvanceList />
      </div>
    </div>
  );
};

export default EmployeeAdvance;
