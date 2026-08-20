export type CategoryPath = string[];

export type PomodoroStateName =
  | 'idle'
  | 'running_work'
  | 'running_break'
  | 'paused_manual'
  | 'paused_afk'
  | 'waiting_confirmation'
  | 'completed'
  | 'interrupted';

export type PomodoroPhaseKind = 'focus' | 'short_break' | 'long_break';

export interface PomodoroPhase {
  kind: PomodoroPhaseKind;
  focus_number?: number;
  after_focus?: number;
}

export interface PomodoroSessionSettings {
  focus_duration_seconds: number;
  short_break_duration_seconds: number;
  long_break_duration_seconds: number;
  work_intervals: number;
  distraction_timeout_seconds: number;
  system_notifications: boolean;
  chrome_notifications: boolean;
  sound_enabled: boolean;
}

export interface PomodoroSettings extends PomodoroSessionSettings {
  last_selected_categories: CategoryPath[];
}

export interface PomodoroDistraction {
  active: boolean;
  elapsed_milliseconds: number;
  warning_pending: boolean;
  warning_sequence: number;
}

export interface PomodoroState {
  state: PomodoroStateName;
  session_id?: string;
  phase?: PomodoroPhase;
  next_phase?: PomodoroPhase;
  remaining_milliseconds?: number;
  completed_focus_intervals: number;
  planned_focus_intervals: number;
  selected_categories: CategoryPath[];
  current_category?: CategoryPath;
  distraction: PomodoroDistraction;
  afk: boolean;
  monitoring_available: boolean;
  pause_reason?: 'manual' | 'afk' | 'monitoring_unavailable';
  interruption_reason?: 'user' | 'activitywatch_restart' | 'server_error';
}

export interface PomodoroHistoryItem {
  session_id: string;
  started_at: string;
  ended_at: string;
  status: 'completed' | 'interrupted';
  interruption_reason?: 'user' | 'activitywatch_restart' | 'server_error';
  settings: PomodoroSessionSettings;
  selected_categories: CategoryPath[];
  planned_focus_intervals: number;
  completed_focus_intervals: number;
  actual_focus_milliseconds: number;
  actual_break_milliseconds: number;
  manual_pause_milliseconds: number;
  afk_pause_milliseconds: number;
  monitoring_pause_milliseconds: number;
  distraction_count: number;
  distraction_milliseconds: number;
  allowed_focus_milliseconds: number;
  focus_percentage?: number;
}

export interface PomodoroHistoryPage {
  items: PomodoroHistoryItem[];
  page: number;
  page_size: number;
  total: number;
}

export interface PomodoroCategoryNode {
  key: string;
  label: string;
  path: CategoryPath;
  children: PomodoroCategoryNode[];
}

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

export const POMODORO_API_BASE = 'http://127.0.0.1:5667/pomodoro';

export class PomodoroApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = 'request_failed', httpStatus = 0) {
    super(message);
    this.name = 'PomodoroApiError';
    this.code = code;
    this.status = httpStatus;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${POMODORO_API_BASE}${path}`, options);
  } catch (_error) {
    throw new PomodoroApiError('Pomodoro background service is unavailable', 'unavailable');
  }

  let body: T | ApiErrorBody | null = null;
  try {
    body = await response.json();
  } catch (_error) {
    if (response.ok) {
      throw new PomodoroApiError(
        'Pomodoro service returned an invalid response',
        'invalid_response'
      );
    }
  }

  if (!response.ok) {
    const error = (body as ApiErrorBody | null)?.error;
    throw new PomodoroApiError(
      error?.message || `Pomodoro request failed (${response.status})`,
      error?.code || 'request_failed',
      response.status
    );
  }
  return body as T;
}

function jsonRequest(method: 'POST' | 'PUT', body: unknown = {}): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export const pomodoroApi = {
  state(): Promise<PomodoroState> {
    return request('/state');
  },
  settings(): Promise<PomodoroSettings> {
    return request('/settings');
  },
  saveSettings(settings: PomodoroSettings): Promise<PomodoroSettings> {
    return request('/settings', jsonRequest('PUT', settings));
  },
  start(
    selectedCategories: CategoryPath[],
    settings: PomodoroSessionSettings
  ): Promise<PomodoroState> {
    return request(
      '/start',
      jsonRequest('POST', { selected_categories: selectedCategories, settings })
    );
  },
  pause(): Promise<PomodoroState> {
    return request('/pause', jsonRequest('POST'));
  },
  resume(): Promise<PomodoroState> {
    return request('/resume', jsonRequest('POST'));
  },
  stop(): Promise<PomodoroState> {
    return request('/stop', jsonRequest('POST'));
  },
  confirmNext(): Promise<PomodoroState> {
    return request('/confirm-next', jsonRequest('POST'));
  },
  continueDistraction(): Promise<PomodoroState> {
    return request('/distraction/continue', jsonRequest('POST'));
  },
  history(page = 1, pageSize = 10): Promise<PomodoroHistoryPage> {
    return request(`/history?page=${page}&page_size=${pageSize}`);
  },
};

export function buildPomodoroCategoryTree(paths: CategoryPath[]): PomodoroCategoryNode[] {
  const roots: PomodoroCategoryNode[] = [];
  const byKey = new Map<string, PomodoroCategoryNode>();
  const uniquePaths = new Map<string, CategoryPath>();

  paths.forEach(path => {
    if (!path.length || path[0] === 'Uncategorized') return;
    for (let depth = 1; depth <= path.length; depth += 1) {
      const partial = path.slice(0, depth);
      uniquePaths.set(JSON.stringify(partial), partial);
    }
  });

  [...uniquePaths.values()]
    .sort((a, b) => a.join('\u0000').localeCompare(b.join('\u0000')))
    .forEach(path => {
      const key = JSON.stringify(path);
      const node: PomodoroCategoryNode = {
        key,
        label: path[path.length - 1],
        path,
        children: [],
      };
      byKey.set(key, node);
      if (path.length === 1) {
        roots.push(node);
      } else {
        const parent = byKey.get(JSON.stringify(path.slice(0, -1)));
        if (parent) parent.children.push(node);
      }
    });

  return roots;
}

export function categoryPathEquals(left: CategoryPath, right: CategoryPath): boolean {
  return left.length === right.length && left.every((part, index) => part === right[index]);
}

export function categoryIsCovered(path: CategoryPath, selected: CategoryPath[]): boolean {
  return selected.some(
    category =>
      category.length < path.length && category.every((part, index) => part === path[index])
  );
}

export function togglePomodoroCategory(
  selected: CategoryPath[],
  path: CategoryPath
): CategoryPath[] {
  const exists = selected.some(category => categoryPathEquals(category, path));
  if (exists) return selected.filter(category => !categoryPathEquals(category, path));

  return selected
    .filter(
      category =>
        !(category.length > path.length && path.every((part, index) => part === category[index]))
    )
    .concat([path]);
}

export function isPomodoroSessionActive(state?: PomodoroState | null): boolean {
  return Boolean(state && !['idle', 'completed', 'interrupted'].includes(state.state));
}

export function formatPomodoroClock(milliseconds: number | undefined): string {
  const totalSeconds = Math.max(0, Math.ceil((milliseconds || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [minutes.toString().padStart(2, '0'), seconds.toString().padStart(2, '0')];
  if (hours > 0) parts.unshift(hours.toString().padStart(2, '0'));
  return parts.join(':');
}

export function formatPomodoroDuration(milliseconds: number): string {
  const totalMinutes = Math.round(milliseconds / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
}
