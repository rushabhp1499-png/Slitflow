# Progressive Enterprises - Precision Slitting Works & Production Tracker

Industrial production tracking, precision slitting management, customer portal, and delivery challan dispatch system for **Progressive Enterprises** (Pimpri Industrial Area, Pune).

---

## Key Features & Recent Updates

### 1. Customer Company Locking & Clean Login
- **Company Name Locked to Logged-in Account**: When a customer logs in (e.g., *qwe company*), the customer name and inward order submission are automatically and strictly locked to their authenticated company profile.
- **Dedicated Customer Authentication**: Customer portal uses email/access code login with password verification.
- **Removed Google Authentication from Customer Login**: Clean, focused interface for customer coordinators and purchase teams without third-party auth barriers.
- **Optional Vehicle / Lorry Number**: Vehicle / lorry number is now optional across all forms (Material Inward Entry, Delivery Challan creation, and Challan revision).

### 2. WhatsApp Dispatch Advice
- **Instant Launch**: One-click dispatch advice sending via **WhatsApp Web** (desktop) or **WhatsApp App** (mobile/desktop app).
- **Formatted Message**: Generates clean, formatted text with emoji bullets containing:
  - Delivery Challan No & Date
  - Customer Name & PO Reference
  - Material Grade & Thickness
  - Dispatched Net Weight (kg) & Total Bundles
  - Vehicle / Transporter Details
  - Direct live portal link for digital verification
- **Everywhere Accessible**: Available in:
  - **Delivery Challan Manager**
  - **Customer Portal** (under Issued Delivery Challans)
  - **Factory Dashboard** (quick action button on dispatched jobs)

### 3. Official Gmail Dispatch Integration (`progressive.ent8@gmail.com`)
- **Direct Gmail API Sending**: Configured with Google Workspace OAuth (`https://www.googleapis.com/auth/gmail.send`).
- **Sender Identity**: Dispatches official e-Challan advice directly from `progressive.ent8@gmail.com` to all registered and authorized customer email addresses.
- **Security & User Confirmation**:
  - In-memory access token management (never exposed to persistent storage).
  - Explicit user confirmation dialog before any email is dispatched.
- **Rich HTML & Plain Text Templates**: Generates professional branded emails with dispatch summary tables, GST Rule 55 statutory notices, and download links.
- **Reliable Fallbacks**:
  - Direct Gmail API REST dispatch (`/gmail/v1/users/me/messages/send`)
  - "Open in Gmail Web" composer fallback
  - "Open in Default Mail Client (mailto:)" fallback

### 4. Precision Weighing & Statutory Compliance
- **Weighing Scale Least Count**: Calibrated to 50g precision (0.05 kg).
- **GST Rule 55 Compliance**: Job-work delivery challans with full statutory declarations and customer inspection clauses.
- **HTML & Print PDF Export**: Standalone offline HTML challan files and print layouts.

---

## Technical Stack

- **Framework**: React 19 + TypeScript + Vite 6
- **Styling**: Tailwind CSS
- **Authentication & OAuth**: Firebase SDK + Google Workspace OAuth (`gmail.send`)
- **Icons**: Lucide React
- **Hosting & Runtime**: Node.js / Vite SPA

---

## Contact & Works Address

**Progressive Enterprises Precision Slitting Works**  
Plot No. 42-45, Phase-II, Sector 58, Pimpri Industrial Area,  
Pune, Maharashtra - 411018  
- **Email**: `progressive.ent8@gmail.com`  
- **Phone**: +91 98200 45678 / +91 20 2747 8899  
- **GSTIN**: 27AABCP8841M1ZM  
