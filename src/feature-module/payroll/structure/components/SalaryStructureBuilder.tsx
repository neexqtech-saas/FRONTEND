/**
 * Salary Structure Builder Component
 * Professional UI for creating and editing salary structures
 * Similar to Zoho Payroll / Keka / Darwinbox
 */

import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import { getAuthHeaders } from '../../../../core/utils/apiHelpers';
import { BACKEND_PATH } from '../../../../environment';
import EmployeePayrollConfig from '../../employee-payroll-config/index';
import EmployeePayrollOverview from './EmployeePayrollOverview';
import EmployeeBankInfoOverview from './EmployeeBankInfoOverview';
import './SalaryStructureBuilder.scss';

// Unified Salary Structure API
const salaryStructureUnifiedAPI = {
  get: async (orgId: string, structureId?: number) => {
    const url = structureId
      ? `${BACKEND_PATH}payroll/salary-structure/${orgId}?structure_id=${structureId}`
      : `${BACKEND_PATH}payroll/salary-structure/${orgId}`;
    const response = await axios.get(url, getAuthHeaders());
    return response.data;
  },
  list: async (orgId: string) => {
    const response = await axios.get(`${BACKEND_PATH}payroll/salary-structure/${orgId}?list=true`, getAuthHeaders());
    return response.data;
  },
  create: async (orgId: string, data: { 
    name: string; 
    is_default?: boolean; 
    description?: string;
    earnings?: any[];
    deductions?: any[];
  }) => {
    const response = await axios.post(`${BACKEND_PATH}payroll/salary-structure/${orgId}`, data, getAuthHeaders());
    return response.data;
  },
  update: async (orgId: string, earnings: any[], deductions?: any[], structureId?: number, name?: string) => {
    const url = structureId
      ? `${BACKEND_PATH}payroll/salary-structure/${orgId}?structure_id=${structureId}`
      : `${BACKEND_PATH}payroll/salary-structure/${orgId}`;
    const payload: any = { earnings };
    if (deductions && deductions.length > 0) {
      payload.deductions = deductions;
    }
    if (name) {
      payload.name = name;
    }
    const response = await axios.put(url, payload, getAuthHeaders());
    return response.data;
  },
  delete: async (orgId: string, structureId: number) => {
    const response = await axios.delete(
      `${BACKEND_PATH}payroll/salary-structure/${orgId}?structure_id=${structureId}`,
      getAuthHeaders()
    );
    return response.data;
  },
};

interface EarningsItem {
  component: string;
  label: string;
  calculation_type: 'fixed' | 'percentage';
  value: string;
  editable: boolean;
}

interface DeductionsItem {
  component: string;
  label: string;
  calculation_type?: 'fixed' | 'percentage' | 'auto';
  value: string;
  editable: boolean;
  is_statutory?: boolean;
  statutory_type?: string;
}

interface SalaryStructureData {
  structure_id?: number;
  name: string;
  earnings: EarningsItem[];
  deductions: DeductionsItem[];
}

interface AddEarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (component: { component: string; label: string; calculation_type: 'fixed' | 'percentage'; value: number }) => void;
  existingComponents: string[];
}

interface AddDeductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (component: { component: string; label: string; calculation_type: 'fixed' | 'percentage'; value: number }) => void;
  existingComponents: string[];
}

const AddEarningModal: React.FC<AddEarningModalProps> = ({ isOpen, onClose, onAdd, existingComponents }) => {
  const [componentName, setComponentName] = useState('');
  const [calculationType, setCalculationType] = useState<'fixed' | 'percentage'>('percentage');
  const [value, setValue] = useState<string>('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setComponentName('');
      setCalculationType('percentage');
      setValue('');
    }
  }, [isOpen]);

  const predefinedComponents = [
    'HRA',
    'DA',
    'CCA',
    'Conveyance Allowance',
    'Transport Allowance',
    'Petrol / Fuel Allowance',
    'Food / Meal Allowance',
    'Medical Allowance',
    'Uniform Allowance',
    'Telephone / Internet Allowance',
    'Education Allowance',
    'Children Education Allowance',
    'Hostel Allowance',
    'Shift Allowance',
    'Fixed Annual Bonus',
    'Guaranteed Performance Pay',
    'Retention Bonus',
    'Other Allowance',
  ];

  const handleSubmit = () => {
    if (!componentName.trim()) {
      toast.error('Component name is required');
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      toast.error('Value must be greater than 0');
      return;
    }

    if (calculationType === 'percentage' && numValue > 100) {
      toast.error('Percentage cannot exceed 100%');
      return;
    }

    onAdd({
      component: componentName.toUpperCase().replace(/\s+/g, '_'),
      label: componentName,
      calculation_type: calculationType,
      value: numValue,
    });

    // Reset form
    setComponentName('');
    setCalculationType('percentage');
    setValue('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Add Earning Component</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">Component Name *</label>
              <input
                type="text"
                className="form-control"
                list="component-suggestions"
                value={componentName}
                onChange={(e) => setComponentName(e.target.value)}
                placeholder="e.g., HRA, DA, CCA"
              />
              <datalist id="component-suggestions">
                {predefinedComponents
                  .filter((comp) => !existingComponents.includes(comp.toUpperCase().replace(/\s+/g, '_')))
                  .map((comp) => (
                    <option key={comp} value={comp} />
                  ))}
              </datalist>
            </div>

            <div className="mb-3">
              <label className="form-label">Calculation Type *</label>
              <select
                className="form-select"
                value={calculationType}
                onChange={(e) => setCalculationType(e.target.value as 'fixed' | 'percentage')}
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Value *</label>
              <div className="input-group">
                {calculationType === 'fixed' && <span className="input-group-text">₹</span>}
                <input
                  type="number"
                  className="form-control"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={calculationType === 'percentage' ? 'e.g., 40' : 'e.g., 5000'}
                  min="0"
                  max={calculationType === 'percentage' ? '100' : undefined}
                  step={calculationType === 'percentage' ? '0.01' : '1'}
                />
                {calculationType === 'percentage' && <span className="input-group-text">%</span>}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit}>
              Add Component
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AddDeductionModal: React.FC<AddDeductionModalProps> = ({ isOpen, onClose, onAdd, existingComponents }) => {
  const [componentName, setComponentName] = useState('');
  const [calculationType, setCalculationType] = useState<'fixed' | 'percentage'>('percentage');
  const [value, setValue] = useState<string>('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setComponentName('');
      setCalculationType('percentage');
      setValue('');
    }
  }, [isOpen]);

  const predefinedDeductions = [
    'Health Insurance Premium',
    'Group Term Insurance',
    'Life Insurance Premium',
    'Loan Recovery',
    'Advance Recovery',
    'Other Fixed Recoveries',
    'Labour Welfare Fund (LWF)',
    'Superannuation',
    'National Pension Scheme (NPS – Employer)',
  ];

  const handleSubmit = () => {
    if (!componentName.trim()) {
      toast.error('Component name is required');
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      toast.error('Value must be greater than 0');
      return;
    }

    if (calculationType === 'percentage' && numValue > 100) {
      toast.error('Percentage cannot exceed 100%');
      return;
    }

    const componentCode = componentName.toUpperCase().replace(/\s+/g, '_');
    if (existingComponents.includes(componentCode)) {
      toast.error('This deduction component already exists');
      return;
    }

    onAdd({
      component: componentCode,
      label: componentName,
      calculation_type: calculationType,
      value: numValue,
    });

    // Reset form
    setComponentName('');
    setCalculationType('percentage');
    setValue('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Add Deduction Component</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">Component Name *</label>
              <input
                type="text"
                className="form-control"
                value={componentName}
                onChange={(e) => setComponentName(e.target.value)}
                placeholder="e.g., Health Insurance Premium"
                list="deduction-suggestions"
              />
              <datalist id="deduction-suggestions">
                {predefinedDeductions
                  .filter((name) => !existingComponents.includes(name.toUpperCase().replace(/\s+/g, '_')))
                  .map((name) => (
                    <option key={name} value={name} />
                  ))}
              </datalist>
            </div>

            <div className="mb-3">
              <label className="form-label">Calculation Type *</label>
              <select
                className="form-select"
                value={calculationType}
                onChange={(e) => setCalculationType(e.target.value as 'fixed' | 'percentage')}
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Value *</label>
              <div className="input-group">
                {calculationType === 'fixed' && <span className="input-group-text">₹</span>}
                <input
                  type="number"
                  className="form-control"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={calculationType === 'percentage' ? 'e.g., 5' : 'e.g., 1000'}
                  min="0"
                  max={calculationType === 'percentage' ? '100' : undefined}
                  step={calculationType === 'percentage' ? '0.01' : '1'}
                />
                {calculationType === 'percentage' && <span className="input-group-text">%</span>}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit}>
              Add Component
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StructureListItem {
  structure_id: number;
  name: string;
  description: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const SalaryStructureBuilder: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'config' | 'overview' | 'bankinfo'>('list');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [structureData, setStructureData] = useState<SalaryStructureData | null>(null);
  const [structuresList, setStructuresList] = useState<StructureListItem[]>([]);
  const [statutoryComponents, setStatutoryComponents] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showAddDeductionModal, setShowAddDeductionModal] = useState<boolean>(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingDeductionIndex, setEditingDeductionIndex] = useState<number | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const [isNewStructure, setIsNewStructure] = useState<boolean>(false);

  // Get organization ID
  const getOrganizationId = (): string | null => {
    const role = sessionStorage.getItem('role');
    if (role === 'organization') {
      return sessionStorage.getItem('user_id');
    }
    const selectedOrgId = sessionStorage.getItem('selected_organization_id');
    if (selectedOrgId) return selectedOrgId;
    const orgId = sessionStorage.getItem('organization_id');
    return orgId;
  };

  // Helper function to normalize earnings - ensures Special Allowance is always present and non-editable
  const normalizeEarnings = (earnings: any[]): EarningsItem[] => {
    let normalizedEarnings = earnings || [];
    
    // Check if Special Allowance exists, if not add it
    const hasSpecialAllowance = normalizedEarnings.some((e: any) => e.component === 'SPECIAL_ALLOWANCE');
    if (!hasSpecialAllowance) {
      normalizedEarnings.push({
        component: 'SPECIAL_ALLOWANCE',
        label: 'Special Allowance',
        calculation_type: 'fixed',
        value: 'Auto',
        editable: false,
      });
    } else {
      // Ensure Special Allowance is marked as non-editable
      normalizedEarnings = normalizedEarnings.map((e: any) => {
        if (e.component === 'SPECIAL_ALLOWANCE') {
          return {
            ...e,
            editable: false,
            value: e.value || 'Auto',
            calculation_type: e.calculation_type || 'fixed',
          };
        }
        return e;
      });
    }
    
    return normalizedEarnings;
  };

  // Fetch structure
  const fetchStructure = async () => {
    try {
      setLoading(true);
      const orgId = getOrganizationId();
      if (!orgId) {
        toast.error('Organization ID not found');
        return;
      }

      const response = await salaryStructureUnifiedAPI.get(orgId);

      if (response.response && response.data) {
        // Normalize response data to ensure all fields are present
        const normalizedData = {
          ...response.data,
          earnings: normalizeEarnings(response.data.earnings),
          deductions: response.data.deductions.map((d: any) => ({
            ...d,
            label: d.label || d.component,
            calculation_type: d.calculation_type || (d.editable ? 'fixed' : 'auto'),
          })),
        };
        setStructureData(normalizedData);
      } else {
        // No structure exists, create one
        await createStructure();
      }
    } catch (error: any) {
      console.error('Error fetching structure:', error);
      if (error.response?.status === 404) {
        // No structure exists, create one
        await createStructure();
      } else {
        toast.error(error.response?.data?.message || 'Failed to fetch salary structure');
      }
    } finally {
      setLoading(false);
    }
  };

  // Create structure
  const createStructure = async () => {
    try {
      const orgId = getOrganizationId();
      if (!orgId) {
        toast.error('Organization ID not found');
        return;
      }

      const response = await salaryStructureUnifiedAPI.create(orgId, {
        name: 'Monthly CTC',
        is_default: true,
      });

      if (response.response && response.data) {
        // Normalize earnings to ensure Special Allowance is present
        const normalizedData = {
          ...response.data,
          earnings: normalizeEarnings(response.data.earnings),
          deductions: response.data.deductions?.map((d: any) => ({
            ...d,
            label: d.label || d.component,
            calculation_type: d.calculation_type || (d.editable ? 'fixed' : 'auto'),
          })) || [],
        };
        setStructureData(normalizedData);
        toast.success('Salary structure created successfully');
      }
    } catch (error: any) {
      console.error('Error creating structure:', error);
      // Handle duplicate name error
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
        toast.error(error.response.data.message);
      } else {
        toast.error(error.response?.data?.message || 'Failed to create salary structure');
      }
    }
  };

  // Fetch structures list
  const fetchStructuresList = async () => {
    try {
      setLoading(true);
      const orgId = getOrganizationId();
      if (!orgId) {
        toast.error('Organization ID not found');
        setLoading(false);
        return;
      }

      const response = await salaryStructureUnifiedAPI.list(orgId);
      if (response.response && response.data) {
        // Handle both old format (array) and new format (object with structures and statutory_components)
        if (Array.isArray(response.data)) {
          setStructuresList(response.data);
          setStatutoryComponents([]);
        } else {
          setStructuresList(response.data.structures || []);
          setStatutoryComponents(response.data.statutory_components || []);
        }
      }
    } catch (error: any) {
      console.error('Error fetching structures list:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch structures list');
    } finally {
      setLoading(false);
    }
  };

  // Reset form for new structure
  const resetForm = () => {
    // Initialize deductions with enabled statutory components
    const statutoryDeductions: DeductionsItem[] = statutoryComponents
      .filter((comp) => comp.component_type === 'deduction' && comp.enabled)
      .map((comp): DeductionsItem => ({
        component: String(comp.component),
        label: String(comp.label),
        calculation_type: 'auto' as 'auto',
        value: String(comp.display_value || 'Auto'),
        editable: false, // Statutory components are not editable
        is_statutory: true,
        statutory_type: comp.statutory_type ? String(comp.statutory_type) : undefined,
      }));

    // Initialize with default structure data - Basic and Special Allowance are always present
    setStructureData({
      name: '',
      earnings: [
        {
          component: 'BASIC',
          label: 'Basic Salary',
          calculation_type: 'percentage',
          value: '50%',
          editable: true,
        },
        {
          component: 'SPECIAL_ALLOWANCE',
          label: 'Special Allowance',
          calculation_type: 'fixed',
          value: 'Auto',
          editable: false, // Special Allowance is not editable - it's for auto adjustment
        },
      ],
      deductions: statutoryDeductions,
    });
    setEditingIndex(null);
    setEditingDeductionIndex(null);
    setTempValue('');
    setIsNewStructure(true);
  };

  // Handle create new structure
  const handleCreateNew = async () => {
    // Ensure statutory components are loaded before resetting form
    const orgId = getOrganizationId();
    if (orgId && statutoryComponents.length === 0) {
      try {
        const response = await salaryStructureUnifiedAPI.list(orgId);
        if (response.response && response.data && !Array.isArray(response.data)) {
          const components = response.data.statutory_components || [];
          setStatutoryComponents(components);
          // Reset form with the fetched components
          resetFormWithComponents(components);
        } else {
          resetForm();
        }
      } catch (error) {
        console.error('Error fetching statutory components:', error);
        resetForm();
      }
    } else {
      resetForm();
    }
    setActiveTab('create');
  };

  // Handle structure selection
  const handleSelectStructure = async (structureId: number) => {
    try {
      setLoading(true);
      const orgId = getOrganizationId();
      if (!orgId) {
        toast.error('Organization ID not found');
        return;
      }

      const response = await salaryStructureUnifiedAPI.get(orgId, structureId);
      if (response.response && response.data) {
        // Normalize response data to ensure all fields are present
        const normalizedData = {
          ...response.data,
          earnings: normalizeEarnings(response.data.earnings),
          deductions: response.data.deductions.map((d: any) => ({
            ...d,
            label: d.label || d.component,
            calculation_type: d.calculation_type || (d.editable ? 'fixed' : 'auto'),
          })),
        };
        setStructureData(normalizedData);
        setIsNewStructure(false);
        setActiveTab('create');
      }
    } catch (error: any) {
      console.error('Error fetching structure:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch structure');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'list') {
      fetchStructuresList();
    } else if (activeTab === 'create' && !structureData) {
      // Only fetch if no structure data exists
      fetchStructure();
    }
  }, [activeTab]);

  // Ensure statutory components are loaded when creating new structure
  useEffect(() => {
    if (activeTab === 'create' && statutoryComponents.length === 0) {
      // Fetch structures list to get statutory components if not already loaded
      const orgId = getOrganizationId();
      if (orgId) {
        salaryStructureUnifiedAPI.list(orgId).then((response) => {
          if (response.response && response.data && !Array.isArray(response.data)) {
            setStatutoryComponents(response.data.statutory_components || []);
          }
        }).catch((error) => {
          console.error('Error fetching statutory components:', error);
        });
      }
    }
  }, [activeTab]);

  // Handle earnings update or create
  const handleEarningsUpdate = async () => {
    try {
      setSaving(true);
      const orgId = getOrganizationId();
      if (!orgId) {
        toast.error('Organization ID not found');
        return;
      }

      if (!structureData) return;

      // Check if this is a new structure (no structure_id or isNewStructure flag)
      const isNew = !structureData.structure_id || isNewStructure;

      if (isNew) {
        // CREATE: Use POST to create new structure with earnings and deductions
        // Prepare earnings data for API
        const earningsData = structureData.earnings
          .filter((item) => item.component !== 'SPECIAL_ALLOWANCE') // Exclude Special Allowance (auto-created)
          .map((item) => {
            // Extract numeric value from string (handle %, ₹, commas)
            const valueStr = item.value.replace('%', '').replace('₹', '').replace(',', '').replace('Auto', '0');
            const numValue = parseFloat(valueStr) || 0;
            
            return {
              component: item.component,
              label: item.label,
              calculation_type: item.calculation_type,
              value: numValue,
            };
          });

        // Prepare deductions data for API (non-statutory only)
        const deductionsData = structureData.deductions
          .filter((item) => item.editable) // Only non-statutory (editable) deductions
          .map((item) => {
            // Extract numeric value from string (handle %, ₹, commas, Auto)
            const valueStr = item.value.replace('%', '').replace('₹', '').replace(',', '').replace('Auto', '0');
            const numValue = parseFloat(valueStr) || 0;
            
            return {
              component: item.component,
              label: item.label,
              calculation_type: item.calculation_type || 'fixed',
              value: numValue,
            };
          });

        try {
          const response = await salaryStructureUnifiedAPI.create(orgId, {
            name: structureData.name || 'Monthly CTC',
            is_default: false,
            description: '',
            earnings: earningsData,
            deductions: deductionsData,
          });

          if (response.response && response.data) {
            // Normalize response data
            const normalizedData = {
              ...response.data,
              earnings: normalizeEarnings(response.data.earnings),
              deductions: response.data.deductions.map((d: any) => ({
                ...d,
                label: d.label || d.component,
                calculation_type: d.calculation_type || (d.editable ? 'fixed' : 'auto'),
              })),
            };
            setStructureData(normalizedData);
            setIsNewStructure(false);
            toast.success('Salary structure created successfully');
            // Refresh structures list
            await fetchStructuresList();
          }
        } catch (createError: any) {
          // Handle duplicate name error
          if (createError.response?.status === 400 && createError.response?.data?.message?.includes('already exists')) {
            toast.error(createError.response.data.message);
          } else {
            throw createError;
          }
        }
      } else {
        // UPDATE: Use PUT to update existing structure
        // Prepare earnings data for API
        const earningsData = structureData.earnings
          .filter((item) => item.component !== 'SPECIAL_ALLOWANCE') // Exclude Special Allowance
          .map((item) => ({
            component: item.component,
            calculation_type: item.calculation_type,
            value: parseFloat(item.value.replace('%', '').replace('₹', '').replace(',', '')),
          }));

        // Prepare deductions data for API (non-statutory only)
        const deductionsData = structureData.deductions
          .filter((item) => item.editable) // Only non-statutory (editable) deductions
          .map((item) => {
            // Extract numeric value from string (handle %, ₹, commas, Auto)
            const valueStr = item.value.replace('%', '').replace('₹', '').replace(',', '').replace('Auto', '0');
            const numValue = parseFloat(valueStr) || 0;
            
            return {
              component: item.component,
              calculation_type: item.calculation_type || 'fixed',
              value: numValue,
            };
          });

        try {
          const response = await salaryStructureUnifiedAPI.update(
            orgId, 
            earningsData, 
            deductionsData, 
            structureData.structure_id,
            structureData.name // Include name for update
          );

          if (response.response && response.data) {
            // Normalize response data to ensure all fields are present
            const normalizedData = {
              ...response.data,
              earnings: normalizeEarnings(response.data.earnings),
              deductions: response.data.deductions.map((d: any) => ({
                ...d,
                label: d.label || d.component,
                calculation_type: d.calculation_type || (d.editable ? 'fixed' : 'auto'),
              })),
            };
            setStructureData(normalizedData);
            toast.success('Salary structure updated successfully');
            setEditingIndex(null);
            setEditingDeductionIndex(null);
            setIsNewStructure(false);
            // Refresh structures list
            await fetchStructuresList();
          }
        } catch (updateError: any) {
          // Handle duplicate name error
          if (updateError.response?.status === 400 && updateError.response?.data?.message?.includes('already exists')) {
            toast.error(updateError.response.data.message);
          } else {
            throw updateError;
          }
        }
      }
    } catch (error: any) {
      console.error('Error updating structure:', error);
      // Error handling for duplicate name is already done in try-catch blocks above
      if (!error.response?.data?.message?.includes('already exists')) {
        toast.error(error.response?.data?.message || 'Failed to update salary structure');
      }
    } finally {
      setSaving(false);
    }
  };

  // Handle add earning
  const handleAddEarning = (newComponent: { component: string; label: string; calculation_type: 'fixed' | 'percentage'; value: number }) => {
    if (!structureData) return;

    const newEarning: EarningsItem = {
      component: newComponent.component,
      label: newComponent.label,
      calculation_type: newComponent.calculation_type,
      value: newComponent.calculation_type === 'percentage' ? `${newComponent.value}%` : `₹${newComponent.value.toLocaleString('en-IN')}`,
      editable: true,
    };

    setStructureData({
      ...structureData,
      earnings: [...structureData.earnings, newEarning],
    });
  };

  // Handle remove earning
  const handleRemoveEarning = (index: number) => {
    if (!structureData) return;

    const item = structureData.earnings[index];
    if (item.component === 'BASIC' || item.component === 'SPECIAL_ALLOWANCE') {
      toast.error('Cannot remove Basic Salary or Special Allowance. These are required components.');
      return;
    }

    const newEarnings = structureData.earnings.filter((_, i) => i !== index);
    setStructureData({
      ...structureData,
      earnings: newEarnings,
    });
  };

  // Handle edit value
  const handleEditValue = (index: number, field: 'calculation_type' | 'value', newValue: string) => {
    if (!structureData) return;

    const item = structureData.earnings[index];
    if (!item.editable) return;

    const newEarnings = [...structureData.earnings];
    if (field === 'calculation_type') {
      newEarnings[index] = {
        ...item,
        calculation_type: newValue as 'fixed' | 'percentage',
        value: item.value.replace(/[%₹,]/g, ''), // Reset value when changing type
      };
    } else {
      newEarnings[index] = {
        ...item,
        value: newValue,
      };
    }

    setStructureData({
      ...structureData,
      earnings: newEarnings,
    });
  };

  // Start editing
  const startEditing = (index: number) => {
    if (!structureData) return;
    const item = structureData.earnings[index];
    if (!item.editable) return;

    setEditingIndex(index);
    setTempValue(item.value.replace(/[%₹,]/g, ''));
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingIndex(null);
    setTempValue('');
  };

  // Save edit
  const saveEdit = (index: number) => {
    if (!structureData) return;

    const item = structureData.earnings[index];
    const numValue = parseFloat(tempValue);

    if (isNaN(numValue) || numValue <= 0) {
      toast.error('Value must be greater than 0');
      return;
    }

    if (item.calculation_type === 'percentage' && numValue > 100) {
      toast.error('Percentage cannot exceed 100%');
      return;
    }

    const formattedValue = item.calculation_type === 'percentage' ? `${numValue}%` : `₹${numValue.toLocaleString('en-IN')}`;

    handleEditValue(index, 'value', formattedValue);
    setEditingIndex(null);
    setTempValue('');
  };

  // Handle add deduction
  const handleAddDeduction = (newComponent: { component: string; label: string; calculation_type: 'fixed' | 'percentage'; value: number }) => {
    if (!structureData) return;

    const newDeduction: DeductionsItem = {
      component: newComponent.component,
      label: newComponent.label,
      calculation_type: newComponent.calculation_type,
      value: newComponent.calculation_type === 'percentage' ? `${newComponent.value}%` : `₹${newComponent.value.toLocaleString('en-IN')}`,
      editable: true,
    };

    setStructureData({
      ...structureData,
      deductions: [...structureData.deductions, newDeduction],
    });
  };

  // Handle remove deduction
  const handleRemoveDeduction = (index: number) => {
    if (!structureData) return;

    const item = structureData.deductions[index];
    if (!item.editable) {
      toast.error('Cannot remove statutory deductions');
      return;
    }

    const newDeductions = structureData.deductions.filter((_, i) => i !== index);
    setStructureData({
      ...structureData,
      deductions: newDeductions,
    });
  };

  // Handle edit deduction value
  const handleEditDeductionValue = (index: number, field: 'calculation_type' | 'value', newValue: string) => {
    if (!structureData) return;

    const item = structureData.deductions[index];
    if (!item.editable) return;

    const newDeductions = [...structureData.deductions];
    if (field === 'calculation_type') {
      newDeductions[index] = {
        ...item,
        calculation_type: newValue as 'fixed' | 'percentage',
        value: item.value.replace(/[%₹,]/g, ''), // Reset value when changing type
      };
    } else {
      newDeductions[index] = {
        ...item,
        value: newValue,
      };
    }

    setStructureData({
      ...structureData,
      deductions: newDeductions,
    });
  };

  // Start editing deduction
  const startEditingDeduction = (index: number) => {
    if (!structureData) return;
    const item = structureData.deductions[index];
    if (!item.editable) return;

    setEditingDeductionIndex(index);
    setTempValue(item.value.replace(/[%₹,]/g, '').replace('Auto', ''));
  };

  // Cancel editing deduction
  const cancelEditingDeduction = () => {
    setEditingDeductionIndex(null);
    setTempValue('');
  };

  // Save deduction edit
  const saveDeductionEdit = (index: number) => {
    if (!structureData) return;

    const item = structureData.deductions[index];
    const numValue = parseFloat(tempValue);

    if (isNaN(numValue) || numValue <= 0) {
      toast.error('Value must be greater than 0');
      return;
    }

    if (item.calculation_type === 'percentage' && numValue > 100) {
      toast.error('Percentage cannot exceed 100%');
      return;
    }

    const formattedValue = item.calculation_type === 'percentage' ? `${numValue}%` : `₹${numValue.toLocaleString('en-IN')}`;

    handleEditDeductionValue(index, 'value', formattedValue);
    setEditingDeductionIndex(null);
    setTempValue('');
  };


  // Reset form with specific statutory components (used when components are just fetched)
  const resetFormWithComponents = (components: any[]) => {
    // Initialize deductions with enabled statutory components
    const statutoryDeductions: DeductionsItem[] = components
      .filter((comp) => comp.component_type === 'deduction' && comp.enabled)
      .map((comp): DeductionsItem => ({
        component: String(comp.component),
        label: String(comp.label),
        calculation_type: 'auto' as 'auto',
        value: String(comp.display_value || 'Auto'),
        editable: false, // Statutory components are not editable
        is_statutory: true,
        statutory_type: comp.statutory_type ? String(comp.statutory_type) : undefined,
      }));

    // Initialize with default structure data - Basic and Special Allowance are always present
    setStructureData({
      name: '',
      earnings: [
        {
          component: 'BASIC',
          label: 'Basic Salary',
          calculation_type: 'percentage',
          value: '50%',
          editable: true,
        },
        {
          component: 'SPECIAL_ALLOWANCE',
          label: 'Special Allowance',
          calculation_type: 'fixed',
          value: 'Auto',
          editable: false, // Special Allowance is not editable - it's for auto adjustment
        },
      ],
      deductions: statutoryDeductions,
    });
    setEditingIndex(null);
    setEditingDeductionIndex(null);
    setTempValue('');
    setIsNewStructure(true);
  };

  // Handle delete structure
  const handleDeleteStructure = async (structureId: number, structureName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${structureName}"?\n\nThis will delete the structure and all its related components. This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      const orgId = getOrganizationId();
      if (!orgId) {
        toast.error('Organization ID not found');
        return;
      }

      const response = await salaryStructureUnifiedAPI.delete(orgId, structureId);
      
      if (response.response) {
        toast.success(response.message || 'Salary structure deleted successfully');
        // Refresh structures list
        await fetchStructuresList();
        // If deleted structure was currently being viewed, reset
        if (structureData?.structure_id === structureId) {
          resetForm();
          setActiveTab('list');
        }
      }
    } catch (error: any) {
      console.error('Error deleting structure:', error);
      toast.error(error.response?.data?.message || 'Failed to delete salary structure');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="salary-structure-builder">
          <ToastContainer />
          
          {/* Page Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h3 className="mb-1">Salary Structure</h3>
              <p className="text-muted mb-0">Define salary breakup and statutory deductions</p>
            </div>
            {activeTab === 'create' && (
              <div>
                <button className="btn btn-secondary me-2" onClick={() => {
                  setStructureData(null);
                  setActiveTab('list');
                  fetchStructuresList();
                }}>
                  Back to List
                </button>
                {structureData && (
                <button className="btn btn-primary" onClick={handleEarningsUpdate} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Structure'}
                </button>
                )}
              </div>
            )}
            {activeTab === 'list' && (
              <button className="btn btn-primary" onClick={handleCreateNew}>
                + Create New Structure
              </button>
            )}
          </div>

          {/* Tabs Navigation - Only show when not creating/editing */}
          {activeTab !== 'create' && (
            <ul className="nav nav-tabs mb-4">
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'list' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('list');
                    fetchStructuresList();
                  }}
                >
                  Structures List
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'config' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('config');
                  }}
                >
                  Employee Payroll Configuration
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('overview');
                  }}
                >
                  Employee Payroll Overview
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'bankinfo' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('bankinfo');
                  }}
                >
                  Bank Information
                </button>
              </li>
            </ul>
          )}

          {/* Tab Content */}
          {activeTab === 'list' && (
            <div className="card">
              <div className="card-body">
                {loading ? (
                  <div className="d-flex justify-content-center align-items-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : structuresList.length === 0 ? (
                  <div className="text-center py-5">
                    <p className="text-muted">No salary structures found.</p>
                    <button className="btn btn-primary" onClick={handleCreateNew}>
                      Create Your First Structure
                    </button>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Structure Name</th>
                          <th>Description</th>
                          <th>Status</th>
                          <th>Created</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {structuresList.map((structure) => (
                          <tr key={structure.structure_id}>
                            <td>
                              <strong>{structure.name}</strong>
                            </td>
                            <td>
                              <span className="text-muted">
                                {structure.description || 'No description'}
                              </span>
                            </td>
                            <td>
                              {structure.is_default && (
                                <span className="badge bg-success">Default</span>
                              )}
                              {!structure.is_default && (
                                <span className="badge bg-secondary">Active</span>
                              )}
                            </td>
                            <td>
                              <small className="text-muted">
                                {new Date(structure.created_at).toLocaleDateString()}
                              </small>
                            </td>
                            <td className="text-end">
                              <div className="btn-group" role="group">
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => handleSelectStructure(structure.structure_id)}
                                >
                                  View/Edit
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleDeleteStructure(structure.structure_id, structure.name)}
                                  disabled={loading}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Statutory Components Section */}
          {activeTab === 'list' && statutoryComponents.length > 0 && (
            <div className="card mt-4">
              <div className="card-header bg-light">
                <h5 className="mb-0">📋 Statutory Components</h5>
                <small className="text-muted">These components are automatically maintained and will appear in salary structures</small>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Component</th>
                        <th>Type</th>
                        <th>Statutory Type</th>
                        <th>Status</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statutoryComponents.map((component, index) => (
                        <tr key={index}>
                          <td>
                            <strong>{component.label}</strong>
                            <br />
                            <small className="text-muted">{component.component}</small>
                          </td>
                          <td>
                            <span className={`badge ${component.component_type === 'earning' ? 'bg-success' : 'bg-danger'}`}>
                              {component.component_type === 'earning' ? 'Earning' : 'Deduction'}
                            </span>
                          </td>
                          <td>
                            <span className="badge bg-info">{component.statutory_type}</span>
                          </td>
                          <td>
                            {component.enabled ? (
                              <span className="badge bg-success">Enabled</span>
                            ) : (
                              <span className="badge bg-secondary">Disabled</span>
                            )}
                          </td>
                          <td>
                            <span className="fw-bold">{component.display_value}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {statutoryComponents.length === 0 && (
                  <div className="text-center py-3">
                    <p className="text-muted mb-0">No statutory components configured</p>
                    <small className="text-muted">Configure payroll settings to enable statutory components</small>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div>
              <EmployeePayrollConfig />
            </div>
          )}

          {activeTab === 'overview' && (
            <EmployeePayrollOverview />
          )}

          {activeTab === 'bankinfo' && (
            <EmployeeBankInfoOverview />
          )}

          {activeTab === 'create' && (
            <>
              {loading && !structureData ? (
                <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : !structureData ? (
                <div className="alert alert-info">
                  <h5>Create New Salary Structure</h5>
                  <p>Click the button below to create a new salary structure with default components.</p>
                  <button className="btn btn-primary" onClick={createStructure}>
                    Create Structure
                  </button>
                </div>
              ) : (
                <>
                  {/* Structure Name */}
                  <div className="card mb-4">
                    <div className="card-body">
                      <div className="row align-items-center">
                        <div className="col-md-6">
                          <label className="form-label fw-bold">Structure Name</label>
                          <input
                            type="text"
                            className="form-control"
                            value={structureData.name}
                            onChange={(e) =>
                              setStructureData({ ...structureData, name: e.target.value })
                            }
                            placeholder="e.g., Monthly CTC"
                          />
                        </div>
                        <div className="col-md-6 text-end">
                          <button className="btn btn-primary" onClick={handleEarningsUpdate} disabled={saving}>
                            {saving ? 'Saving...' : 'Save Structure'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2-Column Layout */}
                  <div className="row g-4">
        {/* EARNINGS CARD (Left) */}
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header bg-light">
              <h5 className="mb-0">🟢 Earnings</h5>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Component</th>
                      <th>Type</th>
                      <th>Value</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {structureData.earnings.map((item, index) => (
                      <tr key={index}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <strong>{item.label}</strong>
                            {item.component === 'SPECIAL_ALLOWANCE' && (
                              <>
                                <span className="badge bg-info">Auto Adjustment</span>
                                <small className="text-muted" title="This component automatically balances the salary structure">
                                  (Auto-calculated)
                                </small>
                              </>
                            )}
                          </div>
                        </td>
                        <td>
                          {editingIndex === index && item.editable && item.component !== 'SPECIAL_ALLOWANCE' ? (
                            <select
                              className="form-select form-select-sm"
                              value={item.calculation_type}
                              onChange={(e) => handleEditValue(index, 'calculation_type', e.target.value)}
                            >
                              <option value="percentage">Percentage</option>
                              <option value="fixed">Fixed</option>
                            </select>
                          ) : (
                            <span className={`badge ${item.component === 'SPECIAL_ALLOWANCE' ? 'bg-info' : 'bg-secondary'}`}>
                              {item.calculation_type}
                              {item.component === 'SPECIAL_ALLOWANCE' && ' (Auto)'}
                            </span>
                          )}
                        </td>
                        <td>
                          {editingIndex === index && item.editable && item.component !== 'SPECIAL_ALLOWANCE' ? (
                            <div className="input-group input-group-sm">
                              {item.calculation_type === 'fixed' && <span className="input-group-text">₹</span>}
                              <input
                                type="number"
                                className="form-control"
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                min="0"
                                max={item.calculation_type === 'percentage' ? '100' : undefined}
                                step={item.calculation_type === 'percentage' ? '0.01' : '1'}
                                autoFocus
                              />
                              {item.calculation_type === 'percentage' && <span className="input-group-text">%</span>}
                            </div>
                          ) : (
                            <span className={`fw-bold ${item.component === 'SPECIAL_ALLOWANCE' ? 'text-info' : ''}`}>
                              {item.value}
                              {item.component === 'SPECIAL_ALLOWANCE' && (
                                <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
                                  Automatically calculated to balance salary
                                </small>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="text-end">
                          {editingIndex === index && item.editable ? (
                            <div className="btn-group btn-group-sm">
                              <button className="btn btn-success btn-sm" onClick={() => saveEdit(index)}>
                                ✓
                              </button>
                              <button className="btn btn-secondary btn-sm" onClick={cancelEditing}>
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="btn-group btn-group-sm">
                              {item.editable ? (
                                <>
                                  <button
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={() => startEditing(index)}
                                    title="Edit"
                                  >
                                    ✏️
                                  </button>
                                  {item.component !== 'BASIC' && item.component !== 'SPECIAL_ALLOWANCE' && (
                                    <button
                                      className="btn btn-outline-danger btn-sm"
                                      onClick={() => handleRemoveEarning(index)}
                                      title="Remove"
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </>
                              ) : (
                                <span className="text-muted" title="System-managed component">
                                  🔒
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Helper Text for Special Allowance */}
              {structureData.earnings.some((e) => e.component === 'SPECIAL_ALLOWANCE') && (
                <div className="alert alert-info mt-3 mb-0">
                  <small>
                    <strong>Special Allowance:</strong> Auto-adjusts to balance total earnings. This component ensures
                    your salary structure remains balanced.
                  </small>
                </div>
              )}

              {/* Add Earning Button */}
              <button className="btn btn-outline-primary w-100 mt-3" onClick={() => setShowAddModal(true)}>
                + Add Earning Component
              </button>
            </div>
          </div>
        </div>

        {/* DEDUCTIONS CARD (Right) */}
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header bg-light">
              <h5 className="mb-0">🔴 Deductions</h5>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Component</th>
                      <th>Type</th>
                      <th>Value</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {structureData.deductions.map((item, index) => (
                      <tr key={index}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <strong>{item.label}</strong>
                            {!item.editable && <span className="badge bg-secondary">Statutory</span>}
                          </div>
                        </td>
                        <td>
                          {editingDeductionIndex === index && item.editable ? (
                            <select
                              className="form-select form-select-sm"
                              value={item.calculation_type || 'fixed'}
                              onChange={(e) => handleEditDeductionValue(index, 'calculation_type', e.target.value)}
                            >
                              <option value="percentage">Percentage</option>
                              <option value="fixed">Fixed</option>
                            </select>
                          ) : (
                            <span className="badge bg-secondary">
                              {item.calculation_type || (item.editable ? 'fixed' : 'Auto')}
                            </span>
                          )}
                        </td>
                        <td>
                          {editingDeductionIndex === index && item.editable ? (
                            <div className="input-group input-group-sm">
                              {item.calculation_type === 'fixed' && <span className="input-group-text">₹</span>}
                              <input
                                type="number"
                                className="form-control"
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                min="0"
                                max={item.calculation_type === 'percentage' ? '100' : undefined}
                                step={item.calculation_type === 'percentage' ? '0.01' : '1'}
                                autoFocus
                              />
                              {item.calculation_type === 'percentage' && <span className="input-group-text">%</span>}
                            </div>
                          ) : (
                            <span className="fw-bold">{item.value}</span>
                          )}
                        </td>
                        <td className="text-end">
                          {editingDeductionIndex === index && item.editable ? (
                            <div className="btn-group btn-group-sm">
                              <button
                                className="btn btn-outline-success btn-sm"
                                onClick={() => saveDeductionEdit(index)}
                                title="Save"
                              >
                                ✓
                              </button>
                              <button
                                className="btn btn-outline-secondary btn-sm"
                                onClick={cancelEditingDeduction}
                                title="Cancel"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="btn-group btn-group-sm">
                              {item.editable ? (
                                <>
                                  <button
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={() => startEditingDeduction(index)}
                                    title="Edit"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={() => handleRemoveDeduction(index)}
                                    title="Remove"
                                  >
                                    🗑️
                                  </button>
                                </>
                              ) : (
                                <span
                                  className="text-muted"
                                  title="Statutory deduction, calculated automatically during payroll"
                                >
                                  🔒 Statutory
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {structureData.deductions.length === 0 && (
                <div className="text-center text-muted py-4">
                  <p>No deductions configured.</p>
                  <small>Enable statutory deductions in Payroll Settings or add custom deductions below.</small>
                </div>
              )}

              {structureData.deductions.some((d) => !d.editable) && (
                <div className="alert alert-info mt-3 mb-0">
                  <small>
                    <strong>Statutory Deductions:</strong> These are system-controlled and calculated automatically based on your
                    payroll settings. They cannot be edited or deleted.
                  </small>
                </div>
              )}

              {/* Add Deduction Button */}
              <button className="btn btn-outline-primary w-100 mt-3" onClick={() => setShowAddDeductionModal(true)}>
                + Add Deduction Component
              </button>
            </div>
          </div>
        </div>
      </div>

                  {/* Add Earning Modal */}
                  <AddEarningModal
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    onAdd={handleAddEarning}
                    existingComponents={structureData ? structureData.earnings.map((e) => e.component) : []}
                  />

                  {/* Add Deduction Modal */}
                  <AddDeductionModal
                    isOpen={showAddDeductionModal}
                    onClose={() => setShowAddDeductionModal(false)}
                    onAdd={handleAddDeduction}
                    existingComponents={[
                      ...structureData.earnings.map((e) => e.component),
                      ...structureData.deductions.map((d) => d.component),
                    ]}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalaryStructureBuilder;
