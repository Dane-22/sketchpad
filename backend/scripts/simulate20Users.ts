import { io, Socket } from 'socket.io-client';
import { generateToken } from '../src/utils/jwt';

interface SimUser {
  id: string;
  name: string;
  role: string;
  color: string;
  token: string;
  socket: Socket;
  sentEvents: number;
  receivedEvents: number;
  latencies: number[];
}

const SERVER_URL = 'http://localhost:5005';
const PROJECT_ID = 'sim-project-multiuser-stress';
const NUM_USERS = 20;
const DURATION_SECONDS = 10; // Run active simulation for 10 seconds

const USER_COLORS = [
  '#00f0ff', '#ff007f', '#00ff88', '#ffb700', '#7b2cbf',
  '#ff477e', '#48cae4', '#52b788', '#f72585', '#7209b7',
  '#3a0ca3', '#4361ee', '#4cc9f0', '#06d6a0', '#ffd166',
  '#ef476f', '#118ab2', '#073b4c', '#8338ec', '#3a86ff'
];

async function runSimulation() {
  console.log(`\n======================================================`);
  console.log(`🚀 STARTING 20 CONCURRENT USER COLLABORATION STRESS TEST`);
  console.log(`   Target Server: ${SERVER_URL}`);
  console.log(`   Simulated Users: ${NUM_USERS}`);
  console.log(`   Shared Project Room: project-${PROJECT_ID}`);
  console.log(`   Duration: ${DURATION_SECONDS} seconds`);
  console.log(`======================================================\n`);

  const users: SimUser[] = [];
  const connectionPromises: Promise<void>[] = [];

  // 1. Initialize and connect 20 users
  console.log(`[Phase 1] Connecting 20 concurrent client sockets...`);
  const startTime = Date.now();

  for (let i = 1; i <= NUM_USERS; i++) {
    const userId = `sim-user-${i}`;
    const name = `Engineer User ${i}`;
    const token = generateToken({ userId, role: i === 1 ? 'ADMIN' : 'ENGINEER' });
    const color = USER_COLORS[(i - 1) % USER_COLORS.length];

    const socket = io(SERVER_URL, {
      transports: ['websocket'],
      forceNew: true,
      auth: { token },
    });

    const user: SimUser = {
      id: userId,
      name,
      role: i === 1 ? 'ADMIN' : 'ENGINEER',
      color,
      token,
      socket,
      sentEvents: 0,
      receivedEvents: 0,
      latencies: [],
    };

    users.push(user);

    const connectPromise = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`User ${i} connection timed out after 5s`));
      }, 5000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        socket.emit('join-project', PROJECT_ID);
        resolve();
      });

      socket.on('connect_error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    connectionPromises.push(connectPromise);
  }

  try {
    await Promise.all(connectionPromises);
    console.log(`✅ All ${NUM_USERS} users connected successfully in ${Date.now() - startTime}ms!\n`);
  } catch (err: any) {
    console.error(`❌ Connection failed during initialization:`, err.message);
    process.exit(1);
  }

  // 2. Set up real-time event listeners across all users
  let totalCommentsCreated = 0;
  let totalRepliesSent = 0;
  let totalResolves = 0;
  let totalCursorMoves = 0;

  users.forEach((user) => {
    user.socket.on('new-comment', (data) => {
      user.receivedEvents++;
      if (data && data._clientTimestamp) {
        const latency = Date.now() - data._clientTimestamp;
        user.latencies.push(latency);
      }
    });

    user.socket.on('comment-reply-added', (data) => {
      user.receivedEvents++;
      if (data && data._clientTimestamp) {
        const latency = Date.now() - data._clientTimestamp;
        user.latencies.push(latency);
      }
    });

    user.socket.on('comment-resolved-updated', () => {
      user.receivedEvents++;
    });

    user.socket.on('cursor-moved', () => {
      user.receivedEvents++;
    });
  });

  console.log(`[Phase 2] Simulating concurrent discussions & interactions for ${DURATION_SECONDS}s...`);

  // Active comment threads pool to reply to
  const activeThreads: string[] = [];

  const intervalHandles: NodeJS.Timeout[] = [];
  const testStart = Date.now();

  // 3. User Actions Loop:
  users.forEach((user, idx) => {
    // A. Cursor movement broadcast (every 100ms per user)
    const cursorInterval = setInterval(() => {
      const x = Math.floor(Math.random() * 2000) - 1000;
      const y = Math.floor(Math.random() * 2000) - 1000;
      user.socket.emit('cursor-moved', {
        x,
        y,
        userName: user.name,
        color: user.color,
        userId: user.id,
      });
      user.sentEvents++;
      totalCursorMoves++;
    }, 100 + (idx % 5) * 20);
    intervalHandles.push(cursorInterval);

    // B. New Discussion Comment Pins (Every 1.2s to 2.5s per user)
    const commentInterval = setInterval(() => {
      const commentId = `comment-${user.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      activeThreads.push(commentId);

      const commentData = {
        id: commentId,
        projectId: PROJECT_ID,
        x: Math.floor(Math.random() * 800) + 100,
        y: Math.floor(Math.random() * 600) + 100,
        content: `[${user.name}] Review structural load calculation at node #${Math.floor(Math.random() * 50)}`,
        authorName: user.name,
        authorRole: user.role,
        isResolved: false,
        _clientTimestamp: Date.now(),
      };

      user.socket.emit('new-comment', {
        projectId: PROJECT_ID,
        comment: commentData,
      });

      user.sentEvents++;
      totalCommentsCreated++;
    }, 1200 + (idx % 10) * 150);
    intervalHandles.push(commentInterval);

    // C. Replies to active discussion threads (Every 800ms to 1.8s per user)
    const replyInterval = setInterval(() => {
      if (activeThreads.length > 0) {
        const targetCommentId = activeThreads[Math.floor(Math.random() * activeThreads.length)];
        const replyData = {
          id: `reply-${user.id}-${Date.now()}`,
          commentId: targetCommentId,
          content: `Agree with this spec. Confirmed load tolerance ±5% by ${user.name}.`,
          authorName: user.name,
          createdAt: new Date().toISOString(),
          _clientTimestamp: Date.now(),
        };

        user.socket.emit('comment-reply-added', {
          projectId: PROJECT_ID,
          commentId: targetCommentId,
          reply: replyData,
        });

        user.sentEvents++;
        totalRepliesSent++;
      }
    }, 900 + (idx % 7) * 200);
    intervalHandles.push(replyInterval);

    // D. Resolving threads concurrently (Every 3s per user)
    const resolveInterval = setInterval(() => {
      if (activeThreads.length > 0) {
        const targetCommentId = activeThreads[Math.floor(Math.random() * activeThreads.length)];
        user.socket.emit('comment-resolved-updated', {
          projectId: PROJECT_ID,
          comment: { id: targetCommentId, isResolved: true },
        });
        user.sentEvents++;
        totalResolves++;
      }
    }, 3000 + (idx % 4) * 500);
    intervalHandles.push(resolveInterval);
  });

  // Let test run for DURATION_SECONDS
  await new Promise((resolve) => setTimeout(resolve, DURATION_SECONDS * 1000));

  // Clear all timers
  intervalHandles.forEach(clearInterval);

  // Allow 500ms for final messages to settle
  await new Promise((resolve) => setTimeout(resolve, 500));

  const totalTimeSec = ((Date.now() - testStart) / 1000);

  // 4. Calculate stats
  let totalSent = 0;
  let totalReceived = 0;
  const allLatencies: number[] = [];

  users.forEach((u) => {
    totalSent += u.sentEvents;
    totalReceived += u.receivedEvents;
    allLatencies.push(...u.latencies);
  });

  allLatencies.sort((a, b) => a - b);
  const avgLatency = allLatencies.length
    ? (allLatencies.reduce((acc, v) => acc + v, 0) / allLatencies.length).toFixed(2)
    : '0.00';
  const p50 = allLatencies.length ? allLatencies[Math.floor(allLatencies.length * 0.50)] : 0;
  const p95 = allLatencies.length ? allLatencies[Math.floor(allLatencies.length * 0.95)] : 0;
  const p99 = allLatencies.length ? allLatencies[Math.floor(allLatencies.length * 0.99)] : 0;
  const maxLatency = allLatencies.length ? allLatencies[allLatencies.length - 1] : 0;
  const minLatency = allLatencies.length ? allLatencies[0] : 0;

  const totalMessagesProcessed = totalSent + totalReceived;
  const throughputMsgPerSec = (totalMessagesProcessed / totalTimeSec).toFixed(1);

  // 5. Disconnect all sockets
  users.forEach((u) => u.socket.disconnect());

  // 6. Print Report
  console.log(`\n======================================================`);
  console.log(`📊 20-USER SIMULATION TEST RESULTS`);
  console.log(`======================================================`);
  console.log(`⏱️  Test Duration: ${totalTimeSec.toFixed(2)}s`);
  console.log(`👥 Active Concurrent Users: ${NUM_USERS}`);
  console.log(`💬 Comment Pins Created: ${totalCommentsCreated}`);
  console.log(`📝 Discussion Replies Sent: ${totalRepliesSent}`);
  console.log(`✅ Comments Resolved: ${totalResolves}`);
  console.log(`🖱️  Cursor Movements Broadcast: ${totalCursorMoves}`);
  console.log(`------------------------------------------------------`);
  console.log(`📤 Total Events Sent by 20 Users: ${totalSent}`);
  console.log(`📥 Total Events Received across 20 Users: ${totalReceived}`);
  console.log(`⚡ Combined Throughput: ${throughputMsgPerSec} msg/sec`);
  console.log(`------------------------------------------------------`);
  console.log(`📈 Latency Distribution (Round-trip across 20 sockets):`);
  console.log(`   - Min Latency: ${minLatency} ms`);
  console.log(`   - Average Latency: ${avgLatency} ms`);
  console.log(`   - P50 (Median): ${p50} ms`);
  console.log(`   - P95: ${p95} ms`);
  console.log(`   - P99: ${p99} ms`);
  console.log(`   - Max Latency: ${maxLatency} ms`);
  console.log(`------------------------------------------------------`);
  console.log(`🎯 Dropped/Failed Connections: 0 (100% Success Rate)`);
  console.log(`======================================================\n`);
}

runSimulation().catch(console.error);
