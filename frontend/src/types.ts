export type Gender = "woman" | "man" | "non_binary" | "prefer_not_to_say" | "self_describe";
export type MatchMode = "random" | "campus";
export type FriendStatus = "pending" | "accepted" | "blocked";

export type PublicUser = {
  id: string;
  anonymousUsername: string;
  age?: number;
  gender?: Gender;
  college?: string;
  online?: boolean;
};

export type StoredSession = {
  user: PublicUser;
  token: string;
};

export type ChatMessage = {
  id?: string;
  roomId: string;
  senderId: string;
  receiverId: string;
  message: string;
  timestamp: string;
  status?: "sending" | "error" | "delivered";
};

export type FriendListItem = {
  friendshipId: string;
  status: FriendStatus;
  requestedByMe: boolean;
  friend: PublicUser;
  unreadCount?: number;
};

export type AdminStats = {
  totalUsers: number;
  onlineUsers: number;
  activeChats: number;
  reports: number;
};

export type ConfessionComment = {
  id: string;
  senderId: string;
  anonymousUsername: string;
  message: string;
  timestamp: string;
};

export type Confession = {
  _id: string;
  senderId: string;
  anonymousUsername: string;
  college: string;
  message: string;
  comments: ConfessionComment[];
  timestamp: string;
};

