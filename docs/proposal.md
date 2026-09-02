# Proposal: Improving Uploaded File Resolution

## Problem Statement
Users are experiencing low-resolution issues with uploaded files, specifically PDFs and images rendered onto the canvas. Due to aggressive downscaling for performance and lower latency, the current implementation loses the crispness required for accurate engineering drafting and review.

## Analysis of Current Implementation
Upon reviewing the file upload pipeline, the following bottlenecks for resolution have been identified:

1. **PDF Rendering Scale (`ProjectMessengerWidget.tsx`)**: 
   When a PDF is uploaded, the frontend uses `convertPdfToImages` (from `pdfConverter.ts`). While the default scale in the utility is high (`12.0`), `ProjectMessengerWidget.tsx` overrides this with a very aggressive downscaling:
   ```typescript
   // In ProjectMessengerWidget.tsx
   const pages = await convertPdfToImages(file, 2.0); // Reduced scale for lower latency
   ```
   A scale of `2.0` is insufficient for detailed blueprints, leading to pixelated traces.

2. **Image Conversion Quality (`pdfConverter.ts`)**: 
   Images and PDFs are converted to `image/webp` using `canvasToBlob`. While the quality is set to `1.0`, the low initial canvas dimensions (due to the `2.0` scale) negate any benefit of high-quality encoding.

3. **CAD Previews (`cadDocumentPreview.ts`)**:
   Fallback CAD previews use a fixed internal resolution scaling, which may also need a bump depending on the size of the canvas it's placed onto.

## Proposed Solutions (For Discussion)

### Option 1: Increase the Fixed Scale
We can simply bump the render scale from `2.0` to a higher value (e.g., `4.0` or `6.0`) in `ProjectMessengerWidget.tsx`.
- **Pros**: Easy to implement. Immediate quality improvement.
- **Cons**: Still a one-size-fits-all approach. Larger file sizes and higher latency for users with slower network connections.

### Option 2: Introduce Upload Quality Options (Recommended)
Add a user-selectable "Upload Quality" toggle or dropdown in the UI (e.g., "Draft", "Standard", "High-Res Blueprint").
- **Draft**: Scale 2.0 (Fastest, low memory)
- **Standard**: Scale 4.0 (Good balance)
- **High-Res Blueprint**: Scale 8.0+ (Slowest, but preserves maximum engineering detail)
- **Implementation**: We would pass the user's selected scale dynamically into `convertPdfToImages()` and image processing functions.

### Option 3: Backend Vector Preservation
Instead of converting PDFs to raster WebP images on the frontend, we could upload the raw PDF and have the backend serve SVG representations or use a tile-based rendering system (like DeepZoom or Leaflet/OpenLayers for images).
- **Pros**: Infinite zoom without pixelation.
- **Cons**: High engineering effort; requires significant changes to how the Canvas renders items.

## Next Steps
Please review these options. Once we agree on the best approach (Option 1 vs Option 2), I will proceed with creating the implementation plan and modifying the codebase.
