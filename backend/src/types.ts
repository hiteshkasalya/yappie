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
};

export type FriendListItem = {
  friendshipId: string;
  status: FriendStatus;
  requestedByMe: boolean;
  friend: PublicUser;
};

export type AdminStats = {
  totalUsers: number;
  onlineUsers: number;
  activeChats: number;
  reports: number;
};
