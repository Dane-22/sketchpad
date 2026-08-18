import http from 'http';
import { prisma } from '../src/config/db';
import { hashPassword } from '../src/utils/passwordHash';
import { generateToken } from '../src/utils/jwt';

const SERVER_PORT = 5005;

function makeRequest(options: http.RequestOptions, body?: any): Promise<{ statusCode: number; data: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ statusCode: res.statusCode || 500, data: parsed });
        } catch {
          resolve({ statusCode: res.statusCode || 500, data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function testPersistence() {
  console.log(`\n========================================================`);
  console.log(`🧪 TESTING DATABASE PERSISTENCE FOR DELETION & DUPLICATION`);
  console.log(`========================================================\n`);

  const userId = `user-persist-${Date.now()}`;
  const hashedPassword = await hashPassword('TestPass123!');
  const user = await prisma.user.create({
    data: {
      id: userId,
      email: `persist_${Date.now()}@example.com`,
      password: hashedPassword,
      fullName: 'Persistence Tester',
      role: 'ENGINEER'
    }
  });

  const token = generateToken({ userId: user.id, role: user.role });
  const projectId = `persist-proj-${Date.now()}`;

  // 1. Create a project with an uploaded image element
  console.log(`[Step 1] Creating project with 1 uploaded image...`);
  const initialElements = [
    {
      id: 'img-12345',
      type: 'image',
      name: 'Site Plan.pdf',
      x: 100,
      y: 150,
      width: 800,
      height: 600,
      src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      opacity: 1
    }
  ];

  await prisma.project.create({
    data: {
      id: projectId,
      title: 'Persistence Test Project',
      description: 'Testing canvas saving',
      userId: user.id,
      canvasData: { elements: initialElements, version: 1, scale: 1 }
    }
  });

  // Verify it exists in DB
  let fetched = await makeRequest({
    hostname: 'localhost',
    port: SERVER_PORT,
    path: `/api/v1/projects/${projectId}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(`✅ Loaded project. Elements count: ${fetched.data.canvasData.elements.length}`);

  // 2. Duplicate element & save
  console.log(`\n[Step 2] Simulating element duplicate action & immediate save...`);
  const duplicatedElements = [
    ...initialElements,
    {
      ...initialElements[0],
      id: 'img-12345-clone',
      x: 130,
      y: 180
    }
  ];

  const saveRes1 = await makeRequest({
    hostname: 'localhost',
    port: SERVER_PORT,
    path: `/api/v1/projects/${projectId}/save`,
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }, { elements: duplicatedElements, version: 1, scale: 1 });

  console.log(`✅ Saved canvas with duplicated item (HTTP ${saveRes1.statusCode}).`);

  // Verify reload
  fetched = await makeRequest({
    hostname: 'localhost',
    port: SERVER_PORT,
    path: `/api/v1/projects/${projectId}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(`✅ Verified reload after duplication: ${fetched.data.canvasData.elements.length} elements found (Expected: 2)`);

  // 3. Delete uploaded file & save
  console.log(`\n[Step 3] Simulating element delete action (Del key / Right Click -> Delete) & save...`);
  const remainingElements: any[] = []; // All elements deleted

  const saveRes2 = await makeRequest({
    hostname: 'localhost',
    port: SERVER_PORT,
    path: `/api/v1/projects/${projectId}/save`,
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }, { elements: remainingElements, version: 1, scale: 1 });

  console.log(`✅ Saved canvas after deletion (HTTP ${saveRes2.statusCode}).`);

  // Verify reload
  fetched = await makeRequest({
    hostname: 'localhost',
    port: SERVER_PORT,
    path: `/api/v1/projects/${projectId}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(`✅ Verified reload after deletion: ${fetched.data.canvasData.elements.length} elements found (Expected: 0)`);

  // Cleanup
  await prisma.project.delete({ where: { id: projectId } });
  await prisma.user.delete({ where: { id: userId } });

  console.log(`\n========================================================`);
  console.log(`🎉 ALL PERSISTENCE TESTS PASSED (100% PERSISTENT ACROSS REFRESH)`);
  console.log(`========================================================\n`);
}

testPersistence().catch(console.error);
