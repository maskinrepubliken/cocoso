import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { getSite } from '/imports/api/site/site';

import Newsletters from './newsletter';
import { isAdmin } from '../users/user.roles';
import Memberships from '../memberships/membership';

Meteor.methods({
  async getNewsletters() {
    return await Newsletters.find(
      {},
      {
        fields: {
          _id: 1,
          authorUsername: 1,
          creationDate: 1,
          imageUrl: 1,
          subject: 1,
        },
        sort: { creationDate: -1 },
      }
    ).fetchAsync();
  },
  async getNewsletterById(newsletterId) {
    return await Newsletters.findOneAsync({
      _id: newsletterId,
    });
  },

  async sendNewsletter(email, emailHtml) {
    check(email, Object);
    check(emailHtml, String);

    if (!email?.subject) {
      throw new Meteor.Error('Email subject is required');
    }

    const site = await getSite();
    const currentUser = await Meteor.userAsync();

    if (!currentUser || !(await isAdmin(currentUser._id))) {
      throw new Meteor.Error('You are not allowed!');
    }

    try {
      const newEmailId = await Newsletters.insertAsync({
        ...email,
        authorId: currentUser._id,
        authorUsername: currentUser.username,
        creationDate: new Date(),
      });

      const emailHtmlWithBrowserLink = emailHtml.replace(
        '[newsletter-id]',
        newEmailId
      );

      // Safer member fetching with limits
      const memberships = await Memberships.find(
        {},
        { fields: { userId: 1 }, limit: 10000 }
      ).fetchAsync();
      const userIds = memberships.map((m) => m.userId);
      const memberUsers = await Meteor.users
        .find(
          { _id: { $in: userIds } },
          { fields: { username: 1, emails: 1 } }
        )
        .fetchAsync();
      const members = memberUsers.map((u) => ({
        _id: u._id,
        username: u.username,
        email: u.emails?.[0]?.address,
      }));

      if (members.length === 0) {
        throw new Meteor.Error('No members found to send newsletter to');
      }

      // Send emails in batches to avoid memory overflow on large member lists
      const BATCH_SIZE = 20;
      const results = [];

      for (let i = 0; i < members.length; i += BATCH_SIZE) {
        const batch = members.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.allSettled(
          batch.map(async (member) => {
            const emailAddress = member?.email;
            if (!emailAddress) {
              return {
                status: 'skipped',
                reason: 'No email address',
                member: member._id,
              };
            }

            const emailHtmlWithUsername = emailHtmlWithBrowserLink.replace(
              '[username]',
              member.username || 'there'
            );

            try {
              await Meteor.callAsync(
                'sendEmail',
                emailAddress,
                email.subject,
                emailHtmlWithUsername
              );
              console.log('sent to:', emailAddress);
              return { status: 'sent', member: member._id };
            } catch (error) {
              console.error('failed to send to:', emailAddress);
              return {
                status: 'failed',
                error: error.message,
                member: member._id,
              };
            }
          })
        );
        results.push(...batchResults);
      }

      // Log summary
      const sentCount = results.filter(
        (r) => r.value?.status === 'sent'
      ).length;
      const failedCount = results.filter(
        (r) => r.value?.status === 'failed'
      ).length;

      console.log(
        `Newsletter ${newEmailId}: Sent ${sentCount}, Failed ${failedCount}`
      );

      return {
        newsletterId: newEmailId,
        sent: sentCount,
        failed: failedCount,
        total: members.length,
      };
    } catch (error) {
      console.error('Newsletter sending failed:', error);
      throw new Meteor.Error(error);
    }
  },
});
