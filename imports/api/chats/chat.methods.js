import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import mailtranslations from '/imports/api/activities/mailtranslations';

import { isContributorOrAdmin } from '../users/user.roles';
import Groups from '../groups/group';
import Chats from './chat';

/**
 * Bump the unread-notification counters of every member of the group a chat
 * message was posted in. Internal only: it used to be a Meteor method that
 * any logged-in user could call with an arbitrary group.
 */
async function createGroupNotification(user, values, unSeenIndex) {
  const contextId = values.contextId;
  try {
    const theGroup = await Groups.findOneAsync(contextId);
    const members = await Meteor.users
      .find({ 'groups.groupId': theGroup._id })
      .fetchAsync();

    if (!members || members.length < 1) {
      return;
    }
    await Promise.all(
      members.map(async (member) => {
        if (!member || member._id === user._id) {
          return;
        }
        let contextIdIndex = -1;
        for (let i = 0; i < member.notifications?.length; i += 1) {
          if (member.notifications[i].contextId === contextId) {
            contextIdIndex = i;
            break;
          }
        }

        if (contextIdIndex !== -1) {
          const notifications = [...member.notifications];
          notifications[contextIdIndex].count += 1;
          if (!notifications[contextIdIndex].unSeenIndexes) {
            notifications[contextIdIndex].unSeenIndexes = [];
          }

          notifications[contextIdIndex].unSeenIndexes?.push(unSeenIndex);
          await Meteor.users.updateAsync(member._id, {
            $set: {
              notifications,
            },
          });
        } else {
          await Meteor.users.updateAsync(member._id, {
            $push: {
              notifications: {
                title: theGroup.title,
                count: 1,
                context: 'groups',
                contextId: theGroup._id,
                unSeenIndexes: [unSeenIndex],
              },
            },
          });
        }
        const memberEmail = member.emails[0]?.address;
        if (!memberEmail) {
          return;
        }
        const lang = member.lang || 'en';
        const tr = mailtranslations[lang];
        await Meteor.callAsync(
          'sendEmail',
          memberEmail,
          tr.newGroupMessage.subject(theGroup.title),
          tr.newGroupMessage.text(theGroup.title, theGroup._id)
        );
      })
    );
  } catch (error) {
    console.log('error', error);
    throw new Meteor.Error(error);
  }
}

Meteor.methods({
  async getChatByContextId(contextId) {
    const chat = await Chats.findOneAsync({ contextId });
    return chat;
  },

  async createChat(contextName, contextId, contextType) {
    const user = await Meteor.userAsync();

    if (!user || !(await isContributorOrAdmin(user._id))) {
      throw new Meteor.Error('Not allowed!');
    }

    const theChat = await Chats.insertAsync({
      contextId,
      contextName,
      contextType,
      createdBy: {
        userId: user._id,
        username: user.username,
      },
      isNotificationOn: false,
      messages: [],
    });
    return theChat;
  },

  async addChatMessage(values) {
    check(
      values,
      Match.ObjectIncluding({ contextId: String, message: String })
    );
    const user = await Meteor.userAsync();
    if (!user) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }

    const chat = await Chats.findOneAsync({
      contextId: values.contextId,
    });
    if (!chat) {
      throw new Meteor.Error('not-found', 'Chat not found');
    }

    try {
      await Chats.updateAsync(
        { _id: chat._id },
        {
          $push: {
            messages: {
              content: values.message,
              senderUsername: user.username,
              senderAvatar: user.avatar?.src,
              senderId: user._id,
              createdDate: new Date(),
            },
          },
          $set: {
            isNotificationOn: true,
            lastMessageBy: user._id,
          },
        }
      );
      if (values.context === 'groups') {
        const theGroup = await Chats.findOneAsync({
          contextId: values.contextId,
        });
        if (!theGroup) {
          return;
        }
        const unSeenIndex = theGroup?.messages?.length - 1;
        await createGroupNotification(user, values, unSeenIndex);
      }
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },

  async removeNotification(contextId, messageIndex) {
    const user = await Meteor.userAsync();
    if (!user) {
      throw new Meteor.Error('Not allowed!');
    }

    try {
      const notifications = [...user.notifications];
      if (!notifications) {
        return;
      }

      const notificationIndex = notifications.findIndex(
        (notification) => notification.contextId === contextId
      );

      if (notificationIndex < 0) {
        return;
      }

      notifications[notificationIndex].count -= 1;

      let newNotifications;
      if (notifications[notificationIndex].count === 0) {
        newNotifications = notifications.filter(
          (notification, index) => index !== notificationIndex
        );
      } else {
        const newUnSeenIndexes = notifications[
          notificationIndex
        ].unSeenIndexes.filter((unSeenIndex) => unSeenIndex !== messageIndex);
        notifications[notificationIndex].unSeenIndexes = newUnSeenIndexes;
        newNotifications = notifications;
      }

      await Meteor.users.updateAsync(user._id, {
        $set: {
          notifications: newNotifications,
        },
      });
    } catch (error) {
      console.log('error', error);
      throw new Meteor.Error(error);
    }
  },
});
