# Backend Setup Guide

This guide details how to set up the Node.js backend with the Oracle Database.

## 1. Prerequisites

- Node.js (v16+)
- Oracle Database access
- Connection Credentials:
  - **User**: `nts`
  - **Password**: `nts`
  - **Connection**: `192.168.1.154:1523/ORCLPDB1`

## 2. Database Initialization

Before running the server, you must create the required tables in your Oracle Database.

1.  Connect to your database using a tool like SQL Developer or SQLPlus.
2.  Open `backend/schema.sql`.
3.  Run the script to create tables (`DOC_MASTERS`, `DOC_IMAGES`) and sequences.

## 3. Application Setup

Navigate to the `backend` directory:

```bash
cd backend
npm install
```

## 4. Configuration

The configuration is located in `backend/dbConfig.js`. It defaults to the provided `nts` credentials. You can override these using environment variables:

- `DB_USER`
- `DB_PASSWORD`
- `DB_CONNECT_STRING`

## 5. Running the Server

Start the server:

```bash
npm start
```

The server will start on port **3001**.
Test the connection: `GET http://localhost:3001/api/health`

## 6. Frontend Integration

To connect the frontend to this backend:

1.  Open `App.tsx` in the root folder.
2.  Locate the `handleSync` function.
3.  Replace the simulated delay with a real `fetch` call:

```javascript
const response = await fetch('http://localhost:3001/api/v1/documents/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transactionId: doc.id,
    metadata: {
      fullName: doc.name,
      dateOfBirth: doc.dob,
      phoneNumber: doc.phone,
      capturedAt: doc.createdAt,
    },
    attachments: details.map((d) => ({
      sequence: d.sequence,
      mimeType: d.mimeType,
      data: d.imageData,
    })),
  }),
});
```
