export type ProductionStatus =
  | 'received'              // Material Received / Inward Logged
  | 'pending_production'   // Not Taken Under Production (In Queue)
  | 'in_production'        // Under Slitting (Live on Machine)
  | 'slitting_completed'   // Slitting Done & Quality Inspection
  | 'ready_for_dispatch'   // Packed & Ready for Dispatch
  | 'partially_dispatched' // Midway Urgent Partial Delivery Completed
  | 'dispatched'           // All Material Dispatched (Challans Issued)
  | 'po_closed';           // PO Permanently Closed by Factory Master

export interface Customer {
  id: string;
  name: string;
  companyName: string;
  email: string;
  authorizedEmails: string[]; // Multiple email IDs granted login & notification access
  phone: string;
  gstNumber: string;
  panNumber?: string;
  registeredAddress: string; // Registered legal company address
  plantAddress: string;      // Factory / Unloading site address
  city: string;
  state: string;
  stateCode: string;
  accessCode?: string;       // Direct tracking link code
}

export interface FactoryUser {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  pin: string;
  badgeCode: string;
  phone: string;
  status: 'active' | 'on_duty' | 'off_duty';
}

export interface SlitCut {
  id: string;
  widthMm: number;
  numberOfCuts: number;
  remarks?: string;
}

export type CoreType = 'paper_core' | 'pvc_core' | 'none';

export interface BundleRollItem {
  widthMm: number;
  rollCount: number;
  unitType?: 'reels' | 'reams' | 'rolls';
}

export interface BundleEditRecord {
  editedAt: string;
  editedBy: string;
  reason: string;
  previousGross: number;
  newGross: number;
  previousNet: number;
  newNet: number;
  previousCoreType: CoreType;
  newCoreType: CoreType;
}

export interface BundleRecord {
  id: string;
  bundleNumber: number;            // e.g. 1, 2, 3...
  bundleTag: string;               // e.g. "BNDL-01", "B-01"
  jobId: string;
  jobNo: string;
  customerPoNo?: string;
  rollItems: BundleRollItem[];     // different widths & roll counts in the bundle
  rollsSummary: string;            // e.g. "10 rolls × 20mm" or "5×20mm, 5×30mm"
  totalRollsCount: number;         // e.g. 10
  grossWeightKg: number;           // Actual scale reading (e.g. 28.5 kg)
  coreType: CoreType;              // 'paper_core' | 'pvc_core' | 'none'
  paperCoreTareWeightKg: number;   // Weight reduced from bundle if paper core (e.g. 1.2 kg), 0 if PVC core
  otherPackagingTareKg?: number;   // optional box / strapping tare
  netWeightKg: number;             // Gross Weight - Paper Core Tare
  status: 'ready' | 'dispatched';  // Staged on floor vs sent in challan
  dispatchedInChallanId?: string;
  dispatchedInChallanNo?: string;
  weighedAt: string;
  weighedBy: string;               // e.g. "Production & Dispatch Manager"
  notes?: string;
  // Mistake corrections & audit tracking
  editHistory?: BundleEditRecord[];
  isVoided?: boolean;
  voidReason?: string;
  voidedAt?: string;
  voidedBy?: string;
}

export interface BundleSpecifications {
  targetBundleWeightKg: number; // e.g. 25 - 30 kg max
  unitType: 'reels' | 'reams';   // either 10 reels or 20 reams
  unitsPerBundle: number;        // e.g. 10 or 20
  packagingStyle: string;        // e.g. Corrugated boxes / stretch wrapped bundles
}

export interface SlittingOutput {
  grade: string;
  thickness: number;
  thicknessUnit: 'mm' | 'microns' | 'gauge';
  slitCuts: SlitCut[];
  totalFinishedWeightKg: number;
  scrapWeightKg: number;
  yieldPercentage: number;
  
  // Packaging & Bundle Configuration (requested by user)
  bundleWeightKg: number;          // approx 25 to 30 kg max
  bundleUnitType: 'reels' | 'reams'; // reels or reams per bundle
  unitsPerBundle: number;          // e.g., 10 reels or 20 reams
  reelsOrReamsPerBundle?: number;  // alias
  totalBundles: number;
  packagingType: 'Bundles with Strapping' | 'Corrugated Boxes' | 'Wooden Crates' | 'Packets with Stretch Film' | 'Custom Pallets';
  
  completedAt?: string;
  operatorName?: string;
  machineId?: string;
  qualityPassed: boolean;
  productionNotes?: string;
}

export interface EddHistoryEntry {
  date: string;
  setAt: string;
  changedBy: string;
  note?: string;
}

export interface DeliveryChallanItem {
  srNo: number;
  description: string;
  grade: string;
  thickness: string;
  slitWidthsSummary: string;
  incomingWeightKg: number;
  dispatchedWeightKg: number; // for this specific challan
  scrapWeightKg: number;
  bundlesCount: number;
  unitType: 'reels' | 'reams';
  unitsPerBundle: number;
  bundleWeightApproxKg: number;
  remarks?: string;
}

export interface ChallanRevisionRecord {
  version: number;
  revisionLabel: string;
  challanNo: string;
  revisedAt: string;
  revisedBy: string;
  reason: string;
  vehicleNo: string;
  transporterName: string;
  thisDispatchWeightKg: number;
  totalBundles: number;
  selectedBundleIds?: string[];
  notes?: string;
}

export interface DeliveryChallan {
  id: string;
  challanNo: string;
  challanDate: string;
  jobId: string;
  customerPoNo?: string;
  customerId: string;
  customerName: string;
  customerRegisteredAddress: string;
  customerDeliveryAddress: string;
  customerGst: string;
  
  // Dispatch classification
  dispatchType: 'partial' | 'final';
  dispatchSequenceNumber: number; // 1 for Partial 1, 2 for Partial 2 or Final
  totalOrderWeightKg: number;
  thisDispatchWeightKg: number;    // e.g. 500 kg midway urgent delivery
  remainingBalanceWeightKg: number; // e.g. 752 kg remaining in factory
  
  vehicleNo: string;
  transporterName: string;
  driverPhone?: string;
  eWayBillNo?: string;
  incomingChallanRef: string;
  
  items: DeliveryChallanItem[];
  totalBundles: number;
  totalNetWeightKg: number;
  totalScrapWeightKg: number;
  totalGrossWeightKg: number;
  
  // Itemized bundle schedule for this challan (Gross & Net weights per bundle)
  dispatchedBundles?: BundleRecord[];
  selectedBundleIds?: string[];

  // Mistake corrections & immutable versioning
  version: number;                // 1 for original, 2, 3... for revisions
  revisionLabel: string;         // e.g. "Original" or "Revision 1 (Amended)"
  isLatest: boolean;             // true if current active revision
  isSuperseded?: boolean;        // true if amended by a later revision
  supersededByChallanId?: string;
  amendedFromChallanId?: string;
  revisionReason?: string;       // Mandatory reason for any correction (audit trail)
  revisedAt?: string;
  revisedBy?: string;
  revisionHistory?: ChallanRevisionRecord[];

  terms: string[];
  savedToDrive: boolean;
  drivePath?: string;
  driveSavedAt?: string;
  emailSent: boolean;
  sentToEmails: string[];
  emailSentAt?: string;
  preparedBy: string;
  status: 'generated' | 'dispatched' | 'acknowledged';
}

export interface SpecChangeRequest {
  id: string;
  jobId: string;
  jobNo: string;
  customerPoNo: string;
  customerId: string;
  customerName: string;
  requestedByEmail: string;
  requestedAt: string;
  originalSpecs: {
    slitWidthMm?: number;
    targetBundleWeightKg?: number;
    unitsPerBundle?: number;
    unitType?: 'reels' | 'reams';
    customerInstructions: string;
  };
  requestedSpecs: {
    slitWidthMm?: number;
    targetBundleWeightKg?: number;
    unitsPerBundle?: number;
    unitType?: 'reels' | 'reams';
    customerInstructions: string;
  };
  reason: string; // e.g. "Changed requirement to 25mm slit width for new production line"
  status: 'pending_approval' | 'approved' | 'rejected';
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
}

export interface MaterialInward {
  id: string;
  jobNo: string; // e.g., PE-JOB-2026-104
  customerPoNo: string; // Customer Purchase Order No. e.g. PO/2026/PW-901
  customerId: string;
  customerName: string;
  customerGst: string;
  customerEmail: string; // Primary email
  authorizedEmails: string[]; // All emails allowed to log in and track
  customerPhone: string;
  customerRegisteredAddress: string;
  
  // Inward Parameters
  inwardChallanNo: string;
  vehicleNo: string;
  receivedDate: string;
  materialType: 'Plastic / Polymer Film' | 'Steel Coil / Sheet' | 'Aluminum Coil' | 'Copper / Brass Strip' | 'Kraft Paper Reel' | 'Other';
  grade: string; // e.g. 12 Micron Polyester Film, SS 304, CRCA, Aluminum 1050
  thickness: number;
  thicknessUnit: 'mm' | 'microns' | 'gauge';
  incomingWidth: number; // in mm (e.g. 1000 mm)
  incomingLength: number; // in meters
  incomingWeight: number; // in kg (e.g. 1252 kg)
  coilsOrRollsCount: number; // number of incoming coils/reels
  
  // Bundle parameters requested by customer
  bundleSpecs: BundleSpecifications;
  
  customerInstructions: string; // special customer instructions (e.g., slit to 20mm, bundles 25-30kg max, 10 reels/20 reams per bundle)

  // Production Tracking
  status: ProductionStatus;
  assignedMachine: string;
  estimatedDeliveryDate?: string; // YYYY-MM-DD
  eddHistory: EddHistoryEntry[];

  // Output Parameters (when processed)
  outputDetails?: SlittingOutput;

  // Weighed Bundles on Floor (production manager scale records)
  bundles?: BundleRecord[];

  // Partial & Total Dispatches Tracking
  dispatchedWeightKg: number; // Running total of dispatched weight
  remainingWeightKg: number;  // incomingWeight - dispatchedWeightKg
  challans: DeliveryChallan[]; // List of all generated delivery challans (supports midway partial dispatches!)

  // Legacy single challan accessor for backwards compatibility
  challan?: DeliveryChallan;

  // PO Closure by Factory Master
  poStatus: 'open' | 'partially_dispatched' | 'closed';
  poClosedAt?: string;
  poClosedBy?: string;
  poClosingNotes?: string;

  // Customer Specification Change Requests & Backtrack
  specChangeRequests?: SpecChangeRequest[];

  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  jobId: string;
  jobNo: string;
  customerId: string;
  customerName: string;
  type:
    | 'new_material_inward'
    | 'edd_updated'
    | 'production_started'
    | 'slitting_completed'
    | 'bundle_weighed'
    | 'partial_dispatch'
    | 'ready_for_dispatch'
    | 'challan_generated'
    | 'challan_revised'
    | 'spec_change_requested'
    | 'spec_change_approved'
    | 'spec_change_rejected'
    | 'po_closed'
    | 'status_change';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}
