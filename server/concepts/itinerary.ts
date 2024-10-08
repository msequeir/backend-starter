import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface ItineraryDoc extends BaseDoc {
  author: ObjectId; // Original creator
  collaborators: ObjectId[]; // Other editors
  content: string;
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
    const _id = await this.itineraries.createOne({ author, collaborators: [], content });
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

  async updateItinerary(itineraryId: ObjectId, collaboratorId?: ObjectId, content?: string) {
    if (!collaboratorId && !content) {
      throw new Error("At least one field (collaboratorId or content) must be provided to update.");
    }

    const updatedData: Partial<ItineraryDoc> = {};

    const itinerary = await this.getItineraryById(itineraryId);

    // Ensure collaborators is always an array
    itinerary.collaborators = Array.isArray(itinerary.collaborators) ? itinerary.collaborators : [];

    if (content) updatedData.content = content;

    if (collaboratorId && !itinerary.collaborators.includes(collaboratorId)) {
      itinerary.collaborators.push(collaboratorId); // Add new collaborator only if not already present
      updatedData.collaborators = itinerary.collaborators;
    }

    await this.itineraries.partialUpdateOne({ _id: itineraryId }, updatedData);
    return { msg: "Itinerary successfully updated!", itinerary: await this.getItineraryById(itineraryId) };
  }

  async deleteItinerary(itineraryId: ObjectId) {
    await this.itineraries.deleteOne({ _id: itineraryId });
    return { msg: "Deleted itinerary" };
  }

  async assertAuthorIsAllowedToEdit(itineraryId: ObjectId, user: ObjectId) {
    const itinerary = await this.getItineraryById(itineraryId);
    console.log(itinerary.collaborators[0]);
    console.log("MAYBE", itineraryId.toString == itinerary.collaborators[0].toString);
    if (itinerary.author.toString() !== user.toString()) {
      let seen = false;
      for (const collab of itinerary.collaborators) {
        if (itineraryId.toString == collab.toString) seen = true;
      }
      if (!seen) {
        throw new ItineraryAuthorNotMatchError(user, itineraryId);
      }
    }
  }
}

export class ItineraryAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super(`${author} is not the author of itinerary ${_id}!`);
  }
}
