# Fitness Tracking API Documentation

**Version:** 1.0.0  
**Base URL:** `http://localhost:3000/api/v1`  
**Authentication:** JWT Bearer Token

## Table of Contents
1. [Authentication](#authentication)
2. [Nutrition API](#nutrition-api)
3. [Social API](#social-api)
4. [Progress Tracking API](#progress-tracking-api)
5. [Goals API](#goals-api)
6. [Dashboard API](#dashboard-api)
7. [Error Handling](#error-handling)
8. [Data Models](#data-models)

---

## Authentication

### Register User
Create a new user account.

**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com", 
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "60d5ecb74f0c2c001f5e4e87",
    "username": "johndoe",
    "email": "john@example.com",
    "name": {
      "firstName": "John",
      "lastName": "Doe"
    },
    "profilePicture": null
  }
}
```

### Login User
Authenticate an existing user.

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "identifier": "johndoe", // username or email
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "60d5ecb74f0c2c001f5e4e87",
    "username": "johndoe",
    "email": "john@example.com",
    "name": {
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

### Refresh Token
Refresh an expired JWT token.

**Endpoint:** `POST /auth/refresh`

**Headers:**
```
Authorization: Bearer <refresh_token>
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Token refreshed successfully"
}
```

---

## Nutrition API

All nutrition endpoints require authentication.

### Search Foods
Search for foods in the database.

**Endpoint:** `GET /nutrition/foods`

**Query Parameters:**
- `search` (string, optional): Search term for food name
- `category` (string, optional): Filter by category (fruits, vegetables, proteins, grains, dairy, etc.)
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20, max: 100)

**Example Request:**
```
GET /nutrition/foods?search=apple&category=fruits&page=1&limit=10
```

**Response:**
```json
{
  "foods": [
    {
      "_id": "60d5ecb74f0c2c001f5e4e87",
      "name": "Apple",
      "category": "fruits",
      "nutritionPer100g": {
        "calories": 52,
        "protein": 0.3,
        "carbohydrates": 14,
        "fat": 0.2,
        "fiber": 2.4,
        "sugar": 10,
        "sodium": 0
      },
      "isCustom": false,
      "verified": true,
      "servingSizes": [
        {
          "name": "Medium apple",
          "amount": 182,
          "unit": "g"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

### Create Custom Food
Create a custom food item.

**Endpoint:** `POST /nutrition/foods`

**Request Body:**
```json
{
  "name": "Custom Protein Shake",
  "category": "beverages",
  "nutritionPer100g": {
    "calories": 120,
    "protein": 25,
    "carbohydrates": 5,
    "fat": 1.5,
    "fiber": 2,
    "sugar": 3
  },
  "brand": "My Brand",
  "servingSizes": [
    {
      "name": "1 scoop",
      "amount": 30,
      "unit": "g"
    }
  ]
}
```

**Response:**
```json
{
  "_id": "60d5ecb74f0c2c001f5e4e88",
  "name": "Custom Protein Shake",
  "category": "beverages",
  "nutritionPer100g": {
    "calories": 120,
    "protein": 25,
    "carbohydrates": 5,
    "fat": 1.5,
    "fiber": 2,
    "sugar": 3,
    "sodium": 0
  },
  "isCustom": true,
  "createdBy": {
    "_id": "60d5ecb74f0c2c001f5e4e87",
    "username": "johndoe",
    "name": {
      "firstName": "John",
      "lastName": "Doe"
    }
  },
  "verified": false,
  "createdAt": "2025-09-05T07:40:57.578Z"
}
```

### Log Nutrition Entry
Log daily nutrition intake.

**Endpoint:** `POST /nutrition/entries`

**Request Body:**
```json
{
  "date": "2025-09-05",
  "meals": [
    {
      "type": "breakfast",
      "foods": [
        {
          "food": "60d5ecb74f0c2c001f5e4e87",
          "quantity": 150,
          "unit": "g"
        }
      ]
    }
  ],
  "waterIntake": {
    "amount": 500,
    "unit": "ml"
  }
}
```

**Response:**
```json
{
  "_id": "60d5ecb74f0c2c001f5e4e89",
  "user": "60d5ecb74f0c2c001f5e4e87",
  "date": "2025-09-05T00:00:00.000Z",
  "meals": [
    {
      "type": "breakfast",
      "foods": [
        {
          "food": {
            "_id": "60d5ecb74f0c2c001f5e4e87",
            "name": "Apple"
          },
          "quantity": 150,
          "unit": "g",
          "calories": 78,
          "protein": 0.45,
          "carbohydrates": 21,
          "fat": 0.3
        }
      ],
      "totalCalories": 78
    }
  ],
  "dailyTotals": {
    "calories": 78,
    "protein": 0.45,
    "carbohydrates": 21,
    "fat": 0.3
  },
  "waterIntake": {
    "amount": 500,
    "unit": "ml"
  }
}
```

### Get Nutrition Entries
Retrieve user's nutrition entries.

**Endpoint:** `GET /nutrition/entries`

**Query Parameters:**
- `startDate` (string, optional): Start date (YYYY-MM-DD)
- `endDate` (string, optional): End date (YYYY-MM-DD)
- `page` (number, optional): Page number
- `limit` (number, optional): Items per page

**Response:**
```json
{
  "entries": [
    {
      "_id": "60d5ecb74f0c2c001f5e4e89",
      "date": "2025-09-05T00:00:00.000Z",
      "dailyTotals": {
        "calories": 78,
        "protein": 0.45,
        "carbohydrates": 21,
        "fat": 0.3
      },
      "meals": [...],
      "waterIntake": {
        "amount": 500,
        "unit": "ml"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

### Get Nutrition Analytics
Get nutrition trends and insights.

**Endpoint:** `GET /nutrition/analytics/trends`

**Query Parameters:**
- `period` (string): "7d", "30d", "90d"

**Response:**
```json
{
  "period": "30d",
  "averages": {
    "calories": 1850,
    "protein": 125,
    "carbohydrates": 230,
    "fat": 65
  },
  "trends": [
    {
      "date": "2025-09-05",
      "calories": 1900,
      "protein": 130,
      "carbohydrates": 240,
      "fat": 70
    }
  ],
  "insights": [
    {
      "type": "protein",
      "message": "You're meeting your protein goals consistently!",
      "level": "success"
    }
  ]
}
```

---

## Social API

### Get Followers
Get user's followers list.

**Endpoint:** `GET /social/followers`

**Query Parameters:**
- `page` (number, optional): Page number
- `limit` (number, optional): Items per page

**Response:**
```json
{
  "followers": [
    {
      "_id": "60d5ecb74f0c2c001f5e4e87",
      "username": "johndoe",
      "name": {
        "firstName": "John",
        "lastName": "Doe"
      },
      "profilePicture": "https://example.com/avatar.jpg",
      "isActive": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

### Follow User
Follow another user.

**Endpoint:** `POST /social/follow/:userId`

**Response:**
```json
{
  "message": "Successfully followed user",
  "user": {
    "_id": "60d5ecb74f0c2c001f5e4e87",
    "username": "johndoe",
    "name": {
      "firstName": "John",
      "lastName": "Doe"
    },
    "profilePicture": "https://example.com/avatar.jpg"
  }
}
```

### Unfollow User
Unfollow a user.

**Endpoint:** `DELETE /social/follow/:userId`

**Response:**
```json
{
  "message": "Successfully unfollowed user"
}
```

### Search Users
Search for users to follow.

**Endpoint:** `GET /social/users/search`

**Query Parameters:**
- `query` (string, required): Search term
- `page` (number, optional): Page number
- `limit` (number, optional): Items per page

**Response:**
```json
{
  "users": [
    {
      "_id": "60d5ecb74f0c2c001f5e4e87",
      "username": "johndoe",
      "name": {
        "firstName": "John",
        "lastName": "Doe"
      },
      "profilePicture": "https://example.com/avatar.jpg",
      "isFollowing": false,
      "followersCount": 15,
      "followingCount": 23
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

### Create Forum Post
Create a new forum post.

**Endpoint:** `POST /social/forum/posts`

**Request Body:**
```json
{
  "title": "My Fitness Journey",
  "content": "Just completed my first month of training!",
  "category": "progress-sharing",
  "tags": ["motivation", "progress", "beginner"]
}
```

**Response:**
```json
{
  "_id": "60d5ecb74f0c2c001f5e4e89",
  "title": "My Fitness Journey",
  "content": "Just completed my first month of training!",
  "category": "progress-sharing",
  "tags": ["motivation", "progress", "beginner"],
  "author": {
    "_id": "60d5ecb74f0c2c001f5e4e87",
    "username": "johndoe",
    "name": {
      "firstName": "John",
      "lastName": "Doe"
    },
    "profilePicture": null
  },
  "views": 0,
  "likes": [],
  "replies": [],
  "createdAt": "2025-09-05T07:45:00.000Z"
}
```

### Get Forum Posts
Get forum posts with filtering.

**Endpoint:** `GET /social/forum/posts`

**Query Parameters:**
- `category` (string, optional): Filter by category
- `tags` (string, optional): Comma-separated tags
- `sort` (string, optional): "latest", "popular", "trending"
- `page` (number, optional): Page number
- `limit` (number, optional): Items per page

**Response:**
```json
{
  "posts": [
    {
      "_id": "60d5ecb74f0c2c001f5e4e89",
      "title": "My Fitness Journey",
      "content": "Just completed my first month of training!",
      "category": "progress-sharing",
      "author": {
        "username": "johndoe",
        "name": {
          "firstName": "John",
          "lastName": "Doe"
        }
      },
      "isLiked": false,
      "likesCount": 5,
      "repliesCount": 2,
      "views": 25,
      "createdAt": "2025-09-05T07:45:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

### Like/Unlike Post
Toggle like on a forum post.

**Endpoint:** `POST /social/forum/posts/:id/like`

**Response:**
```json
{
  "isLiked": true,
  "likesCount": 6
}
```

---

## Progress Tracking API

### Log Progress Entry
Create a new progress entry.

**Endpoint:** `POST /progress/entries`

**Request Body (Weight):**
```json
{
  "type": "weight",
  "date": "2025-09-05",
  "data": {
    "weight": 70.5
  },
  "notes": "Morning weight after workout"
}
```

**Request Body (Body Measurements):**
```json
{
  "type": "body-measurements",
  "date": "2025-09-05",
  "data": {
    "chest": 100,
    "waist": 85,
    "hips": 95,
    "arms": 35,
    "thighs": 60
  },
  "notes": "Monthly measurements"
}
```

**Request Body (Performance):**
```json
{
  "type": "performance",
  "date": "2025-09-05",
  "data": {
    "exercise": "Bench Press",
    "value": 80,
    "unit": "kg",
    "reps": 8,
    "sets": 3
  },
  "notes": "New personal record!"
}
```

**Response:**
```json
{
  "_id": "60d5ecb74f0c2c001f5e4e89",
  "user": "60d5ecb74f0c2c001f5e4e87",
  "type": "weight",
  "date": "2025-09-05T00:00:00.000Z",
  "data": {
    "weight": 70.5
  },
  "notes": "Morning weight after workout",
  "createdAt": "2025-09-05T08:00:00.000Z"
}
```

### Get Progress Entries
Retrieve progress entries.

**Endpoint:** `GET /progress/entries`

**Query Parameters:**
- `type` (string, optional): "weight", "body-measurements", "performance", "photo"
- `startDate` (string, optional): Start date (YYYY-MM-DD)
- `endDate` (string, optional): End date (YYYY-MM-DD)
- `page` (number, optional): Page number
- `limit` (number, optional): Items per page

**Response:**
```json
{
  "entries": [
    {
      "_id": "60d5ecb74f0c2c001f5e4e89",
      "type": "weight",
      "date": "2025-09-05T00:00:00.000Z",
      "data": {
        "weight": 70.5
      },
      "notes": "Morning weight after workout",
      "createdAt": "2025-09-05T08:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "pages": 1
  }
}
```

### Get Weight Analytics
Get weight trend analysis.

**Endpoint:** `GET /progress/analytics/weight`

**Query Parameters:**
- `period` (string, optional): "7d", "30d", "90d", "1y"

**Response:**
```json
{
  "entries": [
    {
      "_id": "60d5ecb74f0c2c001f5e4e89",
      "date": "2025-09-05T00:00:00.000Z",
      "data": {
        "weight": 70.5
      }
    }
  ],
  "trend": {
    "direction": "decreasing",
    "change": -2.5,
    "changePercentage": "-3.42"
  },
  "statistics": {
    "average": "71.25",
    "min": 70.5,
    "max": 73,
    "totalEntries": 5
  }
}
```

### Get Progress Summary
Get overall progress summary.

**Endpoint:** `GET /progress/summary`

**Response:**
```json
{
  "totalEntries": 15,
  "entriesThisMonth": 8,
  "lastEntry": {
    "type": "weight",
    "date": "2025-09-05T00:00:00.000Z",
    "data": {
      "weight": 70.5
    }
  },
  "byType": {
    "weight": {
      "count": 5,
      "latest": {...},
      "trend": {
        "change": "-2.50",
        "direction": "decreasing"
      }
    },
    "measurements": {
      "count": 3,
      "latest": {...}
    },
    "performance": {
      "count": 7,
      "latest": {...},
      "uniqueExercises": 4
    }
  }
}
```

---

## Goals API

### Create Goal
Create a new fitness goal.

**Endpoint:** `POST /goals`

**Request Body:**
```json
{
  "title": "Lose 5kg in 3 months",
  "description": "I want to lose 5kg by December for a healthier lifestyle",
  "type": "weight-loss",
  "priority": "high",
  "targetValue": 65.5,
  "currentValue": 70.5,
  "unit": "kg",
  "targetDate": "2025-12-05",
  "milestones": [
    {
      "title": "Lose first 2kg",
      "targetValue": 68.5,
      "targetDate": "2025-10-05"
    }
  ]
}
```

**Response:**
```json
{
  "_id": "60d5ecb74f0c2c001f5e4e89",
  "user": "60d5ecb74f0c2c001f5e4e87",
  "title": "Lose 5kg in 3 months",
  "description": "I want to lose 5kg by December for a healthier lifestyle",
  "type": "weight-loss",
  "priority": "high",
  "targetValue": 65.5,
  "currentValue": 70.5,
  "unit": "kg",
  "targetDate": "2025-12-05T00:00:00.000Z",
  "status": "active",
  "milestones": [
    {
      "_id": "60d5ecb74f0c2c001f5e4e8a",
      "title": "Lose first 2kg",
      "targetValue": 68.5,
      "targetDate": "2025-10-05T00:00:00.000Z",
      "isCompleted": false
    }
  ],
  "progressHistory": [],
  "createdAt": "2025-09-05T08:00:00.000Z"
}
```

### Get Goals
Retrieve user's goals.

**Endpoint:** `GET /goals`

**Query Parameters:**
- `status` (string, optional): "active", "completed", "paused", "cancelled"
- `type` (string, optional): "weight-loss", "weight-gain", "muscle-gain", etc.
- `priority` (string, optional): "low", "medium", "high"

**Response:**
```json
{
  "goals": [
    {
      "_id": "60d5ecb74f0c2c001f5e4e89",
      "title": "Lose 5kg in 3 months",
      "type": "weight-loss",
      "priority": "high",
      "targetValue": 65.5,
      "currentValue": 68.0,
      "unit": "kg",
      "targetDate": "2025-12-05T00:00:00.000Z",
      "status": "active",
      "progressPercentage": 50,
      "milestones": [...],
      "createdAt": "2025-09-05T08:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

### Update Goal Progress
Update progress on a goal.

**Endpoint:** `POST /goals/:id/progress`

**Request Body:**
```json
{
  "value": 68.0,
  "notes": "Lost 2.5kg this month!",
  "date": "2025-09-05"
}
```

**Response:**
```json
{
  "message": "Progress updated successfully",
  "goal": {
    "_id": "60d5ecb74f0c2c001f5e4e89",
    "currentValue": 68.0,
    "progressHistory": [
      {
        "date": "2025-09-05T00:00:00.000Z",
        "value": 68.0,
        "notes": "Lost 2.5kg this month!",
        "previousValue": 70.5
      }
    ]
  },
  "progressPercentage": 50,
  "completedMilestones": [
    {
      "_id": "60d5ecb74f0c2c001f5e4e8a",
      "title": "Lose first 2kg",
      "completedAt": "2025-09-05T08:00:00.000Z"
    }
  ],
  "isGoalCompleted": false
}
```

### Get Goal Analytics
Get goal statistics and insights.

**Endpoint:** `GET /goals/analytics/stats`

**Response:**
```json
{
  "overall": {
    "total": 5,
    "active": 3,
    "completed": 2,
    "paused": 0,
    "cancelled": 0
  },
  "byCategory": [
    {
      "_id": "weight-loss",
      "count": 2,
      "completed": 1
    },
    {
      "_id": "strength",
      "count": 3,
      "completed": 1
    }
  ],
  "completionRate": "40.00",
  "completionTrend": [
    {
      "_id": {
        "year": 2025,
        "month": 9
      },
      "count": 1
    }
  ]
}
```

---

## Dashboard API

### Get Main Dashboard
Get comprehensive dashboard data.

**Endpoint:** `GET /dashboard`

**Response:**
```json
{
  "user": {
    "name": {
      "firstName": "John",
      "lastName": "Doe"
    },
    "profilePicture": "https://example.com/avatar.jpg",
    "joinDate": "2025-08-01T00:00:00.000Z"
  },
  "summary": {
    "workoutsThisWeek": 4,
    "averageDailyCalories": 1850,
    "activeGoals": 3,
    "progressEntries": 8
  },
  "recentActivity": {
    "workouts": [...],
    "nutrition": {
      "avgCalories": 1850,
      "totalProtein": 125,
      "entries": 7
    },
    "progress": [...]
  },
  "goals": [
    {
      "_id": "60d5ecb74f0c2c001f5e4e89",
      "title": "Lose 5kg in 3 months",
      "progressPercentage": 50,
      "priority": "high",
      "targetDate": "2025-12-05T00:00:00.000Z"
    }
  ],
  "insights": [
    {
      "type": "workout",
      "level": "success",
      "message": "Great job! You've completed 4 workouts this week."
    },
    {
      "type": "goals",
      "level": "success", 
      "message": "1 goal(s) are almost complete! Keep pushing!"
    }
  ]
}
```

### Get Workout Analytics
Get detailed workout analytics.

**Endpoint:** `GET /dashboard/workouts`

**Query Parameters:**
- `period` (string, optional): "7d", "30d", "90d", "1y"

**Response:**
```json
{
  "period": "30d",
  "overview": {
    "totalWorkouts": 16,
    "totalDuration": 960,
    "avgDuration": 60,
    "totalCaloriesBurned": 3200,
    "avgCaloriesBurned": 200
  },
  "byCategory": [
    {
      "_id": "strength",
      "count": 10,
      "totalDuration": 600,
      "avgDuration": 60
    },
    {
      "_id": "cardio", 
      "count": 6,
      "totalDuration": 360,
      "avgDuration": 60
    }
  ],
  "frequency": [
    {
      "_id": 1, // Sunday
      "count": 2
    },
    {
      "_id": 2, // Monday
      "count": 4
    }
  ],
  "volumeProgression": [
    {
      "_id": {
        "year": 2025,
        "month": 9,
        "week": 36
      },
      "totalVolume": 2500,
      "workoutCount": 4,
      "avgDuration": 65
    }
  ]
}
```

---

## Error Handling

### Error Response Format
All errors follow a consistent format:

```json
{
  "error": "Error message",
  "details": "Additional error details or validation errors"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `500` - Internal Server Error

### Validation Errors
Validation errors include detailed field information:

```json
{
  "error": "Validation failed",
  "details": [
    {
      "type": "field",
      "msg": "Invalid value",
      "path": "email",
      "location": "body"
    }
  ]
}
```

---

## Data Models

### User Model
```typescript
interface User {
  _id: string;
  username: string;
  email: string;
  name: {
    firstName: string;
    lastName: string;
  };
  profilePicture?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  height?: number;
  activityLevel?: 'sedentary' | 'lightly-active' | 'moderately-active' | 'very-active' | 'extremely-active';
  followers: string[];
  following: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Food Model
```typescript
interface Food {
  _id: string;
  name: string;
  brand?: string;
  category: string;
  nutritionPer100g: {
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
  servingSizes: Array<{
    name: string;
    amount: number;
    unit: string;
  }>;
  isCustom: boolean;
  createdBy?: string;
  verified: boolean;
  createdAt: Date;
}
```

### Progress Model
```typescript
interface Progress {
  _id: string;
  user: string;
  type: 'weight' | 'body-measurements' | 'performance' | 'photo';
  date: Date;
  data: any; // Type-specific data
  notes?: string;
  photos?: string[];
  createdAt: Date;
}
```

### Goal Model
```typescript
interface Goal {
  _id: string;
  user: string;
  title: string;
  description?: string;
  type: 'weight-loss' | 'weight-gain' | 'muscle-gain' | 'strength' | 'endurance' | 'habit' | 'other';
  priority: 'low' | 'medium' | 'high';
  targetValue?: number;
  currentValue: number;
  unit?: string;
  targetDate?: Date;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  milestones: Array<{
    title: string;
    targetValue: number;
    targetDate: Date;
    isCompleted: boolean;
    completedAt?: Date;
  }>;
  progressHistory: Array<{
    date: Date;
    value: number;
    notes?: string;
    previousValue: number;
  }>;
  createdAt: Date;
}
```

---

## Authentication Headers

All protected endpoints require the Authorization header:

```
Authorization: Bearer <jwt_token>
```

Example:
```javascript
const response = await fetch('/api/v1/nutrition/foods', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

---

## Rate Limiting

API calls are rate-limited to prevent abuse:
- **Authentication endpoints**: 10 requests per minute
- **Other endpoints**: 100 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1630000000
```

---

## Development Notes

1. **Base URL**: Update the base URL for production deployment
2. **CORS**: Configured for development (localhost). Update for production domains
3. **File Uploads**: Photo upload endpoints will be available in future versions
4. **Real-time Features**: WebSocket endpoints for live notifications coming soon
5. **Pagination**: All list endpoints support pagination with consistent format

For questions or support, contact the development team.
