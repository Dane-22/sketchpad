# Implementation Plan: Configurable Upload Resolution

This plan details the steps to implement **Option 2 (Upload Quality Options)**, allowing users to select the desired rendering quality for PDF blueprints before uploading them to the canvas.

## User Review Required

> [!IMPORTANT]
> Based on the benchmark data and visual testing principles for web canvases, I strongly recommend dropping Scale 8.0 entirely. 
> - **Scale 4.0 (Standard)** yields roughly 2400x3400 pixels (1.6MB). This is excellent for 90% of use cases.
> - **Scale 6.0 (High-Res)** yields roughly 3600x5000 pixels (3.8MB). This provides massive detail for deep zooming without the extreme 800ms+ latency and 5.6MB bloat of Scale 8.0.
> - The visual difference between 6.0 and 8.0 is practically indistinguishable on a web canvas. Capping at 6.0 protects the app's performance and bandwidth.

## Proposed Changes

---

### Frontend Components

#### [MODIFY] `ProjectMessengerWidget.tsx`
- **State Addition**: Add `uploadQuality` state (defaulting to `4.0` / Standard) to the widget.
- **UI Modification**: Add a small `<select>` dropdown or toggle group next to the file upload button (the attachment clip) in the chat input area. The options will be:
  - **Draft**: Scale `2.0` (Fastest, low memory)
  - **Standard**: Scale `4.0` (Balanced - Default)
  - **High-Res Blueprint**: Scale `6.0` (Maximum detail, higher bandwidth)
- **Logic Update**: When a PDF is uploaded, pass the selected `uploadQuality` scale to the `convertPdfToImages(file, uploadQuality)` function instead of the hardcoded `2.0`.

#### [MODIFY] `cadDocumentPreview.ts`
- **Logic Update**: The CAD thumbnail extractor currently uses a fixed scale to ensure the image width is at least `1500px`. The fallback generic sheet uses a scale of `4.0` (yielding `4800x3200`).
- We will update `generateCadDocumentPreview` to optionally accept the `uploadQuality` parameter and dynamically adjust the minimum CAD thumbnail scaling factor to respect the user's quality preference, rather than hardcoding it to 1500px. 

## Verification Plan

### Automated Tests
No specific unit tests to run, but we will ensure the app builds without TypeScript errors.

### Manual Verification
1. Launch the frontend and open the Project Messenger.
2. Select a test PDF file with the quality set to "Draft". Observe the blurriness when zoomed in on the canvas.
3. Upload the same test PDF with the quality set to "High-Res Blueprint" (Scale 6.0).
4. Zoom in fully on the newly uploaded blueprint and verify the text and vectors are crisp and high-resolution.
5. Upload a `.dwg` file and verify the CAD preview generation respects the scale logic and doesn't throw errors.
