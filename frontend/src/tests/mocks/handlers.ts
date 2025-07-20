import { http, HttpResponse } from 'msw';
import { mockCattle, mockPhotos, mockWeightLogs, mockHerdStats, mockUser } from './mockData';

const API_URL = '/api';

export const handlers = [
  // Auth endpoints
  http.post(`${API_URL}/auth/login/`, async ({ request }) => {
    const body = await request.json() as { username: string; password: string };
    
    if (body.username === 'testuser' && body.password === 'testpass') {
      return HttpResponse.json({
        access: 'mock-access-token',
        refresh: 'mock-refresh-token',
      });
    }
    
    return HttpResponse.json(
      { detail: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  http.get(`${API_URL}/auth/user/`, () => {
    const token = localStorage.getItem('auth_token');
    if (token === 'mock-access-token') {
      return HttpResponse.json(mockUser);
    }
    return HttpResponse.json(
      { detail: 'Authentication credentials were not provided.' },
      { status: 401 }
    );
  }),

  http.post(`${API_URL}/auth/logout/`, () => {
    return HttpResponse.json({ detail: 'Successfully logged out' });
  }),

  http.post(`${API_URL}/auth/token/refresh/`, async ({ request }) => {
    const body = await request.json() as { refresh: string };
    
    if (body.refresh === 'mock-refresh-token') {
      return HttpResponse.json({
        access: 'mock-access-token-refreshed',
      });
    }
    
    return HttpResponse.json(
      { detail: 'Token is invalid or expired' },
      { status: 401 }
    );
  }),

  // Cattle endpoints
  http.get(`${API_URL}/cattle/`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('page_size') || '10');
    
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const results = mockCattle.slice(start, end);
    
    return HttpResponse.json({
      count: mockCattle.length,
      next: end < mockCattle.length ? `${API_URL}/cattle/?page=${page + 1}` : null,
      previous: page > 1 ? `${API_URL}/cattle/?page=${page - 1}` : null,
      results,
    });
  }),

  http.get(`${API_URL}/cattle/:id/`, ({ params }) => {
    const cattle = mockCattle.find(c => c.id === params.id);
    if (cattle) {
      return HttpResponse.json(cattle);
    }
    return HttpResponse.json(
      { detail: 'Not found.' },
      { status: 404 }
    );
  }),

  http.post(`${API_URL}/cattle/`, async ({ request }) => {
    const body = await request.json();
    const newCattle = {
      id: `cattle-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      age_in_months: 0,
      ...body,
    };
    return HttpResponse.json(newCattle, { status: 201 });
  }),

  http.patch(`${API_URL}/cattle/:id/`, async ({ params, request }) => {
    const cattle = mockCattle.find(c => c.id === params.id);
    if (!cattle) {
      return HttpResponse.json(
        { detail: 'Not found.' },
        { status: 404 }
      );
    }
    const body = await request.json();
    return HttpResponse.json({
      ...cattle,
      ...body,
      updated_at: new Date().toISOString(),
    });
  }),

  http.delete(`${API_URL}/cattle/:id/`, ({ params }) => {
    const cattle = mockCattle.find(c => c.id === params.id);
    if (!cattle) {
      return HttpResponse.json(
        { detail: 'Not found.' },
        { status: 404 }
      );
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // Photos endpoints
  http.get(`${API_URL}/photos/`, () => {
    return HttpResponse.json({
      count: mockPhotos.length,
      next: null,
      previous: null,
      results: mockPhotos,
    });
  }),

  http.post(`${API_URL}/photos/`, async ({ request }) => {
    const formData = await request.formData();
    const newPhoto = {
      id: `photo-${Date.now()}`,
      cattle: formData.get('cattle') as string,
      image: '/media/test-image.jpg',
      display_url: '/media/display/test-image.jpg',
      thumb_url: '/media/thumb/test-image.jpg',
      caption: formData.get('caption') as string || '',
      tags: formData.getAll('tags') as string[],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(newPhoto, { status: 201 });
  }),

  // Weight logs endpoints
  http.get(`${API_URL}/weight-logs/`, ({ request }) => {
    const url = new URL(request.url);
    const cattleId = url.searchParams.get('cattle');
    
    let results = mockWeightLogs;
    if (cattleId) {
      results = results.filter(log => log.cattle === cattleId);
    }
    
    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),

  http.get(`${API_URL}/weight-logs/:id/`, ({ params }) => {
    const log = mockWeightLogs.find(l => l.id === params.id);
    if (log) {
      return HttpResponse.json(log);
    }
    return HttpResponse.json(
      { detail: 'Not found.' },
      { status: 404 }
    );
  }),

  http.post(`${API_URL}/weight-logs/`, async ({ request }) => {
    const body = await request.json();
    const newLog = {
      id: `log-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...body,
    };
    return HttpResponse.json(newLog, { status: 201 });
  }),

  http.patch(`${API_URL}/weight-logs/:id/`, async ({ params, request }) => {
    const log = mockWeightLogs.find(l => l.id === params.id);
    if (!log) {
      return HttpResponse.json(
        { detail: 'Not found.' },
        { status: 404 }
      );
    }
    const body = await request.json();
    return HttpResponse.json({
      ...log,
      ...body,
      updated_at: new Date().toISOString(),
    });
  }),

  http.delete(`${API_URL}/weight-logs/:id/`, ({ params }) => {
    const log = mockWeightLogs.find(l => l.id === params.id);
    if (!log) {
      return HttpResponse.json(
        { detail: 'Not found.' },
        { status: 404 }
      );
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // Statistics endpoints
  http.get(`${API_URL}/statistics/herd/`, () => {
    return HttpResponse.json(mockHerdStats);
  }),

  http.get(`${API_URL}/statistics/color-distribution/`, () => {
    return HttpResponse.json(mockHerdStats.color_distribution);
  }),

  http.get(`${API_URL}/statistics/sex-distribution/`, () => {
    return HttpResponse.json(mockHerdStats.sex_distribution);
  }),

  http.get(`${API_URL}/statistics/horn-status-distribution/`, () => {
    return HttpResponse.json(mockHerdStats.horn_status_distribution);
  }),

  http.get(`${API_URL}/statistics/monthly-births/`, () => {
    return HttpResponse.json(mockHerdStats.monthly_births);
  }),

  http.get(`${API_URL}/statistics/weight-trends/`, () => {
    return HttpResponse.json([
      { date: '2024-01-01', weight: 450 },
      { date: '2024-02-01', weight: 475 },
      { date: '2024-03-01', weight: 500 },
    ]);
  }),

  http.get(`${API_URL}/photos/tags/`, () => {
    return HttpResponse.json(['breeding', 'show', 'health', 'portrait']);
  }),
];