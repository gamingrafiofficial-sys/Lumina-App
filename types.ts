
export interface User {
  id: string;
  username: string;
  avatar: string;
  fullName: string;
  mobile?: string;
  coverPhoto?: string;
  isVerified?: boolean;
  isFollowing?: boolean;
  bio?: string;
  work?: string;
  location?: string;
  website?: string;
  postsCount?: number;
  followersCount?: number;
  followingCount?: number;
}

export interface Post {
  id: string;
  user: User;
  imageUrl: string;
  caption: string;
  likes: number;
  comments: Comment[];
  timestamp: string;
  isLiked: boolean;
  isSaved?: boolean;
}

export interface Comment {
  id: string;
  username: string;
  text: string;
  timestamp: string;
}

export interface Story {
  id: string;
  user: User;
  imageUrl: string;
  viewed: boolean;
  createdAt: number;
}

export interface FriendRequest {
  id: string;
  user: User;
  timestamp: string;
}
