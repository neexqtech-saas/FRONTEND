/**
 * Statutory Rules Component - Read-only informational screen
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import { all_routes } from '../../router/all_routes';

const StatutoryRules: React.FC = () => {
  const navigate = useNavigate();
  const [expandedCards, setExpandedCards] = useState<{ [key: string]: boolean }>({
    professionalTax: true,
    providentFund: false,
    esic: false,
    gratuity: false,
  });

  const toggleCard = (cardKey: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [cardKey]: !prev[cardKey],
    }));
  };

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Statutory Payroll Rules (India)</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <a href="#">
                      <i className="ti ti-smart-home" />
                    </a>
                  </li>
                  <li className="breadcrumb-item">
                    <a href="#">Payroll System</a>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Statutory Rules
                  </li>
                </ol>
              </nav>
              <p className="text-muted mb-0 mt-2">
                Government-mandated payroll deductions and benefits explained
              </p>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>

          {/* Read-only Notice */}
          <div className="alert alert-info d-flex align-items-center mb-4" role="alert">
            <i className="ti ti-lock me-2" style={{ fontSize: '20px' }}></i>
            <div>
              <strong>Read Only</strong> – Statutory compliance rules cannot be modified. 
              These rules are defined by statutory authorities and are automatically applied during payroll processing.
            </div>
          </div>

          {/* Rule Cards */}
          <div className="row">
            <div className="col-12">
              {/* Professional Tax Card */}
              <div className="card mb-3">
                <div
                  className="card-header d-flex justify-content-between align-items-center"
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleCard('professionalTax')}
                >
                  <div className="d-flex align-items-center">
                    <h5 className="mb-0 me-3">Professional Tax (PT)</h5>
                    <span className="badge bg-warning text-dark">State-wise Rule</span>
                    <span className="badge bg-info ms-2">Varies by State</span>
                  </div>
                  <i
                    className={`ti ${expandedCards.professionalTax ? 'ti-chevron-up' : 'ti-chevron-down'}`}
                    style={{ fontSize: '20px' }}
                  ></i>
                </div>
                {expandedCards.professionalTax && (
                  <div className="card-body">
                    <p className="text-muted mb-3">
                      Professional Tax is a state-level tax levied on salaried individuals and professionals.
                      The applicable tax amount depends on the employee's work location and state-specific slabs.
                    </p>
                    <ul className="list-unstyled mb-3">
                      <li className="mb-2">
                        <i className="ti ti-check text-success me-2"></i>
                        Managed by respective state governments
                      </li>
                      <li className="mb-2">
                        <i className="ti ti-check text-success me-2"></i>
                        Slabs and limits differ from state to state
                      </li>
                      <li className="mb-2">
                        <i className="ti ti-check text-success me-2"></i>
                        Deducted monthly or annually depending on state law
                      </li>
                      <li className="mb-0">
                        <i className="ti ti-check text-success me-2"></i>
                        Employer is responsible for deduction and deposit
                      </li>
                    </ul>
                    <div className="mt-3">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => navigate(all_routes.professionalTaxRules)}
                      >
                        <i className="ti ti-map-pin me-2"></i>
                        View State-wise Rules
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Provident Fund Card */}
              <div className="card mb-3">
                <div
                  className="card-header d-flex justify-content-between align-items-center"
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleCard('providentFund')}
                >
                  <div className="d-flex align-items-center">
                    <h5 className="mb-0 me-3">Provident Fund (PF)</h5>
                    <span className="badge bg-primary">Central Rule</span>
                    <span className="badge bg-success ms-2">Uniform Across India</span>
                  </div>
                  <i
                    className={`ti ${expandedCards.providentFund ? 'ti-chevron-up' : 'ti-chevron-down'}`}
                    style={{ fontSize: '20px' }}
                  ></i>
                </div>
                {expandedCards.providentFund && (
                  <div className="card-body">
                    <p className="text-muted mb-3">
                      Provident Fund (PF) is a retirement benefit scheme governed by the Employees' Provident Funds & Miscellaneous Provisions Act, 1952.
                    </p>
                    <ul className="list-unstyled mb-0">
                      <li className="mb-2">
                        <i className="ti ti-check text-success me-2"></i>
                        Employee contribution: <strong>12%</strong>
                      </li>
                      <li className="mb-2">
                        <i className="ti ti-check text-success me-2"></i>
                        Employer contribution: <strong>12%</strong>
                      </li>
                      <li className="mb-2">
                        <i className="ti ti-check text-success me-2"></i>
                        Wage ceiling: <strong>₹15,000</strong>
                      </li>
                      <li className="mb-2">
                        <i className="ti ti-check text-success me-2"></i>
                        Same rules apply across all Indian states
                      </li>
                      <li className="mb-0">
                        <i className="ti ti-check text-success me-2"></i>
                        Optional voluntary higher contribution allowed
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              {/* ESIC Card */}
              <div className="card mb-3">
                <div
                  className="card-header d-flex justify-content-between align-items-center"
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleCard('esic')}
                >
                  <div className="d-flex align-items-center">
                    <h5 className="mb-0 me-3">Employee State Insurance (ESIC)</h5>
                    <span className="badge bg-primary">Central Rule</span>
                    <span className="badge bg-success ms-2">Uniform Across India</span>
                  </div>
                  <i
                    className={`ti ${expandedCards.esic ? 'ti-chevron-up' : 'ti-chevron-down'}`}
                    style={{ fontSize: '20px' }}
                  ></i>
                </div>
                {expandedCards.esic && (
                  <div className="card-body">
                    <p className="text-muted mb-3">
                      ESIC is a social security scheme providing medical and cash benefits under the ESI Act, 1948.
                    </p>
                    <ul className="list-unstyled mb-0">
                      <li className="mb-2">
                        <i className="ti ti-check text-success me-2"></i>
                        Employee contribution: <strong>0.75%</strong>
                      </li>
                      <li className="mb-2">
                        <i className="ti ti-check text-success me-2"></i>
                        Employer contribution: <strong>3.25%</strong>
                      </li>
                      <li className="mb-2">
                        <i className="ti ti-check text-success me-2"></i>
                        Salary eligibility limit: <strong>₹21,000</strong>
                      </li>
                      <li className="mb-2">
                        <i className="ti ti-check text-success me-2"></i>
                        Medical, maternity, sickness and disability benefits
                      </li>
                      <li className="mb-0">
                        <i className="ti ti-check text-success me-2"></i>
                        Rules are consistent nationwide
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Gratuity Card */}
              <div className="card mb-3">
                <div
                  className="card-header d-flex justify-content-between align-items-center"
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleCard('gratuity')}
                >
                  <div className="d-flex align-items-center">
                    <h5 className="mb-0 me-3">Gratuity</h5>
                    <span className="badge bg-primary">Central Rule</span>
                    <span className="badge bg-success ms-2">Uniform Across India</span>
                  </div>
                  <i
                    className={`ti ${expandedCards.gratuity ? 'ti-chevron-up' : 'ti-chevron-down'}`}
                    style={{ fontSize: '20px' }}
                  ></i>
                </div>
                {expandedCards.gratuity && (
                  <div className="card-body">
                    <p className="text-muted mb-3">
                      Gratuity is a long-term employment benefit payable to employees after continuous service.
                    </p>
                    <ul className="list-unstyled mb-0">
                      <li className="mb-2">
                        <i className="ti ti-check text-success me-2"></i>
                        Minimum service requirement: <strong>5 years</strong>
                      </li>
                      <li className="mb-2">
                        <i className="ti ti-check text-success me-2"></i>
                        Applicable for organizations with <strong>10 or more employees</strong>
                      </li>
                      <li className="mb-2">
                        <i className="ti ti-check text-success me-2"></i>
                        Calculation formula:
                        <div className="bg-light p-3 mt-2 rounded" style={{ fontFamily: 'monospace' }}>
                          <strong>(Last Drawn Salary × 15 × Years of Service) ÷ 26</strong>
                        </div>
                      </li>
                      <li className="mb-0">
                        <i className="ti ti-check text-success me-2"></i>
                        Calculation method is same across India
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="card mt-4">
            <div className="card-body">
              <p className="text-muted mb-0 text-center">
                <i className="ti ti-info-circle me-2"></i>
                These rules are defined by statutory authorities and are automatically applied during payroll processing.
              </p>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .card-header {
          transition: background-color 0.2s ease;
        }
        .card-header:hover {
          background-color: #f8f9fa;
        }
        .card {
          border: 1px solid #e0e0e0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        .card-header {
          background-color: #ffffff;
          border-bottom: 1px solid #e0e0e0;
        }
        .badge {
          font-size: 0.75rem;
          padding: 0.35em 0.65em;
          font-weight: 500;
        }
      `}</style>
    </>
  );
};

export default StatutoryRules;
