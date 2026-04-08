export interface FileItem {
  id: string
  name: string
  type: 'file' | 'folder'
  size?: number | string
  mimeType?: string
  modified: Date | string
  created: Date | string
  owner: string
  shared: boolean
  starred: boolean
  parentId?: string
  children?: FileItem[]
  // IPFS/Blockchain properties
  ipfsHash?: string
  cid?: string       // CID from the backend (same as ipfsHash)
  customHash?: string
  ownerAddress?: string
  txHash?: string
  isOnBlockchain?: boolean
  verified?: boolean
}

export interface User {
  id: string
  name: string
  walletAddress: string
  role: 'admin' | 'commenter' | 'uploader'
  storageUsed: number
  storageQuota: number
  createdAt: Date
  lastLogin?: Date | null
  isActive: boolean
  profilePicture?: string
}

export interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalStorage: number
  usedStorage: number
  availableStorage: number
  averageStoragePerUser: number
}

// Mock files with nested folder structure
export const mockFiles: FileItem[] = [
  {
    id: '1',
    name: 'Project Documents',
    type: 'folder',
    modified: new Date('2024-03-08'),
    created: new Date('2024-01-15'),
    owner: 'You',
    shared: false,
    starred: true,
    parentId: undefined,
    isOnBlockchain: true,
    verified: true,
    ownerAddress: '0x1234...5678',
    children: [
      {
        id: '1-1',
        name: 'Q1 Report.pdf',
        type: 'file',
        size: 1500000,
        mimeType: 'application/pdf',
        modified: new Date('2024-03-07'),
        created: new Date('2024-03-01'),
        owner: 'You',
        shared: false,
        starred: false,
        parentId: '1',
        ipfsHash: 'QmXxxx...xxxx',
        isOnBlockchain: true,
        verified: true,
        ownerAddress: '0x1234...5678',
      },
      {
        id: '1-2',
        name: 'Development Specs',
        type: 'folder',
        modified: new Date('2024-03-06'),
        created: new Date('2024-02-15'),
        owner: 'You',
        shared: true,
        starred: false,
        parentId: '1',
        isOnBlockchain: true,
        verified: true,
        children: [
          {
            id: '1-2-1',
            name: 'API Documentation.md',
            type: 'file',
            size: 250000,
            mimeType: 'text/markdown',
            modified: new Date('2024-03-06'),
            created: new Date('2024-02-20'),
            owner: 'You',
            shared: true,
            starred: true,
            parentId: '1-2',
            ipfsHash: 'QmYyyy...yyyy',
            isOnBlockchain: true,
            verified: true,
            ownerAddress: '0x1234...5678',
          },
          {
            id: '1-2-2',
            name: 'Database Schema.sql',
            type: 'file',
            size: 125000,
            mimeType: 'application/x-sql',
            modified: new Date('2024-03-05'),
            created: new Date('2024-02-18'),
            owner: 'You',
            shared: false,
            starred: false,
            parentId: '1-2',
            ipfsHash: 'QmZzzz...zzzz',
            isOnBlockchain: false,
            verified: false,
          },
        ],
      },
      {
        id: '1-3',
        name: 'Meeting Notes.docx',
        type: 'file',
        size: 280000,
        mimeType: 'application/msword',
        modified: new Date('2024-03-04'),
        created: new Date('2024-02-25'),
        owner: 'You',
        shared: true,
        starred: false,
        parentId: '1',
        ipfsHash: 'QmWwww...wwww',
        isOnBlockchain: true,
        verified: true,
        ownerAddress: '0x1234...5678',
      },
    ],
  },
  {
    id: '2',
    name: 'Design Assets',
    type: 'folder',
    modified: new Date('2024-03-07'),
    created: new Date('2024-02-10'),
    owner: 'You',
    shared: true,
    starred: false,
    parentId: undefined,
    isOnBlockchain: true,
    verified: true,
    children: [
      {
        id: '2-1',
        name: 'Logos',
        type: 'folder',
        modified: new Date('2024-03-07'),
        created: new Date('2024-02-15'),
        owner: 'You',
        shared: true,
        starred: false,
        parentId: '2',
        isOnBlockchain: true,
        verified: true,
        children: [
          {
            id: '2-1-1',
            name: 'logo-dark.png',
            type: 'file',
            size: 450000,
            mimeType: 'image/png',
            modified: new Date('2024-03-05'),
            created: new Date('2024-02-18'),
            owner: 'You',
            shared: true,
            starred: true,
            parentId: '2-1',
            ipfsHash: 'QmUuuu...uuuu',
            isOnBlockchain: true,
            verified: true,
            ownerAddress: '0x1234...5678',
          },
        ],
      },
      {
        id: '2-2',
        name: 'UI Components.figma',
        type: 'file',
        size: 8500000,
        mimeType: 'application/x-figma',
        modified: new Date('2024-03-06'),
        created: new Date('2024-02-20'),
        owner: 'You',
        shared: true,
        starred: false,
        parentId: '2',
        ipfsHash: 'QmTttt...tttt',
        isOnBlockchain: false,
        verified: false,
      },
    ],
  },
  {
    id: '3',
    name: 'Presentation.pptx',
    type: 'file',
    size: 2500000,
    mimeType: 'application/vnd.presentationml',
    modified: new Date('2024-03-06'),
    created: new Date('2024-03-01'),
    owner: 'You',
    shared: true,
    starred: false,
    ipfsHash: 'QmSsss...ssss',
    isOnBlockchain: true,
    verified: true,
    ownerAddress: '0x1234...5678',
  },
  {
    id: '4',
    name: 'Budget 2024.xlsx',
    type: 'file',
    size: 350000,
    mimeType: 'application/vnd.ms-excel',
    modified: new Date('2024-03-05'),
    created: new Date('2024-01-20'),
    owner: 'You',
    shared: false,
    starred: true,
    ipfsHash: 'QmRrrr...rrrr',
    isOnBlockchain: true,
    verified: true,
    ownerAddress: '0x1234...5678',
  },
  {
    id: '5',
    name: 'Team Meeting Notes.docx',
    type: 'file',
    size: 180000,
    mimeType: 'application/msword',
    modified: new Date('2024-03-09'),
    created: new Date('2024-02-28'),
    owner: 'You',
    shared: true,
    starred: false,
    isOnBlockchain: false,
    verified: false,
  },
]

// Mock users
export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Admin User',
    walletAddress: '0x1111111111111111111111111111111111111111',
    role: 'admin',
    storageUsed: 15738000000,
    storageQuota: 1099511627776,
    createdAt: new Date('2024-01-01'),
    lastLogin: new Date('2024-03-09'),
    isActive: true,
  },
  {
    id: '2',
    name: 'John Doe',
    walletAddress: '0x2222222222222222222222222222222222222222',
    role: 'user',
    storageUsed: 53687091200,
    storageQuota: 107374182400,
    createdAt: new Date('2024-01-15'),
    lastLogin: new Date('2024-03-08'),
    isActive: true,
  },
  {
    id: '3',
    name: 'Sarah Smith',
    walletAddress: '0x3333333333333333333333333333333333333333',
    role: 'user',
    storageUsed: 10737418240,
    storageQuota: 107374182400,
    createdAt: new Date('2024-02-01'),
    lastLogin: new Date('2024-03-07'),
    isActive: true,
  },
  {
    id: '4',
    name: 'Mike Johnson',
    walletAddress: '0x4444444444444444444444444444444444444444',
    role: 'user',
    storageUsed: 32212254720,
    storageQuota: 107374182400,
    createdAt: new Date('2024-02-10'),
    lastLogin: new Date('2024-03-06'),
    isActive: true,
  },
  {
    id: '5',
    name: 'Emily Brown',
    walletAddress: '0x5555555555555555555555555555555555555555',
    role: 'user',
    storageUsed: 21474836480,
    storageQuota: 107374182400,
    createdAt: new Date('2024-02-20'),
    lastLogin: null,
    isActive: false,
  },
]

// Calculate admin stats
export const mockAdminStats: AdminStats = {
  totalUsers: mockUsers.length,
  activeUsers: mockUsers.filter(u => u.isActive).length,
  totalStorage: 1099511627776 * mockUsers.length,
  usedStorage: mockUsers.reduce((acc, u) => acc + u.storageUsed, 0),
  availableStorage: (1099511627776 * mockUsers.length) - mockUsers.reduce((acc, u) => acc + u.storageUsed, 0),
  averageStoragePerUser: mockUsers.reduce((acc, u) => acc + u.storageUsed, 0) / mockUsers.length,
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

export function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function getFileIcon(mimeType?: string): string {
  if (!mimeType) return '📄'
  if (mimeType.includes('image')) return '🖼️'
  if (mimeType.includes('video')) return '🎬'
  if (mimeType.includes('audio')) return '🎵'
  if (mimeType.includes('pdf')) return '📕'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊'
  if (mimeType.includes('presentation')) return '📑'
  return '📄'
}
