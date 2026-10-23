# Progressive Enterprises - Precision Slitting Works & Production Tracker

Industrial production tracking, precision slitting management, customer portal, and delivery challan dispatch system for **Progressive Enterprises** (Bhiwandi, Maharashtra).

---

## Key Features & Recent Updates

### 1. Delivery Challan Net Weight & Bundle Count Lock
- **Strictly Derived from Bundle Selection**: In the Delivery Challan generation and edit modal, the net dispatch weight and total bundles count are non-editable and strictly locked to the ticked floor bundles in the selection checklist.
- **Shop Floor Integration**: Each bundle displays its tag, gross weight, tare weight, and net weight with least count precision.
- **Quick Selection Presets**: Presets (All Ready Bundles, Half Lot, Even Bundles, Odd Bundles) operate directly on the bundle checkboxes, guaranteeing that the weight and bundle count match the selected physical units.
- **Challan Validation**: Challan generation requires at least 1 bundle to be ticked.

### 2. Direct 1-Click Email Dispatch (`progressive.ent8@gmail.com`)
- **Factory Sender Identity**: All customer dispatch notifications originate from the official factory email **progressive.ent8@gmail.com**.
- **1-Click Seamless Workflow**: Directly opens Gmail with `progressive.ent8@gmail.com` pre-selected, pre-populating customer contacts, PO number, challan breakdown table, and vehicle details without third-party auth errors.
- **Default Mail App & Clipboard**: One-click default mail client (`mailto:`) launch and full-text copy for maximum convenience.

### 3. WhatsApp Dispatch Advice
- **Official Delivery Advice**: Pre-formatted WhatsApp advice with delivery challan number, customer PO, slitted material specifications, vehicle number, and plant address.
- **Clean UI Placement**: WhatsApp and email dispatch buttons are organized exclusively inside the **Delivery Challan Manager** to keep the main dashboard and customer portal uncluttered.

### 4. Factory Address Updated Across All Records
- **Official Works Address**:
  `Shed no. H-11/5,6, Shree Arihant Compound, Kalher, Bhiwandi, Maharashtra - 421302`
- Applied uniformly across statutory challans, HTML exports, email dispatches, WhatsApp advice, and dashboard footers.

### 5. Google Drive Links Removed
- Removed Google Drive sync links across all views in preparation for dedicated relational database migration.

---

## Technical Stack

- **Framework**: React 19 + TypeScript + Vite 6
- **Database, sign-in & live updates**: Supabase (Postgres, Auth, Realtime) - setup steps in [SUPABASE_SETUP.md](SUPABASE_SETUP.md), schema in [supabase/schema.sql](supabase/schema.sql)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Hosting & Runtime**: Vite SPA / Node.js

---

## Works & Plant Address

**Progressive Enterprises Precision Slitting Works**  
Shed no. H-11/5,6, Shree Arihant Compound, Kalher, Bhiwandi, Maharashtra - 421302  
- **Email**: `progressive.ent8@gmail.com`  
- **Phone**: +91 98200 45678  
- **GSTIN**: 27AAACP1234F1Z8  
