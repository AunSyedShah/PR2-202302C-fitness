# Fitness App API

A comprehensive RESTful API for a fitness tracking application built with Node.js, Express, and MongoDB.

## Features

- **User Management**: Registration, authentication, profile management, social features
- **Exercise Database**: Comprehensive exercise library with filtering and search
- **Workout Management**: Create, manage and track workout routines and sessions
- **Nutrition Tracking**: Food database, meal logging, and nutrition analysis
- **Progress Tracking**: Weight, measurements, performance, and photo progress
- **Goal Setting**: Create and track fitness goals with milestones
- **Social Features**: Follow users, forum discussions, workout sharing
- **Meal Planning**: Create and manage meal plans
- **Reminders**: Set workout, meal, and custom reminders
- **Reports**: Generate comprehensive fitness reports
- **Notifications**: Real-time notifications and updates

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd PR2-202302C-fitness
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB**
   ```bash
   # Make sure MongoDB is running on your system
   mongod
   ```

5. **Start the server**
   ```bash
   npm run dev
   ```

## API Endpoints

Base URL: `http://localhost:3000/api/v1`

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login user |

### User Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/profile` | Get current user profile |
| PUT | `/users/profile` | Update user profile |
| GET | `/users/search` | Search users |
| POST | `/users/:userId/follow` | Follow/unfollow user |

### Exercises

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/exercises` | Get exercises with filtering |
| GET | `/exercises/:id` | Get single exercise |
| POST | `/exercises` | Create custom exercise |
| PUT | `/exercises/:id` | Update exercise |
| DELETE | `/exercises/:id` | Delete exercise |

### Workout Routines

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/workout-routines` | Get user's workout routines |
| GET | `/workout-routines/:id` | Get single routine |
| POST | `/workout-routines` | Create workout routine |
| PUT | `/workout-routines/:id` | Update routine |
| DELETE | `/workout-routines/:id` | Delete routine |

### Workout Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/workout-sessions` | Get workout sessions |
| POST | `/workout-sessions/start` | Start workout session |
| PUT | `/workout-sessions/:id` | Update session |
| POST | `/workout-sessions/:id/complete` | Complete session |

### Food & Nutrition

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/foods/search` | Search food database |
| GET | `/foods/:id` | Get food details |
| POST | `/foods` | Add custom food |
| GET | `/nutrition-entries` | Get nutrition logs |
| POST | `/nutrition-entries` | Log nutrition entry |

### Progress Tracking

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/progress` | Get progress entries |
| POST | `/progress` | Record progress |
| PUT | `/progress/:id` | Update progress |
| DELETE | `/progress/:id` | Delete progress |

### Goals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/goals` | Get user goals |
| POST | `/goals` | Create goal |
| PUT | `/goals/:id` | Update goal |
| DELETE | `/goals/:id` | Delete goal |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | Get notifications |
| PUT | `/notifications/:id/read` | Mark as read |
| PUT | `/notifications/mark-all-read` | Mark all as read |

### Support

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/support-tickets` | Get support tickets |
| POST | `/support-tickets` | Create ticket |
| POST | `/support-tickets/:id/responses` | Add response |

### Forum

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/forum-posts` | Get forum posts |
| POST | `/forum-posts` | Create post |
| POST | `/forum-posts/:id/like` | Like/unlike post |
| POST | `/forum-posts/:id/replies` | Reply to post |

### Meal Plans

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/meal-plans` | Get meal plans |
| POST | `/meal-plans` | Create meal plan |
| PUT | `/meal-plans/:id` | Update meal plan |
| DELETE | `/meal-plans/:id` | Delete meal plan |

### Workout Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/workout-templates` | Get templates |
| POST | `/workout-templates` | Create template |
| POST | `/workout-templates/:id/rate` | Rate template |

### Reminders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reminders` | Get reminders |
| POST | `/reminders` | Create reminder |
| PUT | `/reminders/:id` | Update reminder |
| DELETE | `/reminders/:id` | Delete reminder |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports` | Get reports |
| POST | `/reports` | Request report |

### Activity Log

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/activity-log` | Get activity history |

## Data Models

### User
- Authentication (username, email, password)
- Profile information (name, picture, DOB, gender, height)
- Preferences (notifications, units, theme)
- Social features (followers, following)

### Exercise
- Basic info (name, category, muscle groups)
- Equipment requirements
- Instructions and difficulty
- Custom exercises by users

### Workout Routine
- Exercise list with sets, reps, weights
- Categories and difficulty levels
- Public/private sharing options

### Workout Session
- Actual workout performance
- Real-time tracking of exercises
- Duration and calories burned

### Food
- Nutritional information per 100g
- Multiple serving sizes
- Barcode support for packaged foods

### Nutrition Entry
- Daily meal logging
- Automatic nutrition calculations
- Water intake tracking

### Progress
- Weight and body measurements
- Performance metrics
- Progress photos
- Timeline tracking

### Goal
- Various goal types (weight, strength, etc.)
- Target values and dates
- Milestone tracking
- Achievement notifications

## Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

Obtain a token by registering or logging in through the auth endpoints.

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Development

### Scripts
```bash
npm run dev    # Start development server
npm start      # Start production server
npm test       # Run tests
```

### Database
The app uses MongoDB with Mongoose ODM. Models are defined in `/models/models.js`.

### Validation
Input validation is handled using express-validator middleware.

### Logging
Activity logging is implemented for user actions and can be accessed via the activity log endpoint.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
