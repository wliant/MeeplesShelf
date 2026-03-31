import client from "./client";

export const sendFriendRequest = (friendEmail: string) =>
  client.post("/friends/request", { friend_email: friendEmail }).then((r) => r.data);

export const listFriends = () =>
  client.get("/friends").then((r) => r.data);

export const listPendingRequests = () =>
  client.get("/friends/pending").then((r) => r.data);

export const acceptFriendRequest = (friendshipId: number) =>
  client.post(`/friends/${friendshipId}/accept`).then((r) => r.data);

export const removeFriend = (friendshipId: number) =>
  client.delete(`/friends/${friendshipId}`);

export const createPublicProfile = (slug: string) =>
  client.post("/profile/share", { public_slug: slug }).then((r) => r.data);

export const getPublicProfile = (slug: string) =>
  client.get(`/profile/${slug}`).then((r) => r.data);

export interface ActivityEvent {
  id: number;
  user_id: number;
  user_name: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export const getFriendActivity = (limit = 20, offset = 0) =>
  client
    .get<ActivityEvent[]>("/friends/activity", { params: { limit, offset } })
    .then((r) => r.data);
