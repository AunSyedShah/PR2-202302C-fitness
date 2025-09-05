import express from 'express';
import { body, query, param } from 'express-validator';
import { User, Notification } from '../../models/models.js';
import { authenticateToken } from '../../middleware/auth.js';
import { handleValidationErrors, logActivity } from '../../middleware/common.js';

const router = express.Router();

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('followers', 'username name.firstName name.lastName profilePicture')
      .populate('following', 'username name.firstName name.lastName profilePicture');

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile', details: error.message });
  }
});

// Update user profile
router.put('/profile', [
  authenticateToken,
  body('name.firstName').optional().trim().isLength({ min: 1, max: 50 }),
  body('name.lastName').optional().trim().isLength({ min: 1, max: 50 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('profilePicture').optional().isURL(),
  handleValidationErrors,
  logActivity('profile-updated', 'User updated their profile')
], async (req, res) => {
  try {
    const allowedUpdates = ['name', 'email', 'profilePicture', 'dateOfBirth', 'gender', 'height', 'preferences'];
    const updates = {};

    // Filter allowed updates
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile', details: error.message });
  }
});

// Search users
router.get('/search', [
  authenticateToken,
  query('q').notEmpty().withMessage('Search query is required'),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        { isActive: true },
        {
          $or: [
            { username: { $regex: q, $options: 'i' } },
            { 'name.firstName': { $regex: q, $options: 'i' } },
            { 'name.lastName': { $regex: q, $options: 'i' } }
          ]
        }
      ]
    })
    .select('username name profilePicture')
    .limit(parseInt(limit));

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
});

// Follow/Unfollow user
router.post('/:userId/follow', [
  authenticateToken,
  param('userId').isMongoId(),
  handleValidationErrors,
  logActivity('follow-user', 'User followed another user')
], async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already following
    const isFollowing = req.user.following.includes(userId);
    
    if (isFollowing) {
      // Unfollow
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { following: userId }
      });
      await User.findByIdAndUpdate(userId, {
        $pull: { followers: req.user._id }
      });
      
      res.json({ message: 'User unfollowed successfully', action: 'unfollowed' });
    } else {
      // Follow
      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { following: userId }
      });
      await User.findByIdAndUpdate(userId, {
        $addToSet: { followers: req.user._id }
      });

      // Create notification
      await Notification.create({
        user: userId,
        type: 'new-follower',
        title: 'New Follower',
        message: `${req.user.fullName} started following you`
      });
      
      res.json({ message: 'User followed successfully', action: 'followed' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Follow operation failed', details: error.message });
  }
});

// Get user's followers
router.get('/:userId/followers', [
  authenticateToken,
  param('userId').isMongoId(),
  handleValidationErrors
], async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('followers', 'username name profilePicture')
      .select('followers');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ followers: user.followers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch followers', details: error.message });
  }
});

// Get user's following
router.get('/:userId/following', [
  authenticateToken,
  param('userId').isMongoId(),
  handleValidationErrors
], async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('following', 'username name profilePicture')
      .select('following');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ following: user.following });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch following', details: error.message });
  }
});

export default router;
