import { canvasToBlob } from './pdfConverter';
import axios from 'axios';

export interface CadDocumentPreviewResult {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  category: 'cad' | 'skp' | 'doc' | 'other';
  hasRealPlan: boolean;
}

/**
 * Format bytes to readable string (e.g. 2.4 MB)
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Scans an ArrayBuffer for embedded PNG, JPEG, or BMP image streams.
 */
function extractEmbeddedImageFromBuffer(arrayBuffer: ArrayBuffer): { blob: Blob; mimeType: string } | null {
  const uint8 = new Uint8Array(arrayBuffer);
  const len = uint8.length;

  // 1. Search for PNG (\x89PNG\r\n\x1a\n ... IEND\xAE\x42\x60\x82)
  const pngSig = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  const pngEnd = [0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82];

  let pngStartIdx = -1;
  for (let i = 0; i <= len - 8; i++) {
    let match = true;
    for (let j = 0; j < 8; j++) {
      if (uint8[i + j] !== pngSig[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      pngStartIdx = i;
      break;
    }
  }

  if (pngStartIdx !== -1) {
    for (let i = pngStartIdx + 8; i <= len - 8; i++) {
      let match = true;
      for (let j = 0; j < 8; j++) {
        if (uint8[i + j] !== pngEnd[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        const endIdx = i + 8;
        const slice = uint8.slice(pngStartIdx, endIdx);
        return {
          blob: new Blob([slice], { type: 'image/png' }),
          mimeType: 'image/png'
        };
      }
    }
  }

  // 2. Search for JPEG (\xFF\xD8\xFF ... \xFF\xD9)
  let jpgStartIdx = -1;
  for (let i = 0; i <= len - 3; i++) {
    if (uint8[i] === 0xFF && uint8[i + 1] === 0xD8 && uint8[i + 2] === 0xFF) {
      jpgStartIdx = i;
      break;
    }
  }

  if (jpgStartIdx !== -1) {
    for (let i = jpgStartIdx + 2; i <= len - 2; i++) {
      if (uint8[i] === 0xFF && uint8[i + 1] === 0xD9) {
        const endIdx = i + 2;
        const slice = uint8.slice(jpgStartIdx, endIdx);
        return {
          blob: new Blob([slice], { type: 'image/jpeg' }),
          mimeType: 'image/jpeg'
        };
      }
    }
  }

  return null;
}

/**
 * Loads a Blob into an HTMLImageElement and returns its natural dimensions & DataURL.
 */
function loadImageBlob(blob: Blob): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve({
          dataUrl: canvas.toDataURL('image/webp', 0.95),
          width: canvas.width,
          height: canvas.height
        });
      } else {
        const reader = new FileReader();
        reader.onload = () => resolve({ dataUrl: reader.result as string, width: img.naturalWidth, height: img.naturalHeight });
        reader.readAsDataURL(blob);
      }
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Generates an architectural plan view or extracts the real embedded project plan from .dwg / .skp files.
 */
export async function generateCadDocumentPreview(file: File): Promise<CadDocumentPreviewResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isSkp = ext === 'skp' || ext === 'skb';
  const isDwg = ext === 'dwg' || ext === 'dxf';
  const isDoc = ext === 'doc' || ext === 'docx';
  const category: 'cad' | 'skp' | 'doc' | 'other' = isSkp ? 'skp' : isDwg ? 'cad' : isDoc ? 'doc' : 'other';

  // 1. Attempt Client-Side Binary Extraction (fastest & handles real CAD/SketchUp viewports directly)
  try {
    const buffer = await file.arrayBuffer();
    const extracted = extractEmbeddedImageFromBuffer(buffer);

    if (extracted && extracted.blob) {
      const loaded = await loadImageBlob(extracted.blob);
      return {
        dataUrl: loaded.dataUrl,
        blob: extracted.blob,
        width: loaded.width,
        height: loaded.height,
        category,
        hasRealPlan: true
      };
    }
  } catch (clientExtractErr) {
    console.warn('Client-side plan extraction failed, attempting server extractor:', clientExtractErr);
  }

  // 2. Attempt Server-Side Plan Extraction via /api/v1/convert/extract-preview
  try {
    const formData = new FormData();
    formData.append('file', file, file.name);

    const token = localStorage.getItem('token');
    const response = await axios.post('/api/v1/convert/extract-preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    if (response.data && response.data.hasRealThumbnail && response.data.previewUrl) {
      const previewUrl = response.data.previewUrl;
      const imgRes = await fetch(previewUrl);
      const blob = await imgRes.blob();
      const loaded = await loadImageBlob(blob);

      return {
        dataUrl: loaded.dataUrl,
        blob,
        width: loaded.width,
        height: loaded.height,
        category,
        hasRealPlan: true
      };
    }
  } catch (serverExtractErr) {
    console.warn('Server plan extraction failed:', serverExtractErr);
  }

  // 3. Fallback: Generate a crisp Blueprint Sheet with Project Title Block
  // Scale up internal resolution by 4x to ensure high-DPI quality
  const renderScale = 4;
  const logicalWidth = 1200;
  const logicalHeight = 800;
  
  const width = logicalWidth * renderScale;
  const height = logicalHeight * renderScale;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context could not be created');
  }

  // Scale the context so drawing coordinates can remain at logical resolution
  ctx.scale(renderScale, renderScale);

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, logicalWidth, logicalHeight);
  if (isDwg) {
    bgGrad.addColorStop(0, '#0a192f');
    bgGrad.addColorStop(1, '#0f2744');
  } else if (isSkp) {
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(1, '#1e293b');
  } else {
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(1, '#1e293b');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);

  // Architectural Grid
  ctx.strokeStyle = isDwg ? 'rgba(0, 229, 255, 0.08)' : isSkp ? 'rgba(239, 68, 68, 0.08)' : 'rgba(59, 130, 246, 0.08)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < logicalWidth; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, logicalHeight);
    ctx.stroke();
  }
  for (let y = 0; y < logicalHeight; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(logicalWidth, y);
    ctx.stroke();
  }

  // Outer Border
  ctx.strokeStyle = isDwg ? '#00e5ff' : isSkp ? '#ef4444' : '#3b82f6';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, logicalWidth - 40, logicalHeight - 40);

  // Header Title Block
  ctx.fillStyle = isDwg ? 'rgba(0, 229, 255, 0.12)' : isSkp ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)';
  ctx.fillRect(30, 30, logicalWidth - 60, 60);

  ctx.fillStyle = isDwg ? '#00e5ff' : isSkp ? '#ef4444' : '#3b82f6';
  ctx.font = 'bold 18px "Inter", sans-serif';
  ctx.fillText(isDwg ? '📐 AUTOCAD PROJECT PLAN' : isSkp ? '📦 SKETCHUP 3D INTERIOR PLAN' : '📄 SPECIFICATION SHEET', 50, 66);

  // File Name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px "Inter", sans-serif';
  ctx.fillText(file.name, 450, 66);

  // Plan Body Framing
  const cx = logicalWidth / 2;
  const cy = logicalHeight / 2 + 10;

  ctx.fillStyle = isDwg ? '#38bdf8' : isSkp ? '#f87171' : '#60a5fa';
  ctx.font = 'bold 24px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(file.name, cx, cy);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '15px "Inter", sans-serif';
  ctx.fillText('Project Architectural Plan Sheet · Ready for In-Place Redlining & Markups', cx, cy + 40);

  // Footer Info Block
  ctx.textAlign = 'left';
  ctx.fillStyle = isDwg ? 'rgba(0, 229, 255, 0.08)' : isSkp ? 'rgba(239, 68, 68, 0.08)' : 'rgba(59, 130, 246, 0.08)';
  ctx.fillRect(30, logicalHeight - 70, logicalWidth - 60, 40);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 12px "Inter", sans-serif';
  ctx.fillText(`PLAN: ${file.name}`, 50, logicalHeight - 45);
  ctx.fillText(`SIZE: ${formatFileSize(file.size)}`, 550, logicalHeight - 45);
  ctx.fillText(`STATUS: ACTIVE PROJECT SHEET`, 850, logicalHeight - 45);

  const fallbackBlob = await canvasToBlob(canvas, 'image/webp', 0.95);
  const fallbackDataUrl = canvas.toDataURL('image/webp', 0.95);

  return {
    dataUrl: fallbackDataUrl,
    blob: fallbackBlob,
    width,
    height,
    category,
    hasRealPlan: false
  };
}
