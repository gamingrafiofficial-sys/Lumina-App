
export interface User {
  id: string;
  username: string;
  avatar: string;
  fullName: string;
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
  isSaved?: boolean; // New property to track if post is saved by current user
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
  createdAt: number; // Unix timestamp in milliseconds
}

export interface FriendRequest {
  id: string;
  user: User;
  timestamp: string;
}
