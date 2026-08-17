import {
  PomodoroApiError,
  buildPomodoroCategoryTree,
  categoryIsCovered,
  formatPomodoroClock,
  isPomodoroSessionActive,
  pomodoroApi,
  togglePomodoroCategory,
} from '~/util/pomodoro';

describe('Pomodoro API client', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('starts a session with JSON settings and selected categories', async () => {
    const response = { state: 'running_work' };
    global.fetch.mockResolvedValue({ ok: true, json: async () => response });

    await expect(
      pomodoroApi.start([['Work']], {
        focus_duration_seconds: 1500,
        short_break_duration_seconds: 300,
        long_break_duration_seconds: 900,
        work_intervals: 8,
        distraction_timeout_seconds: 30,
        system_notifications: true,
        chrome_notifications: true,
        sound_enabled: true,
      })
    ).resolves.toEqual(response);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5667/pomodoro/start',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const request = global.fetch.mock.calls[0][1];
    expect(JSON.parse(request.body).selected_categories).toEqual([['Work']]);
  });

  test('surfaces structured service errors', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: { code: 'invalid_transition', message: 'already running' } }),
    });

    await expect(pomodoroApi.pause()).rejects.toEqual(
      expect.objectContaining({
        name: 'PomodoroApiError',
        code: 'invalid_transition',
        status: 409,
        message: 'already running',
      })
    );
  });

  test('maps network failures to an unavailable error', async () => {
    global.fetch.mockRejectedValue(new TypeError('network'));
    await expect(pomodoroApi.state()).rejects.toBeInstanceOf(PomodoroApiError);
    await expect(pomodoroApi.state()).rejects.toMatchObject({ code: 'unavailable' });
  });
});

describe('Pomodoro category selection', () => {
  test('builds missing parents and a nested tree', () => {
    const tree = buildPomodoroCategoryTree([
      ['Work', 'Programming', 'Rust'],
      ['Study'],
      ['Uncategorized'],
    ]);

    expect(tree.map(node => node.label)).toEqual(['Study', 'Work']);
    expect(tree[1].children[0].path).toEqual(['Work', 'Programming']);
    expect(tree[1].children[0].children[0].path).toEqual(['Work', 'Programming', 'Rust']);
  });

  test('selecting a parent removes redundant descendants', () => {
    const selected = [['Work', 'Programming'], ['Study']];
    expect(togglePomodoroCategory(selected, ['Work'])).toEqual([['Study'], ['Work']]);
    expect(categoryIsCovered(['Work', 'Programming'], [['Work']])).toBe(true);
  });

  test('allows multiple independent branches and toggles exact paths', () => {
    const selected = togglePomodoroCategory([['Work']], ['Study', 'Rust']);
    expect(selected).toEqual([['Work'], ['Study', 'Rust']]);
    expect(togglePomodoroCategory(selected, ['Work'])).toEqual([['Study', 'Rust']]);
  });
});

describe('Pomodoro display helpers', () => {
  test.each([
    [0, '00:00'],
    [1, '00:01'],
    [61_000, '01:01'],
    [3_661_000, '01:01:01'],
  ])('formats %i milliseconds as %s', (milliseconds, expected) => {
    expect(formatPomodoroClock(milliseconds)).toBe(expected);
  });

  test('distinguishes active and terminal states', () => {
    expect(isPomodoroSessionActive({ state: 'running_work' })).toBe(true);
    expect(isPomodoroSessionActive({ state: 'paused_afk' })).toBe(true);
    expect(isPomodoroSessionActive({ state: 'idle' })).toBe(false);
  });
});
