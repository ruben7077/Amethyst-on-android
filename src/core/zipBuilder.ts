export interface ZipInputFile {
  path: string;
  content: string | Uint8Array;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function buildZipArchive(files: ZipInputFile[]): Uint8Array {
  const encoder = new TextEncoder();
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.path);
    const dataBytes =
      typeof file.content === 'string' ? encoder.encode(file.content) : file.content;
    const crc = crc32(dataBytes);

    // Local file header (30 bytes + filename)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true); // Local file header signature
    lv.setUint16(4, 20, true); // Version needed
    lv.setUint16(6, 0x0800, true); // UTF-8 filename flag
    lv.setUint16(8, 0, true); // Compression method: 0 (store)
    lv.setUint16(10, 0, true); // Mod time
    lv.setUint16(12, 0x5421, true); // Mod date
    lv.setUint32(14, crc, true);
    lv.setUint32(18, dataBytes.length, true);
    lv.setUint32(22, dataBytes.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    localChunks.push(localHeader, dataBytes);

    // Central directory header (46 bytes + filename)
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x5421, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, dataBytes.length, true);
    cv.setUint32(24, dataBytes.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    centralChunks.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralSize = centralChunks.reduce((sum, c) => sum + c.length, 0);
  const endRecord = new Uint8Array(22);
  const ev = new DataView(endRecord.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const totalLength = offset + centralSize + endRecord.length;
  const output = new Uint8Array(totalLength);
  let cursor = 0;

  for (const chunk of localChunks) {
    output.set(chunk, cursor);
    cursor += chunk.length;
  }
  for (const chunk of centralChunks) {
    output.set(chunk, cursor);
    cursor += chunk.length;
  }
  output.set(endRecord, cursor);

  return output;
}

export interface ArchiveModScan {
  entries: string[];
  soLibraries: string[];
  hasPacks: boolean;
  modJsonText: string | null;
  manifestJsonText: string | null;
}

async function inflateRawBytes(compressed: Uint8Array): Promise<Uint8Array | null> {
  if (typeof DecompressionStream === 'undefined') {
    return null;
  }
  try {
    const ds = new DecompressionStream('deflate-raw');
    const copy = new Uint8Array(compressed.byteLength);
    copy.set(compressed);
    const stream = new Blob([copy]).stream().pipeThrough(ds);
    const buffer = await new Response(stream).arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

export async function scanAmethystArchive(bytes: Uint8Array): Promise<ArchiveModScan | null> {
  if (bytes.length < 22) return null;

  // Locate End of Central Directory (PK\x05\x06) scanning backwards
  const minOffset = Math.max(0, bytes.length - 65557);
  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= minOffset; i--) {
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x05 &&
      bytes[i + 3] === 0x06
    ) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const centralOffset = view.getUint32(eocdOffset + 16, true);
  if (centralOffset >= bytes.length) return null;

  const decoder = new TextDecoder('utf-8');
  const entries: string[] = [];
  const soLibraries: string[] = [];
  let hasPacks = false;
  let modJsonText: string | null = null;
  let manifestJsonText: string | null = null;

  const readEntryBytes = async (
    localHeaderOffset: number,
    method: number,
    compressedSize: number
  ): Promise<Uint8Array | null> => {
    if (localHeaderOffset + 30 > bytes.length) return null;
    if (view.getUint32(localHeaderOffset, true) !== 0x04034b50) return null;
    const fnLen = view.getUint16(localHeaderOffset + 26, true);
    const extraLen = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + fnLen + extraLen;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > bytes.length) return null;
    const slice = bytes.subarray(dataStart, dataEnd);
    if (method === 0) return slice;
    if (method === 8) return inflateRawBytes(slice);
    return null;
  };

  let cursor = centralOffset;
  for (let idx = 0; idx < totalEntries && cursor + 46 <= eocdOffset; idx++) {
    if (view.getUint32(cursor, true) !== 0x02014b50) break;
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const fileNameLen = view.getUint16(cursor + 28, true);
    const extraLen = view.getUint16(cursor + 30, true);
    const commentLen = view.getUint16(cursor + 32, true);
    const localHeaderOffset = view.getUint32(cursor + 42, true);

    const nameStart = cursor + 46;
    const nameEnd = nameStart + fileNameLen;
    if (nameEnd > bytes.length) break;

    const rawName = decoder.decode(bytes.subarray(nameStart, nameEnd));
    const normalized = rawName.replace(/\\/g, '/');
    entries.push(normalized);

    const lower = normalized.toLowerCase();
    if (lower.endsWith('.so')) {
      soLibraries.push(normalized);
    }
    if (
      lower.includes('behavior_packs/') ||
      lower.includes('resource_packs/')
    ) {
      hasPacks = true;
    }

    if (lower === 'mod.json' || lower.endsWith('/mod.json')) {
      const content = await readEntryBytes(localHeaderOffset, method, compressedSize);
      if (content) {
        modJsonText = decoder.decode(content);
      }
    } else if (
      !manifestJsonText &&
      (lower === 'manifest.json' || lower.endsWith('/manifest.json'))
    ) {
      const content = await readEntryBytes(localHeaderOffset, method, compressedSize);
      if (content) {
        manifestJsonText = decoder.decode(content);
      }
    }

    cursor = nameEnd + extraLen + commentLen;
  }

  return {
    entries,
    soLibraries,
    hasPacks,
    modJsonText,
    manifestJsonText,
  };
}

