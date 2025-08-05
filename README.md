# BharatInvo – Intelligent Invoice Processing & Matching System

A modern, secure, AI-powered invoice processing system built to streamline enterprise finance workflows, reduce human error, and drive digital transformation in organizations across India.

---

## 🔧 Features

-  **Live Deployment**: [Visit the App](https://bharatinvo.onrender.com/)
-  Upload scanned or digital invoices (PDF, JPG, PNG)
-  AI/ML-powered invoice field extraction using OCR and NLP
-  Three-way matching between Invoice, PO (Purchase Order), and GRN (Goods Receipt)
-  Automated validation and anomaly detection
-  Approval workflow based on user role
-  Secure login with JWT-based auth

---

## System Architecture

Our invoice processing system is built with modularity, reliability, and scalability in mind. Below is an overview of the system architecture and how data flows from ingestion to disbursement.

###  End-to-End Workflow

1. **Invoice Ingestion**
   - Invoices enter the system through two primary methods:
     - **Manual Upload**: Admins or bookkeepers upload invoices directly via the user interface.
     - **Automated Desktop Agent**: A background script checks designated email inboxes periodically, auto-fetches invoice files (PDFs or images), and pushes them into the internal processing queue.

2. **Preprocessing & OCR (Optical Character Recognition)**
   - Files are preprocessed to improve quality.
   - Initially, Tesseract was used but due to limitations with poor layouts or image clarity, we upgraded to **Mistral**, a context-aware GenAI OCR engine.
   - Mistral extracts key data points such as:
     - Vendor Name
     - Invoice Number
     - Line Items
     - Subtotal, Taxes, and Grand Total

3. **GenAI-Based Structuring**
   - Raw text output from OCR is semi-structured and inconsistent.
   - A GenAI model further processes the text and maps it into a consistent **JSON structure**, even when invoices don’t follow standard formats or have missing tables.

4. **3-Way Matching Engine**
   - The structured invoice data is validated against:
     - **Purchase Order (PO)**
     - **Goods Receipt Note (GRN)**
   - The matching engine checks:
     - Item-wise price match
     - Quantity verification
     - Vendor and PO alignment

5. **Human-in-the-Loop (HITL)**
   - If any mismatches occur or the confidence score is below a threshold:
     - A human reviewer is notified through the **Review Dashboard**.
     - Reviewers can correct fields, accept or reject entries, and provide remarks.

6. **Payment Integration**
   - Once verified, invoices are cleared for payment.
   - In our prototype, we’ve used **Razorpay** as a mock integration.
   - In production, this module can connect to:
     - ERP Systems (e.g., SAP, Oracle)
     - Corporate Banking APIs (e.g., ICICI, Axis)

7. **Audit Trails & Logs**
   - Every step in the pipeline is logged with timestamps, status updates, and user actions to maintain complete traceability and compliance.

---

## Assumptions

- Organizations use digital or scanned copies of invoices
- Purchase Orders and Receipts exist in a digital database
- Users will have predefined roles (Admin, Bookkeeper, HOD)
- Validation and approval can be automated for standard patterns

---

## Business Use Case

- Simplifies manual invoice handling and verification
- Ensures compliance with procurement policies
- Prevents fraud and duplicate payments
- Reduces turnaround time for approvals
- Useful for finance, procurement, and auditing teams
- Aligned with India’s digital transformation mission under Digital India
- Adds efficiency to MSMEs, large enterprises, and government departments handling high invoice volumes

---

## Tech Stack

- **Frontend**: React.js + Tailwind CSS
- **Backend**: Node.js (Express), Python (for AI modules)
- **Database**: MongoDB, PostgreSQL
- **AI/ML**: Tesseract / Mistral OCR, NER for field extraction
- **RPA/Automation**: UiPath / Automation Anywhere (planned)

---

## User Roles

- **Admin**: Full access, manage users, view all invoice statuses
- **Bookkeeper**: Upload invoices, match PO/GRN, flag issues
- **HOD/Manager**: Approve or reject matched invoices, monitor summaries

---

## Modules

- **Authentication**: Role-based login and session management
- **Invoice Upload**: Upload, OCR scan, and field parsing
- **PO/GRN Matching**: Automated 3-way comparison logic
- **Validation Engine**: Rules-based + ML anomaly checks
- **Approval Workflow**: Role-based action system
- **Reports Dashboard**: Filtered views, status tracking, CSV export
- **Admin Panel**: Manage users, view system logs

---

##  Security

- JWT-based authentication and session handling
- Role-based access control for APIs
- File upload sanitization and size limits
- Environment-based secret management (dotenv)

---

## Future Improvements

- Add digital signature verification on PDFs
- Integrate GST verification API
- Improve model accuracy using India-specific datasets
- Introduce email-based invoice intake
- Add audit trail and timeline view for invoices
- Implement full RPA for invoice-to-payment automation
- Multilingual OCR and UI support
- Version control for documents
