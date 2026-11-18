import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import Documents from './document';
import Groups from '../groups/group';
import Works from '../works/work';

import { isAdmin } from '../users/user.roles';
import { isFeatureEnabled } from '../_utils/features';
import {
  saveMedia,
  deleteMedia,
  sanitizeSegment,
} from '../_utils/services/mediaStorage';

// Documents on places and requests are behind the `documents` feature
// (api/_utils/features.ts); a group's are not.
const isSwitchedOff = (contextType) =>
  ['resources', 'works'].includes(contextType) &&
  !isFeatureEnabled('documents');

// Who may take a document away: an admin, whoever uploaded it, the
// request's author and the group's admins.
async function canRemove(userId, document) {
  if (!userId || !document) {
    return false;
  }
  if (document.uploadedBy === userId || (await isAdmin(userId))) {
    return true;
  }
  if (document.contextType === 'works') {
    const work = await Works.findOneAsync(document.attachedTo, {
      fields: { authorId: 1 },
    });
    return work?.authorId === userId;
  }
  if (document.contextType === 'groups') {
    const group = await Groups.findOneAsync(document.attachedTo, {
      fields: { members: 1 },
    });
    return Boolean(
      group?.members?.some((m) => m.memberId === userId && m.isAdmin)
    );
  }
  return false;
}

Meteor.methods({
  // Newest first, each with whether the one asking may remove it
  async getDocumentsByAttachments(attachedTo) {
    const userId = Meteor.userId();
    const documents = await Documents.find(
      { attachedTo },
      {
        sort: { creationDate: -1 },
        fields: {
          ...Documents.publicFields,
          attachedTo: 1,
          uploadedBy: 1,
        },
      }
    ).fetchAsync();
    const shown = documents.filter((doc) => !isSwitchedOff(doc.contextType));
    return await Promise.all(
      shown.map(async ({ uploadedBy, ...doc }) => ({
        ...doc,
        canRemove: await canRemove(userId, { ...doc, uploadedBy }),
      }))
    );
  },

  async createDocument(uploadableFile, itemId, contextType) {
    const user = await Meteor.userAsync();
    if (!user) {
      throw new Meteor.Error(
        'not-authorized',
        'You must be logged in to upload documents'
      );
    }
    if (isSwitchedOff(contextType)) {
      throw new Meteor.Error('feature-disabled', 'documents is switched off');
    }


    if (contextType === 'groups') {
      const group = await Groups.findOneAsync({ _id: itemId });
      if (!group) {
        throw new Meteor.Error('not-found', 'Group not found');
      }
      const member = group.members.find(
        (member) => member.memberId === user._id
      );
      if (!member || !member.isAdmin) {
        throw new Meteor.Error(
          'not-authorized',
          'You must be an admin of the group to upload documents'
        );
      }
    } else if (contextType === 'works') {
      const work = await Works.findOneAsync({ _id: itemId });
      if (!work || work.authorId !== user._id) {
        throw new Meteor.Error(
          'not-found',
          'You must be author of the work to upload documents'
        );
      }
    } else if (contextType === 'resources') {
      if (!(await isAdmin(user._id))) {
        throw new Meteor.Error(
          'not-authorized',
          'You must be an admin to upload documents'
        );
      }
    }

    const buffer = Buffer.from(uploadableFile.fileData, 'base64');
    const key = `documents/${sanitizeSegment(
      user.username || user._id
    )}/${Random.id()}/${sanitizeSegment(uploadableFile.fileName)}`;
    const documentUrl = await saveMedia(buffer, key);

    try {
      return await Documents.insertAsync({
        documentLabel: uploadableFile.fileName,
        documentUrl,
        contextType,
        contentType: uploadableFile.contentType,
        attachedTo: itemId,
        uploadedUsername: user.username,
        uploadedBy: user._id,
        uploadedByName: user.username,
        creationDate: new Date(),
      });
    } catch (error) {
      console.log('Error creating document:', error);
      throw new Meteor.Error(error, "Couldn't create the document");
    }
  },

  async removeDocument(documentId) {
    const userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error('Not allowed!');
    }

    const document = await Documents.findOneAsync({ _id: documentId });
    if (!document) {
      throw new Meteor.Error('not-found', 'Document not found');
    }
    if (!(await canRemove(userId, document))) {
      throw new Meteor.Error('Not allowed!');
    }

    try {
      await Documents.removeAsync(documentId);
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't delete the document");
    }

    if (document?.documentUrl) {
      try {
        await deleteMedia(document.documentUrl);
      } catch (error) {
        console.error('[media] Could not delete document file:', error);
      }
    }
  },
});
