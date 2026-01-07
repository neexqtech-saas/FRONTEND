import React from "react";
import { Navigate, Route } from "react-router";
import { all_routes } from "./all_routes";

// Lazy load all route components for code splitting and faster initial load
const Register = React.lazy(() => import("../auth/register/register"));
const Login = React.lazy(() => import("../auth/login/login"));
const NewLogin = React.lazy(() => import("../auth/new-login/NewLogin"));
const ChangePassword = React.lazy(() => import("../auth/change-password"));
const AdminSettings = React.lazy(() => import("../admin/settings"));
const AdminDashboard = React.lazy(() => import("../adminDashboard"));
const AttendanceAdmin = React.lazy(() => import("../hrm/attendance/fetchModal"));
const Holidays = React.lazy(() => import("../hrm/holidays/fetchModal"));
const Companies = React.lazy(() => import("../super-admin/companies"));
const SystemOwnerOrganizations = React.lazy(() => import("../super-admin/organizations"));
const OrganizationDashboard = React.lazy(() => import("../organization/dashboard"));
const OrganizationSettingsPage = React.lazy(() => import("../organization/settings/index"));
const UnderConstruction = React.lazy(() => import("../pages/underConstruction"));
const ServiceShifts = React.lazy(() => import("../hrm/shifts/fetchModal"));
const LeaveTypes = React.lazy(() => import("../hrm/leave/fetchModal"));
const LeavePolicies = React.lazy(() => import("../hrm/leave-policies/fetchModal"));
const Locations = React.lazy(() => import("../hrm/locations/fetchModal"));
const WeekOffs = React.lazy(() => import("../hrm/week-offs/fetchModal"));
const EmployeeLeaves = React.lazy(() => import("../hrm/leave-applications/EmployeeLeaves"));
const Visits = React.lazy(() => import("../crm/visit/fetchModal"));
const VisitMap = React.lazy(() => import("../crm/visit/VisitMap"));
const Contacts = React.lazy(() => import("../crm/contact/index"));
const ScheduleTask = React.lazy(() => import("../crm/task/fetchModal"));
const Invoices = React.lazy(() => import("../invoice/index"));
const AddInvoice = React.lazy(() => import("../invoice/add-invoice"));
const InvoicePDFView = React.lazy(() => import("../invoice/invoice-pdf-view"));
const Expense = React.lazy(() => import("../expense/index"));
const AssetManagement = React.lazy(() => import("../asset-management/index"));
const PayslipGenerator = React.lazy(() => import("../payroll/payslip-generator/index"));
const ProfessionalTaxRules = React.lazy(() => import("../payroll/professional-tax-rules/index"));
const StatutoryRules = React.lazy(() => import("../payroll/statutory-rules/index"));
const PayrollSettings = React.lazy(() => import("../payroll/payroll-settings/index"));
const SalaryStructureBuilder = React.lazy(() => import("../payroll/structure/components/SalaryStructureBuilder"));
const EmployeePayrollConfig = React.lazy(() => import("../payroll/employee-payroll-config/index"));
const EmployeeAdvance = React.lazy(() => import("../payroll/employee-advance/index"));
const RunPayroll = React.lazy(() => import("../payroll/run-payroll/index"));

// Loading fallback component
const RouteLoadingFallback = () => (
  <div style={{ 
    display: "flex", 
    justifyContent: "center", 
    alignItems: "center", 
    height: "50vh",
    fontSize: "16px"
  }}>
    Loading...
  </div>
);

// Wrapper component for lazy loaded routes with Suspense
const LazyRoute = ({ component: Component, ...props }: { component: React.LazyExoticComponent<React.ComponentType<any>>; [key: string]: any }) => (
  <React.Suspense fallback={<RouteLoadingFallback />}>
    <Component {...props} />
  </React.Suspense>
);

const routes = all_routes;

export const authRoutes = [
  {
    path: routes.register,
    element: <LazyRoute component={Register} />,
    route: Route,
  },
  {
    path: routes.login,
    element: <LazyRoute component={Login} />,
    route: Route,
  },
  {
    path: routes.newLogin,
    element: <LazyRoute component={NewLogin} />,
    route: Route,
  },
];

export const publicRoutes = [
  {
    path: routes.adminDashboard,
    element: <LazyRoute component={Companies} />,
    route: Route,
  },
  {
    path: routes.adminDashboard,
    element: <LazyRoute component={Holidays} />,
    route: Route,
  },
  {
    path: "/",
    name: "Root",
    element: <Navigate to="/index" />,
    route: Route,
  },
  {
    path: routes.holidays,
    element: <LazyRoute component={Holidays} />,
    route: Route,
  },
  {
    path: routes.underConstruction,
    element: <LazyRoute component={UnderConstruction} />,
  },
  {
    path: routes.serviceShifts,
    element: <LazyRoute component={ServiceShifts} />,
  },
  {
    path: routes.leaveTypes,
    element: <LazyRoute component={LeaveTypes} />,
  },
  {
    path: routes.leavePolicies,
    element: <LazyRoute component={LeavePolicies} />,
  },
  {
    path: routes.employeeLeaves,
    element: <LazyRoute component={EmployeeLeaves} />,
  },
  {
    path: routes.workLocations,
    element: <LazyRoute component={Locations} />,
  },
  {
    path: routes.weekOffs,
    element: <LazyRoute component={WeekOffs} />,
  },
  {
    path: routes.attendanceadmin,
    element: <LazyRoute component={AttendanceAdmin} />,
  },
  {
    path: routes.securitysettings,
    element: <LazyRoute component={ChangePassword} />,
  },
  {
    path: routes.organizationDashboard,
    element: <LazyRoute component={OrganizationDashboard} />,
  },
  {
    path: routes.organizationSettings,
    element: <LazyRoute component={OrganizationSettingsPage} />,
  },
  {
    path: routes.adminSettings,
    element: <LazyRoute component={AdminSettings} />,
    route: Route,
  },
  {
    path: routes.visit,
    element: <LazyRoute component={Visits} />,
  },
  {
    path: routes.visitMap,
    element: <LazyRoute component={VisitMap} />,
  },
  {
    path: routes.contactGrid,
    element: <LazyRoute component={Contacts} />,
  },
  {
    path: routes.contactList,
    element: <LazyRoute component={Contacts} />,
  },
  {
    path: routes.scheduleTask,
    element: <LazyRoute component={ScheduleTask} />,
  },
  {
    path: routes.deactivatedEmployees,
    element: <LazyRoute component={Companies} />,
  },
  {
    path: routes.invoices,
    element: <LazyRoute component={Invoices} />,
  },
  {
    path: routes.addInvoice,
    element: <LazyRoute component={AddInvoice} />,
  },
  {
    path: routes.editInvoice,
    element: <LazyRoute component={AddInvoice} />,
  },
  {
    path: routes.invoiceDetails,
    element: <LazyRoute component={InvoicePDFView} />,
  },
  {
    path: routes.expense,
    element: <LazyRoute component={Expense} />,
  },
  {
    path: routes.assetManagement,
    element: <LazyRoute component={AssetManagement} />,
  },
  // Payroll Routes
  {
    path: routes.payslipGenerator,
    element: <LazyRoute component={PayslipGenerator} />,
  },
  {
    path: routes.professionalTaxRules,
    element: <LazyRoute component={ProfessionalTaxRules} />,
  },
  {
    path: routes.statutoryRules,
    element: <LazyRoute component={StatutoryRules} />,
  },
  {
    path: routes.payrollSettings,
    element: <LazyRoute component={PayrollSettings} />,
  },
  {
    path: routes.salaryStructure,
    element: <LazyRoute component={SalaryStructureBuilder} />,
  },
  {
    path: routes.employeePayrollConfig,
    element: <LazyRoute component={EmployeePayrollConfig} />,
  },
  {
    path: routes.employeeAdvance,
    element: <LazyRoute component={EmployeeAdvance} />,
  },
  {
    path: routes.runPayroll,
    element: <LazyRoute component={RunPayroll} />,
  },
];
