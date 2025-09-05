import express from 'express';
import { body, param, query } from 'express-validator';
import { User, ForumPost, WorkoutTemplate, ActivityLog } from '../../models/index.js';
import { authenticateToken } from '../../middleware/auth.js';
import { handleValidationErrors, logActivity } from '../../middleware/common.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ======================
// SOCIAL FOLLOWING ROUTES
// ======================

// Get user's followers
router.get('/followers', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.user._id)
      .populate({
        path: 'followers',
        select: 'username name.firstName name.lastName profilePicture isActive',
        options: { skip, limit: parseInt(limit) }
      });

    const totalFollowers = user.followers.length;

    res.json({
      followers: user.followers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalFollowers,
        pages: Math.ceil(totalFollowers / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch followers', details: error.message });
  }
});

// Get user's following
router.get('/following', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.user._id)
      .populate({
        path: 'following',
        select: 'username name.firstName name.lastName profilePicture isActive',
        options: { skip, limit: parseInt(limit) }
      });

    const totalFollowing = user.following.length;

    res.json({
      following: user.following,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalFollowing,
        pages: Math.ceil(totalFollowing / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch following', details: error.message });
  }
});

// Follow a user
router.post('/follow/:userId', [
  param('userId').isMongoId(),
  handleValidationErrors
], logActivity('follow-user', 'Followed a user'), async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (userId === currentUserId.toString()) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const userToFollow = await User.findById(userId);
    if (!userToFollow || !userToFollow.isActive) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentUser = await User.findById(currentUserId);
    
    // Check if already following
    if (currentUser.following.includes(userId)) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    // Add to following and followers lists
    currentUser.following.push(userId);
    userToFollow.followers.push(currentUserId);

    await Promise.all([currentUser.save(), userToFollow.save()]);

    // Create notification for the followed user
    // This would be handled by a notification service in a real app

    res.json({ 
      message: 'Successfully followed user',
      user: {
        _id: userToFollow._id,
        username: userToFollow.username,
        name: userToFollow.name,
        profilePicture: userToFollow.profilePicture
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to follow user', details: error.message });
  }
});

// Unfollow a user
router.delete('/follow/:userId', [
  param('userId').isMongoId(),
  handleValidationErrors
], logActivity('unfollow-user', 'Unfollowed a user'), async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const currentUser = await User.findById(currentUserId);
    const userToUnfollow = await User.findById(userId);

    if (!userToUnfollow) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove from following and followers lists
    currentUser.following.pull(userId);
    userToUnfollow.followers.pull(currentUserId);

    await Promise.all([currentUser.save(), userToUnfollow.save()]);

    res.json({ message: 'Successfully unfollowed user' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unfollow user', details: error.message });
  }
});

// Search users
router.get('/users/search', [
  query('query').isString().trim().isLength({ min: 1 }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { query: searchQuery, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } }, // Exclude current user
        { isActive: true },
        {
          $or: [
            { username: { $regex: searchQuery, $options: 'i' } },
            { 'name.firstName': { $regex: searchQuery, $options: 'i' } },
            { 'name.lastName': { $regex: searchQuery, $options: 'i' } }
          ]
        }
      ]
    })
    .select('username name.firstName name.lastName profilePicture followers following')
    .skip(skip)
    .limit(parseInt(limit));

    // Add follow status for each user
    const usersWithFollowStatus = users.map(user => ({
      ...user.toObject(),
      isFollowing: req.user.following.includes(user._id),
      followersCount: user.followers.length,
      followingCount: user.following.length
    }));

    const total = await User.countDocuments({
      $and: [
        { _id: { $ne: req.user._id } },
        { isActive: true },
        {
          $or: [
            { username: { $regex: searchQuery, $options: 'i' } },
            { 'name.firstName': { $regex: searchQuery, $options: 'i' } },
            { 'name.lastName': { $regex: searchQuery, $options: 'i' } }
          ]
        }
      ]
    });

    res.json({
      users: usersWithFollowStatus,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search users', details: error.message });
  }
});

// ======================
// FORUM/COMMUNITY ROUTES
// ======================

// Get forum posts
router.get('/forum/posts', [
  query('category').optional().isIn([
    'general-discussion', 'workout-tips', 'nutrition-advice', 'progress-sharing',
    'motivation', 'questions', 'success-stories', 'equipment-reviews'
  ]),
  query('tags').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('sort').optional().isIn(['latest', 'popular', 'trending']),
  handleValidationErrors
], async (req, res) => {
  try {
    const { category, tags, page = 1, limit = 20, sort = 'latest' } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    if (category) query.category = category;
    if (tags) query.tags = { $in: tags.split(',') };

    // Build sort
    let sortOption = {};
    switch (sort) {
      case 'popular':
        sortOption = { 'likes.length': -1, createdAt: -1 };
        break;
      case 'trending':
        sortOption = { views: -1, createdAt: -1 };
        break;
      default:
        sortOption = { isPinned: -1, createdAt: -1 };
    }

    const posts = await ForumPost.find(query)
      .populate('author', 'username name.firstName name.lastName profilePicture')
      .populate('replies.author', 'username name.firstName name.lastName profilePicture')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ForumPost.countDocuments(query);

    // Add user interaction status
    const postsWithStatus = posts.map(post => ({
      ...post.toObject(),
      isLiked: post.likes.some(like => like.user.toString() === req.user._id.toString()),
      likesCount: post.likes.length,
      repliesCount: post.replies.length
    }));

    res.json({
      posts: postsWithStatus,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch forum posts', details: error.message });
  }
});

// Get single forum post
router.get('/forum/posts/:id', [
  param('id').isMongoId(),
  handleValidationErrors
], async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id)
      .populate('author', 'username name.firstName name.lastName profilePicture')
      .populate('replies.author', 'username name.firstName name.lastName profilePicture')
      .populate('attachments.routineId', 'name description category difficulty');

    if (!post) {
      return res.status(404).json({ error: 'Forum post not found' });
    }

    // Increment view count
    post.views += 1;
    await post.save();

    const postWithStatus = {
      ...post.toObject(),
      isLiked: post.likes.some(like => like.user.toString() === req.user._id.toString()),
      likesCount: post.likes.length,
      repliesCount: post.replies.length
    };

    res.json(postWithStatus);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch forum post', details: error.message });
  }
});

// Create forum post
router.post('/forum/posts', [
  body('title').isString().trim().isLength({ min: 1, max: 200 }),
  body('content').isString().trim().isLength({ min: 1, max: 5000 }),
  body('category').isIn([
    'general-discussion', 'workout-tips', 'nutrition-advice', 'progress-sharing',
    'motivation', 'questions', 'success-stories', 'equipment-reviews'
  ]),
  body('tags').optional().isArray(),
  body('attachments').optional().isArray(),
  handleValidationErrors
], logActivity('post-created', 'Created forum post'), async (req, res) => {
  try {
    const post = new ForumPost({
      ...req.body,
      author: req.user._id
    });

    await post.save();
    await post.populate('author', 'username name.firstName name.lastName profilePicture');

    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create forum post', details: error.message });
  }
});

// Like/unlike forum post
router.post('/forum/posts/:id/like', [
  param('id').isMongoId(),
  handleValidationErrors
], logActivity('post-liked', 'Liked forum post'), async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Forum post not found' });
    }

    const existingLike = post.likes.find(like => 
      like.user.toString() === req.user._id.toString()
    );

    if (existingLike) {
      // Unlike
      post.likes.pull({ _id: existingLike._id });
    } else {
      // Like
      post.likes.push({ user: req.user._id });
    }

    await post.save();

    res.json({
      isLiked: !existingLike,
      likesCount: post.likes.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to like/unlike post', details: error.message });
  }
});

// Reply to forum post
router.post('/forum/posts/:id/replies', [
  param('id').isMongoId(),
  body('content').isString().trim().isLength({ min: 1, max: 2000 }),
  handleValidationErrors
], logActivity('post-replied', 'Replied to forum post'), async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Forum post not found' });
    }

    if (post.isLocked) {
      return res.status(403).json({ error: 'This post is locked and cannot receive replies' });
    }

    const reply = {
      author: req.user._id,
      content: req.body.content,
      likes: []
    };

    post.replies.push(reply);
    await post.save();

    await post.populate('replies.author', 'username name.firstName name.lastName profilePicture');

    const newReply = post.replies[post.replies.length - 1];
    res.status(201).json(newReply);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reply to post', details: error.message });
  }
});

// ======================
// WORKOUT SHARING ROUTES
// ======================

// Get public workout templates
router.get('/workout-templates', [
  query('category').optional().isIn([
    'strength', 'cardio', 'flexibility', 'mixed', 'rehabilitation', 'sport-specific'
  ]),
  query('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']),
  query('equipment').optional().isString(),
  query('tags').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('sort').optional().isIn(['latest', 'popular', 'rating']),
  handleValidationErrors
], async (req, res) => {
  try {
    const { 
      category, difficulty, equipment, tags, 
      page = 1, limit = 20, sort = 'latest' 
    } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = { isPublic: true };
    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    if (equipment) query.equipment = { $in: equipment.split(',') };
    if (tags) query.tags = { $in: tags.split(',') };

    // Build sort
    let sortOption = {};
    switch (sort) {
      case 'popular':
        sortOption = { downloads: -1, createdAt: -1 };
        break;
      case 'rating':
        sortOption = { averageRating: -1, totalRatings: -1, createdAt: -1 };
        break;
      default:
        sortOption = { isFeatured: -1, createdAt: -1 };
    }

    const templates = await WorkoutTemplate.find(query)
      .populate('creator', 'username name.firstName name.lastName profilePicture')
      .populate('exercises.exercise', 'name category muscleGroups')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await WorkoutTemplate.countDocuments(query);

    res.json({
      templates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workout templates', details: error.message });
  }
});

// Get workout template by ID
router.get('/workout-templates/:id', [
  param('id').isMongoId(),
  handleValidationErrors
], async (req, res) => {
  try {
    const template = await WorkoutTemplate.findById(req.params.id)
      .populate('creator', 'username name.firstName name.lastName profilePicture')
      .populate('exercises.exercise', 'name category muscleGroups equipment')
      .populate('ratings.user', 'username name.firstName name.lastName');

    if (!template) {
      return res.status(404).json({ error: 'Workout template not found' });
    }

    if (!template.isPublic && template.creator._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(template);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workout template', details: error.message });
  }
});

// Download/copy workout template
router.post('/workout-templates/:id/download', [
  param('id').isMongoId(),
  handleValidationErrors
], logActivity('template-downloaded', 'Downloaded workout template'), async (req, res) => {
  try {
    const template = await WorkoutTemplate.findById(req.params.id)
      .populate('exercises.exercise');

    if (!template || !template.isPublic) {
      return res.status(404).json({ error: 'Workout template not found' });
    }

    // Increment download count
    template.downloads += 1;
    await template.save();

    // This would typically create a copy of the template as a workout routine for the user
    // Implementation would depend on your WorkoutRoutine model structure

    res.json({ 
      message: 'Template downloaded successfully',
      downloads: template.downloads
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to download template', details: error.message });
  }
});

// Rate workout template
router.post('/workout-templates/:id/rate', [
  param('id').isMongoId(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('review').optional().isString().isLength({ max: 500 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { rating, review } = req.body;
    const template = await WorkoutTemplate.findById(req.params.id);

    if (!template || !template.isPublic) {
      return res.status(404).json({ error: 'Workout template not found' });
    }

    if (template.creator.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot rate your own template' });
    }

    // Check if user already rated
    const existingRating = template.ratings.find(r => 
      r.user.toString() === req.user._id.toString()
    );

    if (existingRating) {
      // Update existing rating
      existingRating.rating = rating;
      existingRating.review = review;
      existingRating.ratedAt = new Date();
    } else {
      // Add new rating
      template.ratings.push({
        user: req.user._id,
        rating,
        review
      });
    }

    // Recalculate average rating
    const totalRating = template.ratings.reduce((sum, r) => sum + r.rating, 0);
    template.averageRating = totalRating / template.ratings.length;
    template.totalRatings = template.ratings.length;

    await template.save();

    res.json({
      message: 'Rating submitted successfully',
      averageRating: template.averageRating,
      totalRatings: template.totalRatings
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to rate template', details: error.message });
  }
});

// ======================
// ACTIVITY FEED ROUTES
// ======================

// Get activity feed (following users' activities)
router.get('/feed', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('types').optional().isString(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { page = 1, limit = 20, types } = req.query;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.user._id).select('following');
    const followingIds = [...user.following, req.user._id]; // Include own activities

    // Build activity filter
    const query = { user: { $in: followingIds } };
    if (types) {
      query.action = { $in: types.split(',') };
    }

    const activities = await ActivityLog.find(query)
      .populate('user', 'username name.firstName name.lastName profilePicture')
      .populate('relatedEntity.id') // This might need specific handling based on the entity type
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ActivityLog.countDocuments(query);

    res.json({
      activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity feed', details: error.message });
  }
});

export default router;
