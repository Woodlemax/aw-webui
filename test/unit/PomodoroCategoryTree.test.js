import { BootstrapVue } from 'bootstrap-vue';
import { createLocalVue, mount } from '@vue/test-utils';

import PomodoroCategoryTree from '~/components/PomodoroCategoryTree.vue';
import { i18n } from '~/i18n';

const localVue = createLocalVue();
localVue.use(BootstrapVue);

describe('PomodoroCategoryTree', () => {
  const nodes = [
    {
      key: '["Work"]',
      label: 'Work',
      path: ['Work'],
      children: [
        {
          key: '["Work","Programming"]',
          label: 'Programming',
          path: ['Work', 'Programming'],
          children: [],
        },
      ],
    },
  ];

  test('shows nested categories and disables a child covered by its selected parent', () => {
    const wrapper = mount(PomodoroCategoryTree, {
      localVue,
      i18n,
      propsData: { nodes, selected: [['Work']] },
      stubs: { icon: true },
    });

    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes.at(0).element.checked).toBe(true);
    expect(checkboxes.at(1).element.disabled).toBe(true);
    expect(wrapper.text()).toContain('includes nested');
  });

  test('emits the exact category path when toggled', async () => {
    const wrapper = mount(PomodoroCategoryTree, {
      localVue,
      i18n,
      propsData: { nodes, selected: [] },
      stubs: { icon: true },
    });

    await wrapper.findAll('input[type="checkbox"]').at(1).setChecked(true);
    expect(wrapper.emitted('toggle')[0]).toEqual([['Work', 'Programming']]);
  });
});
