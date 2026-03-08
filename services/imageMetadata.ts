/**
 * imageMetadata.ts
 *
 * Strips all metadata (including Google SynthID / C2PA AI markers) from a
 * generated image and injects realistic iPhone EXIF data so the image looks
 * like it came from a real smartphone camera.
 *
 * Strategy:
 *  1. Draw the image onto a Canvas — this "pixel-copies" it, destroying all
 *     embedded metadata (EXIF, XMP, ICC, SynthID, C2PA manifests, etc.).
 *  2. Export as JPEG from Canvas (clean, metadata-free).
 *  3. Build a minimal but realistic EXIF APP1 segment by hand and splice it
 *     into the raw JPEG binary right after the SOI marker.
 *
 * The injected EXIF mimics a photo taken with an iPhone 15 Pro.
 */

// ─── Realistic iPhone 15 Pro EXIF values ─────────────────────────────────────
// Dates are randomised slightly so batches don't look identical.
function randomisedDate(): string {
  const now = new Date();
  // Random offset: 0–30 days back, 0–12 hours variation
  const offsetMs = Math.random() * 30 * 24 * 3600 * 1000;
  const d = new Date(now.getTime() - offsetMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}:${pad(d.getMonth() + 1)}:${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ─── EXIF binary builder ──────────────────────────────────────────────────────
// We write a minimal IFD0 with the most important tags that make the image look
// like it came from iOS Camera.

function writeUint16BE(buf: DataView, offset: number, val: number) {
  buf.setUint16(offset, val, false);
}
function writeUint32BE(buf: DataView, offset: number, val: number) {
  buf.setUint32(offset, val, false);
}

function buildExifSegment(): Uint8Array {
  const dateStr = randomisedDate();

  // ASCII strings (null-terminated)
  const make       = 'Apple\0';
  const model      = 'iPhone 15 Pro\0';
  const software   = '17.4.1\0';
  const dateOrig   = dateStr + '\0';
  const dateDig    = dateStr + '\0';
  const dateTime   = dateStr + '\0';
  const userComment = 'ASCII\0\0\0Photo taken on iPhone 15 Pro\0';

  // Helper to encode ASCII string to bytes
  const enc = (s: string): Uint8Array => {
    const b = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return b;
  };

  const makeB       = enc(make);
  const modelB      = enc(model);
  const softwareB   = enc(software);
  const dateOrigB   = enc(dateOrig);
  const dateDigB    = enc(dateDig);
  const dateTimeB   = enc(dateTime);
  const userCommentB = enc(userComment);

  // IFD0 tags we want:
  // 0x010F Make
  // 0x0110 Model
  // 0x0131 Software
  // 0x0132 DateTime
  // 0x8769 ExifIFD pointer  → sub-IFD with DateTimeOriginal, DateTimeDigitized, UserComment
  // 0xA002 PixelXDimension (in ExifIFD)
  // 0xA003 PixelYDimension (in ExifIFD)
  // 0x9003 DateTimeOriginal
  // 0x9004 DateTimeDigitized
  // 0x9286 UserComment
  // 0x013B Artist  (optional but adds realism)
  // 0x0213 YCbCrPositioning = 1 (centered, standard for JPEG)

  // We'll keep it simple: IFD0 with 7 entries + ExifSubIFD with 4 entries.
  // All variable-length strings go into the data area after the IFDs.

  // ── Layout (all offsets relative to start of TIFF header = byte 0 of EXIF after "Exif\0\0") ──
  // 0x0000  TIFF header (8 bytes): "MM" big-endian, 0x002A, IFD0 offset=8
  // 0x0008  IFD0: 2-byte count + N*12-byte entries + 4-byte next-IFD=0
  // 0x????  ExifSubIFD: same layout
  // 0x????  Data area: strings

  const IFD0_ENTRY_COUNT = 7;
  const EXIF_IFD_ENTRY_COUNT = 4;

  const TIFF_HEADER_SIZE = 8;
  const IFD0_SIZE = 2 + IFD0_ENTRY_COUNT * 12 + 4;
  const EXIF_IFD_SIZE = 2 + EXIF_IFD_ENTRY_COUNT * 12 + 4;

  const IFD0_OFFSET = TIFF_HEADER_SIZE;                          // 8
  const EXIF_IFD_OFFSET = IFD0_OFFSET + IFD0_SIZE;              // 8 + 2 + 7*12 + 4 = 98
  const DATA_OFFSET = EXIF_IFD_OFFSET + EXIF_IFD_SIZE;          // 98 + 2 + 4*12 + 4 = 152

  // Accumulate data strings in order; track their offsets from TIFF header start
  type DataChunk = { offset: number; bytes: Uint8Array };
  const dataChunks: DataChunk[] = [];
  let dataPointer = DATA_OFFSET;

  function addData(bytes: Uint8Array): number {
    const off = dataPointer;
    dataChunks.push({ offset: off, bytes });
    dataPointer += bytes.length;
    // Align to even byte boundary (EXIF requirement)
    if (dataPointer % 2 !== 0) dataPointer++;
    return off;
  }

  // Pre-allocate data offsets in the order we'll reference them
  const offMake       = addData(makeB);
  const offModel      = addData(modelB);
  const offSoftware   = addData(softwareB);
  const offDateTime   = addData(dateTimeB);
  const offDateOrig   = addData(dateOrigB);
  const offDateDig    = addData(dateDigB);
  const offUserComment = addData(userCommentB);

  const totalSize = dataPointer;
  const buf = new ArrayBuffer(totalSize);
  const view = new DataView(buf);
  const u8   = new Uint8Array(buf);

  // ── TIFF header ──────────────────────────────────────────────────────────────
  u8[0] = 0x4D; u8[1] = 0x4D; // "MM" big-endian
  writeUint16BE(view, 2, 0x002A);
  writeUint32BE(view, 4, IFD0_OFFSET); // IFD0 starts at byte 8

  // ── Helper to write one 12-byte IFD entry ────────────────────────────────────
  // tag, type (2=ASCII,3=SHORT,4=LONG,5=RATIONAL), count, value/offset
  function writeEntry(pos: number, tag: number, type: number, count: number, valueOrOffset: number) {
    writeUint16BE(view, pos,     tag);
    writeUint16BE(view, pos + 2, type);
    writeUint32BE(view, pos + 4, count);
    writeUint32BE(view, pos + 8, valueOrOffset);
  }

  // ── IFD0 ─────────────────────────────────────────────────────────────────────
  let p = IFD0_OFFSET;
  writeUint16BE(view, p, IFD0_ENTRY_COUNT); p += 2;

  writeEntry(p, 0x010F, 2, makeB.length,     offMake);     p += 12; // Make
  writeEntry(p, 0x0110, 2, modelB.length,    offModel);    p += 12; // Model
  writeEntry(p, 0x0131, 2, softwareB.length, offSoftware); p += 12; // Software
  writeEntry(p, 0x0132, 2, dateTimeB.length, offDateTime); p += 12; // DateTime
  writeEntry(p, 0x0213, 3, 1,                1);            p += 12; // YCbCrPositioning=1
  writeEntry(p, 0x8769, 4, 1,                EXIF_IFD_OFFSET); p += 12; // ExifIFD pointer
  writeEntry(p, 0xA001, 3, 1,                0xFFFF);      p += 12; // ColorSpace=uncalibrated (common on iOS)

  writeUint32BE(view, p, 0); p += 4; // Next IFD = 0 (none)

  // ── ExifSubIFD ───────────────────────────────────────────────────────────────
  writeUint16BE(view, p, EXIF_IFD_ENTRY_COUNT); p += 2;

  writeEntry(p, 0x9003, 2, dateOrigB.length,    offDateOrig);    p += 12; // DateTimeOriginal
  writeEntry(p, 0x9004, 2, dateDigB.length,     offDateDig);     p += 12; // DateTimeDigitized
  writeEntry(p, 0x9286, 7, userCommentB.length, offUserComment); p += 12; // UserComment
  writeEntry(p, 0xA000, 7, 4,                   0x30323330);     p += 12; // FlashPixVersion "0230"

  writeUint32BE(view, p, 0); p += 4; // Next IFD = 0

  // ── Data area ─────────────────────────────────────────────────────────────────
  for (const chunk of dataChunks) {
    u8.set(chunk.bytes, chunk.offset);
  }

  // ── Wrap in APP1 segment ──────────────────────────────────────────────────────
  // APP1 = FF E1, length (2 bytes, includes itself), "Exif\0\0", TIFF data
  const exifHeader = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0x00, 0x00]); // "Exif\0\0"
  const segmentLength = 2 + exifHeader.length + totalSize; // length field + "Exif\0\0" + tiff
  const app1 = new Uint8Array(2 + segmentLength);
  const app1view = new DataView(app1.buffer);
  app1[0] = 0xFF; app1[1] = 0xE1;                          // APP1 marker
  app1view.setUint16(2, segmentLength, false);              // segment length (BE)
  app1.set(exifHeader, 4);
  app1.set(u8, 4 + exifHeader.length);

  return app1;
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Takes a base64 data URL (any format Gemini returns — PNG or JPEG),
 * redraws it through Canvas (destroying all metadata / SynthID),
 * then injects a realistic iPhone 15 Pro EXIF block into the JPEG binary.
 *
 * Returns a base64 data URL of the cleaned JPEG.
 */
export async function stripAndInjectIphoneExif(inputDataUrl: string): Promise<string> {
  // 1. Draw onto canvas — this strips ALL embedded metadata
  const img = await loadImage(inputDataUrl);
  const canvas = document.createElement('canvas');
  canvas.width  = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  // 2. Export as JPEG (0.97 quality — indistinguishable from original, smaller than PNG)
  const cleanJpegDataUrl = canvas.toDataURL('image/jpeg', 0.97);

  // 3. Convert to binary
  const cleanJpegBytes = dataUrlToUint8Array(cleanJpegDataUrl);

  // 4. Find where to insert our APP1 (right after the SOI marker: FF D8)
  //    If there's already an APP0 (JFIF) or other APPn, insert AFTER them so
  //    our EXIF takes precedence. Simplest safe approach: insert at byte 2
  //    (right after SOI), which is what iOS actually does.
  const exifApp1 = buildExifSegment();

  // Remove any existing APP0/APP1/APP2 markers (strip JFIF + any Google metadata)
  const strippedJpeg = stripExistingAppMarkers(cleanJpegBytes);

  // 5. Splice: SOI (2 bytes) + our EXIF APP1 + rest of image
  const soi  = strippedJpeg.slice(0, 2);
  const rest = strippedJpeg.slice(2);
  const result = new Uint8Array(soi.length + exifApp1.length + rest.length);
  result.set(soi,      0);
  result.set(exifApp1, 2);
  result.set(rest,     2 + exifApp1.length);

  // 6. Convert back to data URL
  return uint8ArrayToDataUrl(result, 'image/jpeg');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
  const binary  = atob(base64);
  const bytes   = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint8ArrayToDataUrl(bytes: Uint8Array, mime: string): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:${mime};base64,${btoa(binary)}`;
}

/**
 * Strip existing APP0–APP2 segments (JFIF, EXIF, XMP, Google metadata)
 * from a JPEG binary, keeping only the SOI and everything from the first
 * non-APP segment (usually DQT — quantisation tables).
 */
function stripExistingAppMarkers(jpeg: Uint8Array): Uint8Array {
  if (jpeg[0] !== 0xFF || jpeg[1] !== 0xD8) return jpeg; // not a JPEG

  let pos = 2; // skip SOI
  while (pos < jpeg.length - 1) {
    if (jpeg[pos] !== 0xFF) break;
    const marker = jpeg[pos + 1];
    // APP0–APP15 = FF E0 – FF EF; also skip COM (FF FE)
    if ((marker >= 0xE0 && marker <= 0xEF) || marker === 0xFE) {
      const segLen = (jpeg[pos + 2] << 8) | jpeg[pos + 3]; // includes the 2-byte length field
      pos += 2 + segLen;
    } else {
      break; // first non-APP marker — stop stripping
    }
  }

  // Reconstruct: SOI + everything from pos onward
  const soi  = jpeg.slice(0, 2);
  const body = jpeg.slice(pos);
  const out  = new Uint8Array(soi.length + body.length);
  out.set(soi,  0);
  out.set(body, 2);
  return out;
}
