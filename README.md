# Exodus — Trust Payment Escrow Platform

**Exodus** is a fintech-grade escrow and milestone management platform designed to eliminate payment risk for freelancers and delivery risk for clients. Built with a modern **React 19** frontend and a resilient **Node.js / Express 5** backend, the platform leverages **Chapa** for local and cross-border payment processing, **Supabase PostgreSQL** with **Drizzle ORM** for persistent storage, and **Cloudinary** for secure, memory-only file delivery.

---

## 🌟 Key Features

* **Custom JWT Authentication & RBAC**: Timing-safe password hashing (`bcryptjs`) and scoped role permissions (`CLIENT`, `FREELANCER`, `ADMIN`).
* **Escrow Payment Lifecycle (Chapa)**:
  * Server-authoritative pricing (amounts/currencies derived strictly from trusted database records).
  * Hosted Chapa checkout integration with 15-minute idempotent session resumption.
  * Server-to-server transaction verification query to prevent client-side payment tampering.
  * Cryptographic HMAC SHA-256 webhook signature verification with event deduplication.
* **Escrow State Machine**:
  * Formalized multi-step project transitions: Agreement → Awaiting Payment → Funded → Review → Release Approval → Payout.
  * Built-in revision policies (configurable caps) and dispute resolution mechanism that freezes fund releases.
* **Secure Cloudinary Streaming Uploads**:
  * Memory-only storage with Multer (zero server disk persistence).
  * Strict file validation: magic byte verification, category allowlists (Receipts, Deliverables, Agreements, Evidence), and 10 MB size limits.
  * Private/authenticated delivery with short-lived expiring signed URLs.
  * Automatic Cloudinary rollback cleanup if database metadata insertion fails.
* **Freelancer Payout Settlement**:
  * Freelancer bank profile management supporting 14+ Ethiopian banks (Commercial Bank of Ethiopia, Bank of Abyssinia, Telebirr, Awash, etc.).
  * Automated transfer dispatch via Chapa Transfers API upon client release approval.
* **Audit Trail**: Every monetary operation, contract acceptance, and state transition is immutably logged in `project_activities`.

---

## 🏗 System Architecture & Escrow Flow

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> AGREEMENT_PENDING: Terms submitted
    AGREEMENT_PENDING --> AWAITING_PAYMENT: Both parties accept agreement
    AWAITING_PAYMENT --> PAYMENT_PENDING: Client initializes Chapa checkout
    PAYMENT_PENDING --> FUNDED: Chapa payment verified server-to-server
    FUNDED --> IN_PROGRESS: Freelancer begins work
    IN_PROGRESS --> DELIVERABLE_SUBMITTED: Work deliverables uploaded
    DELIVERABLE_SUBMITTED --> CLIENT_REVIEW: Client inspects deliverables
    CLIENT_REVIEW --> REVISION_REQUESTED: Revisions requested (under limit)
    REVISION_REQUESTED --> IN_PROGRESS: Freelancer amends work
    CLIENT_REVIEW --> RELEASE_APPROVED: Client approves work
    CLIENT_REVIEW --> DISPUTED: Disputed by Client or Freelancer
    RELEASE_APPROVED --> PAYOUT_PENDING: Payout request to Chapa Transfers
    PAYOUT_PENDING --> PAID_OUT: Transfer verified successful
    PAID_OUT --> COMPLETED: Escrow closed
```

---

## 📁 Repository Structure

```
exodus/
├── README.md                      # Root project overview & documentation (this file)
│
├── exo/                           # Client Application (Frontend)
│   ├── public/                    # Static assets & SVG icons
│   ├── src/                       # React 19 source code
│   │   ├── assets/                # Logos and graphics
│   │   ├── App.jsx                # Root UI component
│   │   ├── App.css                # Application styles
│   │   ├── main.jsx               # React entry point
│   │   └── index.css              # Global styles
│   ├── index.html                 # HTML shell
│   ├── vite.config.js             # Vite configuration
│   └── package.json               # Client dependencies (React 19, Vite)
│
└── server/                        # Backend REST API (Fintech Escrow Service)
    ├── drizzle/                   # Drizzle ORM SQL migrations
    │   ├── 0000_real_hardball.sql
    │   ├── 0001_registration_profile.sql
    │   ├── 0002_create_profiles.sql
    │   ├── 0003_auth_uuid_profile.sql
    │   ├── 0004_custom_password_auth.sql
    │   ├── 0005_add_projects_and_files.sql
    │   └── 0006_chapa_payments_and_escrow.sql
    ├── src/
    │   ├── config/                # Environment configs (Auth, Cloudinary, Chapa)
    │   ├── controllers/           # HTTP Request controllers
    │   │   ├── auth.controller.js
    │   │   ├── file.controller.js
    │   │   ├── payment.controller.js
    │   │   ├── payout.controller.js
    │   │   ├── project.controller.js
    │   │   └── project-lifecycle.controller.js
    │   ├── db/                    # Drizzle schema & Postgres client
    │   │   ├── index.js           # Supabase Postgres pooler connection
    │   │   └── schema.js          # Tables: users, projects, files, payments, payouts, etc.
    │   ├── middleware/            # JWT auth, rate limits, upload memory handlers
    │   │   ├── auth.middleware.js
    │   │   ├── auth.rate-limit.js
    │   │   ├── file.rate-limit.js
    │   │   └── upload.middleware.js
    │   ├── routes/                # Express router mounts
    │   │   ├── auth.routes.js
    │   │   ├── file.routes.js
    │   │   ├── payment.routes.js
    │   │   ├── payout.routes.js
    │   │   └── project.routes.js
    │   ├── services/              # Business logic & 3rd-party integrations
    │   │   ├── auth.service.js
    │   │   ├── chapa.service.js
    │   │   ├── cloudinary.service.js
    │   │   ├── file.service.js
    │   │   ├── payment.service.js
    │   │   ├── payout.service.js
    │   │   ├── project.service.js
    │   │   ├── project-lifecycle.service.js
    │   │   └── webhook.service.js
    │   ├── validators/            # Strict input & magic-byte file validation
    │   │   ├── auth.validator.js
    │   │   └── file.validator.js
    │   ├── app.js                 # Express application configuration
    │   └── server.js              # Server listener entry point
    ├── test/                      # Unit & integration test suites
    │   ├── auth.validator.test.js
    │   ├── chapa.payment.test.js
    │   └── file.upload.test.js
    ├── README.md                  # Comprehensive API documentation & Postman guide
    ├── .env.example               # Server environment variable template
    └── package.json               # Server dependencies & scripts
```

---

## 🛠 Tech Stack

| Domain | Technology | Description |
| :--- | :--- | :--- |
| **Backend Runtime** | Node.js (v20+) | Native ES modules, modern Fetch & Crypto APIs |
| **HTTP Framework** | Express.js 5 | REST API routing, custom error handling, raw-body buffer hooks |
| **Database** | PostgreSQL (Supabase) | Cloud-hosted relational database via connection pooler |
| **ORM & Migrations**| Drizzle ORM & Kit | Type-safe schema definition and structured SQL migrations |
| **Payment Gateway** | Chapa | Checkout initialization, server verification, and transfer payouts |
| **Media & Storage** | Cloudinary | Streamed media storage, signed private URLs, magic-byte checking |
| **Authentication** | JWT & Bcrypt | Stateless authentication with timing attack protection |
| **Frontend Framework**| React 19 & Vite | High-performance SPA with Hot Module Replacement (HMR) |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
* **Node.js**: `v20.x` or higher
* **PostgreSQL / Supabase**: Connection string with transaction-mode pooler access
* **Chapa Account**: Merchant API keys (Secret key and Webhook secret)
* **Cloudinary Account**: Cloud name, API Key, and Secret

---

### 2. Backend Setup (`server`)

1. **Navigate to the server directory**:
   ```bash
   cd server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and supply your credentials:
   ```bash
   cp .env.example .env
   ```
   *Required variables*:
   ```env
   PORT=5000
   DATABASE_URL=postgresql://postgres.xxx:password@aws-0-xxx.pooler.supabase.com:6543/postgres
   JWT_SECRET=your_super_secret_random_32_byte_string
   BCRYPT_ROUNDS=12

   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

   # Chapa
   CHAPA_SECRET_KEY=CHASECK_TEST-your_chapa_secret_key
   CHAPA_BASE_URL=https://api.chapa.co/v1
   CHAPA_WEBHOOK_SECRET=your_webhook_secret

   CLIENT_URL=http://localhost:5173
   SERVER_URL=http://localhost:5000
   ```

4. **Apply Database Migrations**:
   ```bash
   npm run db:migrate
   ```

5. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   *The server will start on `http://localhost:5000`.*

---

### 3. Frontend Setup (`exo`)

1. **Navigate to the frontend directory**:
   ```bash
   cd exo
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the Vite Dev Server**:
   ```bash
   npm run dev
   ```
   *The client interface will open at `http://localhost:5173`.*

---

## 📡 API Endpoints Overview

Detailed documentation and sample request bodies are available in [`server/README.md`](server/README.md).

| Category | Endpoint | Method | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `/api/auth/register` | `POST` | Public | Register client or freelancer |
| **Auth** | `/api/auth/login` | `POST` | Public | Authenticate and obtain JWT token |
| **Auth** | `/api/auth/me` | `GET` | Authenticated | Retrieve current user profile |
| **Projects** | `/api/projects` | `POST` | Authenticated | Create a new project / escrow deal |
| **Projects** | `/api/projects` | `GET` | Authenticated | List all projects belonging to user |
| **Lifecycle** | `/api/projects/:id/accept-agreement`| `POST` | Client/Freelancer | Accept contract (`DRAFT` → `AWAITING_PAYMENT`) |
| **Lifecycle** | `/api/projects/:id/submit-deliverable`| `POST` | Freelancer | Submit work (`FUNDED` → `CLIENT_REVIEW`) |
| **Lifecycle** | `/api/projects/:id/accept-deliverable`| `POST` | Client | Approve work (`CLIENT_REVIEW` → `RELEASE_APPROVED`) |
| **Lifecycle** | `/api/projects/:id/request-revision` | `POST` | Client | Request revision with reasons |
| **Lifecycle** | `/api/projects/:id/dispute` | `POST` | Client/Freelancer | Open dispute and freeze escrow |
| **Lifecycle** | `/api/projects/:id/activities` | `GET` | Project Members | View chronological audit log |
| **Payments** | `/api/payments/initialize` | `POST` | Client | Initialize Chapa checkout session |
| **Payments** | `/api/payments/verify/:txRef` | `GET` | Project Members | Verify payment server-to-server with Chapa |
| **Payments** | `/api/payments/webhook` | `POST` | Chapa Signature | Process signed Chapa webhooks |
| **Payments** | `/api/payments/banks` | `GET` | Authenticated | List supported payout banks |
| **Files** | `/api/projects/:id/files/receipt` | `POST` | Client / Admin | Upload proof of payment |
| **Files** | `/api/projects/:id/files/deliverable`| `POST` | Freelancer / Admin| Upload project deliverable |
| **Files** | `/api/files/:fileId` | `GET` | Project Members | Retrieve file metadata & signed access URL |
| **Files** | `/api/files/:fileId` | `DELETE`| Uploader / Admin | Delete file from database and Cloudinary |
| **Payouts** | `/api/payouts/profile` | `POST` | Freelancer | Save bank account details |
| **Payouts** | `/api/payouts/project/:id` | `POST` | Project Members | Execute Chapa transfer payout |

---

## 🔒 Security Best Practices Implemented

1. **Anti-IDOR Protection**: All project operations strictly assert user membership (`clientId`, `freelancerId`, or `ADMIN`).
2. **Server-Side Financial Authority**: Checkout amounts and currencies are read from PostgreSQL records; client payloads cannot alter the price.
3. **Cryptographic Webhook Verification**: Raw payload buffers are checked with HMAC SHA-256 and `crypto.timingSafeEqual` to guard against replay attacks and timing leaks.
4. **Buffer Magic Byte Inspection**: Uploaded files have their initial byte sequences inspected (JPEG: `\xFF\xD8\xFF`, PNG: `\x89PNG`, PDF: `%PDF-`, ZIP/DOCX: `PK`) to reject spoofed extensions.
5. **Separation of Proof and Escrow**: Receipt uploads do not mark payments as verified; only verified Chapa transactions move projects to `FUNDED`.

---

## 🧪 Testing

Run backend security and integration suites:
```bash
cd server
npm test
```
*Tests cover validation rules, project access authorization, Chapa signature verification, duplicate webhook deduplication, and IDOR protection.*
