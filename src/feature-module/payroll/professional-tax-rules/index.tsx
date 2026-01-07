/**
 * Professional Tax Rules Component
 */
import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import { professionalTaxRulesAPI } from './utils/api';
import type { ProfessionalTaxRule } from './types';

const ProfessionalTaxRules: React.FC = () => {
  const [rules, setRules] = useState<ProfessionalTaxRule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await professionalTaxRulesAPI.list();
      
      // Backend returns { response: true/false, message: "...", data: [...] }
      if (response.response && response.data && Array.isArray(response.data)) {
        setRules(response.data);
      } else {
        setError(response.message || 'Failed to fetch professional tax rules');
        if (response.data && !Array.isArray(response.data)) {
          console.warn('Unexpected response format:', response);
        }
      }
    } catch (err: any) {
      console.error('Error fetching professional tax rules:', err);
      const errorMessage = err.response?.data?.message || 'Failed to fetch professional tax rules';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getMonthName = (month: number | null): string => {
    if (!month) return 'All Months';
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || 'All Months';
  };

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Professional Tax Rules</h2>
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
                    Professional Tax Rules
                  </li>
                </ol>
              </nav>
              <p className="text-muted mb-0 mt-2">
                State-wise professional tax slabs as per statutory rules
              </p>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>

          {/* Content Card */}
          <div className="card">
            <div className="card-body">
              {/* Error Banner */}
              {error && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                  <strong>Error:</strong> {error}
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setError(null)}
                    aria-label="Close"
                  ></button>
                </div>
              )}

              {/* Loading Skeleton */}
              {loading && (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>State Name</th>
                        <th className="text-end">Salary From</th>
                        <th className="text-end">Salary To</th>
                        <th className="text-end">Tax Amount</th>
                        <th>Applicable Month</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <tr key={i}>
                          <td>
                            <div className="skeleton-line" style={{ width: '120px', height: '16px' }}></div>
                          </td>
                          <td className="text-end">
                            <div className="skeleton-line" style={{ width: '100px', height: '16px', marginLeft: 'auto' }}></div>
                          </td>
                          <td className="text-end">
                            <div className="skeleton-line" style={{ width: '100px', height: '16px', marginLeft: 'auto' }}></div>
                          </td>
                          <td className="text-end">
                            <div className="skeleton-line" style={{ width: '80px', height: '16px', marginLeft: 'auto' }}></div>
                          </td>
                          <td>
                            <div className="skeleton-line" style={{ width: '100px', height: '16px' }}></div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Data Table */}
              {!loading && (
                <>
                  {rules.length === 0 ? (
                    <div className="text-center py-5">
                      <div className="mb-3">
                        <i className="ti ti-file-off" style={{ fontSize: '48px', color: '#ccc' }}></i>
                      </div>
                      <h5 className="text-muted">No Professional Tax Rules Found</h5>
                      <p className="text-muted">There are no professional tax rules available at the moment.</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover table-striped">
                        <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                          <tr>
                            <th style={{ fontWeight: 600, fontSize: '14px', padding: '12px' }}>State Name</th>
                            <th className="text-end" style={{ fontWeight: 600, fontSize: '14px', padding: '12px' }}>Salary From</th>
                            <th className="text-end" style={{ fontWeight: 600, fontSize: '14px', padding: '12px' }}>Salary To</th>
                            <th className="text-end" style={{ fontWeight: 600, fontSize: '14px', padding: '12px' }}>Tax Amount</th>
                            <th style={{ fontWeight: 600, fontSize: '14px', padding: '12px' }}>Applicable Month</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rules.map((rule) => (
                            <tr key={rule.id}>
                              <td style={{ padding: '12px', fontSize: '14px', verticalAlign: 'middle' }}>
                                <strong>{rule.state_name}</strong>
                              </td>
                              <td className="text-end" style={{ padding: '12px', fontSize: '14px', verticalAlign: 'middle' }}>
                                {formatCurrency(rule.salary_from)}
                              </td>
                              <td className="text-end" style={{ padding: '12px', fontSize: '14px', verticalAlign: 'middle' }}>
                                {rule.salary_to ? formatCurrency(rule.salary_to) : <span className="text-muted">No Limit</span>}
                              </td>
                              <td className="text-end" style={{ padding: '12px', fontSize: '14px', verticalAlign: 'middle', fontWeight: 500 }}>
                                {formatCurrency(rule.tax_amount)}
                              </td>
                              <td style={{ padding: '12px', fontSize: '14px', verticalAlign: 'middle' }}>
                                {getMonthName(rule.applicable_month)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
      <style>{`
        .skeleton-line {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: loading 1.5s ease-in-out infinite;
          border-radius: 4px;
        }
        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .table-responsive {
          max-height: calc(100vh - 300px);
          overflow-y: auto;
        }
        .table thead th {
          background-color: #f8f9fa !important;
        }
      `}</style>
    </>
  );
};

export default ProfessionalTaxRules;
