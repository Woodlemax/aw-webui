<template lang="pug">
section.pomodoro-history
  div.d-flex.align-items-center.justify-content-between.mb-3
    div
      h4.mb-1 {{ $t('pomodoro.history.title') }}
      p.text-muted.small.mb-0 {{ $t('pomodoro.history.subtitle') }}
    b-spinner(v-if="loading" small label="Loading")

  b-alert(v-if="!loading && items.length === 0" show variant="light")
    | {{ $t('pomodoro.history.empty') }}

  div.history-list(v-else)
    b-card.history-card.mb-3(v-for="item in items" :key="item.session_id" no-body)
      div.p-3
        div.d-flex.flex-wrap.align-items-start.justify-content-between
          div
            div.d-flex.align-items-center.mb-1
              b-badge.mr-2(:variant="item.status === 'completed' ? 'success' : 'secondary'")
                | {{ $t(`pomodoro.history.status.${item.status}`) }}
              strong {{ formatDate(item.started_at) }}
            div.text-muted.small
              | {{ categorySummary(item.selected_categories) }}
          div.text-right
            div.font-weight-bold
              | {{ item.completed_focus_intervals }} / {{ item.planned_focus_intervals }}
            div.text-muted.small {{ $t('pomodoro.history.intervals') }}

        div.metrics-grid.mt-3
          div.metric
            small.text-muted {{ $t('pomodoro.history.focusTime') }}
            strong {{ formatDuration(item.actual_focus_milliseconds) }}
          div.metric
            small.text-muted {{ $t('pomodoro.history.focusScore') }}
            strong {{ formatPercent(item.focus_percentage) }}
          div.metric
            small.text-muted {{ $t('pomodoro.history.distractions') }}
            strong {{ item.distraction_count }}
          div.metric
            small.text-muted {{ $t('pomodoro.history.distractedTime') }}
            strong {{ formatDuration(item.distraction_milliseconds) }}

        b-button.mt-3.p-0(
          variant="link"
          size="sm"
          v-b-toggle="`pomodoro-history-${item.session_id}`"
        ) {{ $t('pomodoro.history.details') }}
        b-collapse(:id="`pomodoro-history-${item.session_id}`")
          dl.history-details.row.small.mt-3.mb-0
            dt.col-sm-5 {{ $t('pomodoro.history.ended') }}
            dd.col-sm-7 {{ formatDate(item.ended_at) }}
            dt.col-sm-5 {{ $t('pomodoro.history.breakTime') }}
            dd.col-sm-7 {{ formatDuration(item.actual_break_milliseconds) }}
            dt.col-sm-5 {{ $t('pomodoro.history.manualPause') }}
            dd.col-sm-7 {{ formatDuration(item.manual_pause_milliseconds) }}
            dt.col-sm-5 {{ $t('pomodoro.history.afkPause') }}
            dd.col-sm-7 {{ formatDuration(item.afk_pause_milliseconds) }}
            dt.col-sm-5 {{ $t('pomodoro.history.monitoringPause') }}
            dd.col-sm-7 {{ formatDuration(item.monitoring_pause_milliseconds) }}
            template(v-if="item.interruption_reason")
              dt.col-sm-5 {{ $t('pomodoro.history.interruptionReason') }}
              dd.col-sm-7 {{ $t(`pomodoro.history.reason.${item.interruption_reason}`) }}

  b-pagination.mt-3.mb-0(
    v-if="total > pageSize"
    :value="page"
    :total-rows="total"
    :per-page="pageSize"
    align="center"
    @change="$emit('page', $event)"
  )
</template>

<script lang="ts">
import Vue from 'vue';
import { CategoryPath, PomodoroHistoryItem } from '~/util/pomodoro';

export default Vue.extend({
  name: 'PomodoroHistory',
  props: {
    items: { type: Array as () => PomodoroHistoryItem[], required: true },
    loading: { type: Boolean, default: false },
    page: { type: Number, default: 1 },
    pageSize: { type: Number, default: 10 },
    total: { type: Number, default: 0 },
  },
  methods: {
    formatDate(value: string): string {
      return new Intl.DateTimeFormat(this.$i18n.locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value));
    },
    formatDuration(value: number): string {
      const totalSeconds = Math.round(value / 1000);
      if (totalSeconds < 60)
        return this.$t('pomodoro.duration.seconds', { count: totalSeconds }) as string;
      const totalMinutes = Math.round(totalSeconds / 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const parts = [];
      if (hours) parts.push(this.$t('pomodoro.duration.hours', { count: hours }));
      if (minutes || !hours) parts.push(this.$t('pomodoro.duration.minutes', { count: minutes }));
      return parts.join(' ');
    },
    formatPercent(value?: number): string {
      return value == null ? '—' : `${Math.round(value)}%`;
    },
    categorySummary(categories: CategoryPath[]): string {
      return categories.map(category => category.join(' > ')).join(', ');
    },
  },
});
</script>

<style scoped lang="scss">
.history-card {
  border-color: #e3e6e8;
  border-radius: 0.75rem;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
}

.metric {
  display: flex;
  flex-direction: column;
  padding: 0.65rem 0.75rem;
  background: #f7f8f9;
  border-radius: 0.5rem;
}

.history-details dt,
.history-details dd {
  margin-bottom: 0.35rem;
}

@media (max-width: 767.98px) {
  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
