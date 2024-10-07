import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

// export interface ItineraryStop {
//   location: string;
//   activity?: string;
//   date: Date;
//   notes?: string;
// }

// export interface ItineraryDoc extends BaseDoc {
//   author: ObjectId;
//   stops: ItineraryStop[];
//   createdAt: Date;
//   updatedAt: Date;
// }

export interface ItineraryDoc extends BaseDoc {
  author: ObjectId;
  // date: Date;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}
/**
 * concept: Posting [Author]
 */
export default class ItineraryConcept {
  public readonly itineraries: DocCollection<ItineraryDoc>;

  /**
   * Make an instance of Posting.
   */
  constructor(collectionName: string) {
    this.itineraries = new DocCollection<ItineraryDoc>(collectionName);
  }

  async create(author: ObjectId, content: string) {
    const createdAt = new Date();
    const _id = await this.itineraries.createOne({ author, content, createdAt, updatedAt: createdAt });
    return { msg: "Itinerary successfully created!", itinerary: await this.itineraries.readOne({ _id }) };
  }

  async getAllItineraries() {
    return await this.itineraries.readMany({}, { sort: { createdAt: -1 } });
  }

  async getByAuthor(author: ObjectId) {
    return await this.itineraries.readMany({ author });
  }

  async getItineraryById(itineraryId: ObjectId) {
    const itinerary = await this.itineraries.readOne({ _id: itineraryId });
    if (!itinerary) {
      throw new NotFoundError(`Itinerary ${itineraryId} not found`);
    }
    return itinerary;
  }

  async updateItinerary(itineraryId: ObjectId, content?: string) {
    const updatedAt = new Date();
    const updatedData: Partial<ItineraryDoc> = { updatedAt };
    if (content) updatedData.content = content;
    const _id = await this.itineraries.partialUpdateOne({ _id: itineraryId }, updatedData);
    return { msg: "Itinerary Succesfully Updated!" };
  }

  async deleteItinerary(itineraryId: ObjectId) {
    await this.itineraries.deleteOne({ _id: itineraryId });
    return { msg: "Deleted itinerary" };
  }

  async assertAuthorIsUser(_id: ObjectId, user: ObjectId) {
    const post = await this.itineraries.readOne({ _id });
    if (!post) {
      throw new NotFoundError(`Post ${_id} does not exist!`);
    }
    if (post.author.toString() !== user.toString()) {
      throw new ItineraryAuthorNotMatchError(user, _id);
    }
  }

  // async addStop(itineraryId: ObjectId, stop: ItineraryStop) {
  //   const itinerary = await this.getItineraryById(itineraryId);
  //   itinerary.stops.push(stop);
  //   await this.itineraries.partialUpdateOne({ _id: itineraryId }, { stops: itinerary.stops, updatedAt: new Date() });
  //   return { msg: "Stop added to itinerary!" };
  // }

  // async removeStopFromItinerary(itineraryId: ObjectId, stopIndex: number) {
  //   const itinerary = await this.getItineraryById(itineraryId);
  //   if (stopIndex < 0 || stopIndex >= itinerary.stops.length) {
  //     return { msg: "Index out of bounds" };
  //   }

  //   itinerary.stops.splice(stopIndex, 1);
  //   await this.itineraries.partialUpdateOne({ _id: itineraryId }, { stops: itinerary.stops, updatedAt: new Date() });
  //   return { msg: "Stop removed from itinerary!" };
  // }
}

export class ItineraryAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the author of itinerary! {1}!", author, _id);
  }
}
