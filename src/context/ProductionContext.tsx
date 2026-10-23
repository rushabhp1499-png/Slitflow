import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
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
  INITIAL_FACTORY_USERS,
} from '../data/mockData';
import { supabase, getSupabase, errorMessage } from '../lib/supabase';
import { TableSync, SyncedRow } from '../lib/tableSync';

type AuthResult = { success: boolean; message: string };

interface Account {
  role: 'staff' | 'customer';
  customerId: string | null;
}

export interface LocalImportSummary {
  jobs: number;
  customers: number;
}

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
  
  // Database connection & sign-in state
  authLoading: boolean;
  dataLoading: boolean;
  signedInEmail: string | null;
  syncError: string | null;
  clearSyncError: () => void;
  localImport: LocalImportSummary | null;
  importLocalBrowserData: () => Promise<AuthResult>;
  dismissLocalImport: () => void;

  // Factory staff authentication (emails listed in the staff_emails table)
  isFactoryAuthenticated: boolean;
  loginFactory: (email: string, password: string) => Promise<AuthResult>;
  logoutFactory: () => void;
  factoryUsers: FactoryUser[];
  activeFactoryUser: FactoryUser | null;
  loginFactoryUser: (userIdOrPinOrEmail: string) => { success: boolean; user?: FactoryUser; message: string };
  logoutFactoryUser: () => void;
  addFactoryUser: (userData: Omit<FactoryUser, 'id'>) => FactoryUser;
  updateFactoryUser: (userId: string, updates: Partial<FactoryUser>) => void;
  deleteFactoryUser: (userId: string) => void;

  // Customer Session & Portal Authentication
  authenticatedEmail: string | null;
  currentCustomer: Customer | null;
  loginCustomerByEmail: (email: string, password: string) => Promise<AuthResult>;
  sendPasswordReset: (email: string) => Promise<AuthResult>;
  passwordRecovery: boolean;
  completePasswordReset: (newPassword: string) => Promise<AuthResult>;
  logoutCustomer: () => void;
  logoutAll: () => void;

  // Customer Management
  addCustomer: (customerData: Omit<Customer, 'id'>) => Customer;
  registerCustomer: (customerData: Omit<Customer, 'id' | 'accessCode'>) => Promise<AuthResult>;
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
  getJobById: (id: string) => MaterialInward | undefined;
}

// Keys used by the old browser-only version. Only read once, to offer importing them.
const LEGACY_KEY_JOBS = 'progressive_enterprises_jobs_v4';
const LEGACY_KEY_CUSTOMERS = 'progressive_enterprises_customers_v4';
const LEGACY_KEY_IMPORT_DONE = 'slitflow_legacy_import_done_v1';
const DEFAULT_DRIVE_URL = 'https://drive.google.com/drive/my-drive';

const SAMPLE_JOB_IDS = new Set(INITIAL_JOBS.map(j => j.id));
const SAMPLE_CUSTOMER_IDS = new Set(INITIAL_CUSTOMERS.map(c => c.id));

const stripPassword = (c: Customer): Customer => {
  const { password: _password, ...rest } = c;
  return rest as Customer;
};

const readLegacyData = (): { jobs: MaterialInward[]; customers: Customer[] } | null => {
  try {
    if (localStorage.getItem(LEGACY_KEY_IMPORT_DONE)) return null;
    const rawJobs = localStorage.getItem(LEGACY_KEY_JOBS);
    const rawCustomers = localStorage.getItem(LEGACY_KEY_CUSTOMERS);
    if (!rawJobs && !rawCustomers) return null;
    const jobs: MaterialInward[] = (rawJobs ? JSON.parse(rawJobs) : []).filter(
      (j: MaterialInward) => j && j.id && !SAMPLE_JOB_IDS.has(j.id)
    );
    const usedCustomerIds = new Set(jobs.map(j => j.customerId));
    const customers: Customer[] = (rawCustomers ? JSON.parse(rawCustomers) : []).filter(
      (c: Customer) => c && c.id && (!SAMPLE_CUSTOMER_IDS.has(c.id) || usedCustomerIds.has(c.id))
    );
    if (jobs.length === 0 && customers.length === 0) return null;
    return { jobs, customers };
  } catch {
    return null;
  }
};

const ProductionContext = createContext<ProductionContextType | undefined>(undefined);

export const ProductionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ---------------------------------------------------------------------
  // Sign-in state (Supabase Auth)
  // ---------------------------------------------------------------------
  const [authLoading, setAuthLoading] = useState<boolean>(!!supabase);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [localImport, setLocalImport] = useState<LocalImportSummary | null>(null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const isFactoryAuthenticated = account?.role === 'staff';
  const authenticatedEmail = account?.role === 'customer' ? signedInEmail : null;

  // ---------------------------------------------------------------------
  // Data (loaded from the database after sign-in)
  // ---------------------------------------------------------------------
  const [jobs, setJobs] = useState<MaterialInward[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Factory staff badges are not stored in the database yet; kept in memory.
  const [factoryUsers, setFactoryUsers] = useState<FactoryUser[]>(INITIAL_FACTORY_USERS);
  const [activeFactoryUserId, setActiveFactoryUserId] = useState<string | null>(INITIAL_FACTORY_USERS[0]?.id || null);

  const [activeRoleState, setActiveRole] = useState<'factory' | 'customer'>('factory');
  const activeRole: 'factory' | 'customer' = account?.role === 'customer' ? 'customer' : activeRoleState;

  const [selectedCustomerIdState, setSelectedCustomerId] = useState<string>('');
  const selectedCustomerId =
    account?.role === 'customer' && account.customerId ? account.customerId : selectedCustomerIdState;

  const [driveWebLink, setDriveWebLinkState] = useState<string>(DEFAULT_DRIVE_URL);
  const setDriveWebLink = (url: string) => setDriveWebLinkState(url.trim() || DEFAULT_DRIVE_URL);

  const reportSyncError = useCallback((message: string) => {
    console.error(message);
    setSyncError(message);
  }, []);
  const clearSyncError = () => setSyncError(null);

  // Latest values for the sync helpers, which run outside React renders.
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;
  const customersRef = useRef(customers);
  customersRef.current = customers;
  const accountRef = useRef(account);
  accountRef.current = account;

  const jobsSync = useRef(
    new TableSync<MaterialInward>({
      table: 'jobs',
      toColumns: job => ({ customer_id: job.customerId }),
      getLocal: () => jobsRef.current,
      setLocal: updater => setJobs(updater),
      canInsert: () => !!accountRef.current,
      canUpdate: () => accountRef.current?.role === 'staff',
      onError: reportSyncError,
    })
  ).current;

  const customersSync = useRef(
    new TableSync<Customer>({
      table: 'customers',
      toColumns: () => ({}),
      prepare: stripPassword,
      getLocal: () => customersRef.current,
      setLocal: updater => setCustomers(updater),
      canInsert: () => accountRef.current?.role === 'staff',
      canUpdate: () => accountRef.current?.role === 'staff',
      onError: reportSyncError,
    })
  ).current;

  // Asks the database which role this login has (creating the customer
  // company on the first sign-in after registration). Sign-in and the session
  // listener both ask at the same moment, so they share one request.
  const linkRequestRef = useRef<{ userId: string; promise: Promise<Account | null> } | null>(null);
  const linkAccount = (userId: string): Promise<Account | null> => {
    if (linkRequestRef.current?.userId === userId) return linkRequestRef.current.promise;
    const promise = (async () => {
      const { data, error } = await getSupabase().rpc('link_my_account');
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;
      return { role: row.account_role, customerId: row.account_customer_id } as Account;
    })();
    linkRequestRef.current = { userId, promise };
    // Ask again next time if this attempt failed or found no company.
    promise.then(
      acc => {
        if (!acc && linkRequestRef.current?.promise === promise) linkRequestRef.current = null;
      },
      () => {
        if (linkRequestRef.current?.promise === promise) linkRequestRef.current = null;
      }
    );
    return promise;
  };

  // Follow the Supabase session (restored on page load, sign-in, sign-out).
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSessionUserId(data.session?.user.id || null);
      setSignedInEmail(data.session?.user.email?.toLowerCase() || null);
      if (!data.session) setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      setSessionUserId(session?.user.id || null);
      setSignedInEmail(session?.user.email?.toLowerCase() || null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Resolve the role whenever a different user is signed in.
  useEffect(() => {
    if (!supabase) return;
    if (!sessionUserId) {
      linkRequestRef.current = null;
      setAccount(null);
      setAuthLoading(false);
      return;
    }
    let cancelled = false;
    setAuthLoading(true);
    linkAccount(sessionUserId)
      .then(acc => {
        if (cancelled) return;
        if (!acc) {
          reportSyncError(
            'This email is not linked to any company yet. Ask Progressive Enterprises to add your email to your company, or create a new account.'
          );
          void supabase!.auth.signOut();
        }
        setAccount(acc);
      })
      .catch(e => {
        if (cancelled) return;
        reportSyncError(errorMessage(e));
        setAccount(null);
        void supabase!.auth.signOut();
      })
      .finally(() => {
        if (!cancelled) setAuthLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionUserId]);

  // Load everything this login may see, then subscribe to live changes.
  useEffect(() => {
    if (!supabase) return;
    jobsSync.reset();
    customersSync.reset();
    if (!account) {
      setJobs([]);
      setCustomers([]);
      setNotifications([]);
      setLocalImport(null);
      return;
    }

    let cancelled = false;
    const sb = supabase;
    setDataLoading(true);

    const load = async () => {
      const [jobsRes, customersRes, notifsRes] = await Promise.all([
        sb.from('jobs').select('id, data, updated_at').order('created_at', { ascending: false }),
        sb.from('customers').select('id, data, updated_at').order('created_at', { ascending: true }),
        sb.from('notifications').select('id, data').order('created_at', { ascending: false }).limit(300),
      ]);
      if (cancelled) return;
      const firstError = jobsRes.error || customersRes.error || notifsRes.error;
      if (firstError) {
        reportSyncError(`Could not load data from the database: ${errorMessage(firstError)}`);
      }
      setJobs(jobsSync.seed((jobsRes.data || []) as SyncedRow<MaterialInward>[]));
      setCustomers(customersSync.seed((customersRes.data || []) as SyncedRow<Customer>[]));
      setNotifications(((notifsRes.data || []) as { data: AppNotification }[]).map(r => r.data));
      if (account.role === 'customer' && account.customerId) {
        setSelectedCustomerId(account.customerId);
      } else if (customersRes.data && customersRes.data.length > 0) {
        setSelectedCustomerId(prev => prev || (customersRes.data![0] as SyncedRow<Customer>).id);
      }
      if (account.role === 'staff') {
        const legacy = readLegacyData();
        setLocalImport(legacy ? { jobs: legacy.jobs.length, customers: legacy.customers.length } : null);
      }
      setDataLoading(false);
    };
    void load();

    const channel = sb
      .channel(`slitflow-live-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, payload => {
        const id = ((payload.new as { id?: string }) || {}).id || ((payload.old as { id?: string }) || {}).id;
        if (id) jobsSync.receiveRemote(id);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, payload => {
        const id = ((payload.new as { id?: string }) || {}).id || ((payload.old as { id?: string }) || {}).id;
        if (id) customersSync.receiveRemote(id);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, payload => {
        const row = payload.new as { id?: string; data?: AppNotification };
        if (!row?.id || !row.data) return;
        const incoming = row.data;
        setNotifications(prev => {
          const idx = prev.findIndex(n => n.id === incoming.id);
          if (idx === -1) return [incoming, ...prev];
          const next = prev.slice();
          next[idx] = incoming;
          return next;
        });
      })
      .subscribe();

    return () => {
      cancelled = true;
      void sb.removeChannel(channel);
    };
  }, [account?.role, account?.customerId]);

  // Save every local change to the database.
  useEffect(() => {
    if (account && !dataLoading) jobsSync.syncAll();
  }, [jobs, account, dataLoading]);

  useEffect(() => {
    if (account && !dataLoading) customersSync.syncAll();
  }, [customers, account, dataLoading]);

  const activeFactoryUser = factoryUsers.find(u => u.id === activeFactoryUserId) || null;

  const currentCustomer = React.useMemo<Customer | null>(() => {
    if (account?.role === 'customer') {
      return customers.find(c => c.id === account.customerId) || null;
    }
    if (selectedCustomerId) {
      return customers.find(c => c.id === selectedCustomerId) || null;
    }
    return null;
  }, [customers, account, selectedCustomerId]);

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
    if (supabase && accountRef.current) {
      void supabase
        .from('notifications')
        .insert({ id: newNotif.id, customer_id: customerId || null, data: newNotif })
        .then(({ error }) => {
          if (error) console.error('Failed to save notification', error);
        });
    }
  };

  // Signs in with Supabase Auth and checks which role the login has.
  const signIn = async (email: string, password: string): Promise<Account | AuthResult> => {
    if (!supabase) return { success: false, message: 'The database is not configured yet (missing .env settings).' };
    setSyncError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) {
      const msg = /confirm/i.test(error.message)
        ? 'Please confirm your email first - open the confirmation link we emailed you, then sign in.'
        : 'Incorrect email or password.';
      return { success: false, message: msg };
    }
    try {
      const acc = await linkAccount(data.user.id);
      if (!acc) {
        await supabase.auth.signOut();
        return {
          success: false,
          message: 'This email is not linked to any company yet. Ask Progressive Enterprises to add your email, or create a new account.',
        };
      }
      setSessionUserId(data.user.id);
      setAccount(acc);
      return acc;
    } catch (e) {
      await supabase.auth.signOut();
      return { success: false, message: errorMessage(e) };
    }
  };

  const loginFactory = async (email: string, pass: string): Promise<AuthResult> => {
    const res = await signIn(email, pass);
    if ('success' in res) return res;
    if (res.role !== 'staff') {
      await supabase!.auth.signOut();
      return {
        success: false,
        message: 'Access Denied: this is a customer account. Please use the Customer Portal tab to sign in.',
      };
    }
    setActiveRole('factory');
    return { success: true, message: 'Factory access authorized. Welcome to Progressive Enterprises Dashboard.' };
  };

  const loginCustomerByEmail = async (email: string, password: string): Promise<AuthResult> => {
    const res = await signIn(email, password);
    if ('success' in res) return res;
    if (res.role === 'staff') {
      setActiveRole('factory');
      return { success: true, message: 'Signed in with a factory account - opening the factory dashboard.' };
    }
    return { success: true, message: 'Welcome back!' };
  };

  const sendPasswordReset = async (email: string): Promise<AuthResult> => {
    if (!supabase) return { success: false, message: 'The database is not configured yet.' };
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: window.location.origin,
    });
    if (error) return { success: false, message: errorMessage(error) };
    return { success: true, message: `If ${email.trim()} has an account, a password reset link has been emailed to it.` };
  };

  const completePasswordReset = async (newPassword: string): Promise<AuthResult> => {
    if (!supabase) return { success: false, message: 'The database is not configured yet.' };
    if (newPassword.length < 6) return { success: false, message: 'Password must be at least 6 characters long.' };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { success: false, message: errorMessage(error) };
    setPasswordRecovery(false);
    return { success: true, message: 'Your password has been changed.' };
  };

  const signOutEverywhere = () => {
    linkRequestRef.current = null;
    setAccount(null);
    setSessionUserId(null);
    setSignedInEmail(null);
    if (supabase) void supabase.auth.signOut();
  };

  const logoutFactory = signOutEverywhere;
  const logoutAll = signOutEverywhere;
  const logoutCustomer = signOutEverywhere;

  // Customer self-registration. The company is created by the database on
  // the first sign-in, after the email address has been confirmed.
  const registerCustomer: ProductionContextType['registerCustomer'] = async (customerData) => {
    if (!supabase) return { success: false, message: 'The database is not configured yet.' };
    if (!customerData.companyName || !customerData.companyName.trim()) {
      return { success: false, message: 'Entering a Company Name is strictly compulsory to create an account.' };
    }
    if (!customerData.password || customerData.password.trim().length < 6) {
      return { success: false, message: 'Password is compulsory and must be at least 6 characters long.' };
    }

    const cleanEmail = customerData.email.trim().toLowerCase();
    setSyncError(null);
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: customerData.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          companyName: customerData.companyName.trim(),
          contactPerson: customerData.contactPerson || '',
          phone: customerData.phone || '',
          gstNumber: customerData.gstNumber || '',
          registeredAddress: customerData.registeredAddress || '',
          plantAddress: customerData.plantAddress || '',
          city: customerData.city || '',
          state: customerData.state || '',
          stateCode: customerData.stateCode || '',
        },
      },
    });
    if (error) return { success: false, message: errorMessage(error) };

    if (data.session) {
      // Email confirmation is switched off in Supabase: signed in straight away.
      try {
        const acc = await linkAccount(data.session.user.id);
        setSessionUserId(data.session.user.id);
        setAccount(acc);
        return { success: true, message: `Account created for ${customerData.companyName.trim()}!` };
      } catch (e) {
        return { success: false, message: errorMessage(e) };
      }
    }

    return {
      success: true,
      message: `Almost done! We've emailed a confirmation link to ${cleanEmail}. Click it, then sign in here with your email and password.`,
    };
  };

  // One-time copy of records saved in this browser by the old version.
  const importLocalBrowserData = async (): Promise<AuthResult> => {
    if (!supabase || account?.role !== 'staff') return { success: false, message: 'Only factory staff can import.' };
    const legacy = readLegacyData();
    if (!legacy) {
      setLocalImport(null);
      return { success: true, message: 'Nothing to import.' };
    }
    if (legacy.customers.length > 0) {
      const { error } = await supabase.from('customers').upsert(
        legacy.customers.map(c => ({ id: c.id, data: stripPassword(c) })),
        { onConflict: 'id', ignoreDuplicates: true }
      );
      if (error) return { success: false, message: `Import failed (customers): ${errorMessage(error)}` };
    }
    if (legacy.jobs.length > 0) {
      const { error } = await supabase.from('jobs').upsert(
        legacy.jobs.map(j => ({ id: j.id, customer_id: j.customerId, data: j })),
        { onConflict: 'id', ignoreDuplicates: true }
      );
      if (error) return { success: false, message: `Import failed (orders): ${errorMessage(error)}` };
    }
    const { error: seqError } = await supabase.rpc('sync_number_sequences');
    if (seqError) console.error('Failed to update number counters', seqError);
    try {
      localStorage.setItem(LEGACY_KEY_IMPORT_DONE, new Date().toISOString());
    } catch {
      // ignore
    }
    setLocalImport(null);
    // Reload everything from the database.
    const [jobsRes, customersRes] = await Promise.all([
      supabase.from('jobs').select('id, data, updated_at').order('created_at', { ascending: false }),
      supabase.from('customers').select('id, data, updated_at').order('created_at', { ascending: true }),
    ]);
    jobsSync.reset();
    customersSync.reset();
    setJobs(jobsSync.seed((jobsRes.data || []) as SyncedRow<MaterialInward>[]));
    setCustomers(customersSync.seed((customersRes.data || []) as SyncedRow<Customer>[]));
    return {
      success: true,
      message: `Imported ${legacy.jobs.length} orders and ${legacy.customers.length} customers into the database.`,
    };
  };

  const dismissLocalImport = () => {
    try {
      localStorage.setItem(LEGACY_KEY_IMPORT_DONE, 'dismissed');
    } catch {
      // ignore
    }
    setLocalImport(null);
  };

  // Customer Management (factory staff)
  const addCustomer: ProductionContextType['addCustomer'] = (customerData) => {
    const maxNo = customers.reduce((max, c) => {
      const m = c.id.match(/(\d+)$/);
      return m ? Math.max(max, Number(m[1])) : max;
    }, 0);
    const newId = `CUST-${String(maxNo + 1).padStart(3, '0')}`;
    const code = `${customerData.companyName.substring(0, 3).toUpperCase()}-TRACK-2026`;
    const newCust: Customer = {
      ...stripPassword(customerData as Customer),
      id: newId,
      accessCode: code,
      authorizedEmails: customerData.authorizedEmails.length > 0
        ? customerData.authorizedEmails.map(e => e.trim().toLowerCase())
        : [customerData.email.trim().toLowerCase()],
    };
    setCustomers(prev => [...prev, newCust]);
    return newCust;
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
    const customer =
      customers.find(c => c.id === data.customerId) ||
      currentCustomer ||
      customers[0];

    // The database replaces this with the next real job number when it saves the order.
    const jobNo = 'PENDING';
    const id = 'job-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const nowIso = new Date().toISOString();
    const cleanVehicleNo = (data.vehicleNo && data.vehicleNo.trim()) ? data.vehicleNo.trim().toUpperCase() : '—';

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
      vehicleNo: cleanVehicleNo,
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

    // The "New Inward" notification is created by the database together with the job number.
    setJobs(prev => [newJob, ...prev]);

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
    // Continues from the highest number already issued, so deleted challans never cause duplicates.
    const highestChallanNum = jobs.reduce((max, j) => {
      return (j.challans || []).reduce((m, c) => {
        const match = c.challanNo.match(/^PE\/DC\/\d{4}\/0*(\d+)/);
        return match ? Math.max(m, Number(match[1])) : m;
      }, max);
    }, 415);
    const baseChallanNum = highestChallanNum + 1;
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
    const drivePath = `Archive_2026/${driveFileName}`;

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
      `Challan #${challanNo} issued to ${job.customerName}. Dispatched ${dispatchWeight.toLocaleString()} kg in ${bundles} bundles via ${params.vehicleNo}. Emailed to ${allAuthorizedEmails.join(', ')}.`
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
    const drivePath = `Archive_2026/${driveFileName}`;
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
          ? recipientEmail.split(',').map(e => e.trim()).filter(Boolean)
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

    // Saved by a database function, which only lets customers add a pending
    // request and also creates the factory notification.
    if (!supabase) return;
    void supabase.rpc('request_spec_change', { p_job_id: jobId, p_request: newRequest }).then(({ error }) => {
      if (error) {
        reportSyncError(`Could not send the change request: ${errorMessage(error)}`);
        return;
      }
      void jobsSync.refresh(jobId);
    });
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

  // Read status is shared by the factory team. Customers only mark them on
  // their own screen (the database does not let them change notifications).
  const saveNotificationsRead = (toSave: AppNotification[]) => {
    if (!supabase || accountRef.current?.role !== 'staff') return;
    for (const n of toSave) {
      void supabase
        .from('notifications')
        .update({ data: { ...n, read: true } })
        .eq('id', n.id)
        .then(({ error }) => {
          if (error) console.error('Failed to save notification status', error);
        });
    }
  };

  const markNotificationRead = (id: string) => {
    saveNotificationsRead(notifications.filter(n => n.id === id && !n.read));
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    saveNotificationsRead(notifications.filter(n => !n.read));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
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
        authLoading,
        dataLoading,
        signedInEmail,
        syncError,
        clearSyncError,
        localImport,
        importLocalBrowserData,
        dismissLocalImport,
        isFactoryAuthenticated,
        loginFactory,
        logoutFactory,
        factoryUsers,
        activeFactoryUser,
        loginFactoryUser,
        logoutFactoryUser,
        addFactoryUser,
        updateFactoryUser,
        deleteFactoryUser,
        authenticatedEmail,
        currentCustomer,
        loginCustomerByEmail,
        sendPasswordReset,
        passwordRecovery,
        completePasswordReset,
        logoutCustomer,
        logoutAll,
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
