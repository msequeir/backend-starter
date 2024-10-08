import AuthenticatingConcept from "./concepts/authenticating";
import FavoritingConcept from "./concepts/favoriting";
import FriendingConcept from "./concepts/friending";
import ItineraryConcept from "./concepts/itinerary";
import PostingConcept from "./concepts/posting";
import SessioningConcept from "./concepts/sessioning";
import UpvotingConcept from "./concepts/upvoting";

// The app is a composition of concepts instantiated here
// and synchronized together in `routes.ts`.
export const Sessioning = new SessioningConcept();
export const Authing = new AuthenticatingConcept("users");
export const Posting = new PostingConcept("posts", "itineraries");
export const Friending = new FriendingConcept("friends");
export const Upvoting = new UpvotingConcept("upvotes");
export const Favoriting = new FavoritingConcept("favorites");
export const Itinerary = new ItineraryConcept("itineraries");
