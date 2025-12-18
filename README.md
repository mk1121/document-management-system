# DocuDigitize Pro

**DocuDigitize Pro** is a high-performance, offline-first Progressive Web App (PWA) designed for mass document digitization. It enables field agents to capture, edit, organize, and upload hardcopy documents directly to an Oracle Database, even in low-connectivity environments.

## 🚀 Key Features

- **Offline-First PWA**: Fully functional offline using Service Workers. Installable on mobile and desktop.
- **Robust Sync Engine**: Stores records locally (IndexedDB) and syncs to Oracle Backend when online.
- **Smart Image Management**:
  - Client-side compression (JPEG 0.7, max 1200px).
  - Storage independent of sync status.
- **Editing Capabilities**: Modify unsynced documents (Pending/Failed) directly within the app.
- **Modern UI/UX**:
  - Dark/Light mode support.
  - Adaptive "D-shaped" branding icons.
  - Responsive design for all device sizes.
- **Reliability**:
  - Transactional saving (Master-Detail).
  - "Retry Failed" mechanism for error handling.

## 🛠 Tech Stack

### Frontend
- **Framework**: React 18 (Vite)
- **Styling**: Tailwind CSS
- **Local Storage**: Native IndexedDB (Wrappers in `services/db.ts`)
- **Icons**: Lucide React + Custom Assets
- **PWA**: `vite-plugin-pwa` (Workbox)

### Backend
- **Runtime**: Node.js (Express)
- **Database**: Oracle Database 19c+
- **Driver**: `node-oracledb`

### Infrastructure
- **CI/CD**: GitHub Actions (Test & Build on push)
- **Package Manager**: Bun / NPM

## 📂 Project Structure

```bash
/
├── public/                 # Static Assets (Icons, Manifest)
├── src/
│   ├── components/         # React Components (Header, DocumentCard, etc.)
│   ├── services/           # Business Logic (DB, Image Compression)
│   ├── App.tsx             # Main Controller
│   └── main.tsx            # Entry Point
├── backend/                # API Server
│   ├── server.js           # Express App
│   └── dbConfig.js         # Oracle Connection
├── .github/workflows/      # CI/CD Configurations
└── vite.config.ts          # Build & PWA Configuration
```

## 📖 Getting Started

### Prerequisites
- Node.js & Bun (or npm)
- Oracle Database (Local or Cloud)

### 1. Backend Setup
Navigate to `backend/` and install dependencies:
```bash
cd backend
npm install
```
Configure `.env` in `backend/`:
```env
DB_USER=your_user
DB_PASSWORD=your_password
DB_CONNECT_STRING=localhost/xepdb1
GEMINI_API_KEY=optional_utility_key
```
Start the server:
```bash
node server.js
```

### 2. Frontend Setup
Install dependencies:
```bash
bun install
```
Start Development Server:
```bash
bun run dev
```
Build for Production:
```bash
bun run build
```
Preview Production Build:
```bash
bun run preview
```

### 3. Testing
Run the test suite (Vitest):
```bash
bun run test
```

## 📱 Usage Workflow

1.  **Capture**: Enter details and attach images. Data is saved locally immediately.
2.  **Edit**: Tap the pencil icon on unsynced cards to correct mistakes.
3.  **Sync**: Click the "Sync" button in the header to upload pending records.
4.  **Install**: Click "Install App" (if supported) to add to home screen.

## 📄 License
Private Property of DocuDigitize Team.
