import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Authing, Favoriting, Friending, Itinerary, Posting, Sessioning, Upvoting } from "./app";
import { SessionDoc } from "./concepts/sessioning";
import Responses from "./responses";

import { z } from "zod";

/**
 * Web server routes for the app. Implements synchronizations between concepts.
 */
class Routes {
  // Synchronize the concepts from `app.ts`.

  // Sessioning
  @Router.get("/session")
  async getSessionUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.getUserById(user);
  }

  // USER RELATED
  @Router.get("/users")
  async getUsers() {
    return await Authing.getUsers();
  }

  @Router.get("/users/:username")
  @Router.validate(z.object({ username: z.string().min(1) }))
  async getUser(username: string) {
    return await Authing.getUserByUsername(username);
  }

  @Router.post("/users")
  async createUser(session: SessionDoc, username: string, password: string) {
    Sessioning.isLoggedOut(session);
    return await Authing.create(username, password);
  }

  @Router.patch("/users/username")
  async updateUsername(session: SessionDoc, username: string) {
    const user = Sessioning.getUser(session);
    return await Authing.updateUsername(user, username);
  }

  @Router.patch("/users/password")
  async updatePassword(session: SessionDoc, currentPassword: string, newPassword: string) {
    const user = Sessioning.getUser(session);
    return Authing.updatePassword(user, currentPassword, newPassword);
  }

  @Router.delete("/users")
  async deleteUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    Sessioning.end(session);
    return await Authing.delete(user);
  }

  @Router.post("/login")
  async logIn(session: SessionDoc, username: string, password: string) {
    const u = await Authing.authenticate(username, password);
    Sessioning.start(session, u._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/logout")
  async logOut(session: SessionDoc) {
    Sessioning.end(session);
    return { msg: "Logged out!" };
  }

  // POSTING RELATED
  @Router.get("/posts")
  @Router.validate(z.object({ author: z.string().optional(), title: z.string().optional() }))
  async getPosts(author?: string, title?: string) {
    let posts;
    // Filter by author and title
    if (author && title) {
      const id = (await Authing.getUserByUsername(author))._id;
      posts = await Posting.getByAuthorAndTitle(id, title);
    }
    // Just by author
    else if (author) {
      const id = (await Authing.getUserByUsername(author))._id;
      posts = await Posting.getByAuthor(id);
    }
    // Just by title
    else if (title) {
      posts = await Posting.getByTitle(title);
    }
    // Returns all posts
    else {
      posts = await Posting.getPosts();
    }
    return Responses.posts(posts);
  }

  @Router.post("/posts")
  async createPost(session: SessionDoc, title: string, tags: string, rating: number, itineraryId: string, imageUrl: string) {
    const user = Sessioning.getUser(session);
    const iid = new ObjectId(itineraryId);
    await Itinerary.assertAuthorIsAllowedToEdit(iid, user);

    const created = await Posting.create(user, title, tags, rating, iid, imageUrl);
    return { msg: created.msg, post: await Responses.post(created.post) };
  }

  @Router.patch("/posts/:id")
  async updatePost(session: SessionDoc, id: string, title: string, tags?: string, rating?: number, itineraryId?: string, addImage?: string, removeImage?: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);

    let iid;
    if (itineraryId) {
      iid = new ObjectId(itineraryId);
      // Check if the itinerary exists and belongs to the user
      await Itinerary.assertAuthorIsAllowedToEdit(iid, user);
    }

    await Posting.assertAuthorIsUser(oid, user);
    return await Posting.update(oid, title, tags, rating, iid, addImage, removeImage);
  }

  @Router.delete("/posts/:id")
  async deletePost(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Posting.assertAuthorIsUser(oid, user);
    return Posting.delete(oid);
  }

  // UPVOTING RELATED
  @Router.post("/posts/:id/upvote")
  async upVotes(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    return await Upvoting.upVote(oid, user);
  }

  @Router.get("/posts/:id/upvote")
  async getUpvoteCount(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    const count = await Upvoting.getUpvoteCount(oid);
    return { msg: "Upvote count is ", upvotes: count };
  }

  // FRIEND RELATED
  @Router.get("/friends")
  async getFriends(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.idsToUsernames(await Friending.getFriends(user));
  }

  @Router.delete("/friends/:friend")
  async removeFriend(session: SessionDoc, friend: string) {
    const user = Sessioning.getUser(session);
    const friendOid = (await Authing.getUserByUsername(friend))._id;
    return await Friending.removeFriend(user, friendOid);
  }

  @Router.get("/friend/requests")
  async getRequests(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Responses.friendRequests(await Friending.getRequests(user));
  }

  @Router.post("/friend/requests/:to")
  async sendFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.sendRequest(user, toOid);
  }

  @Router.delete("/friend/requests/:to")
  async removeFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.removeRequest(user, toOid);
  }

  @Router.put("/friend/accept/:from")
  async acceptFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.acceptRequest(fromOid, user);
  }

  @Router.put("/friend/reject/:from")
  async rejectFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.rejectRequest(fromOid, user);
  }

  // FAVORITING RELATED
  @Router.post("/posts/:id/favorite")
  async favorite(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    return await Favoriting.favorite(oid, user);
  }

  @Router.delete("/posts/:id/favorite")
  async removeFavorite(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    return await Favoriting.removeFavorite(oid, user); // Call your new method here for removing the favorite
  }

  @Router.get("/favorites")
  async getFavorites(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    const favoritePostsIds = await Favoriting.viewFavorites(user);
    if (favoritePostsIds.length == 0) {
      return { msg: "You have no favorites!" };
    }
    const favoritePosts = await Posting.getPostsByIds(favoritePostsIds);
    return { msg: "These are your favorite posts", favorites: favoritePosts };
  }

  // ITINERARY RELATED
  @Router.post("/itineraries")
  async createItinerary(session: SessionDoc, content: string) {
    const user = Sessioning.getUser(session);
    const created = await Itinerary.create(user, content);

    // TODO: Double check Reponses.post()...
    return { msg: created.msg, itinerary: await Responses.itinerary(created.itinerary) };
  }

  @Router.patch("/itineraries/:id")
  async updateItinerary(session: SessionDoc, id: string, collaboratorId?: string, content?: string) {
    const user = Sessioning.getUser(session);
    const itineraryOid = new ObjectId(id);

    let collaboratorOid;
    if (collaboratorId) {
      collaboratorOid = new ObjectId(collaboratorId);
    }

    await Itinerary.assertAuthorIsAllowedToEdit(itineraryOid, user); // Ensure the user is the owner
    return await Itinerary.updateItinerary(itineraryOid, collaboratorOid, content);
  }

  @Router.delete("/itineraries/:id")
  async deleteItinerary(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);

    await Itinerary.assertAuthorIsAllowedToEdit(oid, user); // Ensure the user is the owner
    return Itinerary.deleteItinerary(oid);
  }

  @Router.get("/itineraries/:id")
  async getItineraryById(session: SessionDoc, id: string) {
    const itineraryOid = new ObjectId(id);

    // Fetch the itinerary by its ID
    const itinerary = await Itinerary.getItineraryById(itineraryOid);
    return Responses.itinerary(itinerary);
  }

  // POSTING RELATED
  @Router.get("/itineraries")
  @Router.validate(z.object({ author: z.string().optional(), title: z.string().optional() }))
  async getItineraries(author?: string, title?: string) {
    if (author) {
      const id = (await Authing.getUserByUsername(author))._id; // TODO: Why is this bugging?
      return await Itinerary.getByAuthor(id);
    }
    const itineraries = await Itinerary.getAllItineraries();
    return Responses.itineraries(itineraries);
  }
}

/** The web app. */
export const app = new Routes();

/** The Express router. */
export const appRouter = getExpressRouter(app);
