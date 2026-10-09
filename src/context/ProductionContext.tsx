import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  MaterialInward,
  Customer,
  AppNotification,
  ProductionStatus,
  SlittingOutput,
  DeliveryChallan,
  BundleSpecifications,
  BundleRecord,
  CoreType,
  BundleRollItem,
  ChallanRevisionRecord,
  BundleEditRecord,
  SpecChangeRequest,
  FactoryUser
} from '../types';
import {
  INITIAL_JOBS,
  INITIAL_CUSTOMERS,
  INITIAL_NOTIFICATIONS,
  INITIAL_FACTORY_USERS,
  COMPANY_INFO
} from '../data/mockData';

export interface ReviseChallanParams {
  reason: string; // Mandatory audit justification
  revisedBy?: string;
  vehicleNo?: string;
  transporterName?: string;
  driverPhone?: string;
  eWayBillNo?: string;
  thisDispatchWeightKg?: number;
  totalBundles?: number;
  remarks?: string;
  selectedBundleIds?: string[];
}

interface GenerateChallanParams {
  dispatchType: 'partial' | 'final';
  thisDispatchWeightKg: number;
  bundlesCount: number;
  unitType?: 'reels' | 'reams';
  unitsPerBundle?: number;
  bundleWeightApproxKg?: number;
  scrapWeightKg?: number;
  vehicleNo: string;
  transporterName: string;
  driverPhone?: string;
  eWayBillNo?: string;
  remarks?: string;
  selectedBundleIds?: string[];
}

interface ProductionContextType {
  jobs: MaterialInward[];
  customers: Customer[];
  notifications: AppNotification[];
  activeRole: 'factory' | 'customer';
  setActiveRole: (role: 'factory' | 'customer') => void;
  selectedCustomerId: string;
  setSelectedCustomerId: (id: string) => void;
  
  // Factory Staff Management & Floor Authentication (3-4 Factory Staff)
  factoryUsers: FactoryUser[];
  activeFactoryUser: FactoryUser | null;
  loginFactoryUser: (userIdOrPinOrEmail: string) => { success: boolean; user?: FactoryUser; message: string };
  logoutFactoryUser: () => void;
  addFactoryUser: (userData: Omit<FactoryUser, 'id'>) => FactoryUser;
  updateFactoryUser: (userId: string, updates: Partial<FactoryUser>) => void;
  deleteFactoryUser: (userId: string) => void;

  // Customer Session & Portal Authentication
  authenticatedEmail: string | null;
  loginCustomerByEmail: (email: string) => { success: boolean; customer?: Customer; message: string };
  loginCustomerByAccessCode: (code: string) => { success: boolean; customer?: Customer; message: string };
  logoutCustomer: () => void;
  
  // Customer Management
  addCustomer: (customerData: Omit<Customer, 'id'>) => Customer;
  registerCustomer: (customerData: Omit<Customer, 'id' | 'accessCode'>) => { success: boolean; customer: Customer; message: string };
  updateCustomer: (customerId: string, customerData: Partial<Customer>) => void;
  addAuthorizedEmail: (customerId: string, newEmail: string) => void;
  removeAuthorizedEmail: (customerId: string, emailToRemove: string) => void;

  // Inward & Production
  addInwardMaterial: (data: {
    customerPoNo: string;
    customerId: string;
    inwardChallanNo: string;
    vehicleNo: string;
    receivedDate: string;
    materialType: MaterialInward['materialType'];
    grade: string;
    thickness: number;
    thicknessUnit: MaterialInward['thicknessUnit'];
    incomingWidth: number;
    incomingLength: number;
    incomingWeight: number;
    coilsOrRollsCount: number;
    bundleSpecs: BundleSpecifications;
    customerInstructions: string;
    assignedMachine?: string;
    estimatedDeliveryDate?: string;
  }) => MaterialInward;

  updateJobStatus: (jobId: string, status: ProductionStatus, note?: string) => void;
  updateEstimatedDeliveryDate: (jobId: string, eddDate: string, note?: string, changedBy?: string) => void;
  recordSlittingOutput: (jobId: string, output: SlittingOutput) => void;
  
  // Delivery Challans (supports partial midway dispatches & revision versioning)
  generateDeliveryChallan: (jobId: string, params: GenerateChallanParams) => DeliveryChallan;
  reviseDeliveryChallan: (jobId: string, challanId: string, params: ReviseChallanParams) => DeliveryChallan;
  updateDeliveryChallan: (jobId: string, challanId: string, updates: Partial<DeliveryChallan>) => void;
  deleteDeliveryChallan: (jobId: string, challanId: string) => void;
  saveChallanToDrive: (jobId: string, challanId: string) => void;
  sendChallanEmail: (jobId: string, challanId: string, recipientEmail?: string) => void;
  driveWebLink: string;
  setDriveWebLink: (url: string) => void;

  // Bundle Weighing & Scale Operations (Production Manager Floor Work)
  addBundleToJob: (
    jobId: string,
    bundleData: {
      rollItems: BundleRollItem[];
      rollsSummary: string;
      totalRollsCount: number;
      grossWeightKg: number;
      coreType: CoreType;
      paperCoreTareWeightKg: number;
      otherPackagingTareKg?: number;
      netWeightKg: number;
      notes?: string;
      weighedBy?: string;
    }
  ) => BundleRecord;
  addMultipleBundlesToJob: (
    jobId: string,
    bundlesList: Array<{
      rollItems: BundleRollItem[];
      rollsSummary: string;
      totalRollsCount: number;
      grossWeightKg: number;
      coreType: CoreType;
      paperCoreTareWeightKg: number;
      otherPackagingTareKg?: number;
      netWeightKg: number;
      notes?: string;
      weighedBy?: string;
    }>
  ) => BundleRecord[];
  deleteBundleFromJob: (jobId: string, bundleId: string) => void;
  updateBundleInJob: (jobId: string, bundleId: string, updates: Partial<BundleRecord>) => void;
  editBundleInJob: (
    jobId: string,
    bundleId: string,
    updates: {
      grossWeightKg: number;
      coreType: CoreType;
      paperCoreTareWeightKg: number;
      rollsSummary?: string;
      totalRollsCount?: number;
      notes?: string;
      reason: string;
      editedBy?: string;
    }
  ) => void;
  voidBundleInJob: (jobId: string, bundleId: string, reason: string, voidedBy?: string) => void;

  // Customer Specification Change Requests & Backtrack Approval
  requestSpecChange: (
    jobId: string,
    data: {
      requestedSpecs: {
        slitWidthMm?: number;
        targetBundleWeightKg?: number;
        unitsPerBundle?: number;
        unitType?: 'reels' | 'reams';
        customerInstructions: string;
      };
      reason: string;
      requestedByEmail: string;
    }
  ) => void;
  approveSpecChange: (jobId: string, requestId: string, reviewNote: string, reviewedBy?: string) => void;
  rejectSpecChange: (jobId: string, requestId: string, rejectionReason: string, reviewedBy?: string) => void;

  // PO Permanent Closure by Factory Master
  closeCustomerPo: (jobId: string, closingNotes?: string, closedBy?: string) => void;
  reopenCustomerPo: (jobId: string, reopenReason?: string) => void;

  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  resetToSampleData: () => void;
  getJobById: (id: string) => MaterialInward | undefined;
}

const STORAGE_KEY_JOBS = 'progressive_enterprises_jobs_v4';
const STORAGE_KEY_CUSTOMERS = 'progressive_enterprises_customers_v4';
const STORAGE_KEY_NOTIFS = 'progressive_enterprises_notifs_v4';
const STORAGE_KEY_ROLE = 'progressive_enterprises_role_v4';
const STORAGE_KEY_CUST_ID = 'progressive_enterprises_selected_cust_v4';
const STORAGE_KEY_AUTH_EMAIL = 'progressive_enterprises_auth_email_v4';
const STORAGE_KEY_FACTORY_USERS = 'progressive_enterprises_factory_users_v4';
const STORAGE_KEY_ACTIVE_FACTORY_USER = 'progressive_enterprises_active_factory_user_v4';
const STORAGE_KEY_DRIVE_URL = 'progressive_enterprises_drive_url_v4';
const DEFAULT_DRIVE_URL = 'https://drive.google.com/drive/my-drive';

const ProductionContext = createContext<ProductionContextType | undefined>(undefined);

export const ProductionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jobs, setJobs] = useState<MaterialInward[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_JOBS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load jobs from localStorage', e);
    }
    return INITIAL_JOBS;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOMERS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load customers from localStorage', e);
    }
    return INITIAL_CUSTOMERS;
  });

  const [factoryUsers, setFactoryUsers] = useState<FactoryUser[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FACTORY_USERS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load factory users from localStorage', e);
    }
    return INITIAL_FACTORY_USERS;
  });

  const [activeFactoryUserId, setActiveFactoryUserId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_FACTORY_USER);
      if (saved) return saved;
    } catch {
      // ignore
    }
    return INITIAL_FACTORY_USERS[0].id;
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NOTIFS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load notifications from localStorage', e);
    }
    return INITIAL_NOTIFICATIONS;
  });

  const [activeRole, setActiveRole] = useState<'factory' | 'customer'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ROLE);
      if (saved === 'factory' || saved === 'customer') return saved;
    } catch {
      // ignore
    }
    return 'factory';
  });

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUST_ID);
      if (saved) return saved;
    } catch {
      // ignore
    }
    return INITIAL_CUSTOMERS[0].id;
  });

  const [authenticatedEmail, setAuthenticatedEmail] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_AUTH_EMAIL) || null;
    } catch {
      return null;
    }
  });

  const [driveWebLink, setDriveWebLinkState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_DRIVE_URL) || DEFAULT_DRIVE_URL;
    } catch {
      return DEFAULT_DRIVE_URL;
    }
  });

  const setDriveWebLink = (url: string) => {
    const cleanUrl = url.trim() || DEFAULT_DRIVE_URL;
    setDriveWebLinkState(cleanUrl);
    try {
      localStorage.setItem(STORAGE_KEY_DRIVE_URL, cleanUrl);
    } catch (e) {
      console.error('Failed to save drive URL', e);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_JOBS, JSON.stringify(jobs));
    } catch (e) {
      console.error('Failed to save jobs to localStorage', e);
    }
  }, [jobs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOMERS, JSON.stringify(customers));
    } catch (e) {
      console.error('Failed to save customers to localStorage', e);
    }
  }, [customers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(notifications));
    } catch (e) {
      console.error('Failed to save notifications to localStorage', e);
    }
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ROLE, activeRole);
    } catch {
      // ignore
    }
  }, [activeRole]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CUST_ID, selectedCustomerId);
    } catch {
      // ignore
    }
  }, [selectedCustomerId]);

  useEffect(() => {
    try {
      if (authenticatedEmail) {
        localStorage.setItem(STORAGE_KEY_AUTH_EMAIL, authenticatedEmail);
      } else {
        localStorage.removeItem(STORAGE_KEY_AUTH_EMAIL);
      }
    } catch {
      // ignore
    }
  }, [authenticatedEmail]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FACTORY_USERS, JSON.stringify(factoryUsers));
    } catch (e) {
      console.error('Failed to save factory users to localStorage', e);
    }
  }, [factoryUsers]);

  useEffect(() => {
    try {
      if (activeFactoryUserId) {
        localStorage.setItem(STORAGE_KEY_ACTIVE_FACTORY_USER, activeFactoryUserId);
      } else {
        localStorage.removeItem(STORAGE_KEY_ACTIVE_FACTORY_USER);
      }
    } catch {
      // ignore
    }
  }, [activeFactoryUserId]);

  const activeFactoryUser = factoryUsers.find(u => u.id === activeFactoryUserId) || null;

  const loginFactoryUser = (userIdOrPinOrEmail: string) => {
    const input = userIdOrPinOrEmail.trim().toLowerCase();
    const matched = factoryUsers.find(
      u => u.id.toLowerCase() === input ||
           u.pin.toLowerCase() === input ||
           u.email.toLowerCase() === input ||
           u.badgeCode.toLowerCase() === input ||
           u.name.toLowerCase().includes(input)
    );

    if (matched) {
      setActiveFactoryUserId(matched.id);
      return {
        success: true,
        user: matched,
        message: `Welcome ${matched.name}! Authenticated as ${matched.role}.`
      };
    }

    return {
      success: false,
      message: `Invalid factory credentials. Please select one of the authorized factory team accounts.`
    };
  };

  const logoutFactoryUser = () => {
    setActiveFactoryUserId(null);
  };

  const addFactoryUser = (userData: Omit<FactoryUser, 'id'>) => {
    const newId = `FACT-${String(factoryUsers.length + 1).padStart(2, '0')}`;
    const newUser: FactoryUser = {
      ...userData,
      id: newId,
      badgeCode: userData.badgeCode || `PE-STF-${newId}`,
    };
    setFactoryUsers(prev => [...prev, newUser]);
    return newUser;
  };

  const updateFactoryUser = (userId: string, updates: Partial<FactoryUser>) => {
    setFactoryUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
  };

  const deleteFactoryUser = (userId: string) => {
    setFactoryUsers(prev => prev.filter(u => u.id !== userId));
    if (activeFactoryUserId === userId) {
      const remaining = factoryUsers.filter(u => u.id !== userId);
      setActiveFactoryUserId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const addNotification = (
    jobId: string,
    jobNo: string,
    customerId: string,
    customerName: string,
    type: AppNotification['type'],
    title: string,
    message: string
  ) => {
    const newNotif: AppNotification = {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      jobId,
      jobNo,
      customerId,
      customerName,
      type,
      title,
      message,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // Customer portal authentication by email
  const loginCustomerByEmail = (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const matchedCustomer = customers.find(c =>
      c.authorizedEmails.some(ae => ae.toLowerCase() === cleanEmail) ||
      c.email.toLowerCase() === cleanEmail
    );

    if (matchedCustomer) {
      setAuthenticatedEmail(cleanEmail);
      setSelectedCustomerId(matchedCustomer.id);
      return {
        success: true,
        customer: matchedCustomer,
        message: `Welcome ${matchedCustomer.name}! Authenticated with ${cleanEmail}.`
      };
    }

    return {
      success: false,
      message: `Email "${email}" is not registered under any customer account. Please contact Progressive Enterprises Admin to grant access.`
    };
  };

  // Customer portal login by direct link or access code
  const loginCustomerByAccessCode = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    const matchedCustomer = customers.find(
      c => (c.accessCode && c.accessCode.toUpperCase() === cleanCode) || c.id.toUpperCase() === cleanCode
    );

    if (matchedCustomer) {
      setAuthenticatedEmail(matchedCustomer.email);
      setSelectedCustomerId(matchedCustomer.id);
      return {
        success: true,
        customer: matchedCustomer,
        message: `Access verified for ${matchedCustomer.companyName}.`
      };
    }

    return {
      success: false,
      message: `Tracking code "${code}" not found. Please verify your tracking link.`
    };
  };

  const logoutCustomer = () => {
    setAuthenticatedEmail(null);
  };

  // Customer Management
  const addCustomer: ProductionContextType['addCustomer'] = (customerData) => {
    const newId = `CUST-${String(customers.length + 1).padStart(3, '0')}`;
    const code = `${customerData.companyName.substring(0, 3).toUpperCase()}-TRACK-2026`;
    const newCust: Customer = {
      ...customerData,
      id: newId,
      accessCode: code,
      authorizedEmails: customerData.authorizedEmails.length > 0
        ? customerData.authorizedEmails
        : [customerData.email],
    };
    setCustomers(prev => [...prev, newCust]);
    return newCust;
  };

  const registerCustomer: ProductionContextType['registerCustomer'] = (customerData) => {
    const cleanEmail = customerData.email.trim().toLowerCase();
    const newId = `CUST-${String(customers.length + 1).padStart(3, '0')}`;
    const code = `${customerData.companyName.substring(0, 3).toUpperCase()}-TRACK-2026`;

    // Check if company or email already exists
    const existing = customers.find(
      c => c.email.toLowerCase() === cleanEmail ||
           c.authorizedEmails.some(e => e.toLowerCase() === cleanEmail) ||
           c.companyName.toLowerCase().trim() === customerData.companyName.toLowerCase().trim()
    );

    if (existing) {
      if (!existing.authorizedEmails.some(e => e.toLowerCase() === cleanEmail)) {
        addAuthorizedEmail(existing.id, cleanEmail);
      }
      setSelectedCustomerId(existing.id);
      setAuthenticatedEmail(cleanEmail);
      return {
        success: true,
        customer: existing,
        message: `Welcome! You are registered and logged into ${existing.companyName}.`,
      };
    }

    const authEmails = customerData.authorizedEmails && customerData.authorizedEmails.length > 0
      ? Array.from(new Set([cleanEmail, ...customerData.authorizedEmails.map(e => e.toLowerCase().trim())]))
      : [cleanEmail];

    const newCust: Customer = {
      ...customerData,
      id: newId,
      email: cleanEmail,
      accessCode: code,
      authorizedEmails: authEmails,
      registeredAddress: customerData.registeredAddress || '',
      plantAddress: customerData.plantAddress || '',
    };

    setCustomers(prev => [...prev, newCust]);
    setSelectedCustomerId(newId);
    setAuthenticatedEmail(cleanEmail);

    addNotification(
      'sys-new-cust',
      'NEW-ACCOUNT',
      newId,
      newCust.companyName,
      'status_change',
      `New Customer Onboarded: ${newCust.companyName}`,
      `${newCust.companyName} created a new self-service customer portal account. Contact: ${newCust.name} (${cleanEmail}).`
    );

    return {
      success: true,
      customer: newCust,
      message: `Account created successfully for ${newCust.companyName}! You can now submit inward material and track delivery.`,
    };
  };

  const updateCustomer = (customerId: string, customerData: Partial<Customer>) => {
    setCustomers(prev =>
      prev.map(c => (c.id === customerId ? { ...c, ...customerData } : c))
    );
  };

  const addAuthorizedEmail = (customerId: string, newEmail: string) => {
    const clean = newEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) return;

    setCustomers(prev =>
      prev.map(c => {
        if (c.id !== customerId) return c;
        if (c.authorizedEmails.includes(clean)) return c;
        return {
          ...c,
          authorizedEmails: [...c.authorizedEmails, clean],
        };
      })
    );

    // Also update any active jobs for this customer
    setJobs(prev =>
      prev.map(j => {
        if (j.customerId !== customerId) return j;
        if (j.authorizedEmails.includes(clean)) return j;
        return {
          ...j,
          authorizedEmails: [...j.authorizedEmails, clean],
        };
      })
    );
  };

  const removeAuthorizedEmail = (customerId: string, emailToRemove: string) => {
    setCustomers(prev =>
      prev.map(c => {
        if (c.id !== customerId) return c;
        return {
          ...c,
          authorizedEmails: c.authorizedEmails.filter(e => e.toLowerCase() !== emailToRemove.toLowerCase()),
        };
      })
    );
  };

  // Add Inward Material
  const addInwardMaterial: ProductionContextType['addInwardMaterial'] = (data) => {
    const customer = customers.find(c => c.id === data.customerId) || customers[0];

    const nextNumber = 85 + jobs.length + 1;
    const jobNo = `PE-JOB-2026-${String(nextNumber).padStart(3, '0')}`;
    const id = 'job-' + Date.now();
    const nowIso = new Date().toISOString();

    const newJob: MaterialInward = {
      id,
      jobNo,
      customerPoNo: data.customerPoNo || `PO/${customer.name.substring(0, 3).toUpperCase()}/2026/${Math.floor(100 + Math.random() * 900)}`,
      customerId: customer.id,
      customerName: customer.companyName,
      customerGst: customer.gstNumber,
      customerEmail: customer.email,
      authorizedEmails: customer.authorizedEmails && customer.authorizedEmails.length > 0
        ? customer.authorizedEmails
        : [customer.email],
      customerPhone: customer.phone,
      customerRegisteredAddress: customer.registeredAddress || customer.address || 'Registered Office Address',
      inwardChallanNo: data.inwardChallanNo || `INW-${Math.floor(1000 + Math.random() * 9000)}`,
      vehicleNo: data.vehicleNo.toUpperCase(),
      receivedDate: data.receivedDate || new Date().toISOString().split('T')[0],
      materialType: data.materialType,
      grade: data.grade,
      thickness: Number(data.thickness),
      thicknessUnit: data.thicknessUnit,
      incomingWidth: Number(data.incomingWidth),
      incomingLength: Number(data.incomingLength),
      incomingWeight: Number(data.incomingWeight),
      coilsOrRollsCount: Number(data.coilsOrRollsCount) || 1,
      bundleSpecs: data.bundleSpecs,
      customerInstructions: data.customerInstructions || 'Standard precision slitting and bundle packaging.',
      status: data.estimatedDeliveryDate ? 'pending_production' : 'received',
      assignedMachine: data.assignedMachine || 'Slitter Line #1',
      estimatedDeliveryDate: data.estimatedDeliveryDate,
      eddHistory: data.estimatedDeliveryDate
        ? [
            {
              date: data.estimatedDeliveryDate,
              setAt: nowIso,
              changedBy: 'Factory Inward Planner',
              note: 'Initial delivery date assigned upon inward material registration.',
            }
          ]
        : [],
      dispatchedWeightKg: 0,
      remainingWeightKg: Number(data.incomingWeight),
      challans: [],
      poStatus: 'open',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setJobs(prev => [newJob, ...prev]);

    // Factory Notification
    addNotification(
      id,
      jobNo,
      customer.id,
      customer.companyName,
      'new_material_inward',
      `New Inward (PO: ${newJob.customerPoNo}): ${newJob.grade}`,
      `${customer.companyName} delivered ${newJob.incomingWeight.toLocaleString()} kg via ${newJob.vehicleNo}. ${
        data.estimatedDeliveryDate
          ? `EDD promised for ${data.estimatedDeliveryDate}.`
          : 'Pending factory estimated delivery date assignment.'
      }`
    );

    return newJob;
  };

  const updateJobStatus = (jobId: string, status: ProductionStatus, note?: string) => {
    setJobs(prev =>
      prev.map(job => {
        if (job.id !== jobId) return job;

        const nowIso = new Date().toISOString();
        const updated = {
          ...job,
          status,
          updatedAt: nowIso,
        };

        const statusLabels: Record<ProductionStatus, string> = {
          received: 'Material Received',
          pending_production: 'Not Taken Under Production (In Queue)',
          in_production: 'Under Slitting (Production Live)',
          slitting_completed: 'Slitting Completed (Quality & Packaging)',
          ready_for_dispatch: 'Ready for Dispatch',
          partially_dispatched: 'Partially Dispatched (Midway Urgent Delivery)',
          dispatched: 'Dispatched (Challan Issued)',
          po_closed: 'PO Permanently Closed (Completed & Reconciled)',
        };

        addNotification(
          job.id,
          job.jobNo,
          job.customerId,
          job.customerName,
          status === 'in_production'
            ? 'production_started'
            : status === 'slitting_completed'
            ? 'slitting_completed'
            : status === 'partially_dispatched'
            ? 'partial_dispatch'
            : status === 'po_closed'
            ? 'po_closed'
            : 'ready_for_dispatch',
          `Job ${job.jobNo}: Status changed to ${statusLabels[status]}`,
          `Material ${job.grade} is now ${statusLabels[status]}. ${note ? `Note: ${note}` : ''}`
        );

        return updated;
      })
    );
  };

  const updateEstimatedDeliveryDate = (
    jobId: string,
    eddDate: string,
    note?: string,
    changedBy: string = 'Factory Production Manager'
  ) => {
    setJobs(prev =>
      prev.map(job => {
        if (job.id !== jobId) return job;

        const nowIso = new Date().toISOString();
        const eddEntry = {
          date: eddDate,
          setAt: nowIso,
          changedBy,
          note: note || 'Estimated delivery schedule confirmed by factory.',
        };

        const nextStatus = job.status === 'received' ? 'pending_production' : job.status;

        addNotification(
          job.id,
          job.jobNo,
          job.customerId,
          job.customerName,
          'edd_updated',
          `Estimated Delivery Date Scheduled: ${eddDate}`,
          `Progressive Enterprises committed delivery date ${eddDate} for PO ${job.customerPoNo} (${job.grade}).`
        );

        return {
          ...job,
          estimatedDeliveryDate: eddDate,
          eddHistory: [...job.eddHistory, eddEntry],
          status: nextStatus,
          updatedAt: nowIso,
        };
      })
    );
  };

  const recordSlittingOutput = (jobId: string, output: SlittingOutput) => {
    setJobs(prev =>
      prev.map(job => {
        if (job.id !== jobId) return job;

        const nowIso = new Date().toISOString();
        const updatedOutput: SlittingOutput = {
          ...output,
          completedAt: nowIso,
        };

        addNotification(
          job.id,
          job.jobNo,
          job.customerId,
          job.customerName,
          'slitting_completed',
          `Slitting Completed: ${output.totalFinishedWeightKg} kg Finished`,
          `Job ${job.jobNo} slitted into ${output.slitCuts.length} cut sizes, packed into ${output.totalBundles} ${output.packagingType} (~${output.bundleWeightKg} kg/bundle, ${output.unitsPerBundle} ${output.bundleUnitType}/bundle). Yield: ${output.yieldPercentage.toFixed(1)}%.`
        );

        return {
          ...job,
          status: job.status === 'partially_dispatched' ? 'partially_dispatched' : 'ready_for_dispatch',
          outputDetails: updatedOutput,
          updatedAt: nowIso,
        };
      })
    );
  };

  // Generate Delivery Challan with Partial Dispatch midway support
  const generateDeliveryChallan = (jobId: string, params: GenerateChallanParams) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) throw new Error('Job not found');

    const customer = customers.find(c => c.id === job.customerId);
    const existingChallansCount = job.challans ? job.challans.length : (job.challan ? 1 : 0);
    const sequenceNumber = existingChallansCount + 1;
    
    // Challan number formatting: e.g. PE/DC/2026/0415-P1 or PE/DC/2026/0415
    const baseChallanNum = 415 + jobs.reduce((acc, j) => acc + (j.challans?.length || 0), 0) + 1;
    const challanNo = params.dispatchType === 'partial'
      ? `PE/DC/2026/0${baseChallanNum}-P${sequenceNumber}`
      : `PE/DC/2026/0${baseChallanNum}`;

    const todayStr = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();

    const slitSummary = job.outputDetails?.slitCuts
      ? job.outputDetails.slitCuts.map(c => `${c.widthMm}mm (${c.numberOfCuts} cuts)`).join(', ')
      : `${job.incomingWidth}mm standard cut`;

    // Process selected bundle records if provided
    const allJobBundles = job.bundles || [];
    const selectedBundleIds = params.selectedBundleIds && params.selectedBundleIds.length > 0
      ? params.selectedBundleIds
      : [];
    
    const matchedBundles = allJobBundles.filter(b => selectedBundleIds.includes(b.id));

    let dispatchWeight = Number(params.thisDispatchWeightKg);
    let bundles = Number(params.bundlesCount) || Math.ceil(dispatchWeight / (job.bundleSpecs?.targetBundleWeightKg || 28));
    let totalGrossWeight = dispatchWeight + (Number(params.scrapWeightKg) || 0);
    let totalNetWeight = dispatchWeight;

    if (matchedBundles.length > 0) {
      bundles = matchedBundles.length;
      totalGrossWeight = Number(matchedBundles.reduce((acc, b) => acc + b.grossWeightKg, 0).toFixed(2));
      totalNetWeight = Number(matchedBundles.reduce((acc, b) => acc + b.netWeightKg, 0).toFixed(2));
      dispatchWeight = totalNetWeight;
    }

    const previousDispatchedWeight = job.dispatchedWeightKg || 0;
    const newDispatchedWeight = previousDispatchedWeight + dispatchWeight;
    const remainingBalance = Math.max(0, job.incomingWeight - newDispatchedWeight);

    const unitType = params.unitType || job.bundleSpecs?.unitType || 'reels';
    const unitsPerBundle = params.unitsPerBundle || job.bundleSpecs?.unitsPerBundle || 10;
    const bundleWeightApprox = params.bundleWeightApproxKg || (bundles > 0 ? Number((dispatchWeight / bundles).toFixed(1)) : 28);
    const scrapWeight = Number(params.scrapWeightKg) || 0;

    const driveFileName = `${challanNo.replace(/[\/\-]/g, '_')}_${job.customerName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    const drivePath = `${COMPANY_INFO.driveStorageFolder}/${driveFileName}`;

    const allAuthorizedEmails = customer?.authorizedEmails && customer.authorizedEmails.length > 0
      ? customer.authorizedEmails
      : [job.customerEmail];

    const challanId = 'dc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);

    const dispatchedBundlesList: BundleRecord[] | undefined = matchedBundles.length > 0
      ? matchedBundles.map(b => ({
          ...b,
          status: 'dispatched' as const,
          dispatchedInChallanId: challanId,
          dispatchedInChallanNo: challanNo,
        }))
      : undefined;

    const newChallan: DeliveryChallan = {
      id: challanId,
      challanNo,
      challanDate: todayStr,
      jobId: job.id,
      customerPoNo: job.customerPoNo,
      customerId: job.customerId,
      customerName: job.customerName,
      customerRegisteredAddress: customer?.registeredAddress || job.customerRegisteredAddress,
      customerDeliveryAddress: customer?.plantAddress || customer?.address || 'Customer Plant Works',
      customerGst: job.customerGst,
      dispatchType: params.dispatchType,
      dispatchSequenceNumber: sequenceNumber,
      totalOrderWeightKg: job.incomingWeight,
      thisDispatchWeightKg: dispatchWeight,
      remainingBalanceWeightKg: remainingBalance,
      vehicleNo: params.vehicleNo.toUpperCase(),
      transporterName: params.transporterName || 'Express Road Lines',
      driverPhone: params.driverPhone,
      eWayBillNo: params.eWayBillNo || `EWB-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      incomingChallanRef: `${job.inwardChallanNo} dated ${job.receivedDate}`,
      items: [
        {
          srNo: 1,
          description: params.dispatchType === 'partial'
            ? `Slitted & Packed ${job.grade} (PARTIAL DISPATCH ${sequenceNumber} - Midway Urgent Delivery)`
            : `Slitted & Packed ${job.grade} (FINAL BALANCE DISPATCH - Job-Work Completed)`,
          grade: job.grade,
          thickness: `${job.thickness} ${job.thicknessUnit}`,
          slitWidthsSummary: slitSummary,
          incomingWeightKg: job.incomingWeight,
          dispatchedWeightKg: dispatchWeight,
          scrapWeightKg: scrapWeight,
          bundlesCount: bundles,
          unitType,
          unitsPerBundle,
          bundleWeightApproxKg: bundleWeightApprox,
          remarks: params.remarks || (
            params.dispatchType === 'partial'
              ? `Urgent midway release of ${dispatchWeight.toLocaleString()} kg in ${bundles} bundles (~${bundleWeightApprox} kg/bundle, ${unitsPerBundle} ${unitType}/bundle). Balance ${remainingBalance.toLocaleString()} kg under slitting.`
              : `Final dispatch of ${dispatchWeight.toLocaleString()} kg in ${bundles} bundles. Complete order reconciled.`
          ),
        }
      ],
      totalBundles: bundles,
      totalNetWeightKg: totalNetWeight,
      totalScrapWeightKg: scrapWeight,
      totalGrossWeightKg: totalGrossWeight,
      dispatchedBundles: dispatchedBundlesList,
      selectedBundleIds: selectedBundleIds.length > 0 ? selectedBundleIds : undefined,
      version: 1,
      revisionLabel: 'Original',
      isLatest: true,
      terms: [
        params.dispatchType === 'partial'
          ? `PARTIAL DELIVERY CHALLAN (${sequenceNumber}) against customer Purchase Order ${job.customerPoNo}.`
          : `FINAL DELIVERY CHALLAN against customer Purchase Order ${job.customerPoNo}.`,
        params.dispatchType === 'partial'
          ? `Remaining raw material balance of ${remainingBalance.toLocaleString()} kg is currently in progress at Progressive Enterprises.`
          : 'All inward raw material accounted for and delivered back to customer.',
        'Goods processed and returned under Rule 55 of CGST Rules 2017 for Job-Work transactions.',
        'Subject to Pune / Factory jurisdiction only.',
      ],
      savedToDrive: true,
      drivePath,
      driveSavedAt: nowIso,
      emailSent: true,
      sentToEmails: allAuthorizedEmails,
      emailSentAt: nowIso,
      preparedBy: 'P. Verma (Authorized Dispatch Officer)',
      status: 'dispatched',
    };

    const newStatus: ProductionStatus = params.dispatchType === 'partial' ? 'partially_dispatched' : 'dispatched';
    const newPoStatus = params.dispatchType === 'partial' ? 'partially_dispatched' : job.poStatus;

    setJobs(prev =>
      prev.map(j => {
        if (j.id !== jobId) return j;
        const updatedChallans = [...(j.challans || []), newChallan];

        // Mark dispatched bundles
        const updatedBundles = (j.bundles || []).map(b => {
          if (selectedBundleIds.includes(b.id)) {
            return {
              ...b,
              status: 'dispatched' as const,
              dispatchedInChallanId: challanId,
              dispatchedInChallanNo: challanNo,
            };
          }
          return b;
        });

        return {
          ...j,
          status: newStatus,
          poStatus: newPoStatus,
          dispatchedWeightKg: newDispatchedWeight,
          remainingWeightKg: remainingBalance,
          challan: newChallan, // latest
          challans: updatedChallans,
          bundles: updatedBundles,
          updatedAt: nowIso,
        };
      })
    );

    addNotification(
      job.id,
      job.jobNo,
      job.customerId,
      job.customerName,
      params.dispatchType === 'partial' ? 'partial_dispatch' : 'challan_generated',
      params.dispatchType === 'partial'
        ? `Partial Delivery Challan #${challanNo} Generated: ${dispatchWeight.toLocaleString()} kg`
        : `Final Delivery Challan #${challanNo} Generated: ${dispatchWeight.toLocaleString()} kg`,
      `Challan #${challanNo} issued to ${job.customerName}. Dispatched ${dispatchWeight.toLocaleString()} kg in ${bundles} bundles via ${params.vehicleNo}. Emailed to ${allAuthorizedEmails.join(', ')} and saved in Google Drive.`
    );

    return newChallan;
  };

  const reviseDeliveryChallan = (jobId: string, challanId: string, params: ReviseChallanParams): DeliveryChallan => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);

    const existingChallan = (job.challans || []).find(c => c.id === challanId) || job.challan;
    if (!existingChallan) throw new Error(`Challan not found: ${challanId}`);

    const nowIso = new Date().toISOString();
    const todayStr = new Date().toISOString().split('T')[0];
    const newVersion = (existingChallan.version || 1) + 1;
    const revisionNumber = newVersion - 1;
    const revisionLabel = `Revision ${revisionNumber} (Amended)`;
    const newChallanNo = existingChallan.challanNo.includes('-R')
      ? existingChallan.challanNo.replace(/-R\d+$/, `-R${revisionNumber}`)
      : `${existingChallan.challanNo}-R${revisionNumber}`;

    const newVehicleNo = (params.vehicleNo || existingChallan.vehicleNo).toUpperCase();
    const newTransporter = params.transporterName || existingChallan.transporterName;
    const newEwb = params.eWayBillNo || existingChallan.eWayBillNo;
    const newDriverPhone = params.driverPhone !== undefined ? params.driverPhone : existingChallan.driverPhone;

    // Calculate bundle reconciliation if selectedBundleIds provided
    let newDispatchWeight = params.thisDispatchWeightKg !== undefined ? Number(params.thisDispatchWeightKg) : existingChallan.thisDispatchWeightKg;
    let newBundlesCount = params.totalBundles !== undefined ? Number(params.totalBundles) : existingChallan.totalBundles;
    let newNetWeight = existingChallan.totalNetWeightKg;
    let newGrossWeight = existingChallan.totalGrossWeightKg;
    let matchedBundles: BundleRecord[] = [];

    const selectedBundleIds = params.selectedBundleIds || existingChallan.selectedBundleIds || [];
    if (params.selectedBundleIds && job.bundles && job.bundles.length > 0) {
      matchedBundles = job.bundles.filter(b => params.selectedBundleIds!.includes(b.id));
      if (matchedBundles.length > 0) {
        newNetWeight = Number(matchedBundles.reduce((s, b) => s + b.netWeightKg, 0).toFixed(1));
        newGrossWeight = Number(matchedBundles.reduce((s, b) => s + b.grossWeightKg, 0).toFixed(1));
        newDispatchWeight = newNetWeight;
        newBundlesCount = matchedBundles.length;
      }
    }

    const driveFileName = `${newChallanNo.replace(/[\/\-]/g, '_')}_${job.customerName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    const drivePath = `${COMPANY_INFO.driveStorageFolder}/${driveFileName}`;
    const newChallanId = 'dc-rev-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);

    // Audit snapshot of the superseded revision
    const supersededSnapshot: ChallanRevisionRecord = {
      version: existingChallan.version || 1,
      revisionLabel: existingChallan.revisionLabel || 'Original',
      challanNo: existingChallan.challanNo,
      revisedAt: nowIso,
      revisedBy: params.revisedBy || 'Production & Dispatch Manager',
      reason: params.reason,
      vehicleNo: existingChallan.vehicleNo,
      transporterName: existingChallan.transporterName,
      thisDispatchWeightKg: existingChallan.thisDispatchWeightKg,
      totalBundles: existingChallan.totalBundles,
      selectedBundleIds: existingChallan.selectedBundleIds,
      notes: existingChallan.revisionReason,
    };

    const existingHistory = existingChallan.revisionHistory || [];

    const revisedChallan: DeliveryChallan = {
      ...existingChallan,
      id: newChallanId,
      challanNo: newChallanNo,
      challanDate: todayStr,
      version: newVersion,
      revisionLabel,
      isLatest: true,
      isSuperseded: false,
      amendedFromChallanId: existingChallan.id,
      revisionReason: params.reason,
      revisedAt: nowIso,
      revisedBy: params.revisedBy || 'Production & Dispatch Manager',
      revisionHistory: [...existingHistory, supersededSnapshot],
      vehicleNo: newVehicleNo,
      transporterName: newTransporter,
      driverPhone: newDriverPhone,
      eWayBillNo: newEwb,
      thisDispatchWeightKg: newDispatchWeight,
      totalBundles: newBundlesCount,
      totalNetWeightKg: newNetWeight,
      totalGrossWeightKg: newGrossWeight,
      selectedBundleIds: selectedBundleIds.length > 0 ? selectedBundleIds : undefined,
      drivePath,
      driveSavedAt: nowIso,
      items: existingChallan.items.map(item => ({
        ...item,
        dispatchedWeightKg: newDispatchWeight,
        bundlesCount: newBundlesCount,
        remarks: params.remarks || item.remarks,
      })),
      terms: [
        ...existingChallan.terms.filter(t => !t.startsWith('AMENDED REVISION')),
        `AMENDED REVISION ${revisionNumber} (Supersedes ${existingChallan.challanNo} dated ${existingChallan.challanDate}). Audit Reason: ${params.reason}`,
      ],
    };

    setJobs(prev =>
      prev.map(j => {
        if (j.id !== jobId) return j;

        // Mark the previous version as superseded
        const updatedChallans = (j.challans || []).map(c => {
          if (c.id === challanId) {
            return {
              ...c,
              isLatest: false,
              isSuperseded: true,
              supersededByChallanId: newChallanId,
            };
          }
          return c;
        });

        // Add the new revised challan
        updatedChallans.push(revisedChallan);

        // Reconcile dispatched bundle references
        const updatedBundles = (j.bundles || []).map(b => {
          if (selectedBundleIds.includes(b.id)) {
            return {
              ...b,
              status: 'dispatched' as const,
              dispatchedInChallanId: newChallanId,
              dispatchedInChallanNo: newChallanNo,
            };
          } else if (b.dispatchedInChallanId === challanId) {
            // Bundle was in previous version but removed in this revision: release back to floor
            return {
              ...b,
              status: 'ready' as const,
              dispatchedInChallanId: undefined,
              dispatchedInChallanNo: undefined,
            };
          }
          return b;
        });

        // Recalculate dispatched weight based on latest active challans
        const activeChallans = updatedChallans.filter(c => !c.isSuperseded);
        const totalDispatched = activeChallans.reduce((sum, c) => sum + c.thisDispatchWeightKg, 0);
        const remaining = Math.max(0, j.incomingWeight - totalDispatched);

        return {
          ...j,
          challans: updatedChallans,
          challan: revisedChallan,
          bundles: updatedBundles,
          dispatchedWeightKg: totalDispatched,
          remainingWeightKg: remaining,
          updatedAt: nowIso,
        };
      })
    );

    addNotification(
      job.id,
      job.jobNo,
      job.customerId,
      job.customerName,
      'challan_revised',
      `Challan Amended: ${newChallanNo} (${revisionLabel})`,
      `Challan ${existingChallan.challanNo} was amended to ${revisionLabel}. Reason: "${params.reason}". Full revision trail preserved.`
    );

    return revisedChallan;
  };

  const updateDeliveryChallan = (
    jobId: string,
    challanId: string,
    updates: Partial<DeliveryChallan>
  ) => {
    const nowIso = new Date().toISOString();
    setJobs(prev =>
      prev.map(job => {
        if (job.id !== jobId) return job;
        
        let targetChallanNo = '';
        const challans = (job.challans || []).map(ch => {
          if (ch.id !== challanId) return ch;
          targetChallanNo = ch.challanNo;

          let updatedDispatchedBundles = ch.dispatchedBundles;
          if (updates.selectedBundleIds !== undefined) {
            const matched = (job.bundles || []).filter(b => updates.selectedBundleIds!.includes(b.id));
            updatedDispatchedBundles = matched.map(b => ({
              ...b,
              status: 'dispatched' as const,
              dispatchedInChallanId: challanId,
              dispatchedInChallanNo: ch.challanNo,
            }));
          }

          const updated: DeliveryChallan = {
            ...ch,
            ...updates,
            dispatchedBundles: updatedDispatchedBundles,
          };
          if (updates.thisDispatchWeightKg !== undefined) {
            updated.thisDispatchWeightKg = updates.thisDispatchWeightKg;
            if (updated.items && updated.items[0]) {
              updated.items[0].dispatchedWeightKg = updates.thisDispatchWeightKg;
            }
          }
          if (updates.totalBundles !== undefined && updated.items && updated.items[0]) {
            updated.items[0].bundlesCount = updates.totalBundles;
          }
          return updated;
        });

        // Reconcile job bundles if selectedBundleIds was updated
        let updatedBundles = job.bundles;
        if (updates.selectedBundleIds !== undefined) {
          const selectedSet = new Set(updates.selectedBundleIds);
          updatedBundles = (job.bundles || []).map(b => {
            if (selectedSet.has(b.id)) {
              return {
                ...b,
                status: 'dispatched' as const,
                dispatchedInChallanId: challanId,
                dispatchedInChallanNo: targetChallanNo || b.dispatchedInChallanNo,
              };
            } else if (b.dispatchedInChallanId === challanId) {
              // Unchecked bundle - return to shop floor
              return {
                ...b,
                status: 'ready' as const,
                dispatchedInChallanId: undefined,
                dispatchedInChallanNo: undefined,
              };
            }
            return b;
          });
        }

        const newTotalDispatched = challans.reduce((sum, c) => sum + (c.thisDispatchWeightKg || 0), 0);
        const newRemaining = Math.max(0, job.incomingWeight - newTotalDispatched);
        const latestChallan = challans[challans.length - 1];

        return {
          ...job,
          challans,
          challan: latestChallan,
          bundles: updatedBundles,
          dispatchedWeightKg: newTotalDispatched,
          remainingWeightKg: newRemaining,
          updatedAt: nowIso,
        };
      })
    );

    addNotification(
      jobId,
      'UPDATE',
      '',
      'Delivery Challan Updated',
      'challan_generated',
      'Delivery Challan Amended',
      `Delivery Challan #${challanId} was successfully updated with modified dispatch parameters.`
    );
  };

  const deleteDeliveryChallan = (jobId: string, challanId: string) => {
    const nowIso = new Date().toISOString();
    setJobs(prev =>
      prev.map(job => {
        if (job.id !== jobId) return job;
        const targetChallan = (job.challans || []).find(c => c.id === challanId);
        if (!targetChallan) return job;

        const updatedChallans = (job.challans || []).filter(c => c.id !== challanId);
        const newTotalDispatched = updatedChallans.reduce((sum, c) => sum + (c.thisDispatchWeightKg || 0), 0);
        const newRemaining = Math.max(0, job.incomingWeight - newTotalDispatched);

        // Restore bundles that were dispatched with this challan
        const updatedBundles = (job.bundles || []).map(b => {
          if (b.dispatchedInChallanId === challanId) {
            return {
              ...b,
              status: 'ready' as const,
              dispatchedInChallanId: undefined,
              dispatchedInChallanNo: undefined,
            };
          }
          return b;
        });

        const newStatus: ProductionStatus =
          newTotalDispatched > 0
            ? 'partially_dispatched'
            : job.outputDetails
            ? 'slitting_completed'
            : 'in_production';

        const newPoStatus = newTotalDispatched > 0 ? 'partially_dispatched' : 'open';

        return {
          ...job,
          challans: updatedChallans,
          challan: updatedChallans[updatedChallans.length - 1] || undefined,
          bundles: updatedBundles,
          dispatchedWeightKg: newTotalDispatched,
          remainingWeightKg: newRemaining,
          status: job.status === 'po_closed' ? 'po_closed' : newStatus,
          poStatus: job.poStatus === 'closed' ? 'closed' : newPoStatus,
          updatedAt: nowIso,
        };
      })
    );

    addNotification(
      jobId,
      'VOID',
      '',
      'Delivery Challan Removed',
      'status_change',
      'Challan Voided & Material Restored',
      `Delivery Challan #${challanId} was deleted. Material weight restored to available floor balance.`
    );
  };

  const saveChallanToDrive = (jobId: string, challanId: string) => {
    const nowIso = new Date().toISOString();
    setJobs(prev =>
      prev.map(job => {
        if (job.id !== jobId) return job;
        const updatedChallans = (job.challans || []).map(ch => {
          if (ch.id === challanId) {
            return {
              ...ch,
              savedToDrive: true,
              driveSavedAt: nowIso,
            };
          }
          return ch;
        });

        return {
          ...job,
          challans: updatedChallans,
          challan: job.challan?.id === challanId
            ? { ...job.challan, savedToDrive: true, driveSavedAt: nowIso }
            : job.challan,
        };
      })
    );
  };

  const sendChallanEmail = (jobId: string, challanId: string, recipientEmail?: string) => {
    const nowIso = new Date().toISOString();
    setJobs(prev =>
      prev.map(job => {
        if (job.id !== jobId) return job;
        const targetEmails = recipientEmail
          ? [recipientEmail]
          : (job.authorizedEmails && job.authorizedEmails.length > 0 ? job.authorizedEmails : [job.customerEmail]);

        const updatedChallans = (job.challans || []).map(ch => {
          if (ch.id === challanId) {
            return {
              ...ch,
              emailSent: true,
              sentToEmails: targetEmails,
              emailSentAt: nowIso,
            };
          }
          return ch;
        });

        return {
          ...job,
          challans: updatedChallans,
          challan: job.challan?.id === challanId
            ? { ...job.challan, emailSent: true, sentToEmails: targetEmails, emailSentAt: nowIso }
            : job.challan,
        };
      })
    );
  };

  // Close PO permanently by Factory Master
  const closeCustomerPo = (
    jobId: string,
    closingNotes: string = 'All material delivered, reconciled, and audited. PO permanently closed.',
    closedBy: string = 'Factory Master (Works Head - R. K. Sharma)'
  ) => {
    const nowIso = new Date().toISOString();
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    setJobs(prev =>
      prev.map(j => {
        if (j.id !== jobId) return j;
        return {
          ...j,
          status: 'po_closed',
          poStatus: 'closed',
          poClosedAt: nowIso,
          poClosedBy: closedBy,
          poClosingNotes: closingNotes || 'All material delivered, reconciled, and audited. PO permanently closed.',
          updatedAt: nowIso,
        };
      })
    );

    addNotification(
      job.id,
      job.jobNo,
      job.customerId,
      job.customerName,
      'po_closed',
      `PO ${job.customerPoNo} Permanently Closed by Factory Master`,
      `${closedBy} has permanently closed Purchase Order ${job.customerPoNo} for ${job.customerName}. Reconciliation: ${job.incomingWeight.toLocaleString()} kg inward raw material fully accounted for across ${job.challans?.length || 1} delivery challan(s).`
    );
  };

  const reopenCustomerPo = (jobId: string, reopenReason: string = 'Reopened by Factory Operations') => {
    const nowIso = new Date().toISOString();
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    setJobs(prev =>
      prev.map(j => {
        if (j.id !== jobId) return j;
        return {
          ...j,
          status: 'ready_for_dispatch',
          poStatus: 'open',
          poClosingNotes: undefined,
          poClosedAt: undefined,
          poClosedBy: undefined,
          updatedAt: nowIso,
        };
      })
    );

    addNotification(
      job.id,
      job.jobNo,
      job.customerId,
      job.customerName,
      'status_change',
      `PO ${job.customerPoNo} Reopened`,
      `Purchase order ${job.customerPoNo} was reopened for further processing / adjustments. Reason: ${reopenReason}`
    );
  };

  // Bundle Weighing & Scale Operations (for Production Manager & Factory Management)
  const addBundleToJob = (
    jobId: string,
    bundleData: {
      rollItems: BundleRollItem[];
      rollsSummary: string;
      totalRollsCount: number;
      grossWeightKg: number;
      coreType: CoreType;
      paperCoreTareWeightKg: number;
      otherPackagingTareKg?: number;
      netWeightKg: number;
      notes?: string;
      weighedBy?: string;
    }
  ): BundleRecord => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) throw new Error('Job not found');

    const nextNumber = (job.bundles?.length || 0) + 1;
    const bundleTag = `BNDL-${String(nextNumber).padStart(2, '0')}`;
    const nowIso = new Date().toISOString();

    const newBundle: BundleRecord = {
      id: 'bndl-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      bundleNumber: nextNumber,
      bundleTag,
      jobId: job.id,
      jobNo: job.jobNo,
      customerPoNo: job.customerPoNo,
      rollItems: bundleData.rollItems,
      rollsSummary: bundleData.rollsSummary,
      totalRollsCount: bundleData.totalRollsCount,
      grossWeightKg: bundleData.grossWeightKg,
      coreType: bundleData.coreType,
      paperCoreTareWeightKg: bundleData.paperCoreTareWeightKg,
      otherPackagingTareKg: bundleData.otherPackagingTareKg || 0,
      netWeightKg: bundleData.netWeightKg,
      status: 'ready',
      weighedAt: nowIso,
      weighedBy: bundleData.weighedBy || 'Sunil Patil (Production & Dispatch Manager)',
      notes: bundleData.notes,
    };

    setJobs(prev =>
      prev.map(j => {
        if (j.id !== jobId) return j;
        const currentBundles = j.bundles || [];
        const updatedStatus: ProductionStatus =
          j.status === 'received' || j.status === 'pending_production' ? 'in_production' : j.status;
        return {
          ...j,
          status: updatedStatus,
          bundles: [...currentBundles, newBundle],
          updatedAt: nowIso,
        };
      })
    );

    addNotification(
      job.id,
      job.jobNo,
      job.customerId,
      job.customerName,
      'bundle_weighed',
      `Bundle ${bundleTag} Weighed: ${newBundle.grossWeightKg} kg Gross (${newBundle.netWeightKg} kg Net)`,
      `Logged bundle ${bundleTag} (${newBundle.rollsSummary}) on weighing scale. Gross: ${newBundle.grossWeightKg} kg, Core type: ${newBundle.coreType === 'paper_core' ? 'Paper Tube' : 'Plastic Tube'}. Net: ${newBundle.netWeightKg} kg. Staged ready on floor.`
    );

    return newBundle;
  };

  const addMultipleBundlesToJob = (
    jobId: string,
    bundlesList: Array<{
      rollItems: BundleRollItem[];
      rollsSummary: string;
      totalRollsCount: number;
      grossWeightKg: number;
      coreType: CoreType;
      paperCoreTareWeightKg: number;
      otherPackagingTareKg?: number;
      netWeightKg: number;
      notes?: string;
      weighedBy?: string;
    }>
  ) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return [];
    const nowIso = new Date().toISOString();
    let currentCount = job.bundles?.length || 0;

    const newRecords: BundleRecord[] = bundlesList.map(bData => {
      currentCount += 1;
      const bundleTag = `BNDL-${String(currentCount).padStart(2, '0')}`;
      return {
        id: 'bndl-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6) + '-' + currentCount,
        bundleNumber: currentCount,
        bundleTag,
        jobId: job.id,
        jobNo: job.jobNo,
        customerPoNo: job.customerPoNo,
        rollItems: bData.rollItems,
        rollsSummary: bData.rollsSummary,
        totalRollsCount: bData.totalRollsCount,
        grossWeightKg: bData.grossWeightKg,
        coreType: bData.coreType,
        paperCoreTareWeightKg: bData.paperCoreTareWeightKg,
        otherPackagingTareKg: bData.otherPackagingTareKg || 0,
        netWeightKg: bData.netWeightKg,
        status: 'ready',
        weighedAt: nowIso,
        weighedBy: bData.weighedBy || 'Sunil Patil (Production & Dispatch Manager)',
        notes: bData.notes,
      };
    });

    setJobs(prev =>
      prev.map(j => {
        if (j.id !== jobId) return j;
        const currentBundles = j.bundles || [];
        const updatedStatus: ProductionStatus =
          j.status === 'received' || j.status === 'pending_production' ? 'in_production' : j.status;
        return {
          ...j,
          status: updatedStatus,
          bundles: [...currentBundles, ...newRecords],
          updatedAt: nowIso,
        };
      })
    );

    const totalBatchNet = Number(newRecords.reduce((s, b) => s + b.netWeightKg, 0).toFixed(1));
    addNotification(
      job.id,
      job.jobNo,
      job.customerId,
      job.customerName,
      'bundle_weighed',
      `Batch Weighing: ${newRecords.length} Bundles Recorded (${totalBatchNet} kg Net)`,
      `Production scale recorded ${newRecords.length} bundles for PO ${job.customerPoNo}. Total net weight: ${totalBatchNet} kg. Staged on shop floor ready for dispatch.`
    );
    return newRecords;
  };

  const deleteBundleFromJob = (jobId: string, bundleId: string) => {
    setJobs(prev =>
      prev.map(j => {
        if (j.id !== jobId) return j;
        return {
          ...j,
          bundles: (j.bundles || []).filter(b => b.id !== bundleId),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const updateBundleInJob = (jobId: string, bundleId: string, updates: Partial<BundleRecord>) => {
    setJobs(prev =>
      prev.map(j => {
        if (j.id !== jobId) return j;
        return {
          ...j,
          bundles: (j.bundles || []).map(b => (b.id === bundleId ? { ...b, ...updates } : b)),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const editBundleInJob = (
    jobId: string,
    bundleId: string,
    updates: {
      grossWeightKg: number;
      coreType: CoreType;
      paperCoreTareWeightKg: number;
      rollsSummary?: string;
      totalRollsCount?: number;
      notes?: string;
      reason: string;
      editedBy?: string;
    }
  ) => {
    const nowIso = new Date().toISOString();
    setJobs(prev =>
      prev.map(j => {
        if (j.id !== jobId) return j;
        const targetBundle = (j.bundles || []).find(b => b.id === bundleId);
        if (!targetBundle) return j;

        const tare = updates.coreType === 'paper_core' ? Number(updates.paperCoreTareWeightKg) : 0;
        const newNet = Number((updates.grossWeightKg - tare).toFixed(2));

        const editRecord: BundleEditRecord = {
          editedAt: nowIso,
          editedBy: updates.editedBy || 'Sunil Patil (Production Manager)',
          reason: updates.reason,
          previousGross: targetBundle.grossWeightKg,
          newGross: updates.grossWeightKg,
          previousNet: targetBundle.netWeightKg,
          newNet,
          previousCoreType: targetBundle.coreType,
          newCoreType: updates.coreType,
        };

        const updatedBundles = (j.bundles || []).map(b => {
          if (b.id !== bundleId) return b;
          return {
            ...b,
            grossWeightKg: updates.grossWeightKg,
            coreType: updates.coreType,
            paperCoreTareWeightKg: tare,
            netWeightKg: newNet,
            rollsSummary: updates.rollsSummary || b.rollsSummary,
            totalRollsCount: updates.totalRollsCount !== undefined ? updates.totalRollsCount : b.totalRollsCount,
            notes: updates.notes || b.notes,
            editHistory: [...(b.editHistory || []), editRecord],
          };
        });

        return {
          ...j,
          bundles: updatedBundles,
          updatedAt: nowIso,
        };
      })
    );
  };

  const voidBundleInJob = (jobId: string, bundleId: string, reason: string, voidedBy?: string) => {
    const nowIso = new Date().toISOString();
    setJobs(prev =>
      prev.map(j => {
        if (j.id !== jobId) return j;
        return {
          ...j,
          bundles: (j.bundles || []).map(b => {
            if (b.id !== bundleId) return b;
            return {
              ...b,
              isVoided: true,
              voidReason: reason,
              voidedAt: nowIso,
              voidedBy: voidedBy || 'Sunil Patil (Production Manager)',
              status: 'ready' as const,
            };
          }),
          updatedAt: nowIso,
        };
      })
    );
  };

  const requestSpecChange = (
    jobId: string,
    data: {
      requestedSpecs: {
        slitWidthMm?: number;
        targetBundleWeightKg?: number;
        unitsPerBundle?: number;
        unitType?: 'reels' | 'reams';
        customerInstructions: string;
      };
      reason: string;
      requestedByEmail: string;
    }
  ) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    const nowIso = new Date().toISOString();
    const requestId = 'req-' + Date.now();
    const newRequest: SpecChangeRequest = {
      id: requestId,
      jobId,
      jobNo: job.jobNo,
      customerPoNo: job.customerPoNo,
      customerId: job.customerId,
      customerName: job.customerName,
      requestedByEmail: data.requestedByEmail,
      requestedAt: nowIso,
      originalSpecs: {
        slitWidthMm: job.bundleSpecs ? (job.outputDetails?.slitCuts?.[0]?.widthMm || 20) : 20,
        targetBundleWeightKg: job.bundleSpecs?.targetBundleWeightKg || 25,
        unitsPerBundle: job.bundleSpecs?.unitsPerBundle || 10,
        unitType: job.bundleSpecs?.unitType || 'reels',
        customerInstructions: job.customerInstructions,
      },
      requestedSpecs: data.requestedSpecs,
      reason: data.reason,
      status: 'pending_approval',
    };

    setJobs(prev =>
      prev.map(j => {
        if (j.id !== jobId) return j;
        return {
          ...j,
          specChangeRequests: [...(j.specChangeRequests || []), newRequest],
          updatedAt: nowIso,
        };
      })
    );

    addNotification(
      job.id,
      job.jobNo,
      job.customerId,
      job.customerName,
      'spec_change_requested',
      `Spec Change Requested: PO ${job.customerPoNo}`,
      `Customer requested spec amendment (${data.reason}). Awaiting factory review.`
    );
  };

  const approveSpecChange = (jobId: string, requestId: string, reviewNote: string, reviewedBy?: string) => {
    const nowIso = new Date().toISOString();
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    setJobs(prev =>
      prev.map(j => {
        if (j.id !== jobId) return j;
        const targetReq = (j.specChangeRequests || []).find(r => r.id === requestId);
        if (!targetReq) return j;

        const updatedRequests = (j.specChangeRequests || []).map(r => {
          if (r.id !== requestId) return r;
          return {
            ...r,
            status: 'approved' as const,
            reviewedAt: nowIso,
            reviewedBy: reviewedBy || 'Factory Operations Master',
            reviewNote,
          };
        });

        const updatedBundleSpecs: BundleSpecifications = {
          ...j.bundleSpecs,
          targetBundleWeightKg: targetReq.requestedSpecs.targetBundleWeightKg || j.bundleSpecs?.targetBundleWeightKg || 25,
          unitsPerBundle: targetReq.requestedSpecs.unitsPerBundle || j.bundleSpecs?.unitsPerBundle || 10,
          unitType: targetReq.requestedSpecs.unitType || j.bundleSpecs?.unitType || 'reels',
        };

        return {
          ...j,
          customerInstructions: targetReq.requestedSpecs.customerInstructions || j.customerInstructions,
          bundleSpecs: updatedBundleSpecs,
          specChangeRequests: updatedRequests,
          updatedAt: nowIso,
        };
      })
    );

    addNotification(
      job.id,
      job.jobNo,
      job.customerId,
      job.customerName,
      'spec_change_approved',
      `Spec Change APPROVED for PO ${job.customerPoNo}`,
      `Factory Master approved the specification change. Note: "${reviewNote}". Shop floor instructions updated.`
    );
  };

  const rejectSpecChange = (jobId: string, requestId: string, rejectionReason: string, reviewedBy?: string) => {
    const nowIso = new Date().toISOString();
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    setJobs(prev =>
      prev.map(j => {
        if (j.id !== jobId) return j;
        const updatedRequests = (j.specChangeRequests || []).map(r => {
          if (r.id !== requestId) return r;
          return {
            ...r,
            status: 'rejected' as const,
            reviewedAt: nowIso,
            reviewedBy: reviewedBy || 'Factory Operations Master',
            reviewNote: rejectionReason,
          };
        });

        return {
          ...j,
          specChangeRequests: updatedRequests,
          updatedAt: nowIso,
        };
      })
    );

    addNotification(
      job.id,
      job.jobNo,
      job.customerId,
      job.customerName,
      'spec_change_rejected',
      `Spec Change DECLINED for PO ${job.customerPoNo}`,
      `Factory could not accommodate change request. Reason: "${rejectionReason}". Existing specifications remain active.`
    );
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const resetToSampleData = () => {
    setJobs(INITIAL_JOBS);
    setCustomers(INITIAL_CUSTOMERS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setFactoryUsers(INITIAL_FACTORY_USERS);
    setActiveFactoryUserId(INITIAL_FACTORY_USERS[0].id);
    setAuthenticatedEmail(null);
    localStorage.removeItem(STORAGE_KEY_JOBS);
    localStorage.removeItem(STORAGE_KEY_CUSTOMERS);
    localStorage.removeItem(STORAGE_KEY_NOTIFS);
    localStorage.removeItem(STORAGE_KEY_AUTH_EMAIL);
    localStorage.removeItem(STORAGE_KEY_FACTORY_USERS);
    localStorage.removeItem(STORAGE_KEY_ACTIVE_FACTORY_USER);
  };

  const getJobById = (id: string) => {
    return jobs.find(j => j.id === id);
  };

  return (
    <ProductionContext.Provider
      value={{
        jobs,
        customers,
        notifications,
        activeRole,
        setActiveRole,
        selectedCustomerId,
        setSelectedCustomerId,
        factoryUsers,
        activeFactoryUser,
        loginFactoryUser,
        logoutFactoryUser,
        addFactoryUser,
        updateFactoryUser,
        deleteFactoryUser,
        authenticatedEmail,
        loginCustomerByEmail,
        loginCustomerByAccessCode,
        logoutCustomer,
        addCustomer,
        registerCustomer,
        updateCustomer,
        addAuthorizedEmail,
        removeAuthorizedEmail,
        addInwardMaterial,
        updateJobStatus,
        updateEstimatedDeliveryDate,
        recordSlittingOutput,
        generateDeliveryChallan,
        reviseDeliveryChallan,
        updateDeliveryChallan,
        deleteDeliveryChallan,
        saveChallanToDrive,
        sendChallanEmail,
        driveWebLink,
        setDriveWebLink,
        addBundleToJob,
        addMultipleBundlesToJob,
        deleteBundleFromJob,
        updateBundleInJob,
        editBundleInJob,
        voidBundleInJob,
        requestSpecChange,
        approveSpecChange,
        rejectSpecChange,
        closeCustomerPo,
        reopenCustomerPo,
        markNotificationRead,
        markAllNotificationsRead,
        resetToSampleData,
        getJobById,
      }}
    >
      {children}
    </ProductionContext.Provider>
  );
};

export const useProduction = () => {
  const context = useContext(ProductionContext);
  if (!context) {
    throw new Error('useProduction must be used within a ProductionProvider');
  }
  return context;
};
