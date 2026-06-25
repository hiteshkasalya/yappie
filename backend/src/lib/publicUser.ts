import type { PublicUser } from "../types";

type UserLike = {
  _id: unknown;
  anonymousUsername: string;
  age?: number;
  gender?: PublicUser["gender"];
  college?: string;
  isOnline?: boolean;
};

export function toPublicUser(user: UserLike): PublicUser {
  return {
    id: String(user._id),
    anonymousUsername: user.anonymousUsername,
    age: user.age,
    gender: user.gender,
    college: user.college,
    online: Boolean(user.isOnline)
  };
}
