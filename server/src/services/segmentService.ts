import database from "../loaders/database";
import { ObjectId } from "mongodb";

// Process segment rules to get matching customers
export async function processSegmentRules(rules) {
  const db = await database();

  // Convert segment rules to MongoDB query
  const query = buildMongoQuery(rules);
  console.log('Generated MongoDB query:', JSON.stringify(query, null, 2));
  
  // Get matching customers
  const customers = await db.collection('customers').find(query).toArray();
  
  return customers;
}

// Function to build MongoDB query from segment rules
function buildMongoQuery(rules) {
  // Handle empty rules
  if (!rules || Object.keys(rules).length === 0) {
    return {};
  }
  
  // Handle top-level operator (AND/OR)
  if (rules.operator) {
    const mongoOperator = rules.operator === 'AND' ? '$and' : '$or';
    return {
      [mongoOperator]: rules.conditions.map(condition => buildMongoQuery(condition))
    };
  }
  
  // Handle leaf condition
  if (rules.field && rules.condition && rules.value !== undefined) {
    return processLeafCondition(rules.field, rules.condition, rules.value);
  }
  
  // If structure doesn't match expected format, return empty query
  return {};
}

// Process individual condition
function processLeafCondition(field, condition, value) {
  switch (field) {
    case 'totalSpend':
      return processNumericCondition('totalSpend', condition, parseFloat(value));
      
    case 'lastPurchaseDate':
      return processDateCondition('lastPurchaseDate', condition, value);
      
    case 'visits':
      return processNumericCondition('visits', condition, parseInt(value));
      
    case 'inactive':
      // Special case for inactivity (days since last purchase)
      if (condition === 'for') {
        const daysAgo = parseInt(value);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
        
        return {
          $or: [
            { lastPurchaseDate: { $lt: cutoffDate } },
            { lastPurchaseDate: { $exists: false } }
          ]
        };
      }
      break;
      
    case 'tags':
      if (condition === 'contains') {
        return { tags: { $in: [value] } };
      } else if (condition === 'not_contains') {
        return { tags: { $nin: [value] } };
      }
      break;
  }
  
  // Default fallback for unsupported conditions
  return {};
}

// Process numeric conditions
function processNumericCondition(field, condition, value) {
  switch (condition) {
    case '>':
      return { [field]: { $gt: value } };
    case '>=':
      return { [field]: { $gte: value } };
    case '<':
      return { [field]: { $lt: value } };
    case '<=':
      return { [field]: { $lte: value } };
    case '=':
      return { [field]: value };
    case '!=':
      return { [field]: { $ne: value } };
    default:
      return {};
  }
}

// Process date conditions
function processDateCondition(field, condition, value) {
  let date;
  
  // Handle relative dates like "30 days ago"
  if (typeof value === 'string' && value.includes('days ago')) {
    const daysAgo = parseInt(value.split(' ')[0]);
    date = new Date();
    date.setDate(date.getDate() - daysAgo);
  } else {
    // Handle absolute date
    date = new Date(value);
  }
  
  switch (condition) {
    case 'before':
      return { [field]: { $lt: date } };
    case 'after':
      return { [field]: { $gt: date } };
    case 'on': {
      // For "on" we need to match the entire day
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);
      return {
        [field]: { $gte: date, $lt: nextDay }
      };
    }
    default:
      return {};
  }
}

module.exports = { processSegmentRules };