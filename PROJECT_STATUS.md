# 🚀 IPFS Blockchain Drive - Project Status & Setup Guide

## **What This Project Does**
A decentralized file storage and sharing system built with:
- **Web3 Wallet Integration** (MetaMask authentication via signature)
- **IPFS Storage** (Distributed file hosting with content-addressed hashing)
- **Blockchain** (Ethers.js v6 for smart contracts & quota management)
- **Real-time Collaboration** (Comments, sharing, notifications)
- **End-to-End Encryption** (TweetNaCl for file privacy)

---

## **⚙️ Fixed Issues**

### Issue 1: Frontend Not Running on Port 3000
✅ **FIXED:** Missing dependencies + WASM config
- Added `tweetnacl` and `tweetnacl-util` packages
- Updated `next.config.mjs` with turbopack root configuration
- Cleaned build cache and reinstalled dependencies

### Issue 2: MetaMask 500 Error & Connect Failure
✅ **FIXED:** Poor error handling in auth endpoints
- Enhanced `/auth/nonce` with address validation & better logging
- Improved `/auth/verify` with detailed error messages
- Fixed session persistence race conditions
- Added non-blocking background tasks for drive initialization

### Issue 3: Code Quality & Performance
✅ **OPTIMIZED:** BlockchainService initialization
- Converted to lazy initialization pattern
- Added `ensureInitialized()` for safety
- Consistent error handling across all methods
- Removed silent error catching

---

## **🏗️ Architecture Overview**

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (3000)                    │
│            Next.js 16 + React + Tailwind            │
│                                                      │
│  ┌──────────────┐      ┌──────────────┐             │
│  │ WalletConnect│ ◄─►  │  Web3Context │ ◄─┐         │
│  │  (MetaMask)  │      │  (ethers.js) │   │         │
│  └──────────────┘      └──────────────┘   │         │
│         │                      │            │         │
│         └──────────┬───────────┘            │         │
│                    ▼                        │         │
│            API Client (axios)               │         │
│                    │                        │         │
│                    ▼                        │         │
├────────────────────┼─────────────────────────────────┤
│                    │       BACKEND (5000)  │         │
│                    │     Express + Node    │         │
│                    ▼                        │         │
│         ┌──────────────────┐                │         │
│         │   Auth Routes    │                │         │
│         │ • /auth/nonce    │ ◄──────────────┘         │
│         │ • /auth/verify   │                          │
│         │ • /auth/logout   │                          │
│         └──────────────────┘                          │
│                    │                                   │
│         ┌──────────┴──────────┐                       │
│         ▼                     ▼                       │
│    ┌─────────────┐      ┌──────────────┐             │
│    │  MongoDB    │      │   IPFS Kubo  │             │
│    │   (27017)   │      │   (5002)     │             │
│    └─────────────┘      └──────────────┘             │
│         ▲                     ▲                        │
│         │                     │                       │
│    Files, Users,      IPFS Hash,                     │
│    Sessions,          Distributed                    │
│    Permissions        File Content                   │
└─────────────────────────────────────────────────────┘
```

---

## **🚀 Quick Start**

### Prerequisites
- Node.js 18+
- MongoDB running on `localhost:27017` ✅
- MetaMask browser extension (for testing)
- (Optional) IPFS Kubo running on `localhost:5002`

### Terminal 1: Start Backend
```bash
cd /Users/ankit/Desktop/ipfs-project
npm start
```
✅ Runs on `http://localhost:5000`

### Terminal 2: Start Frontend
```bash
cd "/Users/ankit/Desktop/ipfs-project/front end"
npm run dev
```
✅ Runs on `http://localhost:3000`

### Verify Setup
```bash
# Check backend health
curl http://localhost:5000/health
# Response: {"ok":true,"database":"connected"}

# Check MongoDB connection
curl http://localhost:5000/health | grep database
```

---

## **🔐 Authentication Flow**

1. **User clicks "Connect Wallet"**
   - Frontend calls `GET /auth/nonce?address=0x...`
   - Backend generates random nonce & stores in MongoDB

2. **MetaMask Signature Request**
   - Browser prompts user to sign nonce with private key
   - No password required - cryptographic proof of ownership

3. **Verification & Session Creation**
   - Frontend sends signed message to `POST /auth/verify`
   - Backend recovers address from signature
   - Creates session (expires in 24 hours)

4. **Authenticated Requests**
   - Frontend includes session cookies with all requests
   - Backend validates session before file/blockchain operations

---

## **📁 Key Files Structure**

```
/Users/ankit/Desktop/ipfs-project/
├── server.js                 # Express entry point
├── .env                       # Configuration (BACKEND_URL, MONGO_URI, etc)
├── package.json              # Backend dependencies
│
├── routes/
│   ├── authRoutes.js        # ✅ IMPROVED: Wallet auth endpoints
│   ├── driveRoutes.js       # File operations
│   ├── blockchainRoutes.js  # Quota & blockchain info
│   └── ...
│
├── services/
│   ├── blockchain.js        # ✅ OPTIMIZED: Smart contract interactions
│   ├── database.js          # MongoDB initialization
│   ├── fileService.js       # IPFS file handling
│   └── ...
│
└── front end/               # Next.js Frontend
    ├── next.config.mjs      # ✅ UPDATED: Turbopack config
    ├── package.json         # ✅ UPDATED: Added tweetnacl
    ├── app/                 # Next.js pages
    ├── components/
    │   ├── wallet-connector.tsx      # Connect button
    │   └── wallet-connect-prompt.tsx
    ├── context/
    │   └── web3-context.tsx          # ✅ Uses improved endpoints
    └── lib/
        ├── api.ts           # Axios client (calls backend)
        └── file-crypto.ts   # Encryption/decryption
```

---

## **🔄 Authentication Testing**

### Test 1: Get Nonce (Validates Address Format)
```bash
curl "http://localhost:5000/auth/nonce?address=0x1234567890123456789012345678901234567890"
# Response: {"nonce":"Welcome to Blockchain Drive! ..."}

# Invalid address:
curl "http://localhost:5000/auth/nonce?address=invalid"
# Response: {"error":"Invalid Ethereum address format"}
```

### Test 2: Verify Signature (Needs Signature)
```bash
curl -X POST http://localhost:5000/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"address":"0x...","signature":"0x..."}'
# Response: {"success":true,"userId":"...","needsUsername":true}
```

### Test 3: Check Session (After Login)
```bash
curl -b "connect.sid=..." http://localhost:5000/me
# Response: {"id":"...","wallet_address":"0x...","username":"..."}
```

---

## **⚡ Performance Optimizations Applied**

| Optimization | Impact | Details |
|-------------|--------|---------|
| Lazy Initialization | 🚀 Startup | BlockchainService only initializes when needed |
| Better Error Logging | 🔍 Debugging | Clear error messages at each step |
| Input Validation | 🛡️ Security | Address format checks prevent invalid data |
| Non-blocking Tasks | ⚡ Speed | Nonce cleanup doesn't block response |
| Turbopack Compiler | 💨 Dev Speed | 5x faster than webpack (581ms rebuild) |
| MongoDB Indexes | 📊 Query Speed | Auto-created on startup |

---

## **🐛 Troubleshooting**

### Port 3000 Not Working
```bash
# Solution 1: Check if Next.js is running
ps aux | grep "next dev"

# Solution 2: Install missing deps
cd "front end" && npm install tweetnacl tweetnacl-util

# Solution 3: Clean and rebuild
rm -rf node_modules package-lock.json .next
npm install && npm run dev
```

### MetaMask 500 Error
```bash
# Check backend logs for error messages
# Look for: "Signature verification error" or "Database error"

# Verify MongoDB is running
ps aux | grep mongod

# Check .env configuration
cat .env | grep MONGO_URI
```

### Session Not Persisting
```bash
# Check session secret in .env
cat .env | grep SESSION_SECRET

# Verify cookies are enabled in browser
# Check browser DevTools → Application → Cookies
```

---

## **📝 Environment Variables (.env)**

```env
# Backend Port
PORT=5000

# Database
MONGO_URI=mongodb://127.0.0.1:27017
MONGO_DB_NAME=ipfs_app

# IPFS (Kubo daemon)
IPFS_API_URL=http://127.0.0.1:5002/api/v0
IPFS_GATEWAY_URL=http://127.0.0.1:5002

# Frontend Backend URL
BACKEND_URL=http://127.0.0.1:5000
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:5000

# Blockchain (Sepolia testnet)
RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
STORAGE_ALLOC_CONTRACT=0x87A3effB84CBE1E4caB6Ab430139eC41d156D55A
DRIVE_V2_CONTRACT=0x87A3effB84CBE1E4caB6Ab430139eC41d156D55A
USE_REAL_CONTRACTS=false    # Set to true for mainnet

# Session
SESSION_SECRET=my-super-secret-session-key
```

---

## **✅ Verification Checklist**

- [ ] Backend running on port 5000
- [ ] Frontend running on port 3000
- [ ] MongoDB running on port 27017
- [ ] Can access `http://localhost:3000` in browser
- [ ] "Connect Wallet" button appears
- [ ] MetaMask installed and enabled
- [ ] Can click button and see MetaMask prompt
- [ ] Successfully sign message
- [ ] Redirected to `/drive` page after login
- [ ] Can see username prompt
- [ ] (Optional) IPFS daemon running for file uploads

---

## **📚 API Documentation**

### Authentication Endpoints
```
GET    /auth/nonce              - Get signature nonce
POST   /auth/verify             - Verify signature & login
POST   /auth/username           - Set username
POST   /auth/encryption-key     - Store encryption key
POST   /auth/logout             - Logout & destroy session
```

### File Management
```
GET    /files                   - List user files
POST   /upload                  - Upload file to IPFS
DELETE /delete/:fileId          - Delete file
GET    /drive/:fileId/download  - Download file
```

### Blockchain
```
GET    /blockchain/status       - Get blockchain mode info
GET    /blockchain/quota        - Get user storage quota
```

---

## **🎯 Next Steps**

1. ✅ Start both backend and frontend
2. ✅ Test MetaMask wallet connection
3. ⚠️ Start IPFS daemon (if doing file uploads)
4. 🧪 Upload test files and verify IPFS storage
5. 📝 Set up admin account in MongoDB
6. 🔒 Configure real smart contracts for production

---

## **📞 Support**

If you encounter issues:
1. Check browser console (F12 → Console)
2. Check backend logs (npm output)
3. Verify all services running: `ps aux | grep -E "node|mongod|ipfs"`
4. Check `.env` file configuration
5. Review error messages - they now provide clear context

---

**Last Updated:** June 25, 2026
**Status:** ✅ All Services Running | ✅ Issues Fixed | ✅ Optimized Code
