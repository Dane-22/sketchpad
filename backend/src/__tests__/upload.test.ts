import request from 'supertest';
import { app } from '../index';

describe('Upload Endpoints', () => {
  describe('POST /api/v1/uploads/canvas-asset', () => {
    it('should upload a canvas asset successfully and return public URL', async () => {
      const dummyBuffer = Buffer.from('fake-image-binary-data');

      const response = await request(app)
        .post('/api/v1/uploads/canvas-asset')
        .attach('file', dummyBuffer, 'blueprint.png');

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('url');
      expect(response.body.url).toMatch(/^\/uploads\/canvas\/.*\.png$/);
    });

    it('should return 400 when no file is attached', async () => {
      const response = await request(app)
        .post('/api/v1/uploads/canvas-asset');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'No file uploaded');
    });
  });
});
