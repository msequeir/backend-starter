import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";

export interface FavoriteDoc extends BaseDoc {
  postId: ObjectId;
  userId: ObjectId;
}
export default class FavoritingConcept {
  public readonly favorites: DocCollection<FavoriteDoc>;

  constructor(collectionName: string) {
    this.favorites = new DocCollection<FavoriteDoc>(collectionName);
  }

  async favorite(postId: ObjectId, userId: ObjectId) {
    const favorites = await this.favorites.readMany({ postId, userId });
    const exists = favorites.length > 0;
    // If already favorited, then removes favorite
    if (exists) {
      return { msg: "Trying to favorite a post that is already favorited" };
    }
    // If not favorited, then adds to favorited
    else {
      await this.favorites.createOne({ postId, userId });
      return { msg: "Successfully added post to your favorites" };
    }
  }

  async removeFavorite(postId: ObjectId, userId: ObjectId) {
    const favorites = await this.favorites.readMany({ postId, userId });
    const exists = favorites.length > 0;
    // If already favorited, then removes favorite
    if (exists) {
      await this.favorites.deleteOne({ postId, userId });
      return { msg: "Removed post from your favorites" };
    } else {
      return { msg: "Trying to remove a favorite that doesn't exist" };
    }
  }

  async viewFavorites(userId: ObjectId): Promise<ObjectId[]> {
    const favorites = await this.favorites.readMany({ userId });
    return favorites.map((favorite) => favorite.postId);
  }
}
