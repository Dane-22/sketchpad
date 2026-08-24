import * as pdfjsLib from 'pdfjs-dist';
import axios from 'axios';

// Set up PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

export interface ConvertedPdfPage {
  pageNumber: number;
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
}

/**
 * Converts a canvas element into a compressed Blob (WebP or JPEG).
 */
export function canvasToBlob(canvas: HTMLCanvasElement, mimeType = 'image/webp', quality = 1.0): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          // Fallback to image/png if webp is not supported
          canvas.toBlob(
            (fallbackBlob) => {
              if (fallbackBlob) resolve(fallbackBlob);
              else reject(new Error('Canvas to Blob conversion failed'));
            },
            'image/png'
          );
        }
      },
      mimeType,
      quality
    );
  });
}

/**
 * Converts a PDF File into an array of high-resolution image data URLs and Blobs (one per page).
 */
export async function convertPdfToImages(file: File, renderScale = 8.0): Promise<ConvertedPdfPage[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pages: ConvertedPdfPage[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: renderScale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    // Fill white background for CAD blueprint clarity
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
    };

    await page.render(renderContext).promise;

    const blob = await canvasToBlob(canvas, 'image/webp', 1.0);
    const dataUrl = canvas.toDataURL('image/webp', 1.0);

    pages.push({
      pageNumber: pageNum,
      dataUrl,
      blob,
      width: viewport.width / renderScale, // Normalized original width
      height: viewport.height / renderScale, // Normalized original height
    });
  }

  return pages;
}

/**
 * Loads an image File (PNG, JPG, SVG, WebP) and returns its DataURL along with natural dimensions and File.
 */
export function convertImageFileToDataUrl(file: File): Promise<{ dataUrl: string; file: File; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;
        let scale = 1;
        if (origW > 0 && origW < 1500) {
          scale = 1500 / origW;
        }
        if (scale > 1) {
          const canvas = document.createElement('canvas');
          canvas.width = origW * scale;
          canvas.height = origH * scale;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = false; // Sharp upscale
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0);
            resolve({
              dataUrl: canvas.toDataURL('image/webp', 0.95),
              file,
              width: canvas.width,
              height: canvas.height
            });
            return;
          }
        }
        resolve({
          dataUrl,
          file,
          width: origW,
          height: origH
        });
      };
      img.onerror = (err) => reject(err);
      img.src = dataUrl;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a canvas image or PDF page blob to the backend server and returns the lightweight URL.
 */
export async function uploadCanvasAssetToServer(fileOrBlob: File | Blob, filename: string = 'canvas-asset.webp'): Promise<string> {
  const formData = new FormData();
  formData.append('file', fileOrBlob, filename);

  const token = localStorage.getItem('token');
  const response = await axios.post('/api/v1/uploads/canvas-asset', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (response.data && response.data.url) {
    return response.data.url;
  }

  throw new Error('Server did not return a valid asset URL');
}

