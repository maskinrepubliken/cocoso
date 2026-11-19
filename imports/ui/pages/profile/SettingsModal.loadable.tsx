import loadable from '@loadable/component';

const SettingsModal = loadable(
  () => import('/imports/ui/pages/profile/SettingsModal')
);

export default SettingsModal;
