# Trust Payment API Documentation

Backend escrow service built with **Node.js**, **Express**, **Drizzle ORM**, **Supabase PostgreSQL**, and **Cloudinary**.

---

## Base URL
```
http://localhost:5000
```

---

## 1. System Health Routes

### `GET /`
Check API status.
* **Authentication**: None
* **Response `200 OK`**:
```json
{
  "message": "Trust Payment API is running"
}
```

### `GET /health`
Server health check.
* **Authentication**: None
* **Response `200 OK`**:
```json
{
  "status": "ok",
  "timestamp": "2026-10-24T12:00:00.000Z"
}
```

---

## 2. Authentication Routes (`/api/auth`)

### `POST /api/auth/register`
Register a new user account.
* **Authentication**: None
* **Content-Type**: `application/json`
* **Request Body**:
```json
{
  "fullName": "Abebe Kebede",
  "email": "abebe@example.com",
  "password": "Password123!@#",
  "confirmPassword": "Password123!@#",
  "phone": "+251911000000",
  "role": "CLIENT"
}
```
*Note: `phone` is optional. `role` defaults to `"CLIENT"` (can be `"CLIENT"` or `"FREELANCER"`). Passwords require 12+ characters with uppercase, lowercase, number, and symbol.*

* **Response `201 Created`**:
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "token": "eyJhbGciOi...",
    "user": {
      "id": "55afdaa0-62c1-497e-a1dc-1da73fc7967e",
      "fullName": "Abebe Kebede",
      "email": "abebe@example.com",
      "phone": "+251911000000",
      "role": "CLIENT",
      "createdAt": "2026-10-24T11:05:33.210Z"
    }
  }
}
```

---

### `POST /api/auth/login`
Authenticate with email and password.
* **Authentication**: None
* **Content-Type**: `application/json`
* **Request Body**:
```json
{
  "email": "abebe@example.com",
  "password": "Password123!@#"
}
```
* **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOi...",
    "user": {
      "id": "55afdaa0-62c1-497e-a1dc-1da73fc7967e",
      "fullName": "Abebe Kebede",
      "email": "abebe@example.com",
      "phone": "+251911000000",
      "role": "CLIENT"
    }
  }
}
```

---

### `GET /api/auth/me`
Retrieve authenticated user profile.
* **Authentication**: `Bearer <JWT_TOKEN>`
* **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "55afdaa0-62c1-497e-a1dc-1da73fc7967e",
      "fullName": "Abebe Kebede",
      "email": "abebe@example.com",
      "phone": "+251911000000",
      "role": "CLIENT"
    }
  }
}
```

---

## 3. Project / Deal Routes (`/api/projects`)

### `POST /api/projects`
Create a new escrow project.
* **Authentication**: `Bearer <JWT_TOKEN>`
* **Content-Type**: `application/json`
* **Request Body**:
```json
{
  "title": "E-Commerce Website Redesign",
  "description": "Full-stack development with milestone payments",
  "amount": 2500,
  "freelancerId": "optional-freelancer-uuid"
}
```
* **Response `201 Created`**:
```json
{
  "success": true,
  "message": "Project created successfully.",
  "data": {
    "project": {
      "id": "b1e2c3d4-...",
      "title": "E-Commerce Website Redesign",
      "description": "Full-stack development with milestone payments",
      "clientId": "55afdaa0-...",
      "freelancerId": null,
      "status": "ACTIVE",
      "amount": 2500,
      "createdAt": "2026-10-24T12:00:00.000Z",
      "updatedAt": "2026-10-24T12:00:00.000Z"
    }
  }
}
```

---

### `GET /api/projects`
List all projects associated with the logged-in user.
* **Authentication**: `Bearer <JWT_TOKEN>`
* **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "b1e2c3d4-...",
        "title": "E-Commerce Website Redesign",
        "status": "ACTIVE",
        "amount": 2500
      }
    ]
  }
}
```

---

### `GET /api/projects/:projectId`
Retrieve single project details.
* **Authentication**: `Bearer <JWT_TOKEN>` (Must be project client, freelancer, or admin)
* **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "b1e2c3d4-...",
      "title": "E-Commerce Website Redesign",
      "status": "ACTIVE",
      "amount": 2500
    }
  }
}
```

---

## 4. Secure File Upload Routes (`/api/projects/:projectId/files`)

> **Upload Rules**:
> - Enctype: `multipart/form-data`
> - Field name: `file`
> - Max size: `10 MB` (configured via `MAX_FILE_SIZE_BYTES`)
> - Memory storage: Uploaded buffers are streamed directly to Cloudinary without writing to local disk.
> - Magic byte validation: Spoofed file extensions are rejected immediately.

### Allowed Formats per Category:
| Category | Endpoint | Allowed File Types | Permitted Roles |
| :--- | :--- | :--- | :--- |
| **PAYMENT_RECEIPT** | `POST /api/projects/:projectId/files/receipt` | JPEG, PNG, PDF | Project Client, Admin |
| **DELIVERABLE** | `POST /api/projects/:projectId/files/deliverable` | JPEG, PNG, PDF, DOCX, ZIP | Project Freelancer, Admin |
| **AGREEMENT** | `POST /api/projects/:projectId/files/agreement` | PDF, DOCX, JPEG, PNG | Client, Freelancer, Admin |
| **SUPPORTING_EVIDENCE** | `POST /api/projects/:projectId/files/evidence` | JPEG, PNG, PDF, DOCX, ZIP | Client, Freelancer, Admin |
| **GENERIC** | `POST /api/projects/:projectId/files` | Category-specific | Per category rule |

---

### `POST /api/projects/:projectId/files/receipt`
Upload payment receipt for escrow funding.
* **Authentication**: `Bearer <CLIENT_TOKEN>`
* **Content-Type**: `multipart/form-data`
* **Form-Data**:
  * Key: `file` (File) -> `.jpg`, `.png`, or `.pdf`
* **Response `201 Created`**:
```json
{
  "success": true,
  "message": "Payment receipt uploaded successfully. Note: Payment verification is handled separately.",
  "data": {
    "file": {
      "id": "f8a9b0c1-...",
      "projectId": "b1e2c3d4-...",
      "uploaderId": "55afdaa0-...",
      "category": "PAYMENT_RECEIPT",
      "originalFilename": "bank_receipt.pdf",
      "cloudinaryAssetId": "a1b2c3...",
      "cloudinaryPublicId": "trust-payment/projects/b1e2c3d4-.../bank_receipt-...",
      "resourceType": "raw",
      "deliveryType": "authenticated",
      "mimeType": "application/pdf",
      "fileSize": 104230,
      "checksum": "8f4a21...",
      "accessUrl": "https://res.cloudinary.com/...",
      "createdAt": "2026-10-24T12:05:00.000Z"
    }
  }
}
```

---

### `POST /api/projects/:projectId/files/deliverable`
Upload milestone project deliverable.
* **Authentication**: `Bearer <FREELANCER_TOKEN>`
* **Content-Type**: `multipart/form-data`
* **Form-Data**:
  * Key: `file` (File) -> `.zip`, `.pdf`, `.docx`, `.png`, `.jpg`
* **Response `201 Created`**

---

### `POST /api/projects/:projectId/files/agreement`
Upload signed contract or terms.
* **Authentication**: `Bearer <JWT_TOKEN>`
* **Content-Type**: `multipart/form-data`
* **Form-Data**:
  * Key: `file` (File) -> `.pdf`, `.docx`, `.jpg`, `.png`
* **Response `201 Created`**

---

### `POST /api/projects/:projectId/files/evidence`
Upload supporting dispute evidence or logs.
* **Authentication**: `Bearer <JWT_TOKEN>`
* **Content-Type**: `multipart/form-data`
* **Form-Data**:
  * Key: `file` (File) -> `.jpg`, `.png`, `.pdf`, `.docx`, `.zip`
* **Response `201 Created`**

---

### `POST /api/projects/:projectId/files`
Generic upload endpoint with form field category.
* **Authentication**: `Bearer <JWT_TOKEN>`
* **Content-Type**: `multipart/form-data`
* **Form-Data**:
  * Key: `category` (Text) -> `"PAYMENT_RECEIPT"`, `"DELIVERABLE"`, `"AGREEMENT"`, or `"SUPPORTING_EVIDENCE"`
  * Key: `file` (File)
* **Response `201 Created`**

---

### `GET /api/projects/:projectId/files`
List all files belonging to a project.
* **Authentication**: `Bearer <JWT_TOKEN>` (Must be project member or admin)
* **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": "f8a9b0c1-...",
        "projectId": "b1e2c3d4-...",
        "uploaderId": "55afdaa0-...",
        "category": "PAYMENT_RECEIPT",
        "originalFilename": "bank_receipt.pdf",
        "mimeType": "application/pdf",
        "fileSize": 104230,
        "accessUrl": "https://res.cloudinary.com/..."
      }
    ]
  }
}
```

---

## 5. Direct File Access & Deletion Routes (`/api/files`)

### `GET /api/files/:fileId`
Retrieve metadata and a fresh signed temporary download URL for a file.
* **Authentication**: `Bearer <JWT_TOKEN>` (Must have access to the parent project)
* **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "file": {
      "id": "f8a9b0c1-...",
      "projectId": "b1e2c3d4-...",
      "uploaderId": "55afdaa0-...",
      "category": "PAYMENT_RECEIPT",
      "originalFilename": "bank_receipt.pdf",
      "mimeType": "application/pdf",
      "fileSize": 104230,
      "accessUrl": "https://res.cloudinary.com/..."
    }
  }
}
```

---

### `GET /api/files/:fileId/download`
Directly download the file. Automatically redirects (`302`) to the short-lived signed Cloudinary CDN URL.
* **Authentication**: `Bearer <JWT_TOKEN>`
* **Response**: `302 Found` (Redirects to CDN download)

---

### `DELETE /api/files/:fileId`
Permanently delete a file from both PostgreSQL and Cloudinary.
* **Authentication**: `Bearer <JWT_TOKEN>`
* **Permissions**: **Only** the original uploader or an `ADMIN` can delete. Non-uploaders receive `403 FORBIDDEN`.
* **Response `200 OK`**:
```json
{
  "success": true,
  "message": "File deleted successfully.",
  "data": {
    "id": "f8a9b0c1-...",
    "deleted": true
  }
}
```

---

## 6. Error Responses

All error responses return consistent JSON:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable description."
  }
}
```

| HTTP Status | Code | Meaning |
| :--- | :--- | :--- |
| `400` | `VALIDATION_ERROR` | Invalid fields, mismatched extension, or failed magic byte check |
| `400` | `MISSING_FILE` | No file found in `file` multipart field |
| `401` | `UNAUTHENTICATED` | Missing or invalid Bearer token |
| `403` | `FORBIDDEN` | Requesting user does not belong to project, or non-uploader trying to delete |
| `404` | `PROJECT_NOT_FOUND` | Project ID does not exist |
| `404` | `FILE_NOT_FOUND` | File ID does not exist |
| `413` | `FILE_TOO_LARGE` | Upload exceeds maximum size (10 MB) |
| `429` | `UPLOAD_RATE_LIMITED` | Too many uploads from this IP |

---

## 7. Chapa Escrow Payment Routes (`/api/payments`)

### `POST /api/payments/initialize`
Client initializes escrow funding via Chapa checkout.
* **Authentication**: `Bearer <CLIENT_TOKEN>`
* **Content-Type**: `application/json`
* **Request Body**:
```json
{
  "projectId": "b1e2c3d4-..."
}
```
*Note: Amount and currency are securely retrieved from the trusted database project record.*

* **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Checkout initialized successfully.",
  "data": {
    "paymentId": "5fa8c21a-...",
    "txRef": "TP-TX-b1e2c3d4-1729768000000-a1b2c3",
    "amount": "2500.00",
    "currency": "ETB",
    "checkoutUrl": "https://checkout.chapa.co/checkout/payment/...",
    "isReused": false
  }
}
```

---

### `GET /api/payments/verify/:txRef` (or `GET /api/payments/:paymentId/verify`)
Verifies payment status directly server-to-server with Chapa.
* **Authentication**: `Bearer <JWT_TOKEN>` (Must be project member or admin)
* **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Payment verified successfully. Project escrow is funded.",
  "data": {
    "id": "5fa8c21a-...",
    "projectId": "b1e2c3d4-...",
    "txRef": "TP-TX-b1e2c3d4-1729768000000-a1b2c3",
    "amount": "2500.00",
    "currency": "ETB",
    "status": "SUCCESSFUL",
    "paymentMethod": "telebirr",
    "verifiedAt": "2026-10-24T12:15:00.000Z"
  }
}
```

---

### `POST /api/payments/webhook`
Chapa incoming webhook endpoint.
* **Authentication**: Cryptographic `x-chapa-signature` (HMAC SHA-256)
* **Response `200 OK`**:
```json
{
  "isValid": true,
  "statusCode": 200,
  "message": "Webhook processed successfully.",
  "duplicate": false
}
```

---

### `GET /api/payments/banks`
List all supported Ethiopian banks for freelancer payouts.
* **Authentication**: `Bearer <JWT_TOKEN>`
* **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "banks": [
      { "id": "856", "name": "Commercial Bank of Ethiopia", "code": "CBE" },
      { "id": "947", "name": "Bank of Abyssinia", "code": "BOA" },
      { "id": "853", "name": "Telebirr", "code": "TELEBIRR" }
    ]
  }
}
```

---

## 8. Escrow Lifecycle & Deliverable Acceptance (`/api/projects/:projectId`)

| Method | Endpoint | Permitted Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/projects/:id/accept-agreement` | Client / Freelancer | Accept contract (`DRAFT` → `AWAITING_PAYMENT`) |
| `POST` | `/api/projects/:id/submit-deliverable` | Freelancer | Submit work for review (`FUNDED` → `CLIENT_REVIEW`) |
| `POST` | `/api/projects/:id/accept-deliverable` | Client | Approve work & authorize fund release (`CLIENT_REVIEW` → `RELEASE_APPROVED`) |
| `POST` | `/api/projects/:id/request-revision` | Client | Request revision with reason (`CLIENT_REVIEW` → `REVISION_REQUESTED`) |
| `POST` | `/api/projects/:id/dispute` | Client / Freelancer | Open dispute, freezing funds and payouts (`*` → `DISPUTED`) |
| `GET` | `/api/projects/:id/activities` | Project Members | View chronological audit timeline of all escrow events |

---

## 9. Freelancer Payout Routes (`/api/payouts`)

### `POST /api/payouts/profile`
Freelancer configures bank account for receiving payouts.
* **Authentication**: `Bearer <FREELANCER_TOKEN>`
* **Request Body**:
```json
{
  "bankCode": "856",
  "bankName": "Commercial Bank of Ethiopia",
  "accountNumber": "1000123456789",
  "accountName": "Abebe Kebede"
}
```

### `POST /api/payouts/project/:projectId`
Initiate release payout to freelancer via Chapa Transfers API.
* **Authentication**: `Bearer <JWT_TOKEN>` (Must be project member or admin)
* **Pre-condition**: Project must be in `RELEASE_APPROVED` state.
* **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Payout completed successfully.",
  "data": {
    "payout": {
      "id": "e3a1...",
      "reference": "TP-PO-b1e2c3d4-...",
      "amount": "2500.00",
      "currency": "ETB",
      "status": "SUCCESSFUL"
    },
    "projectStatus": "PAID_OUT"
  }
}
```

