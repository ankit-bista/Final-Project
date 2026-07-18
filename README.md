# SecureVault 🔒

SecureVault is a decentralized file storage and sharing platform that bridges modern web technologies with Web3 infrastructure. By combining the InterPlanetary File System (IPFS), Ethereum blockchain, and Role-Based Access Control (RBAC), SecureVault provides highly resilient, tamper-proof, and secure cloud storage.

Unlike traditional centralized cloud providers, SecureVault eliminates single points of failure and implements a zero-trust architecture. It uses high-performance parallelized tree-hashing for file integrity and authenticated encryption to guarantee total data confidentiality.

---

## Key Features

* **Decentralized Storage:** Files are chunked and distributed across IPFS, ensuring high availability and system resilience.
* **Blockchain Integrity:** Cryptographic file metadata and transaction references are anchored to the Ethereum Sepolia Testnet for immutable tracking.
* **Role-Based Access Control (RBAC):** Distinct permission tiers managing data isolation for Users and Administrators.
* **Authenticated Encryption (AES-GCM):** Data is protected using Advanced Encryption Standard in Galois/Counter Mode, guaranteeing both data confidentiality and cryptographic proof of ciphertext integrity.
* **Parallelized Tree-Hashing (BLAKE3):** Leverages a modern tree-hashing structure to achieve ultra-fast, multi-threaded integrity checks and native alignment with IPFS chunk verification pipelines.
* **Drive Organization:** Support for isolated personal drives alongside collaborative shared workspaces.
* **Granular Sharing:** Generate secure, permission-controlled share links for external access.
* **Storage Quota Management:** Automated tracking and enforcement of user storage limits.

---

## Technology Stack

| Category | Technologies |
| :--- | :--- |
| **Frontend** | React, Material UI |
| **Backend** | Node.js, Express.js |
| **Storage** | IPFS (Kubo/Helia) |
| **Web3 / Blockchain** | Ethereum, Solidity, Sepolia Testnet, MetaMask |
| **Security** | bcrypt, AES-GCM (AEAD Encryption), BLAKE3 (Tree Hashing) |
| **Database** | MongoDB (for user profiles and metadata caching) |

---

## Prerequisites

Before running this project locally, ensure you have the following installed:
* **Node.js** (v18.x or higher recommended for native cryptographic support)
* **npm** or **yarn**
* **MetaMask** browser extension (connected to Sepolia Testnet)
* **MongoDB** (Local instance or MongoDB Atlas cluster)

---
System Architecture: IPFS, AES-GCM, and BLAKE3

To understand why AES-GCM and BLAKE3 are critical upgrades for SecureVault, it is essential to look at how they interact with the core architecture of IPFS (InterPlanetary File System).

IPFS fundamentally changes how data is stored by moving away from location-based addressing to content-based addressing. When a file is uploaded to IPFS, the network splits it into small chunks, hashes those chunks into a Merkle DAG (Directed Acyclic Graph), and outputs a unique root hash known as a CID (Content Identifier). While this makes the network incredibly resilient, it creates security and performance challenges that AES-GCM and BLAKE3 specifically solve.
1. The Privacy Problem: Solved by AES-GCM

IPFS is effectively a public bulletin board. If a raw file is uploaded to IPFS, anyone who discovers or guesses the CID can download the entire document. Therefore, in a zero-trust decentralized application like SecureVault, encryption must happen before the data ever touches the IPFS network.

    The Workflow: Before a file leaves the user's browser or backend, AES-GCM encrypts the plaintext using a secure, randomly generated symmetric key.

    The IPFS Upload: SecureVault then uploads this encrypted ciphertext blob to IPFS. Because the data is scrambled, the resulting public CID is entirely safe to store openly on the Ethereum blockchain.

    Tamper-Proofing (The "GCM" advantage): Because IPFS is decentralized, malicious nodes could theoretically attempt to alter hosted chunks. Because AES-GCM generates a Galois authentication tag alongside the ciphertext, the decryption process will instantly throw a hard error if even a single byte is manipulated.

2. The Performance Problem: Solved by BLAKE3

IPFS relies heavily on cryptographic hashing to verify files. Historically, nodes relied on strictly sequential hashing (like SHA-256), making it a severe bottleneck when processing large files. BLAKE3 solves this by structurally mirroring how IPFS works:

    Tree Architecture Matches IPFS Architecture: BLAKE3 is fundamentally built as a Merkle tree. It chops input data into 1 KiB chunks and hashes them upward into a single root hash. This perfectly mirrors the IPFS Merkle DAG structure.

    Chunk-Level Verification (Verified Streaming): Because of this shared tree-structure, BLAKE3 enables incremental verification. As SecureVault streams a large file down from various decentralized IPFS nodes, BLAKE3 can mathematically verify the integrity of each individual chunk as it arrives, rather than forcing the application to wait for the entire file to download before checking for corruption.

    Maximum Hardware Utilization: Because the chunks are independent, BLAKE3 allows the system to use all available CPU cores via SIMD instructions, processing decentralized data at speeds over 1 GB/s and eliminating legacy bottlenecks.