import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";
import ItineraryConcept from "./itinerary";

export interface PostDoc extends BaseDoc {
  author: ObjectId;
  title: string;
  tags: string;
  rating: number;
  itineraryId: ObjectId;
  favoriteUsers: ObjectId[];
  imageUrls: string[];
}

/**
 * concept: Posting [Author]
 */
export default class PostingConcept {
  public readonly posts: DocCollection<PostDoc>;
  public readonly itineraries: ItineraryConcept;

  /**
   * Make an instance of Posting.
   */
  constructor(collectionName: string, itineraryCollectionName: string) {
    this.posts = new DocCollection<PostDoc>(collectionName);
    this.itineraries = new ItineraryConcept(itineraryCollectionName);
  }

  async create(author: ObjectId, title: string, tags: string, rating: number, itineraryId: ObjectId, imageUrl: string) {
    const itinerary = await this.itineraries.getItineraryById(itineraryId);
    if (!itinerary) {
      throw new NotFoundError(`Itinerary ${itineraryId} does not exist!`);
    }
    const _id = await this.posts.createOne({ author, title, tags, rating, itineraryId, favoriteUsers: [], imageUrls: [imageUrl] });
    return { msg: "Post successfully created!", post: await this.posts.readOne({ _id }) };
  }

  async getPosts() {
    // Returns all posts! You might want to page for better client performance
    const posts = await this.posts.readMany({}, { sort: { _id: -1 } });
    const postsWithItineraries = await Promise.all(
      posts.map(async (post) => {
        try {
          const itinerary = await this.itineraries.getItineraryById(post.itineraryId);
          return { ...post, itinerary };
        } catch (error) {
          // If itinerary is missing (e.g., NotFoundError), continue without it
          return {
            ...post,
            itinerary: { msg: "Itinerary deleted or not found", itineraryId: post.itineraryId },
          };
        }
      }),
    );

    return postsWithItineraries;
  }

  async getByAuthorAndTitle(author: ObjectId, searchTitle: string) {
    const regex = new RegExp(searchTitle, "i");
    const posts = await this.posts.readMany({ author, title: { $regex: regex } });

    const postsWithItineraries = await Promise.all(
      posts.map(async (post) => {
        try {
          const itinerary = await this.itineraries.getItineraryById(post.itineraryId);
          return { ...post, itinerary };
        } catch (error) {
          // If itinerary is missing, return a fallback message
          return {
            ...post,
            itinerary: { msg: "Itinerary deleted or not found", itineraryId: post.itineraryId },
          };
        }
      }),
    );

    return postsWithItineraries;
  }

  async getByTitle(searchTitle: string) {
    const regex = new RegExp(searchTitle, "i");
    const posts = await this.posts.readMany({ title: { $regex: regex } });

    const postsWithItineraries = await Promise.all(
      posts.map(async (post) => {
        try {
          const itinerary = await this.itineraries.getItineraryById(post.itineraryId);
          return { ...post, itinerary };
        } catch (error) {
          // If itinerary is missing, return a fallback message
          return {
            ...post,
            itinerary: { msg: "Itinerary deleted or not found", itineraryId: post.itineraryId },
          };
        }
      }),
    );

    return postsWithItineraries;
  }

  async getByAuthor(author: ObjectId) {
    const posts = await this.posts.readMany({ author });

    const postsWithItineraries = await Promise.all(
      posts.map(async (post) => {
        try {
          const itinerary = await this.itineraries.getItineraryById(post.itineraryId);
          return { ...post, itinerary };
        } catch (error) {
          // If itinerary is missing, return a fallback message
          return {
            ...post,
            itinerary: { msg: "Itinerary deleted or not found", itineraryId: post.itineraryId },
          };
        }
      }),
    );

    return postsWithItineraries;
  }

  async getPostsByIds(postIds: ObjectId[]) {
    return await this.posts.readMany({ _id: { $in: postIds } });
  }

  async update(_id: ObjectId, title?: string, tags?: string, rating?: number, itineraryId?: ObjectId, addImageUrl?: string, removeImageUrl?: string) {
    // Find the existing post to retrieve its current values
    const currPost = await this.posts.readOne({ _id });
    if (!currPost) {
      throw new NotFoundError(`Post ${_id} does not exist!`);
    }

    // Check if itineraryId is passed and verify its existence
    if (itineraryId) {
      const itinerary = await this.itineraries.getItineraryById(itineraryId);
      if (!itinerary) {
        throw new NotFoundError(`Itinerary ${itineraryId} does not exist!`);
      }
    }

    // Handle image URLs updates (add/remove)
    const urlList = [...(currPost.imageUrls || [])]; // Clone the current image URLs

    if (addImageUrl) {
      urlList.push(addImageUrl);
    }

    if (removeImageUrl) {
      const index = urlList.indexOf(removeImageUrl);
      if (index !== -1) {
        urlList.splice(index, 1);
      } else {
        throw new NotAllowedError("Trying to remove a URL that doesn't exist");
      }
    }

    // Prepare the update object, but only include fields that are defined
    const updateData: Partial<PostDoc> = {};

    if (title !== undefined) {
      updateData.title = title;
    }

    if (tags !== undefined) {
      updateData.tags = tags;
    }

    if (rating !== undefined) {
      updateData.rating = rating;
    }

    if (itineraryId !== undefined) {
      updateData.itineraryId = itineraryId;
    }

    // Only update imageUrls if they have changed
    if (addImageUrl || removeImageUrl) {
      updateData.imageUrls = urlList;
    }

    // Perform the partial update, only including fields that have changed
    await this.posts.partialUpdateOne({ _id }, updateData);

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
