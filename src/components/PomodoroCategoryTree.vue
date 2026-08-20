<template lang="pug">
ul.pomodoro-category-tree.list-unstyled.mb-0
  li(v-for="node in nodes" :key="node.key")
    div.category-option.d-flex.align-items-center(:style="{ paddingLeft: `${depth * 1.25}rem` }")
      b-button.category-toggle.p-0.mr-1(
        v-if="node.children.length"
        variant="link"
        size="sm"
        :aria-label="$t('pomodoro.categories.toggleChildren')"
        @click="toggleExpanded(node.key)"
      )
        icon(:name="isExpanded(node.key) ? 'chevron-down' : 'chevron-right'")
      span.category-toggle-placeholder.mr-1(v-else)
      b-form-checkbox.mb-0(
        :checked="isSelected(node.path)"
        :disabled="disabled || isCovered(node.path)"
        @change="$emit('toggle', node.path)"
      )
        span.category-name {{ node.label }}
        small.text-muted.ml-2(v-if="node.children.length && isSelected(node.path)")
          | {{ $t('pomodoro.categories.includesChildren') }}
    pomodoro-category-tree(
      v-if="node.children.length && isExpanded(node.key)"
      :nodes="node.children"
      :selected="selected"
      :disabled="disabled"
      :depth="depth + 1"
      @toggle="$emit('toggle', $event)"
    )
</template>

<script lang="ts">
import Vue from 'vue';
import 'vue-awesome/icons/chevron-down';
import 'vue-awesome/icons/chevron-right';

import {
  CategoryPath,
  PomodoroCategoryNode,
  categoryIsCovered,
  categoryPathEquals,
} from '~/util/pomodoro';

export default Vue.extend({
  name: 'PomodoroCategoryTree',
  props: {
    nodes: { type: Array as () => PomodoroCategoryNode[], required: true },
    selected: { type: Array as () => CategoryPath[], required: true },
    disabled: { type: Boolean, default: false },
    depth: { type: Number, default: 0 },
  },
  data() {
    return { collapsed: {} as Record<string, boolean> };
  },
  methods: {
    isSelected(path: CategoryPath): boolean {
      return this.selected.some(category => categoryPathEquals(category, path));
    },
    isCovered(path: CategoryPath): boolean {
      return categoryIsCovered(path, this.selected);
    },
    isExpanded(key: string): boolean {
      return !this.collapsed[key];
    },
    toggleExpanded(key: string) {
      this.$set(this.collapsed, key, !this.collapsed[key]);
    },
  },
});
</script>

<style scoped lang="scss">
.category-option {
  min-height: 2.15rem;
  border-radius: 0.4rem;
}

.category-option:hover {
  background: rgba(0, 0, 0, 0.035);
}

.category-toggle {
  width: 1.5rem;
  color: #6c757d;
  line-height: 1;
}

.category-toggle-placeholder {
  display: inline-block;
  width: 1.5rem;
}

.category-name {
  color: #343a40;
}
</style>
