// A group meeting's title: the group's name, and the meeting's own after it
// ("Tranemo kammarkör – Höstmöte"), so lists, search and the calendar show
// both. Without a name of its own, the group's name alone.
export const meetingTitleOf = (groupTitle, meetingTitle) =>
  meetingTitle ? `${groupTitle} – ${meetingTitle}` : groupTitle;
