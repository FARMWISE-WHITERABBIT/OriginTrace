import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Supabase mock — prevents any real DB calls during tests.
// Individual tests can override specific methods via vi.mocked().
// ---------------------------------------------------------------------------

export const mockSupabaseFrom = vi.fn();
export const mockSupabaseAuth = {
  getUser: vi.fn(),
};

const mockSupabaseClient = {
  from: mockSupabaseFrom,
  auth: mockSupabaseAuth,
};

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockSupabaseClient,
  getAdminClient: () => mockSupabaseClient,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => mockSupabaseClient,
}));

// Reset all mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
