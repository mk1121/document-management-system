# Oracle Integration Guide

This document outlines the expected API contract between the DocuDigitize frontend and the Oracle Backend Service.

## Endpoint

`POST /api/v1/documents/sync`

## Request Payload

The frontend sends one document (Master + Details) per request.

```json
{
  "transactionId": "uuid-v4-string",
  "metadata": {
    "fullName": "Rahim Uddin",
    "dateOfBirth": "1990-01-01",
    "phoneNumber": "01711000000",
    "capturedAt": 1715423455000
  },
  "attachments": [
    {
      "sequence": 1,
      "mimeType": "image/jpeg",
      "data": "base64_encoded_string_without_prefix..."
    },
    {
      "sequence": 2,
      "mimeType": "image/jpeg",
      "data": "base64_encoded_string_without_prefix..."
    }
  ]
}
```

## Response

### Success (200 OK)

```json
{
  "status": "success",
  "oracleRecordId": 102030,
  "message": "Data committed successfully"
}
```

### Failure (4xx/5xx)

```json
{
  "status": "error",
  "code": "ORA-001",
  "message": "Duplicate entry found for phone number"
}
```

## Backend Database Schema Recommendation

**Table: DOC_MASTERS**

- ID (PK, NUMBER)
- FULL_NAME (VARCHAR2)
- DOB (DATE)
- PHONE (VARCHAR2)
- CREATED_AT (TIMESTAMP)

**Table: DOC_IMAGES**

- ID (PK, NUMBER)
- MASTER_ID (FK, NUMBER)
- SEQUENCE_NO (NUMBER)
- IMAGE_BLOB (BLOB)

_Note: The frontend sends Base64. The backend API layer should decode this to raw bytes before inserting into the BLOB column._
