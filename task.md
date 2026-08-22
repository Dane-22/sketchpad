# Production Issues Task List

These are the issues encountered in production testing, to be discussed before implementation:

1. **Undo sync issue**: User 2 erases a line, then User 1 undoes it, but it did not undo for User 1.
2. **Eraser latency/sync issue**: Hover latency when erasing. User 1 erases a line, arrows, polyline, etc., but it does not reflect on User 2's end.
3. **Rectangular crop bug**: Visual bug with rectangular selection/cropping (reference attached image).
4. **Move object sync issue**: User 1 tries to move a line, arrow, etc., but the movement does not reflect on User 2's end.
5. **Cursor latency/sync issue**: Enhance latency. if idle for few minutes, User 1's cursor moves, but it's not responsive on User 2's end. It only reflects when User 2 refreshes their browser.
6. **Desktop alerts**: Native Windows desktop alerts are not working when enabled.
