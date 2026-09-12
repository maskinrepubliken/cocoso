import { Meteor } from 'meteor/meteor';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';

/**
 * Per-connection rate limits for methods that send email, create accounts,
 * write files, or can be used to enumerate users. Limits are generous for a
 * human and tight for a script. Adjust here rather than in the methods.
 */
const RULES = [
  // Anything that results in an outbound email.
  {
    methods: [
      'sendEmail',
      'resetUserPassword',
      'forgotPassword',
      'requestMagicLink',
      'registerAttendance',
      'updateAttendance',
      'removeAttendance',
      'sendNewsletter',
    ],
    limit: 5,
    intervalMs: 60 * 1000,
  },
  // Account creation and username/email probing.
  {
    methods: ['createAccount', 'isUsernameUnique', 'isEmailUnique'],
    limit: 10,
    intervalMs: 60 * 1000,
  },
  // Uploads write to local disk.
  {
    methods: ['images.upload', 'createDocument'],
    limit: 30,
    intervalMs: 60 * 1000,
  },
  // Login attempts (Meteor's built-in `login` method).
  {
    methods: ['login'],
    limit: 10,
    intervalMs: 60 * 1000,
  },
];

Meteor.startup(() => {
  for (const rule of RULES) {
    const names = new Set(rule.methods);
    DDPRateLimiter.addRule(
      {
        type: 'method',
        name: (name) => names.has(name),
        connectionId: () => true,
      },
      rule.limit,
      rule.intervalMs
    );
  }
});
