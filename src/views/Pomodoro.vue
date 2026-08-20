<template lang="pug">
div.pomodoro-page
  div.pomodoro-heading.d-flex.flex-wrap.align-items-center.justify-content-between.mb-4
    div
      h2.mb-1 {{ $t('pomodoro.title') }}
      p.text-muted.mb-0 {{ $t('pomodoro.subtitle') }}
    b-badge.px-3.py-2(:variant="connected ? 'success' : 'secondary'")
      | {{ connected ? $t('pomodoro.service.connected') : $t('pomodoro.service.disconnected') }}

  b-alert(v-if="errorMessage" show dismissible variant="danger" @dismissed="errorMessage = ''")
    | {{ errorMessage }}

  b-card.service-unavailable.text-center(v-if="!loading && !connected")
    icon.service-icon.mb-3(name="exclamation-circle" scale="2.4")
    h4 {{ $t('pomodoro.service.unavailableTitle') }}
    p.text-muted {{ $t('pomodoro.service.unavailableBody') }}
    b-button(variant="primary" :disabled="actionBusy" @click="initialize")
      icon.mr-2(name="sync-alt")
      | {{ $t('pomodoro.service.retry') }}

  div.text-center.py-5(v-else-if="loading")
    b-spinner(label="Loading")

  template(v-else)
    b-alert(
      v-if="sessionActive && state && !state.monitoring_available"
      show
      variant="danger"
    )
      strong {{ $t('pomodoro.monitoring.title') }}
      div {{ $t('pomodoro.monitoring.body') }}

    b-alert(v-if="sessionActive && state && state.afk" show variant="warning")
      strong {{ $t('pomodoro.afk.title') }}
      div {{ $t('pomodoro.afk.body') }}

    section.active-session(v-if="sessionActive")
      div.session-grid
        b-card.timer-card.text-center
          div.d-flex.justify-content-center.align-items-center.mb-2
            b-badge.mr-2(:variant="statusVariant") {{ statusLabel }}
            span.text-muted.small(v-if="state && state.phase") {{ phaseLabel(state.phase) }}

          div.timer-ring.mx-auto.my-4(:style="timerRingStyle")
            div.timer-ring__inner
              div.timer-value {{ timerValue }}
              div.timer-caption {{ timerCaption }}

          div.interval-progress.mb-4(v-if="state")
            div.d-flex.justify-content-between.small.mb-1
              span {{ $t('pomodoro.timer.progress') }}
              strong
                | {{ displayedFocusNumber }} / {{ state.planned_focus_intervals }}
            b-progress(:value="displayedFocusNumber" :max="state.planned_focus_intervals" height="0.45rem")

          div.controls.d-flex.flex-wrap.justify-content-center
            b-button.m-1(
              v-if="canPause"
              variant="outline-secondary"
              :disabled="actionBusy"
              @click="pause"
            )
              icon.mr-2(name="pause")
              | {{ $t('pomodoro.actions.pause') }}
            b-button.m-1(
              v-if="canResume"
              variant="primary"
              :disabled="actionBusy || !resumeAvailable"
              @click="resume"
            )
              icon.mr-2(name="play")
              | {{ $t('pomodoro.actions.resume') }}
            b-button.m-1(
              v-if="waitingConfirmation"
              variant="primary"
              :disabled="actionBusy || !resumeAvailable"
              @click="confirmNext"
            )
              icon.mr-2(name="step-forward")
              | {{ $t('pomodoro.actions.startNext', { phase: nextPhaseLabel }) }}
            b-button.m-1(
              variant="outline-danger"
              :disabled="actionBusy"
              @click="stop"
            )
              icon.mr-2(name="stop")
              | {{ $t('pomodoro.actions.stop') }}

        div.session-side
          b-card.mb-3
            h5.mb-3 {{ $t('pomodoro.focus.title') }}
            div.focus-row
              span.text-muted {{ $t('pomodoro.focus.currentCategory') }}
              strong.text-right {{ currentCategoryLabel }}
            div.focus-row.mt-3
              span.text-muted {{ $t('pomodoro.focus.selectedCategories') }}
              strong.text-right {{ selectedCategorySummary }}

          b-alert.distraction-warning(
            v-if="state && state.distraction.warning_pending"
            show
            variant="warning"
          )
            h5 {{ $t('pomodoro.distraction.warningTitle') }}
            p.mb-3 {{ $t('pomodoro.distraction.warningBody', { timeout: settingsForm.distractionTimeoutSeconds }) }}
            div.d-flex.flex-wrap
              b-button.mr-2.mb-2(
                variant="warning"
                :disabled="actionBusy"
                @click="continueDistraction"
              ) {{ $t('pomodoro.actions.continue') }}
              b-button.mr-2.mb-2(
                variant="outline-secondary"
                :disabled="actionBusy"
                @click="pause"
              ) {{ $t('pomodoro.actions.pause') }}
              b-button.mb-2(
                variant="outline-danger"
                :disabled="actionBusy"
                @click="stop"
              ) {{ $t('pomodoro.actions.stop') }}

          b-card.distraction-active(
            v-else-if="state && state.distraction.active"
            border-variant="warning"
          )
            div.d-flex.align-items-center
              icon.mr-3.text-warning(name="exclamation-triangle" scale="1.35")
              div
                strong.d-block {{ $t('pomodoro.distraction.activeTitle') }}
                small.text-muted
                  | {{ $t('pomodoro.distraction.activeBody', { elapsed: distractionElapsed }) }}

          b-card(v-if="waitingConfirmation" border-variant="info")
            h5 {{ $t('pomodoro.confirmation.title') }}
            p.text-muted {{ $t('pomodoro.confirmation.body', { phase: nextPhaseLabel }) }}

    section.setup-session(v-else)
      div.setup-grid
        b-card.categories-card
          div.d-flex.align-items-start.justify-content-between.mb-3
            div
              h4.mb-1 {{ $t('pomodoro.categories.title') }}
              p.text-muted.small.mb-0 {{ $t('pomodoro.categories.help') }}
            b-badge(variant="info")
              | {{ $t('pomodoro.categories.selected', { count: selectedCategories.length }) }}

          b-alert(v-if="categoryTree.length === 0" show variant="light")
            | {{ $t('pomodoro.categories.empty') }}
          div.category-tree-shell(v-else)
            pomodoro-category-tree(
              :nodes="categoryTree"
              :selected="selectedCategories"
              @toggle="toggleCategory"
            )

        b-card.settings-card
          h4.mb-1 {{ $t('pomodoro.settings.title') }}
          p.text-muted.small.mb-4 {{ $t('pomodoro.settings.help') }}

          div.form-grid
            b-form-group(:label="$t('pomodoro.settings.focusMinutes')")
              b-form-input(v-model.number="settingsForm.focusMinutes" type="number" min="0.02" max="1440" step="0.5")
            b-form-group(:label="$t('pomodoro.settings.shortBreakMinutes')")
              b-form-input(v-model.number="settingsForm.shortBreakMinutes" type="number" min="0.02" max="1440" step="0.5")
            b-form-group(:label="$t('pomodoro.settings.longBreakMinutes')")
              b-form-input(v-model.number="settingsForm.longBreakMinutes" type="number" min="0.02" max="1440" step="0.5")
            b-form-group(:label="$t('pomodoro.settings.workIntervals')")
              b-form-input(v-model.number="settingsForm.workIntervals" type="number" min="1" max="100" step="1")
            b-form-group.form-grid__wide(:label="$t('pomodoro.settings.distractionTimeoutSeconds')")
              b-form-input(v-model.number="settingsForm.distractionTimeoutSeconds" type="number" min="1" max="86400" step="1")

          hr
          h6.mb-3 {{ $t('pomodoro.settings.notifications') }}
          b-form-checkbox.mb-2(v-model="settingsForm.systemNotifications")
            | {{ $t('pomodoro.settings.systemNotifications') }}
          b-form-checkbox.mb-2(v-model="settingsForm.chromeNotifications")
            | {{ $t('pomodoro.settings.chromeNotifications') }}
          b-form-checkbox(v-model="settingsForm.soundEnabled")
            | {{ $t('pomodoro.settings.sound') }}

      b-alert.mt-3(v-if="!formValid" show variant="light")
        | {{ formValidationMessage }}

      div.start-panel.mt-3.p-3.d-flex.flex-wrap.align-items-center.justify-content-between
        div
          strong.d-block {{ $t('pomodoro.start.readyTitle') }}
          small.text-muted {{ $t('pomodoro.start.readyBody') }}
        div.mt-2.mt-md-0
          b-button.mr-2(
            variant="outline-secondary"
            :disabled="actionBusy || !formValid"
            @click="saveDefaults"
          ) {{ $t('pomodoro.actions.saveDefaults') }}
          b-button(
            variant="danger"
            size="lg"
            :disabled="actionBusy || !formValid"
            @click="start"
          )
            icon.mr-2(name="play")
            | {{ $t('pomodoro.actions.start') }}

    hr.my-5
    pomodoro-history(
      :items="history.items"
      :loading="historyLoading"
      :page="history.page"
      :page-size="history.page_size"
      :total="history.total"
      @page="loadHistory"
    )
</template>

<script lang="ts">
import Vue from 'vue';
import 'vue-awesome/icons/exclamation-circle';
import 'vue-awesome/icons/exclamation-triangle';
import 'vue-awesome/icons/pause';
import 'vue-awesome/icons/play';
import 'vue-awesome/icons/step-forward';
import 'vue-awesome/icons/stop';
import 'vue-awesome/icons/sync-alt';

import PomodoroCategoryTree from '~/components/PomodoroCategoryTree.vue';
import PomodoroHistory from '~/components/PomodoroHistory.vue';
import { useCategoryStore } from '~/stores/categories';
import { useSettingsStore } from '~/stores/settings';
import {
  CategoryPath,
  PomodoroApiError,
  PomodoroHistoryPage,
  PomodoroCategoryNode,
  PomodoroPhase,
  PomodoroSessionSettings,
  PomodoroSettings,
  PomodoroState,
  buildPomodoroCategoryTree,
  formatPomodoroClock,
  isPomodoroSessionActive,
  pomodoroApi,
  togglePomodoroCategory,
} from '~/util/pomodoro';

interface SettingsForm {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  workIntervals: number;
  distractionTimeoutSeconds: number;
  systemNotifications: boolean;
  chromeNotifications: boolean;
  soundEnabled: boolean;
}

const defaultSettingsForm = (): SettingsForm => ({
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  workIntervals: 8,
  distractionTimeoutSeconds: 30,
  systemNotifications: true,
  chromeNotifications: true,
  soundEnabled: true,
});

const emptyHistory = (): PomodoroHistoryPage => ({ items: [], page: 1, page_size: 10, total: 0 });

export default Vue.extend({
  name: 'Pomodoro',
  components: { PomodoroCategoryTree, PomodoroHistory },
  data() {
    return {
      actionBusy: false,
      categoryTree: [] as PomodoroCategoryNode[],
      connected: false,
      errorMessage: '',
      history: emptyHistory(),
      historyLoading: false,
      loading: true,
      polling: false,
      pollTimer: null as ReturnType<typeof setInterval> | null,
      selectedCategories: [] as CategoryPath[],
      settingsForm: defaultSettingsForm(),
      state: null as PomodoroState | null,
    };
  },
  computed: {
    sessionActive(): boolean {
      return isPomodoroSessionActive(this.state);
    },
    canPause(): boolean {
      return Boolean(this.state && ['running_work', 'running_break'].includes(this.state.state));
    },
    canResume(): boolean {
      return Boolean(this.state && ['paused_manual', 'paused_afk'].includes(this.state.state));
    },
    waitingConfirmation(): boolean {
      return this.state?.state === 'waiting_confirmation';
    },
    resumeAvailable(): boolean {
      return Boolean(this.state && !this.state.afk && this.state.monitoring_available);
    },
    timerValue(): string {
      return formatPomodoroClock(this.state?.remaining_milliseconds);
    },
    timerCaption(): string {
      if (this.state?.state === 'paused_afk') return this.$t('pomodoro.timer.pausedAfk') as string;
      if (this.state?.state === 'paused_manual') return this.$t('pomodoro.timer.paused') as string;
      if (this.waitingConfirmation) return this.$t('pomodoro.timer.waiting') as string;
      return this.$t('pomodoro.timer.remaining') as string;
    },
    displayedFocusNumber(): number {
      if (!this.state) return 0;
      return Math.min(
        this.state.planned_focus_intervals,
        this.state.phase?.focus_number ||
          this.state.phase?.after_focus ||
          this.state.next_phase?.focus_number ||
          this.state.completed_focus_intervals
      );
    },
    phaseTotalMilliseconds(): number {
      const kind = this.state?.phase?.kind;
      if (kind === 'focus') return this.settingsForm.focusMinutes * 60000;
      if (kind === 'short_break') return this.settingsForm.shortBreakMinutes * 60000;
      if (kind === 'long_break') return this.settingsForm.longBreakMinutes * 60000;
      return 1;
    },
    timerProgress(): number {
      const remaining = this.state?.remaining_milliseconds || 0;
      return Math.max(0, Math.min(100, 100 - (remaining / this.phaseTotalMilliseconds) * 100));
    },
    timerRingStyle(): Record<string, string> {
      return { '--pomodoro-progress': `${this.timerProgress * 3.6}deg` };
    },
    statusLabel(): string {
      return this.$t(`pomodoro.state.${this.state?.state || 'idle'}`) as string;
    },
    statusVariant(): string {
      if (this.state?.state === 'running_work') return 'danger';
      if (this.state?.state === 'running_break') return 'success';
      if (this.state?.state === 'paused_afk') return 'warning';
      return 'secondary';
    },
    nextPhaseLabel(): string {
      return this.state?.next_phase ? this.phaseLabel(this.state.next_phase) : '';
    },
    currentCategoryLabel(): string {
      return (
        this.state?.current_category?.join(' > ') ||
        (this.$t('pomodoro.focus.uncategorized') as string)
      );
    },
    selectedCategorySummary(): string {
      return (
        this.state?.selected_categories.map(category => category.join(' > ')).join(', ') || '—'
      );
    },
    distractionElapsed(): string {
      return formatPomodoroClock(this.state?.distraction.elapsed_milliseconds);
    },
    formValid(): boolean {
      return Boolean(
        this.selectedCategories.length > 0 &&
          this.validNumber(this.settingsForm.focusMinutes, 1 / 60, 1440) &&
          this.validNumber(this.settingsForm.shortBreakMinutes, 1 / 60, 1440) &&
          this.validNumber(this.settingsForm.longBreakMinutes, 1 / 60, 1440) &&
          this.validInteger(this.settingsForm.workIntervals, 1, 100) &&
          this.validInteger(this.settingsForm.distractionTimeoutSeconds, 1, 86400)
      );
    },
    formValidationMessage(): string {
      if (!this.selectedCategories.length)
        return this.$t('pomodoro.validation.categories') as string;
      return this.$t('pomodoro.validation.settings') as string;
    },
  },
  async created() {
    const settingsStore = useSettingsStore();
    await settingsStore.ensureLoaded();
    const categoryStore = useCategoryStore();
    categoryStore.load();
    this.categoryTree = buildPomodoroCategoryTree(categoryStore.all_categories);
    await this.initialize();
    this.pollTimer = setInterval(() => this.pollState(), 1000);
  },
  beforeDestroy() {
    if (this.pollTimer) clearInterval(this.pollTimer);
  },
  methods: {
    validInteger(value: number, min: number, max: number): boolean {
      return Number.isInteger(value) && value >= min && value <= max;
    },
    validNumber(value: number, min: number, max: number): boolean {
      return Number.isFinite(value) && value >= min && value <= max;
    },
    phaseLabel(phase: PomodoroPhase): string {
      return this.$t(`pomodoro.phase.${phase.kind}`) as string;
    },
    applySettings(settings: PomodoroSettings) {
      this.settingsForm = {
        focusMinutes: this.secondsToMinutes(settings.focus_duration_seconds),
        shortBreakMinutes: this.secondsToMinutes(settings.short_break_duration_seconds),
        longBreakMinutes: this.secondsToMinutes(settings.long_break_duration_seconds),
        workIntervals: settings.work_intervals,
        distractionTimeoutSeconds: settings.distraction_timeout_seconds,
        systemNotifications: settings.system_notifications,
        chromeNotifications: settings.chrome_notifications,
        soundEnabled: settings.sound_enabled,
      };
      this.selectedCategories = settings.last_selected_categories.map(category => [...category]);
    },
    sessionSettings(): PomodoroSessionSettings {
      return {
        focus_duration_seconds: Math.round(this.settingsForm.focusMinutes * 60),
        short_break_duration_seconds: Math.round(this.settingsForm.shortBreakMinutes * 60),
        long_break_duration_seconds: Math.round(this.settingsForm.longBreakMinutes * 60),
        work_intervals: this.settingsForm.workIntervals,
        distraction_timeout_seconds: this.settingsForm.distractionTimeoutSeconds,
        system_notifications: this.settingsForm.systemNotifications,
        chrome_notifications: this.settingsForm.chromeNotifications,
        sound_enabled: this.settingsForm.soundEnabled,
      };
    },
    secondsToMinutes(seconds: number): number {
      return Number((seconds / 60).toFixed(2));
    },
    savedSettings(): PomodoroSettings {
      return {
        ...this.sessionSettings(),
        last_selected_categories: this.selectedCategories.map(category => [...category]),
      };
    },
    toggleCategory(path: CategoryPath) {
      this.selectedCategories = togglePomodoroCategory(this.selectedCategories, path);
    },
    async initialize() {
      this.loading = true;
      this.errorMessage = '';
      try {
        const [settings, state] = await Promise.all([pomodoroApi.settings(), pomodoroApi.state()]);
        this.applySettings(settings);
        this.state = state;
        if (isPomodoroSessionActive(state)) {
          this.selectedCategories = state.selected_categories.map(category => [...category]);
        }
        this.connected = true;
        await this.loadHistory(1);
      } catch (error) {
        this.connected = false;
        this.handleError(error, false);
      } finally {
        this.loading = false;
      }
    },
    async pollState() {
      if (this.polling) return;
      this.polling = true;
      try {
        const state = await pomodoroApi.state();
        const hadSession = isPomodoroSessionActive(this.state);
        this.state = state;
        this.connected = true;
        if (hadSession && !isPomodoroSessionActive(state)) await this.loadHistory(1);
      } catch (error) {
        this.connected = false;
        this.handleError(error, false);
      } finally {
        this.polling = false;
      }
    },
    async loadHistory(page = 1) {
      if (!this.connected) return;
      this.historyLoading = true;
      try {
        this.history = await pomodoroApi.history(page, 10);
      } catch (error) {
        this.handleError(error);
      } finally {
        this.historyLoading = false;
      }
    },
    async runAction(action: () => Promise<PomodoroState>, refreshHistory = false) {
      this.actionBusy = true;
      this.errorMessage = '';
      try {
        this.state = await action();
        this.connected = true;
        if (refreshHistory) await this.loadHistory(1);
      } catch (error) {
        this.handleError(error);
      } finally {
        this.actionBusy = false;
      }
    },
    async start() {
      if (!this.formValid) return;
      await this.runAction(() =>
        pomodoroApi.start(this.selectedCategories, this.sessionSettings())
      );
    },
    async saveDefaults() {
      if (!this.formValid) return;
      this.actionBusy = true;
      try {
        const settings = await pomodoroApi.saveSettings(this.savedSettings());
        this.applySettings(settings);
      } catch (error) {
        this.handleError(error);
      } finally {
        this.actionBusy = false;
      }
    },
    pause() {
      return this.runAction(() => pomodoroApi.pause());
    },
    resume() {
      return this.runAction(() => pomodoroApi.resume());
    },
    confirmNext() {
      return this.runAction(() => pomodoroApi.confirmNext());
    },
    continueDistraction() {
      return this.runAction(() => pomodoroApi.continueDistraction());
    },
    stop() {
      if (!window.confirm(this.$t('pomodoro.actions.stopConfirm') as string)) return;
      return this.runAction(() => pomodoroApi.stop(), true);
    },
    handleError(error: unknown, show = true) {
      const message =
        error instanceof PomodoroApiError
          ? error.message
          : (this.$t('pomodoro.service.unknownError') as string);
      if (show) this.errorMessage = message;
    },
  },
});
</script>

<style scoped lang="scss">
.pomodoro-page {
  max-width: 1120px;
  margin: 0 auto;
}

.service-unavailable {
  max-width: 620px;
  margin: 3rem auto;
  border-radius: 1rem;
}

.service-icon {
  color: #adb5bd;
}

.session-grid,
.setup-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
  gap: 1.25rem;
}

.timer-card,
.categories-card,
.settings-card {
  border-color: #e3e6e8;
  border-radius: 1rem;
}

.timer-ring {
  --pomodoro-progress: 0deg;
  width: min(17rem, 72vw);
  height: min(17rem, 72vw);
  padding: 0.7rem;
  border-radius: 50%;
  background: conic-gradient(#dc3545 var(--pomodoro-progress), #edf0f2 0);
}

.timer-ring__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: #fff;
  border-radius: 50%;
}

.timer-value {
  font-size: clamp(2.7rem, 8vw, 4.4rem);
  font-weight: 600;
  letter-spacing: -0.08rem;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.timer-caption {
  margin-top: 0.6rem;
  color: #6c757d;
}

.focus-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.focus-row strong {
  max-width: 65%;
}

.category-tree-shell {
  max-height: 30rem;
  overflow: auto;
  padding: 0.4rem;
  border: 1px solid #e3e6e8;
  border-radius: 0.6rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem 1rem;
}

.form-grid__wide {
  grid-column: 1 / -1;
}

.start-panel {
  background: #f7f8f9;
  border: 1px solid #e3e6e8;
  border-radius: 0.75rem;
}

@media (max-width: 991.98px) {
  .session-grid,
  .setup-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 575.98px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-grid__wide {
    grid-column: auto;
  }
}
</style>
