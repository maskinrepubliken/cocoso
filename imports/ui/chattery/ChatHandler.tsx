import React from 'react';
import { useSubscribe, useTracker } from 'meteor/react-meteor-data';
import { useTranslation } from 'react-i18next';

import { Drawer } from '/imports/ui/core';
import { call } from '/imports/api/_utils/shared';
import Chats from '/imports/api/chats/chat';

import Chattery from './ChatteryContainer';

interface Notification {
  unSeenIndexes?: number[];
}

interface CurrentUser {
  _id: string;
  notifications?: Notification[];
}

interface Item {
  _id: string;
}

interface ChatUIProps {
  context: string;
  currentUser: CurrentUser | null;
  item: Item | null;
  open: boolean;
  title?: string;
  withInput: boolean;
  setOpen: (open: boolean) => void;
}

export function ChatUI({
  context,
  currentUser,
  item,
  open,
  title,
  withInput,
  setOpen,
}: ChatUIProps) {
  const [tc] = useTranslation('common');

  // Hooks must run unconditionally; bail out after them.
  const contextId = item?._id;
  const isChatLoading = useSubscribe('chat', contextId);
  const chat = useTracker(() => {
    return contextId ? Chats.findOne({ contextId }) : undefined;
  }, [contextId]);

  if (!currentUser || !item) {
    return null;
  }
  const discussion = chat?.messages?.map((message: any) => ({
    ...message,
    isFromMe: currentUser && message && message.senderId === currentUser._id,
  }));

  const addNewChatMessage = async (messageContent: string) => {
    const values = {
      context,
      contextId,
      message: messageContent,
    };

    try {
      await call('addChatMessage', values);
    } catch (error) {
      console.log('error', error);
    }
  };

  const removeNotification = async (messageIndex: number) => {
    const shouldRun = currentUser?.notifications?.find((notification) => {
      if (!notification.unSeenIndexes) {
        return false;
      }
      return notification.unSeenIndexes.some(
        (unSeenIndex) => unSeenIndex === messageIndex
      );
    });

    if (!shouldRun) {
      return;
    }

    try {
      await call('removeNotification', item._id, messageIndex);
    } catch (error) {
      console.log('error', error);
    }
  };

  return (
    <Drawer
      id="chat-drawer"
      open={open}
      size="xl"
      title={title || tc('labels.discussion')}
      onClose={() => setOpen(false)}
    >
      {open && (
        <Chattery
          messages={discussion}
          withInput={withInput}
          onNewMessage={addNewChatMessage}
          removeNotification={removeNotification}
        />
      )}
    </Drawer>
  );
}
