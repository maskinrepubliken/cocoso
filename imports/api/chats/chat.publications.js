import { Meteor } from 'meteor/meteor';
import Chats from './chat';
import { isFeatureEnabled } from '../_utils/features';

Meteor.publish('chat', function (contextId) {
  const userId = this.userId;
  // Behind the `discussions` feature (api/_utils/features.ts)
  if (!userId || !isFeatureEnabled('discussions')) {
    return this.ready();
  }
  return Chats.find({
    contextId,
  });
});
