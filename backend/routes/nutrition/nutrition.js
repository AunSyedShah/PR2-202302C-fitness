import express from 'express';
import { body, param, query } from 'express-validator';
import { Food, NutritionEntry, MealPlan, User } from '../../models/index.js';
import { authenticateToken } from '../../middleware/auth.js';
import { handleValidationErrors, logActivity } from '../../middleware/common.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ======================
// FOOD DATABASE ROUTES
// ======================

// Get foods with search and filtering
router.get('/foods', [
  query('search').optional().isString().trim(),
  query('category').optional().isIn([
    'vegetables', 'fruits', 'grains', 'protein', 'dairy', 
    'fats-oils', 'beverages', 'snacks', 'condiments', 'supplements', 'other'
  ]),
  query('verified').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { search, category, verified, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      query.category = category;
    }
    
    if (verified !== undefined) {
      query.verified = verified === 'true';
    }

    // Include custom foods created by user
    query.$or = [
      { ...query, isCustom: false },
      { ...query, isCustom: true, createdBy: req.user._id }
    ];

    const foods = await Food.find(query)
      .populate('createdBy', 'username name.firstName name.lastName')
      .sort({ verified: -1, name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Food.countDocuments(query);

    res.json({
      foods,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch foods', details: error.message });
  }
});

// Get food by ID
router.get('/foods/:id', [
  param('id').isMongoId(),
  handleValidationErrors
], async (req, res) => {
  try {
    const food = await Food.findById(req.params.id)
      .populate('createdBy', 'username name.firstName name.lastName');

    if (!food) {
      return res.status(404).json({ error: 'Food not found' });
    }

    // Check if user can access this food (public or own custom food)
    if (food.isCustom && food.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(food);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch food', details: error.message });
  }
});

// Create custom food
router.post('/foods', [
  body('name').isString().trim().isLength({ min: 1, max: 100 }),
  body('brand').optional().isString().trim().isLength({ max: 50 }),
  body('barcode').optional().matches(/^\d{8,14}$/),
  body('nutritionPer100g.calories').isNumeric().isFloat({ min: 0 }),
  body('nutritionPer100g.protein').isNumeric().isFloat({ min: 0 }),
  body('nutritionPer100g.carbohydrates').isNumeric().isFloat({ min: 0 }),
  body('nutritionPer100g.fat').isNumeric().isFloat({ min: 0 }),
  body('nutritionPer100g.fiber').optional().isNumeric().isFloat({ min: 0 }),
  body('nutritionPer100g.sugar').optional().isNumeric().isFloat({ min: 0 }),
  body('nutritionPer100g.sodium').optional().isNumeric().isFloat({ min: 0 }),
  body('category').isIn([
    'vegetables', 'fruits', 'grains', 'protein', 'dairy', 
    'fats-oils', 'beverages', 'snacks', 'condiments', 'supplements', 'other'
  ]),
  body('servingSizes').optional().isArray(),
  handleValidationErrors
], logActivity('food-created', 'Created custom food'), async (req, res) => {
  try {
    const foodData = {
      ...req.body,
      isCustom: true,
      createdBy: req.user._id,
      verified: false
    };

    const food = new Food(foodData);
    await food.save();

    await food.populate('createdBy', 'username name.firstName name.lastName');

    res.status(201).json(food);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Food with this barcode already exists' });
    }
    res.status(500).json({ error: 'Failed to create food', details: error.message });
  }
});

// ======================
// NUTRITION ENTRY ROUTES
// ======================

// Get nutrition entries for user
router.get('/entries', [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 30 } = req.query;
    const skip = (page - 1) * limit;

    // Build date filter
    const dateFilter = { user: req.user._id };
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    }

    const entries = await NutritionEntry.find(dateFilter)
      .populate('meals.foods.food', 'name brand nutritionPer100g')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await NutritionEntry.countDocuments(dateFilter);

    res.json({
      entries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch nutrition entries', details: error.message });
  }
});

// Get nutrition entry by date
router.get('/entries/:date', [
  param('date').isISO8601(),
  handleValidationErrors
], async (req, res) => {
  try {
    const date = new Date(req.params.date);
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);

    const entry = await NutritionEntry.findOne({
      user: req.user._id,
      date: { $gte: date, $lt: nextDay }
    }).populate('meals.foods.food', 'name brand nutritionPer100g');

    if (!entry) {
      return res.status(404).json({ error: 'No nutrition entry found for this date' });
    }

    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch nutrition entry', details: error.message });
  }
});

// Create or update nutrition entry
router.post('/entries', [
  body('date').isISO8601(),
  body('meals').isArray(),
  body('meals.*.type').isIn(['breakfast', 'lunch', 'dinner', 'snack']),
  body('meals.*.foods').isArray(),
  body('meals.*.foods.*.food').isMongoId(),
  body('meals.*.foods.*.quantity').isNumeric().isFloat({ min: 0.1 }),
  body('meals.*.foods.*.unit').isIn(['g', 'ml', 'oz', 'cup', 'piece']),
  body('waterIntake.amount').optional().isNumeric().isFloat({ min: 0 }),
  body('waterIntake.unit').optional().isIn(['ml', 'oz', 'cups']),
  handleValidationErrors
], logActivity('nutrition-logged', 'Logged nutrition entry'), async (req, res) => {
  try {
    const { date, meals, waterIntake } = req.body;
    const entryDate = new Date(date);

    // Calculate nutrition for each meal and food item
    const processedMeals = [];
    let dailyTotals = { calories: 0, protein: 0, carbohydrates: 0, fat: 0 };

    for (const meal of meals) {
      const processedFoods = [];
      let mealCalories = 0;

      for (const foodItem of meal.foods) {
        const food = await Food.findById(foodItem.food);
        if (!food) {
          return res.status(400).json({ error: `Food with ID ${foodItem.food} not found` });
        }

        // Calculate nutrition based on quantity
        const multiplier = foodItem.quantity / 100; // nutrition is per 100g
        const nutrition = {
          calories: food.nutritionPer100g.calories * multiplier,
          protein: food.nutritionPer100g.protein * multiplier,
          carbohydrates: food.nutritionPer100g.carbohydrates * multiplier,
          fat: food.nutritionPer100g.fat * multiplier
        };

        processedFoods.push({
          food: foodItem.food,
          quantity: foodItem.quantity,
          unit: foodItem.unit,
          ...nutrition
        });

        mealCalories += nutrition.calories;
        dailyTotals.calories += nutrition.calories;
        dailyTotals.protein += nutrition.protein;
        dailyTotals.carbohydrates += nutrition.carbohydrates;
        dailyTotals.fat += nutrition.fat;
      }

      processedMeals.push({
        type: meal.type,
        foods: processedFoods,
        totalCalories: mealCalories,
        notes: meal.notes
      });
    }

    // Find or create nutrition entry for the date
    const existingEntry = await NutritionEntry.findOne({
      user: req.user._id,
      date: {
        $gte: entryDate,
        $lt: new Date(entryDate.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    let entry;
    if (existingEntry) {
      existingEntry.meals = processedMeals;
      existingEntry.dailyTotals = dailyTotals;
      if (waterIntake) existingEntry.waterIntake = waterIntake;
      entry = await existingEntry.save();
    } else {
      entry = new NutritionEntry({
        user: req.user._id,
        date: entryDate,
        meals: processedMeals,
        dailyTotals,
        waterIntake: waterIntake || { amount: 0, unit: 'ml' }
      });
      await entry.save();
    }

    await entry.populate('meals.foods.food', 'name brand nutritionPer100g');
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create nutrition entry', details: error.message });
  }
});

// ======================
// MEAL PLAN ROUTES
// ======================

// Get meal plans for user
router.get('/meal-plans', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('public').optional().isBoolean(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { page = 1, limit = 20, public: isPublic } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (isPublic === 'true') {
      query.isPublic = true;
    } else {
      query.user = req.user._id;
    }

    const mealPlans = await MealPlan.find(query)
      .populate('user', 'username name.firstName name.lastName')
      .populate('days.meals.foods.food', 'name nutritionPer100g')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MealPlan.countDocuments(query);

    res.json({
      mealPlans,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch meal plans', details: error.message });
  }
});

// Get meal plan by ID
router.get('/meal-plans/:id', [
  param('id').isMongoId(),
  handleValidationErrors
], async (req, res) => {
  try {
    const mealPlan = await MealPlan.findById(req.params.id)
      .populate('user', 'username name.firstName name.lastName')
      .populate('days.meals.foods.food', 'name nutritionPer100g');

    if (!mealPlan) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    // Check if user can access this meal plan
    if (!mealPlan.isPublic && mealPlan.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(mealPlan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch meal plan', details: error.message });
  }
});

// Create meal plan
router.post('/meal-plans', [
  body('name').isString().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().isString().isLength({ max: 500 }),
  body('duration').isInt({ min: 1, max: 365 }),
  body('targetCalories').optional().isInt({ min: 800, max: 5000 }),
  body('targetMacros.protein').optional().isNumeric().isFloat({ min: 0, max: 100 }),
  body('targetMacros.carbohydrates').optional().isNumeric().isFloat({ min: 0, max: 100 }),
  body('targetMacros.fat').optional().isNumeric().isFloat({ min: 0, max: 100 }),
  body('days').isArray(),
  body('difficulty').optional().isIn(['easy', 'moderate', 'challenging']),
  body('tags').optional().isArray(),
  body('isPublic').optional().isBoolean(),
  handleValidationErrors
], logActivity('meal-plan-created', 'Created meal plan'), async (req, res) => {
  try {
    const mealPlan = new MealPlan({
      ...req.body,
      user: req.user._id
    });

    await mealPlan.save();
    await mealPlan.populate('user', 'username name.firstName name.lastName');
    await mealPlan.populate('days.meals.foods.food', 'name nutritionPer100g');

    res.status(201).json(mealPlan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create meal plan', details: error.message });
  }
});

// Update meal plan
router.put('/meal-plans/:id', [
  param('id').isMongoId(),
  body('name').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().isString().isLength({ max: 500 }),
  body('duration').optional().isInt({ min: 1, max: 365 }),
  body('targetCalories').optional().isInt({ min: 800, max: 5000 }),
  body('difficulty').optional().isIn(['easy', 'moderate', 'challenging']),
  body('isPublic').optional().isBoolean(),
  handleValidationErrors
], logActivity('meal-plan-updated', 'Updated meal plan'), async (req, res) => {
  try {
    const mealPlan = await MealPlan.findById(req.params.id);

    if (!mealPlan) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    if (mealPlan.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    Object.assign(mealPlan, req.body);
    await mealPlan.save();

    await mealPlan.populate('user', 'username name.firstName name.lastName');
    await mealPlan.populate('days.meals.foods.food', 'name nutritionPer100g');

    res.json(mealPlan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update meal plan', details: error.message });
  }
});

// Delete meal plan
router.delete('/meal-plans/:id', [
  param('id').isMongoId(),
  handleValidationErrors
], logActivity('meal-plan-deleted', 'Deleted meal plan'), async (req, res) => {
  try {
    const mealPlan = await MealPlan.findById(req.params.id);

    if (!mealPlan) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    if (mealPlan.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await MealPlan.findByIdAndDelete(req.params.id);
    res.json({ message: 'Meal plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete meal plan', details: error.message });
  }
});

// ======================
// NUTRITION ANALYTICS
// ======================

// Get nutrition analytics
router.get('/analytics', [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('period').optional().isIn(['week', 'month', 'year']),
  handleValidationErrors
], async (req, res) => {
  try {
    const { startDate, endDate, period = 'month' } = req.query;
    
    // Calculate date range
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      end = new Date();
      start = new Date();
      
      switch (period) {
        case 'week':
          start.setDate(end.getDate() - 7);
          break;
        case 'month':
          start.setMonth(end.getMonth() - 1);
          break;
        case 'year':
          start.setFullYear(end.getFullYear() - 1);
          break;
      }
    }

    const entries = await NutritionEntry.find({
      user: req.user._id,
      date: { $gte: start, $lte: end }
    }).sort({ date: 1 });

    // Calculate analytics
    const analytics = {
      period: { start, end },
      summary: {
        totalDays: entries.length,
        averageCalories: 0,
        averageProtein: 0,
        averageCarbs: 0,
        averageFat: 0,
        totalWaterIntake: 0
      },
      trends: [],
      topFoods: [],
      mealDistribution: {
        breakfast: 0,
        lunch: 0,
        dinner: 0,
        snack: 0
      }
    };

    if (entries.length > 0) {
      let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0, totalWater = 0;
      const foodFrequency = {};

      entries.forEach(entry => {
        // Daily totals
        totalCalories += entry.dailyTotals.calories || 0;
        totalProtein += entry.dailyTotals.protein || 0;
        totalCarbs += entry.dailyTotals.carbohydrates || 0;
        totalFat += entry.dailyTotals.fat || 0;
        totalWater += entry.waterIntake.amount || 0;

        // Trends data
        analytics.trends.push({
          date: entry.date,
          calories: entry.dailyTotals.calories || 0,
          protein: entry.dailyTotals.protein || 0,
          carbohydrates: entry.dailyTotals.carbohydrates || 0,
          fat: entry.dailyTotals.fat || 0
        });

        // Meal distribution and food frequency
        entry.meals.forEach(meal => {
          analytics.mealDistribution[meal.type]++;
          
          meal.foods.forEach(foodItem => {
            const foodId = foodItem.food.toString();
            foodFrequency[foodId] = (foodFrequency[foodId] || 0) + 1;
          });
        });
      });

      analytics.summary.averageCalories = Math.round(totalCalories / entries.length);
      analytics.summary.averageProtein = Math.round(totalProtein / entries.length);
      analytics.summary.averageCarbs = Math.round(totalCarbs / entries.length);
      analytics.summary.averageFat = Math.round(totalFat / entries.length);
      analytics.summary.totalWaterIntake = totalWater;

      // Get top foods
      const topFoodIds = Object.entries(foodFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([foodId]) => foodId);

      if (topFoodIds.length > 0) {
        const topFoods = await Food.find({ _id: { $in: topFoodIds } })
          .select('name brand category');
        
        analytics.topFoods = topFoods.map(food => ({
          food,
          frequency: foodFrequency[food._id.toString()]
        }));
      }
    }

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch nutrition analytics', details: error.message });
  }
});

export default router;
