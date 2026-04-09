type FileLike = {
  type?: string
  name?: string
}

const TYPE_ORDER = [
  'folder',
  'image',
  'document',
  'video',
  'audio',
  'archive',
  'code',
  'other',
] as const

type FileTypeBucket = (typeof TYPE_ORDER)[number]

function getExtension(name: string): string {
  const idx = name.lastIndexOf('.')
  if (idx < 0 || idx === name.length - 1) return ''
  return name.slice(idx + 1).toLowerCase()
}

function classifyFileType(file: FileLike): FileTypeBucket {
  if (String(file.type || '').toLowerCase() === 'folder') return 'folder'
  const ext = getExtension(String(file.name || ''))

  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return 'image'
  if (['pdf', 'doc', 'docx', 'txt', 'md', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext)) return 'document'
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'video'
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) return 'audio'
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive'
  if (['js', 'ts', 'tsx', 'jsx', 'json', 'sol', 'py', 'java', 'go', 'rs', 'c', 'cpp', 'h'].includes(ext)) return 'code'
  return 'other'
}

function compareFiles(a: FileLike, b: FileLike): number {
  const ta = classifyFileType(a)
  const tb = classifyFileType(b)
  const typeRank = TYPE_ORDER.indexOf(ta) - TYPE_ORDER.indexOf(tb)
  if (typeRank !== 0) return typeRank

  const an = String(a.name || '').toLowerCase()
  const bn = String(b.name || '').toLowerCase()
  if (an < bn) return -1
  if (an > bn) return 1
  return 0
}

// Merge sort implementation from scratch (stable O(n log n)).
function mergeSort<T extends FileLike>(arr: T[]): T[] {
  if (arr.length <= 1) return arr
  const mid = Math.floor(arr.length / 2)
  const left = mergeSort(arr.slice(0, mid))
  const right = mergeSort(arr.slice(mid))
  return merge(left, right)
}

function merge<T extends FileLike>(left: T[], right: T[]): T[] {
  const out: T[] = []
  let i = 0
  let j = 0
  while (i < left.length && j < right.length) {
    if (compareFiles(left[i], right[j]) <= 0) {
      out.push(left[i])
      i += 1
    } else {
      out.push(right[j])
      j += 1
    }
  }
  while (i < left.length) out.push(left[i++])
  while (j < right.length) out.push(right[j++])
  return out
}

export function sortFilesByTypeFromScratch<T extends FileLike>(files: T[]): T[] {
  return mergeSort([...files])
}

