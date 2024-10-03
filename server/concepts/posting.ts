import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface PostOptions {
  backgroundColor?: string;
}

export interface PostDoc extends BaseDoc {
  author: ObjectId;
  title: string;
  content: string;
  options?: PostOptions;
  favoriteUsers: ObjectId[];
}

/**
 * concept: Posting [Author]
 */
export default class PostingConcept {
  public readonly posts: DocCollection<PostDoc>;

  /**
   * Make an instance of Posting.
   */
  constructor(collectionName: string) {
    this.posts = new DocCollection<PostDoc>(collectionName);
  }

  async create(author: ObjectId, title: string, content: string, options?: PostOptions) {
    const _id = await this.posts.createOne({ author, title, content, options, favoriteUsers: [] });
    return { msg: "Post successfully created!", post: await this.posts.readOne({ _id }) };
  }

  async getPosts() {
    // Returns all posts! You might want to page for better client performance
    return await this.posts.readMany({}, { sort: { _id: -1 } });
  }

  async getByAuthorAndTitle(author: ObjectId, searchTitle: string) {
    const regex = new RegExp(searchTitle, "i");
    return await this.posts.readMany({ author, title: { $regex: regex } });
  }

  async getByTitle(searchTitle: string) {
    const regex = new RegExp(searchTitle, "i");
    return await this.posts.readMany({ title: { $regex: regex } });
  }

  async getByAuthor(author: ObjectId) {
    return await this.posts.readMany({ author });
  }

  async getPostsByIds(postIds: ObjectId[]) {
    return await this.posts.readMany({ _id: { $in: postIds } });
  }

  async update(_id: ObjectId, title?: string, content?: string, options?: PostOptions) {
    // Note that if content or options is undefined, those fields will *not* be updated
    // since undefined values for partialUpdateOne are ignored.
    await this.posts.partialUpdateOne({ _id }, { title, content, options });
    return { msg: "Post successfully updated!" };
  }

  async delete(_id: ObjectId) {
    await this.posts.deleteOne({ _id });
    return { msg: "Post deleted successfully!" };
  }

  async assertAuthorIsUser(_id: ObjectId, user: ObjectId) {
    const post = await this.posts.readOne({ _id });
    if (!post) {
      throw new NotFoundError(`Post ${_id} does not exist!`);
    }
    if (post.author.toString() !== user.toString()) {
      throw new PostAuthorNotMatchError(user, _id);
    }
  }

  async addFavoriteUser(_id: ObjectId, userId: ObjectId) {
    // Use this.createOne to add user to favoriteUsers
    const post = await this.posts.readOne({ _id });
    if (!post) {
      throw new NotFoundError(`Post ${_id} does not exist!`);
    }
    if (post.favoriteUsers.some((id) => id.equals(userId))) {
      return { msg: "User has already liked this message" };
    }

    post.favoriteUsers.push(userId);
    await this.posts.partialUpdateOne({ _id }, { favoriteUsers: post.favoriteUsers });

    return { msg: "User added to favorites" };
  }

  async removeFavoriteUser(_id: ObjectId, userId: ObjectId) {
    const post = await this.posts.readOne({ _id });
    if (!post) {
      throw new NotFoundError(`Post ${_id} does not exist!`);
    }

    const index = post.favoriteUsers.findIndex((id) => id.equals(userId));
    if (index === -1) {
      return { msg: "User has not favorited this post" };
    }

    post.favoriteUsers.splice(index, 1);
    await this.posts.partialUpdateOne({ _id }, { favoriteUsers: post.favoriteUsers });

    return { msg: "User removed from favorites" };
  }
}

export class PostAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the author of post {1}!", author, _id);
  }
}
