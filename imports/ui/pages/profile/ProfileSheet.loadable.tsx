import loadable from '@loadable/component';

const ProfileSheet = loadable(
  () => import('/imports/ui/pages/profile/ProfileSheet')
);

export default ProfileSheet;
