/**
 * Payslip Generator - Main Component
 */
import React, { useState, useRef } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import html2pdf from 'html2pdf.js';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import { payslipGeneratorAPI } from './utils/api';
import CreatePayslipForm from './components/CreatePayslipForm';
import PayslipPreview from './components/PayslipPreview';
import { validatePayslipForm } from './utils/helpers';
import { templateOptions } from './utils/templates';
import type { PayslipFormData } from './types';
import { getAdminIdForApi } from '../../../core/utils/apiHelpers';

const PayslipGenerator: React.FC = () => {
  const [formData, setFormData] = useState<PayslipFormData>({
    month: '',
    year: new Date().getFullYear(),
    payDate: '',
    paidDays: 0,
    lossOfPayDays: 0,
    template: 'classic',
    currency: 'INR',
    companyName: '',
    companyAddress: '',
    companyLogo: null,
    employeeName: '',
    employeeId: '',
    designation: '',
    department: '',
    panNumber: '',
    customEmployeeFields: {},
    earnings: [{ name: 'Basic Salary', amount: 0 }],
    deductions: [],
    customPaySummaryFields: {},
    totalEarnings: 0,
    totalDeductions: 0,
    netPay: 0,
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleFieldChange = (field: keyof PayslipFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDownloadPDF = async () => {
    if (!previewRef.current) {
      toast.error('Preview not available');
      return;
    }

    const errors = validatePayslipForm(formData);
    if (errors.length > 0) {
      toast.error('Please fill all required fields before downloading');
      return;
    }

    try {
      const element = previewRef.current;
      
      // Temporarily adjust styles for PDF to fit on one page
      const originalStyles = new WeakMap<HTMLElement, { padding: string; margin: string; fontSize: string }>();
      const styleElements = element.querySelectorAll('*') as NodeListOf<HTMLElement>;
      
      styleElements.forEach((el) => {
        const computedStyle = window.getComputedStyle(el);
        originalStyles.set(el, {
          padding: el.style.padding,
          margin: el.style.margin,
          fontSize: el.style.fontSize,
        });
        
        // Reduce padding and margins for PDF
        if (el.tagName === 'DIV' || el.className.includes('mb-')) {
          const margin = computedStyle.marginBottom;
          if (margin && parseFloat(margin) > 8) {
            el.style.marginBottom = '8px';
          }
        }
        
        if (el.tagName === 'TD' || el.tagName === 'TH') {
          el.style.padding = '4px 6px';
        }
        
        // Reduce font sizes slightly
        if (computedStyle.fontSize) {
          const fontSize = parseFloat(computedStyle.fontSize);
          if (fontSize > 12) {
            el.style.fontSize = `${Math.max(fontSize * 0.85, 10)}px`;
          }
        }
      });
      
      // Reduce container padding
      const originalPadding = element.style.padding;
      element.style.padding = '10px';
      
      const opt = {
        margin: [3, 3, 3, 3],
        filename: `Payslip_${formData.employeeName}_${formData.month}_${formData.year}.pdf`,
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: { 
          scale: 1.2,
          useCORS: true,
          logging: false,
          letterRendering: true,
          windowWidth: 800,
          windowHeight: 1120, // A4 height
          scrollX: 0,
          scrollY: 0
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait',
          compress: true
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      toast.info('Generating PDF...');
      
      // @ts-ignore - html2pdf.js API
      await html2pdf().set(opt).from(element).save();
      
      // Restore original styles
      styleElements.forEach((el) => {
        const saved = originalStyles.get(el);
        if (saved) {
          el.style.padding = saved.padding || '';
          el.style.margin = saved.margin || '';
          el.style.fontSize = saved.fontSize || '';
        }
      });
      element.style.padding = originalPadding || '';
      
      toast.success('Payslip downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to download payslip');
    }
  };

  const handleSave = async () => {
    const errors = validatePayslipForm(formData);
    if (errors.length > 0) {
      toast.error(errors.join(', '));
      return;
    }

    const admin_id = getAdminIdForApi();
    if (!admin_id) {
      toast.error('Admin ID not found');
      return;
    }

    setLoading(true);
    try {
      const formDataToSend = new FormData();
      // Add form fields to FormData
      Object.keys(formData).forEach((key) => {
        const value = formData[key as keyof PayslipFormData];
        if (value !== null && key !== 'companyLogo') {
          if (typeof value === 'object' && !Array.isArray(value)) {
            formDataToSend.append(key, JSON.stringify(value));
          } else if (Array.isArray(value)) {
            formDataToSend.append(key, JSON.stringify(value));
          } else {
            formDataToSend.append(key, String(value));
          }
        }
      });

      if (formData.companyLogo) {
        formDataToSend.append('company_logo', formData.companyLogo);
      }

      const response = await payslipGeneratorAPI.create(admin_id, formDataToSend);
      toast.success('Payslip created successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create payslip');
    } finally {
      setLoading(false);
    }
  };

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

          {/* Payslip Generator Content */}
          <div className="payslip-generator">
            <div className="row">
              <div className="col-md-6">
                <div className="card">
                  <div className="card-header">
                    <h2 className="mb-1">Custom Payslip Generator</h2>
                  </div>
                  <div className="card-body">
                    <CreatePayslipForm
                      formData={formData}
                      handleFieldChange={handleFieldChange}
                      handleSave={handleSave}
                      loading={loading}
                      handleDownloadPDF={handleDownloadPDF}
                    />
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card">
                  <div className="card-header">
                    <div className="d-flex justify-content-between align-items-center">
                      <h3 className="mb-0">Preview</h3>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleDownloadPDF}
                        disabled={loading}
                      >
                        <i className="ti ti-download me-1"></i>
                        Download PDF
                      </button>
                    </div>
                  </div>
                  <div className="card-body">
                    <div ref={previewRef}>
                      <PayslipPreview formData={formData} template={formData.template} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
    </>
  );
};

export default PayslipGenerator;
