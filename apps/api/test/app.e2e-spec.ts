import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

describe('EventDev API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('serves the public event catalog from PostgreSQL', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/events')
      .expect(200);

    const body: unknown = response.body;
    expect(isRecord(body)).toBe(true);
    if (!isRecord(body) || !Array.isArray(body.events)) {
      throw new Error('The catalog response does not contain an events array.');
    }

    expect(body.total).toBe(body.events.length);
    expect(body.events.length).toBeGreaterThan(0);
  });

  it('protects organizer routes without a bearer token', async () => {
    await request(app.getHttpServer()).get('/api/organizer/events').expect(401);
  });

  it('authenticates the seeded organizer and returns only its events', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'organizer@elite.dev',
        password: 'Organizer123!',
      })
      .expect(201);

    const loginBody: unknown = loginResponse.body;
    expect(isRecord(loginBody)).toBe(true);
    if (
      !isRecord(loginBody) ||
      typeof loginBody.token !== 'string' ||
      !isRecord(loginBody.user)
    ) {
      throw new Error('The login response does not match the auth contract.');
    }

    expect(loginBody.user.role).toBe('ORGANIZER');

    const eventsResponse = await request(app.getHttpServer())
      .get('/api/organizer/events')
      .set('Authorization', `Bearer ${loginBody.token}`)
      .expect(200);

    const eventsBody: unknown = eventsResponse.body;
    expect(isRecord(eventsBody)).toBe(true);
    if (!isRecord(eventsBody) || !Array.isArray(eventsBody.events)) {
      throw new Error(
        'The organizer response does not contain an events array.',
      );
    }

    expect(eventsBody.events.length).toBeGreaterThan(0);
    expect(
      eventsBody.events.every(
        (event: unknown) => isRecord(event) && typeof event.status === 'string',
      ),
    ).toBe(true);
  });

  afterAll(async () => {
    await app?.close();
  });
});
