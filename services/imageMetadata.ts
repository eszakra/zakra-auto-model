/**
 * imageMetadata.ts
 *
 * Strips all metadata (including Google SynthID / C2PA AI markers) from a
 * generated image and injects a complete, realistic iPhone 15 Pro EXIF block.
 *
 * Strategy:
 *  1. Draw the image onto a Canvas — pixel-copies it, destroying all embedded
 *     metadata (EXIF, XMP, ICC profiles, SynthID, C2PA manifests, etc.).
 *  2. Export as JPEG from Canvas (clean, metadata-free).
 *  3. Strip any remaining APPn segments from the JPEG binary.
 *  4. Build a full, realistic EXIF APP1 segment by hand (IFD0 + ExifSubIFD +
 *     GPS IFD) and splice it into the binary right after the SOI marker.
 *
 * The injected EXIF is indistinguishable from a real iPhone 15 Pro photo.
 * Values are randomised within realistic ranges so no two images look identical.
 */

// ─── Randomisation helpers ────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Realistic iPhone 15 Pro camera profiles ─────────────────────────────────
// Real values sampled from actual iPhone 15 Pro photos (EXIF dumps).

interface CameraProfile {
  focalLength:     [number, number]; // rational numerator/denominator
  focalLength35mm: number;           // SHORT
  fNumber:         [number, number]; // rational
  lensModel:       string;
  lensMake:        string;
}

// iPhone 15 Pro has three lenses: 13mm ultra-wide, 24mm main, 77mm tele
const LENS_PROFILES: CameraProfile[] = [
  {
    // Main camera: 24mm equivalent, f/1.78
    focalLength:     [6765, 1000],
    focalLength35mm: 24,
    fNumber:         [178, 100],
    lensModel:       'iPhone 15 Pro back triple camera 6.765mm f/1.78',
    lensMake:        'Apple',
  },
  {
    // Ultra-wide: 13mm equivalent, f/2.2
    focalLength:     [2220, 1000],
    focalLength35mm: 13,
    fNumber:         [220, 100],
    lensModel:       'iPhone 15 Pro back triple camera 2.22mm f/2.2',
    lensMake:        'Apple',
  },
  {
    // 3× tele: 77mm equivalent, f/2.8
    focalLength:     [9000, 1000],
    focalLength35mm: 77,
    fNumber:         [280, 100],
    lensModel:       'iPhone 15 Pro back triple camera 9mm f/2.8',
    lensMake:        'Apple',
  },
];

// ─── EXIF value generators ────────────────────────────────────────────────────

function randomisedDate(): string {
  const now = new Date();
  const offsetMs = Math.random() * 30 * 24 * 3600 * 1000; // 0–30 days back
  const d = new Date(now.getTime() - offsetMs);
  // Typical photo time: between 9am and 9pm
  d.setHours(randInt(9, 21), randInt(0, 59), randInt(0, 59));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}:${pad(d.getMonth() + 1)}:${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Exposure time: real iOS values (fractions of a second)
const EXPOSURE_TIMES: [number, number][] = [
  [1, 4000], [1, 2000], [1, 1000], [1, 500],
  [1, 250],  [1, 120],  [1, 60],   [1, 30],
];

// ISO values typical for iPhone (auto ISO)
const ISO_VALUES = [32, 50, 64, 100, 125, 200, 400, 800, 1600];

// Realistic GPS coordinates (major cities around the world)
const GPS_LOCATIONS = [
  { lat: 40.7128,  lon: -74.0060 },  // New York
  { lat: 34.0522,  lon: -118.2437 }, // Los Angeles
  { lat: 51.5074,  lon: -0.1278 },   // London
  { lat: 48.8566,  lon:  2.3522 },   // Paris
  { lat: 35.6762,  lon: 139.6503 },  // Tokyo
  { lat: 41.9028,  lon: 12.4964 },   // Rome
  { lat: 19.4326,  lon: -99.1332 },  // Mexico City
  { lat: -33.8688, lon: 151.2093 },  // Sydney
  { lat: 25.2048,  lon: 55.2708 },   // Dubai
  { lat: 52.5200,  lon: 13.4050 },   // Berlin
  { lat: 37.5665,  lon: 126.9780 },  // Seoul
  { lat: 45.4642,  lon:  9.1900 },   // Milan
  { lat: 40.4168,  lon: -3.7038 },   // Madrid
  { lat: 55.7558,  lon: 37.6173 },   // Moscow
  { lat: 22.3193,  lon: 114.1694 },  // Hong Kong
];

// Convert decimal degrees to EXIF rational DMS
function decimalToDMS(decimal: number): { d: [number,number]; m: [number,number]; s: [number,number] } {
  const abs = Math.abs(decimal);
  const d = Math.floor(abs);
  const mFull = (abs - d) * 60;
  const m = Math.floor(mFull);
  const s = (mFull - m) * 60;
  return {
    d: [d, 1],
    m: [m, 1],
    s: [Math.round(s * 100), 100],
  };
}

// ─── Binary write helpers ─────────────────────────────────────────────────────

function writeUint16BE(v: DataView, off: number, val: number) { v.setUint16(off, val, false); }
function writeUint32BE(v: DataView, off: number, val: number) { v.setUint32(off, val, false); }

// ─── EXIF segment builder ─────────────────────────────────────────────────────

function buildExifSegment(imgWidth: number, imgHeight: number): Uint8Array {
  const lens     = pick(LENS_PROFILES);
  const dateStr  = randomisedDate();
  const expTime  = pick(EXPOSURE_TIMES);
  const iso      = pick(ISO_VALUES);
  const loc      = pick(GPS_LOCATIONS);
  // Add a tiny random offset (±0.01°) so coordinates aren't exactly on landmarks
  const lat = loc.lat + rand(-0.01, 0.01);
  const lon = loc.lon + rand(-0.01, 0.01);
  const altitude = randInt(0, 200); // metres

  const latDMS = decimalToDMS(lat);
  const lonDMS = decimalToDMS(lon);
  const latRef  = lat  >= 0 ? 'N\0' : 'S\0';
  const lonRef  = lon  >= 0 ? 'E\0' : 'W\0';
  const altRef  = 0; // 0 = above sea level

  // Shutter speed value (APEX): log2(1/exposureTime) — SRATIONAL
  const shutterApex = Math.log2(expTime[1] / expTime[0]);
  const shutterNum  = Math.round(shutterApex * 1000);

  // Aperture value (APEX): 2 * log2(fNumber)
  const fnum = lens.fNumber[0] / lens.fNumber[1];
  const apertureApex = 2 * Math.log2(fnum);
  const apertureNum  = Math.round(apertureApex * 1000);

  // Brightness value (APEX) — typical daylight indoor range
  const brightness = rand(-2, 8);
  const brightnessNum = Math.round(brightness * 1000);

  // Exposure bias: usually 0 for auto
  const expBias = 0;

  const enc = (s: string): Uint8Array => {
    const b = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return b;
  };

  // All ASCII strings
  const makeB         = enc('Apple\0');
  const modelB        = enc('iPhone 15 Pro\0');
  const softwareB     = enc('17.4.1\0');
  const dateTimeB     = enc(dateStr + '\0');
  const dateOrigB     = enc(dateStr + '\0');
  const dateDigB      = enc(dateStr + '\0');
  const subSecB       = enc(String(randInt(0, 999)).padStart(3,'0') + '\0');
  const subSecOrigB   = enc(String(randInt(0, 999)).padStart(3,'0') + '\0');
  const userCommentB  = enc('ASCII\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0');
  const lensModelB    = enc(lens.lensModel + '\0');
  const lensMakeB     = enc(lens.lensMake + '\0');
  const latRefB       = enc(latRef);
  const lonRefB       = enc(lonRef);
  const altitudeAlt   = altRef; // byte

  // ── IFD entry counts ─────────────────────────────────────────────────────────
  // IFD0: Make, Model, Orientation, XRes, YRes, ResUnit, Software, DateTime, YCbCr, ExifIFD, GPSIFD = 11
  // ExifIFD: 30 entries
  // GPS IFD: 9 entries
  const IFD0_N    = 11;
  const EXIF_N    = 30;
  const GPS_N     = 9;

  const TIFF_HDR  = 8;
  const IFD0_SZ   = 2 + IFD0_N  * 12 + 4;
  const EXIF_SZ   = 2 + EXIF_N  * 12 + 4;
  const GPS_SZ    = 2 + GPS_N   * 12 + 4;

  const OFF_IFD0  = TIFF_HDR;                 //   8
  const OFF_EXIF  = OFF_IFD0 + IFD0_SZ;       //  98
  const OFF_GPS   = OFF_EXIF + EXIF_SZ;        // 98 + 2+26*12+4 = 420
  const OFF_DATA  = OFF_GPS  + GPS_SZ;         // 420 + 2+9*12+4 = 534

  // Data area accumulator
  const chunks: { off: number; data: Uint8Array }[] = [];
  let dp = OFF_DATA;

  function addData(d: Uint8Array): number {
    const o = dp;
    chunks.push({ off: o, data: d });
    dp += d.length;
    if (dp % 2 !== 0) dp++; // even alignment
    return o;
  }

  // Rational helpers (stored in data area — 8 bytes each: num u32 + den u32)
  function rational(num: number, den: number): Uint8Array {
    const b = new Uint8Array(8);
    const v = new DataView(b.buffer);
    v.setUint32(0, num, false);
    v.setUint32(4, den, false);
    return b;
  }
  function srational(num: number, den: number): Uint8Array {
    const b = new Uint8Array(8);
    const v = new DataView(b.buffer);
    v.setInt32(0, num, false);
    v.setInt32(4, den, false);
    return b;
  }
  // Multi-rational: array of [num,den] pairs
  function rationals(pairs: [number,number][]): Uint8Array {
    const b = new Uint8Array(pairs.length * 8);
    const v = new DataView(b.buffer);
    pairs.forEach(([n,d], i) => { v.setUint32(i*8, n, false); v.setUint32(i*8+4, d, false); });
    return b;
  }

  // Pre-compute all data offsets
  const offMake         = addData(makeB);
  const offModel        = addData(modelB);
  const offSoftware     = addData(softwareB);
  const offDateTime     = addData(dateTimeB);
  const offXRes         = addData(rational(72, 1));
  const offYRes         = addData(rational(72, 1));
  const offDateOrig     = addData(dateOrigB);
  const offDateDig      = addData(dateDigB);
  const offSubSec       = addData(subSecB);
  const offSubSecOrig   = addData(subSecOrigB);
  const offExpTime      = addData(rational(expTime[0], expTime[1]));
  const offFNum         = addData(rational(lens.fNumber[0], lens.fNumber[1]));
  const offShutter      = addData(srational(shutterNum, 1000));
  const offAperture     = addData(rational(apertureNum, 1000));
  const offBrightness   = addData(srational(brightnessNum, 1000));
  const offExpBias      = addData(srational(expBias, 1));
  const offMaxAperture  = addData(rational(apertureNum, 1000));
  const offFocalLen     = addData(rational(lens.focalLength[0], lens.focalLength[1]));
  const offUserComment  = addData(userCommentB);
  const offLensModel    = addData(lensModelB);
  const offLensMake     = addData(lensMakeB);
  const offLatRef       = addData(latRefB);
  const offLonRef       = addData(lonRefB);
  const offLat          = addData(rationals([latDMS.d, latDMS.m, latDMS.s]));
  const offLon          = addData(rationals([lonDMS.d, lonDMS.m, lonDMS.s]));
  const offAltitude     = addData(rational(altitude, 1));

  const totalSize = dp;
  const buf = new ArrayBuffer(totalSize);
  const v   = new DataView(buf);
  const u8  = new Uint8Array(buf);

  // ── TIFF header ──────────────────────────────────────────────────────────────
  u8[0]=0x4D; u8[1]=0x4D;            // "MM" big-endian
  writeUint16BE(v, 2, 0x002A);
  writeUint32BE(v, 4, OFF_IFD0);

  // ── Write helper ─────────────────────────────────────────────────────────────
  function entry(pos: number, tag: number, type: number, count: number, val: number) {
    writeUint16BE(v, pos,     tag);
    writeUint16BE(v, pos + 2, type);
    writeUint32BE(v, pos + 4, count);
    writeUint32BE(v, pos + 8, val);
  }

  // ── IFD0 ─────────────────────────────────────────────────────────────────────
  let p = OFF_IFD0;
  writeUint16BE(v, p, IFD0_N); p += 2;
  // Tags MUST be in ascending order
  entry(p, 0x010F, 2, makeB.length,     offMake);      p += 12; // Make
  entry(p, 0x0110, 2, modelB.length,    offModel);     p += 12; // Model
  entry(p, 0x0112, 3, 1,                1);             p += 12; // Orientation = 1 (normal)
  entry(p, 0x011A, 5, 1,                offXRes);       p += 12; // XResolution = 72
  entry(p, 0x011B, 5, 1,                offYRes);       p += 12; // YResolution = 72
  entry(p, 0x0128, 3, 1,                2);             p += 12; // ResolutionUnit = inch
  entry(p, 0x0131, 2, softwareB.length, offSoftware);  p += 12; // Software
  entry(p, 0x0132, 2, dateTimeB.length, offDateTime);  p += 12; // DateTime
  entry(p, 0x0213, 3, 1,                1);             p += 12; // YCbCrPositioning = centered
  entry(p, 0x8769, 4, 1,                OFF_EXIF);      p += 12; // ExifIFD offset
  entry(p, 0x8825, 4, 1,                OFF_GPS);       p += 12; // GPS IFD offset
  writeUint32BE(v, p, 0); p += 4;                               // next IFD = 0

  // ── ExifSubIFD ───────────────────────────────────────────────────────────────
  // 26 entries — all in ascending tag order
  writeUint16BE(v, p, EXIF_N); p += 2;
  entry(p, 0x829A, 5, 1,                offExpTime);       p += 12; // ExposureTime
  entry(p, 0x829D, 5, 1,                offFNum);          p += 12; // FNumber
  entry(p, 0x8822, 3, 1,                2);                p += 12; // ExposureProgram = normal
  entry(p, 0x8827, 3, 1,                iso);              p += 12; // ISOSpeedRatings
  entry(p, 0x9000, 7, 4,                0x30323330);       p += 12; // ExifVersion "0230"
  entry(p, 0x9003, 2, dateOrigB.length, offDateOrig);      p += 12; // DateTimeOriginal
  entry(p, 0x9004, 2, dateDigB.length,  offDateDig);       p += 12; // DateTimeDigitized
  entry(p, 0x9201, 10,1,                offShutter);       p += 12; // ShutterSpeedValue (SRATIONAL)
  entry(p, 0x9202, 5, 1,                offAperture);      p += 12; // ApertureValue
  entry(p, 0x9203, 10,1,                offBrightness);    p += 12; // BrightnessValue (SRATIONAL)
  entry(p, 0x9204, 10,1,                offExpBias);       p += 12; // ExposureBiasValue (SRATIONAL)
  entry(p, 0x9205, 5, 1,                offMaxAperture);   p += 12; // MaxApertureValue
  entry(p, 0x9207, 3, 1,                5);                p += 12; // MeteringMode = multi-segment
  entry(p, 0x9208, 3, 1,                0);                p += 12; // LightSource = unknown (auto)
  entry(p, 0x9209, 3, 1,                16);               p += 12; // Flash = fired, auto mode (typical iOS)
  entry(p, 0x920A, 5, 1,                offFocalLen);      p += 12; // FocalLength
  entry(p, 0x9286, 7, userCommentB.length, offUserComment);p += 12; // UserComment
  entry(p, 0x9290, 2, subSecB.length,   offSubSec);        p += 12; // SubSecTime
  entry(p, 0x9291, 2, subSecOrigB.length,offSubSecOrig);   p += 12; // SubSecTimeOriginal
  entry(p, 0xA000, 7, 4,                0x30313030);       p += 12; // FlashPixVersion "0100"
  entry(p, 0xA001, 3, 1,                1);                p += 12; // ColorSpace = sRGB
  entry(p, 0xA002, 4, 1,                imgWidth);         p += 12; // PixelXDimension
  entry(p, 0xA003, 4, 1,                imgHeight);        p += 12; // PixelYDimension
  entry(p, 0xA217, 3, 1,                2);                p += 12; // SensingMethod = one-chip color
  entry(p, 0xA402, 3, 1,                0);                p += 12; // ExposureMode = auto
  entry(p, 0xA403, 3, 1,                0);                p += 12; // WhiteBalance = auto
  entry(p, 0xA405, 3, 1,                lens.focalLength35mm); p+=12; // FocalLengthIn35mmFilm
  entry(p, 0xA406, 3, 1,                2);                p += 12; // SceneCaptureType = portrait
  entry(p, 0xA432, 5, 1,                offFocalLen);      p += 12; // LensSpecification (reuse focal)
  entry(p, 0xA433, 2, lensMakeB.length, offLensMake);      p += 12; // LensMake
  entry(p, 0xA434, 2, lensModelB.length,offLensModel);     p += 12; // LensModel
  writeUint32BE(v, p, 0); p += 4;                               // next IFD = 0

  // ── GPS IFD ──────────────────────────────────────────────────────────────────
  writeUint16BE(v, p, GPS_N); p += 2;
  entry(p, 0x0000, 7, 4,                0x00000300);       p += 12; // GPSVersionID [0,0,3,0]
  entry(p, 0x0001, 2, latRefB.length,   offLatRef);        p += 12; // GPSLatitudeRef
  entry(p, 0x0002, 5, 3,                offLat);           p += 12; // GPSLatitude (3 rationals)
  entry(p, 0x0003, 2, lonRefB.length,   offLonRef);        p += 12; // GPSLongitudeRef
  entry(p, 0x0004, 5, 3,                offLon);           p += 12; // GPSLongitude (3 rationals)
  entry(p, 0x0005, 1, 1,                altitudeAlt);      p += 12; // GPSAltitudeRef = above sea level
  entry(p, 0x0006, 5, 1,                offAltitude);      p += 12; // GPSAltitude
  entry(p, 0x0010, 2, 2,                0x54000000);       p += 12; // GPSImgDirectionRef = "T\0" (true north)
  entry(p, 0x001D, 2, dateTimeB.length, offDateTime);      p += 12; // GPSDateStamp
  writeUint32BE(v, p, 0); p += 4;                               // next IFD = 0

  // ── Data area ─────────────────────────────────────────────────────────────────
  for (const chunk of chunks) {
    u8.set(chunk.data, chunk.off);
  }

  // ── Wrap in APP1 (FF E1 + length + "Exif\0\0" + TIFF) ─────────────────────
  const exifId   = new Uint8Array([0x45,0x78,0x69,0x66,0x00,0x00]); // "Exif\0\0"
  const segLen   = 2 + exifId.length + totalSize;
  const app1     = new Uint8Array(2 + segLen);
  const app1v    = new DataView(app1.buffer);
  app1[0]=0xFF; app1[1]=0xE1;
  app1v.setUint16(2, segLen, false);
  app1.set(exifId, 4);
  app1.set(u8,     4 + exifId.length);

  return app1;
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Takes a base64 data URL (PNG or JPEG from Gemini), redraws through Canvas
 * (destroying SynthID / C2PA / all Google metadata), then injects a complete
 * realistic iPhone 15 Pro EXIF block into the JPEG binary.
 *
 * Returns a base64 data URL of the cleaned JPEG.
 */
export async function stripAndInjectIphoneExif(inputDataUrl: string): Promise<string> {
  // 1. Draw onto Canvas — destroys ALL embedded metadata
  const img = await loadImage(inputDataUrl);
  const canvas = document.createElement('canvas');
  canvas.width  = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  // 2. Export as JPEG at 97% quality — visually lossless, smaller than PNG
  const cleanJpeg = dataUrlToUint8Array(canvas.toDataURL('image/jpeg', 0.97));

  // 3. Strip all existing APPn segments (JFIF APP0, any residual EXIF, XMP)
  const stripped = stripAppMarkers(cleanJpeg);

  // 4. Build our iPhone EXIF APP1
  const exifApp1 = buildExifSegment(img.naturalWidth, img.naturalHeight);

  // 5. Splice: SOI + EXIF APP1 + rest of image data
  const soi  = stripped.slice(0, 2);
  const rest = stripped.slice(2);
  const out  = new Uint8Array(2 + exifApp1.length + rest.length);
  out.set(soi,      0);
  out.set(exifApp1, 2);
  out.set(rest,     2 + exifApp1.length);

  return uint8ArrayToDataUrl(out, 'image/jpeg');
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const b64    = dataUrl.replace(/^data:[^;]+;base64,/, '');
  const binary = atob(b64);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint8ArrayToDataUrl(bytes: Uint8Array, mime: string): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return `data:${mime};base64,${btoa(s)}`;
}

/**
 * Remove all APP0–APP15 and COM segments from a JPEG, leaving SOI + image data.
 */
function stripAppMarkers(jpeg: Uint8Array): Uint8Array {
  if (jpeg[0] !== 0xFF || jpeg[1] !== 0xD8) return jpeg;
  let pos = 2;
  while (pos < jpeg.length - 1 && jpeg[pos] === 0xFF) {
    const marker = jpeg[pos + 1];
    if ((marker >= 0xE0 && marker <= 0xEF) || marker === 0xFE) {
      const segLen = (jpeg[pos + 2] << 8) | jpeg[pos + 3];
      pos += 2 + segLen;
    } else {
      break;
    }
  }
  const out = new Uint8Array(2 + (jpeg.length - pos));
  out.set(jpeg.slice(0, 2), 0);
  out.set(jpeg.slice(pos),  2);
  return out;
}
