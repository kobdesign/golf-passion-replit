export const queryKeys = {
  user: ['user'] as const,
  
  userRole: (userId?: string) => ['user-role', userId] as const,
  isAdmin: (userId?: string) => ['is-admin', userId] as const,
  
  courses: {
    all: ['courses'] as const,
    detail: (id: string) => ['course', id] as const,
    holes: (courseId: string) => ['holes', courseId] as const,
    reviews: (courseId: string) => ['course-reviews', courseId] as const,
    configurations: (courseId: string) => ['course-configurations', courseId] as const,
    subCourses: (courseId: string) => ['sub-courses', courseId] as const,
    teePositions: (holeId: string) => ['tee-positions', holeId] as const,
  },
  
  bookmarks: {
    all: (userId?: string) => ['bookmarks', userId] as const,
    check: (userId: string, courseId: string) => ['bookmark', userId, courseId] as const,
  },
  
  rounds: {
    all: (userId?: string) => ['rounds', userId] as const,
    active: (userId?: string) => ['active-round', userId] as const,
    detail: (roundId: string) => ['round', roundId] as const,
    history: (userId?: string, courseId?: string) => 
      courseId ? ['round-history', userId, courseId] as const : ['round-history', userId] as const,
    holeScores: (roundId: string) => ['hole-scores', roundId] as const,
  },
  
  social: {
    feed: (page?: number) => page !== undefined ? ['feed', page] as const : ['feed'] as const,
    post: (postId: string) => ['post', postId] as const,
    comments: (postId: string) => ['comments', postId] as const,
    likes: (postId: string) => ['likes', postId] as const,
    userPosts: (userId: string) => ['user-posts', userId] as const,
  },
  
  profile: {
    byId: (userId: string) => ['profile', userId] as const,
    current: ['current-profile'] as const,
  },
  
  friends: {
    all: (userId?: string) => ['friends', userId] as const,
    requests: (userId?: string) => ['friend-requests', userId] as const,
  },
  
  notifications: {
    all: (userId?: string) => ['notifications', userId] as const,
    unread: (userId?: string) => ['unread-notifications', userId] as const,
  },
  
  leaderboard: (courseId: string) => ['leaderboard', courseId] as const,
  
  stats: {
    user: (userId?: string, courseId?: string) => 
      courseId ? ['stats', userId, courseId] as const : ['stats', userId] as const,
  },
} as const;
