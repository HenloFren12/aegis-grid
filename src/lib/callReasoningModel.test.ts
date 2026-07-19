import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { callReasoningModel } from './callReasoningModel';

describe('callReasoningModel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('posts the prompt to the reasoning endpoint', async () => {
    const responseData = {
      gates: [],
      overallSituation: 'Normal operations',
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(responseData),
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await callReasoningModel(
      'analyze stadium conditions',
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/reasoning',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
        },
        body: JSON.stringify({
          prompt: 'analyze stadium conditions',
        }),
      },
    );

    expect(result).toEqual(responseData);
  });

  it('returns null when the endpoint returns an error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    );

    await expect(
      callReasoningModel('test'),
    ).resolves.toBeNull();
  });

  it('returns null when the network request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(
        new Error('Network unavailable'),
      ),
    );

    await expect(
      callReasoningModel('test'),
    ).resolves.toBeNull();
  });

  it('returns null when response JSON parsing fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockRejectedValue(
          new Error('Malformed JSON'),
        ),
      }),
    );

    await expect(
      callReasoningModel('test'),
    ).resolves.toBeNull();
  });
});