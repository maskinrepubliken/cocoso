import { publicUrl } from '../_utils/shared';

// Group chat notifications (chats/chat.methods.js). The event registration
// emails have their own texts in activity.mails.js.
export default {
  en: {
    newGroupMessage: {
      subject: (groupTitle) => `New message in ${groupTitle}`,
      text: (groupTitle, groupId) =>
        `You have a new message in the ${groupTitle} group discussion. <br />
        Go to the group page <a href="${publicUrl(`/groups/${groupId}`)}">${groupTitle}</a> to see the message and join the conversation.
        <br /><br />
        <a href="${publicUrl(`/groups/${groupId}`)}">${publicUrl(`/groups/${groupId}`)}</a>`,
    },
  },
  sv: {
    newGroupMessage: {
      subject: (groupTitle) => `Ny meddelande i ${groupTitle}`,
      text: (groupTitle, groupId) =>
        `Du har ett nytt meddelande i ${groupTitle} gruppdiskussionen. <br />
        Gå till gruppsidan <a href="${publicUrl(`/groups/${groupId}`)}">${groupTitle}</a> för att se meddelandet och gå med i diskussionen.
        <br /><br />
        <a href="${publicUrl(`/groups/${groupId}`)}">${publicUrl(`/groups/${groupId}`)}</a>`,
    },
  },
};
