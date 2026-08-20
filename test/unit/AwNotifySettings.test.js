import { BootstrapVue } from 'bootstrap-vue';
import { createLocalVue, shallowMount } from '@vue/test-utils';

import AwNotifySettings from '~/views/settings/AwNotifySettings.vue';

const mockGet = jest.fn();
const localVue = createLocalVue();
localVue.use(BootstrapVue);

jest.mock('~/util/awclient', () => ({
  getClient: () => ({
    req: {
      get: mockGet,
      post: jest.fn(),
    },
  }),
}));

describe('AwNotifySettings', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  test('uses defaults when the server has no saved aw-notify settings', async () => {
    mockGet.mockResolvedValue({ data: null });
    const wrapper = shallowMount(AwNotifySettings, { localVue, stubs: { icon: true } });

    await wrapper.vm.load();

    expect(wrapper.vm.error).toBe('');
    expect(wrapper.vm.alerts).toEqual([
      { label: 'All', category: 'All', thresholdStr: '60, 240, 480', positive: false },
      { label: '💼 Work', category: 'Work', thresholdStr: '60, 120, 240', positive: true },
    ]);
  });
});
