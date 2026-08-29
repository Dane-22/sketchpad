# Sketchpad System
## General User Manual

| Version | Date | Description |
| :--- | :--- | :--- |
| 1.0.0 | August 2026 | Initial Release |

---

## Table of Contents
1. [Getting Started](#1-getting-started)
2. [Managing Files & Projects](#2-managing-files--projects)
3. [Viewing the Canvas & Auto-Save](#3-viewing-the-canvas--auto-save)
4. [Drawing Tools](#4-drawing-tools)
5. [Basic Shortcuts](#5-basic-shortcuts)
6. [Discussions & Feedback](#6-discussions--feedback)
7. [Managing Notifications](#7-managing-notifications)
8. [Feature Requests & Updates](#8-feature-requests--updates)

---

## 1. Getting Started

Welcome to the **Sketchpad System**! This tool allows you and your team to collaborate on architectural drawings, project plans, and diagrams in real-time. 

To access the platform, navigate your web browser to: **[http://72.62.254.60:9000/](http://72.62.254.60:9000/)**

When you first log in, you will be taken to your Dashboard. 

### Recent Activity
On your Dashboard, you will see a **Recent Activity** feed. This feed shows you all the latest updates across your projects, such as new comments, uploaded files, or changes made by other team members, keeping you up-to-date instantly.

### Signing Out
To securely sign out of the platform, click on your profile picture or initials in the top right corner of the dashboard, and select **Sign Out** from the dropdown menu.

## 2. Managing Files & Projects

### Project and Folder Creation
To keep your work organized:
1. **Create a Folder:** On the Dashboard, click "New Folder" to create a workspace for a specific client or property.
2. **Create a Project:** Inside a folder (or on the main dashboard), click "New Project" to create a fresh canvas. 

### Uploading Files & File Conversions
You can upload existing blueprints, documents, and images to use as a base layer for your projects. Click the **Upload** button in your project to get started.

The Sketchpad System handles various file types by converting them so they can be viewed and drawn over easily in the browser:
- **.PDF (Documents):** Multi-page architectural plans are converted into high-quality images so you can draw directly on top of them.
- **.PNG / .JPG (Images):** Standard images are imported directly onto the canvas.
- **.DWG (CAD Files):** 2D AutoCAD files are parsed and converted into basic web-friendly lines and shapes. *(Note: Complex 3D elements or proprietary hatches may be simplified).*
- **.SKP (SketchUp Files):** 3D SketchUp models are flattened and converted into a 2D top-down or isometric view so you can annotate over the floorplan.

## 3. Viewing the Canvas & Auto-Save

The Canvas is where all the planning and drawing happens. 

### Auto-Save Functionality
**You never have to remember to click "Save"!** Every line you draw, file you upload, or comment you make is instantly synced to our servers and saved automatically in real-time. If you accidentally close your browser, your work will be exactly as you left it.

### Navigation
Even if you are just reviewing a document, it's easy to navigate:
- **Panning (Moving Around):** Click the middle mouse button (scroll wheel) and drag, or hold down the Spacebar and click-and-drag to move around the drawing.
- **Zooming:** Scroll your mouse wheel up to zoom in, and down to zoom out.
- **Selecting Items:** Click on the standard cursor icon in the toolbar (or press `P` or `Escape`) to ensure you are in "Select" mode. You can then click on any drawing or text to highlight it.

## 4. Drawing Tools

Whether you need to mark up a blueprint or sketch an idea, you have several intuitive drawing tools at your disposal:
- **Line & Polyline:** Draw single straight lines or continuous connected segments.
- **Arrow:** Perfect for pointing out specific areas or creating leader lines.
- **Freehand:** Draw freely, just like a pen on paper. 
- **Ortho Mode (`F8`):** When turned ON, this feature forces your Lines and Polylines to snap to perfectly horizontal or vertical angles.
- **Ink Color:** You can easily change the color of your pen to color-code your notes and markups.
- **Eraser (Hover and Click):** Select the eraser tool, hover your mouse over the line or shape you want to remove, and simply click to delete it.

## 5. Basic Shortcuts

You don't need to be a CAD expert to use the Sketchpad System quickly! Here are the most essential keyboard shortcuts:

- **Undo:** `Ctrl + Z` (Windows) or `Cmd + Z` (Mac). Made a mistake? This will instantly reverse your last action.
- **Redo:** `Ctrl + Y` (Windows) or `Cmd + Y` (Mac).
- **Delete:** Select an item on the canvas and press the `Delete` or `Backspace` key to remove it.
- **Open / Import:** `Ctrl + O` (Windows) or `Cmd + O` (Mac) to quickly upload a new blueprint, PDF, or DWG file.
- **Toggle Grid:** Press `F7` to turn the background alignment grid on or off.

## 6. Discussions & Feedback

Collaboration and discussion functionalities are built directly into the Sketchpad System. You don't need to switch to an email or a different app to talk to your engineers.

### Seeing Who is Online
At the top or side of your screen, you will see a list of avatars or names representing everyone currently viewing the project. A green dot indicates they are online and active right now. You can also see their live mouse cursor moving around the canvas in real-time, making it easy to follow along as they point out specific details!

### Project Messenger
On the right side of your screen, you'll find the Project Messenger. 
- You can chat in specific **Channels** (like `#general` or `#electrical-wiring`).
- You can tag team members using `@Name` to get their attention.

### Canvas Comments
If you want to discuss a specific part of a drawing (like a specific door or wall), you can leave a pinned comment right on the canvas. 
1. Click the Comment tool.
2. Click anywhere on the drawing.
3. Type your feedback. 
Anyone who clicks that pin will see your note and can reply directly in a thread.

## 7. Managing Notifications *(In Progress)*

> [!NOTE]
> This feature is currently in progress and will be fully available once the production domain is configured.

To ensure you don't get overwhelmed with alerts, you can manage your notification preferences:
1. Go to your User Settings.
2. Under "Notification Preferences", you can turn sound alerts on or off.
3. You can choose to only be notified when someone directly mentions you in the chat (`Mentions Only`).
4. You can independently toggle alerts for Chat messages, AI Copilot replies, and Canvas Comments.

## 8. Feature Requests & Updates

If you have ideas for new features, require an update to the platform, or want something changed to better fit your workflow, please proceed to the Developer (Daniel Rillera) directly to discuss your requirements. We are always looking to improve the Sketchpad System based on user feedback!
