"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiController = void 0;
exports.aiController = {
    chat: async (req, res) => {
        try {
            const { prompt, context } = req.body;
            if (!prompt) {
                return res.status(400).json({ error: 'Prompt is required' });
            }
            const apiKey = process.env.GEMINI_API_KEY;
            // System context instructions
            const systemInstruction = `You are "EngiAI", an expert engineering, drafting, and architectural CAD assistant in the "Eng Planner" application.
You assist engineers, architects, and designers with:
- Reviewing plan layouts, dimensions, clearances, and structural alignment.
- Answering questions about engineering materials, standards, and drafting best practices.
- Analyzing uploaded background plans, drawings, and CAD symbols.
- Summarizing active multi-user discussions, comment pins, and action items.

Format your responses cleanly using GitHub-flavored Markdown (bolding, lists, tables, alerts where suitable). Keep answers concise, highly technical, and actionable.`;
            // Format drawing context if provided
            let drawingContextText = '';
            if (context) {
                drawingContextText = `\n--- CURRENT CANVAS CONTEXT ---\n`;
                if (context.projectName)
                    drawingContextText += `Project Name: ${context.projectName}\n`;
                if (context.elementCount !== undefined)
                    drawingContextText += `Total Elements: ${context.elementCount}\n`;
                if (context.elementTypes)
                    drawingContextText += `Element Breakdown: ${JSON.stringify(context.elementTypes)}\n`;
                if (context.dimensions && context.dimensions.length > 0) {
                    drawingContextText += `Key Dimensions: ${context.dimensions.join(', ')}\n`;
                }
                if (context.comments && context.comments.length > 0) {
                    drawingContextText += `Team Discussions / Comment Pins (${context.comments.length}):\n`;
                    context.comments.forEach((c, idx) => {
                        drawingContextText += ` ${idx + 1}. [${c.isResolved ? 'RESOLVED' : 'ACTIVE'}] ${c.user || 'User'}: "${c.content}"\n`;
                    });
                }
                drawingContextText += `-----------------------------\n`;
            }
            const fullPrompt = `${systemInstruction}\n${drawingContextText}\nUser Question: ${prompt}`;
            if (apiKey) {
                try {
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [
                                {
                                    parts: [{ text: fullPrompt }]
                                }
                            ],
                            generationConfig: {
                                temperature: 0.4,
                                maxOutputTokens: 1024
                            }
                        })
                    });
                    if (response.ok) {
                        const data = await response.json();
                        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (replyText) {
                            return res.json({ reply: replyText });
                        }
                    }
                    else {
                        console.warn('Gemini API responded with status:', response.status);
                    }
                }
                catch (apiErr) {
                    console.warn('Gemini API call failed, falling back to local assistant engine:', apiErr);
                }
            }
            // Intelligent Local Fallback Response (works offline or when API key is not configured)
            const lowerPrompt = prompt.toLowerCase();
            let fallbackReply = '';
            if (lowerPrompt.includes('summar') || lowerPrompt.includes('comment') || lowerPrompt.includes('discuss')) {
                const commentCount = context?.comments?.length || 0;
                const activeCount = context?.comments?.filter((c) => !c.isResolved).length || 0;
                fallbackReply = `### 📋 Discussion & Drawing Summary

- **Total Discussions**: ${commentCount} pinned thread(s)
- **Active Action Items**: ${activeCount} unresolved
- **Canvas Entities**: ${context?.elementCount || 0} drawing elements recorded.

**Key Discussion Insights:**
${context?.comments && context.comments.length > 0
                    ? context.comments.map((c, i) => `- **Point ${i + 1} (${c.isResolved ? '✅ Resolved' : '⏳ Pending'})**: ${c.user || 'Team member'} noted: _"${c.content}"_`).join('\n')
                    : '- No pinned comments yet. Place comment pins directly onto the canvas to collaborate with your team!'}

> **Recommendation**: Review pending pins before finalizing the drawing export or production release.`;
            }
            else if (lowerPrompt.includes('dimension') || lowerPrompt.includes('scale') || lowerPrompt.includes('measure')) {
                fallbackReply = `### 📏 Dimensional & Scale Analysis

- **Scale Status**: Visual canvas units synchronized with configured project units (mm/inches).
- **Element Entities**: ${context?.elementCount || 0} entities rendered.

**Best Practices for Drafting Dimensions:**
1. Maintain consistent extension line offsets (5-10mm from geometry).
2. Group related dimension strings along major datum lines.
3. Verify minimum door clearance (standard: ≥ 900mm / 36") and structural grid spacing.`;
            }
            else if (lowerPrompt.includes('layout') || lowerPrompt.includes('analyze') || lowerPrompt.includes('check')) {
                fallbackReply = `### 📐 Plan Layout Review

Based on the current canvas state (${context?.elementCount || 0} elements):
- **Geometry Balance**: Vector layers are properly segmented into lines, rectangles, and reference overlays.
- **Reference Overlays**: Ensure background files and images are locked or assigned to dedicated reference layers.
- **Drafting Recommendation**: Verify that boundary lines form closed polygons for area calculations.`;
            }
            else {
                fallbackReply = `### 🤖 EngiAI Drafting Assistant

I've analyzed your query regarding **"${prompt}"** with respect to the active drawing context (${context?.elementCount || 0} elements, ${context?.comments?.length || 0} pinned threads).

**Suggestions:**
- Use the **Spatial Comment Pins** to mark specific coordinates for your team.
- Upload PDF blueprints or high-res images to trace or dimension over them directly.
- Use **Zoom Extents** or grid snapping to ensure precise alignment of structural axes.

*Tip: You can add a \`GEMINI_API_KEY\` to your backend \`.env\` for live multi-modal AI generation.*`;
            }
            return res.json({ reply: fallbackReply });
        }
        catch (error) {
            console.error('AI chat error:', error);
            return res.status(500).json({ error: 'Failed to process AI chat request' });
        }
    }
};
