import {
  requireUser,
  checkUsage,
  incrementUsage,
  errorResponse,
  ApiError,
  DAILY_LIMITS,
} from '@/lib/api-helpers';

// ── Supabase mock ─────────────────────────────────────────────────────────────

const mockGetUser = jest.fn();
const mockSingle = jest.fn();
const mockRpc = jest.fn();
const mockEq = jest.fn();
const mockSelect = jest.fn();
const mockFrom = jest.fn();

function resetChain() {
  mockEq.mockReturnThis();
  mockSelect.mockReturnThis();
  mockFrom.mockReturnValue({ select: mockSelect, eq: mockEq, single: mockSingle });
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(headers: Record<string, string> = {}): Request {
  return {
    headers: { get: (key: string) => headers[key.toLowerCase()] ?? null },
  } as unknown as Request;
}

beforeEach(() => {
  jest.clearAllMocks();
  resetChain();
});

// ── requireUser ───────────────────────────────────────────────────────────────

describe('requireUser', () => {
  it('throws 401 when Authorization header is missing', async () => {
    const req = makeRequest();
    await expect(requireUser(req)).rejects.toMatchObject({ status: 401 });
  });

  it('throws 401 when Authorization header is not a Bearer token', async () => {
    const req = makeRequest({ authorization: 'Basic abc123' });
    await expect(requireUser(req)).rejects.toMatchObject({ status: 401 });
  });

  it('throws 401 when Supabase cannot verify the token', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = makeRequest({ authorization: 'Bearer invalid-token' });
    await expect(requireUser(req)).rejects.toMatchObject({ status: 401 });
  });

  it('returns the user id when the token is valid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-abc' } } });
    const req = makeRequest({ authorization: 'Bearer valid-token' });
    await expect(requireUser(req)).resolves.toBe('user-abc');
  });

  it('passes the token without the Bearer prefix to Supabase', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-abc' } } });
    const req = makeRequest({ authorization: 'Bearer my-jwt-token' });
    await requireUser(req);
    expect(mockGetUser).toHaveBeenCalledWith('my-jwt-token');
  });
});

// ── checkUsage ────────────────────────────────────────────────────────────────

describe('checkUsage', () => {
  it('allows the request when no usage row exists yet', async () => {
    mockSingle.mockResolvedValue({ data: null });
    await expect(checkUsage('user-1', 'ingredient_calls')).resolves.toBeUndefined();
  });

  it('allows the request when usage is below the limit', async () => {
    mockSingle.mockResolvedValue({ data: { ingredient_calls: 5 } });
    await expect(checkUsage('user-1', 'ingredient_calls')).resolves.toBeUndefined();
  });

  it('throws 429 when usage equals the daily limit', async () => {
    mockSingle.mockResolvedValue({ data: { ingredient_calls: DAILY_LIMITS.ingredient_calls } });
    await expect(checkUsage('user-1', 'ingredient_calls')).rejects.toMatchObject({ status: 429 });
  });

  it('throws 429 when usage exceeds the daily limit', async () => {
    mockSingle.mockResolvedValue({ data: { recipe_calls: DAILY_LIMITS.recipe_calls + 1 } });
    await expect(checkUsage('user-1', 'recipe_calls')).rejects.toMatchObject({ status: 429 });
  });

  it('includes a human-readable label in the 429 message for ingredient_calls', async () => {
    mockSingle.mockResolvedValue({ data: { ingredient_calls: DAILY_LIMITS.ingredient_calls } });
    await expect(checkUsage('user-1', 'ingredient_calls')).rejects.toMatchObject({
      message: expect.stringContaining('ingredient scans'),
    });
  });

  it('includes a human-readable label in the 429 message for recipe_calls', async () => {
    mockSingle.mockResolvedValue({ data: { recipe_calls: DAILY_LIMITS.recipe_calls } });
    await expect(checkUsage('user-1', 'recipe_calls')).rejects.toMatchObject({
      message: expect.stringContaining('recipe generations'),
    });
  });
});

// ── incrementUsage ────────────────────────────────────────────────────────────

describe('incrementUsage', () => {
  it('calls the increment_usage RPC with the correct arguments', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    await incrementUsage('user-1', 'recipe_calls');
    expect(mockRpc).toHaveBeenCalledWith('increment_usage', {
      p_user_id: 'user-1',
      p_field: 'recipe_calls',
    });
  });
});

// ── errorResponse ─────────────────────────────────────────────────────────────

describe('errorResponse', () => {
  it('returns the ApiError status and message', async () => {
    const res = errorResponse(new ApiError(429, 'Rate limited'));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe('Rate limited');
  });

  it('returns 500 for a generic Error', async () => {
    const res = errorResponse(new Error('Something broke'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Something broke');
  });

  it('returns 500 for an unknown thrown value', async () => {
    const res = errorResponse('oops');
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Unknown error');
  });
});
