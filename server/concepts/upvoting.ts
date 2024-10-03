import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";

export interface UpvoteDoc extends BaseDoc {
  postId: ObjectId;
  userId: ObjectId;
}

export default class UpvotingConcept {
  public readonly upvotes: DocCollection<UpvoteDoc>;

  constructor(collectionName: string) {
    this.upvotes = new DocCollection<UpvoteDoc>(collectionName);
  }

  async upVote(postId: ObjectId, userId: ObjectId) {
    const exists = await this.upvotes.readOne({ postId, userId });
    if (!exists) {
      await this.upvotes.createOne({ postId, userId });
      return { msg: "Successfully upvoted" };
    } else {
      await this.upvotes.deleteOne({ postId, userId });
      return { msg: "Removed upvote" };
    }
  }

  async getUpvoteCount(postId: ObjectId) {
    const upvotes = await this.upvotes.readMany({ postId });
    return upvotes.length;
  }
}
