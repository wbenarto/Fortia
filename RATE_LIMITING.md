# Rate Limiting Implementation

## Overview

This project implements a simple user-based rate limiting system to control API usage and prevent abuse. The current implementation limits users to **20 meal analysis requests per day**.

## Implementation Details

### Rate Limiter Class (`lib/rateLimiter.ts`)

- **In-memory storage**: Uses a Map to track user usage
- **Daily reset**: Automatically resets limits at midnight (local time)
- **User isolation**: Each user has independent limits
- **Memory management**: Automatically cleans up old entries

### Key Features

1. **Simple API**: Easy to use with `canMakeRequest()`, `recordRequest()`, and `getUsageInfo()`
2. **Automatic cleanup**: Removes old entries to prevent memory leaks
3. **Flexible configuration**: Can be configured for different limits and time windows
4. **Thread-safe**: Uses simple in-memory operations

### Usage

```typescript
import { mealAnalysisRateLimiter } from '@/lib/rateLimiter';

// Check if user can make a request
if (mealAnalysisRateLimiter.canMakeRequest(userId)) {
	// Process the request
	mealAnalysisRateLimiter.recordRequest(userId);
} else {
	// Return rate limit error
}
```

### API Integration

The rate limiter is integrated into the meal analysis API (`app/(api)/meal-analysis+api.ts`):

1. **Request validation**: Checks if userId is provided
2. **Rate limit check**: Verifies user hasn't exceeded daily limit
3. **Usage tracking**: Records successful requests
4. **Error responses**: Returns 429 status with usage information

### Frontend Integration

The frontend components (`MacrosTracking.tsx`, `ActivityTracking.tsx`) have been updated to:

1. **Pass userId**: Include user ID in API requests
2. **Handle errors**: Display rate limit errors to users
3. **Show usage**: Display current usage information
4. **User feedback**: Clear error messages when limits are reached

### Error Handling

When rate limits are exceeded, the API returns:

```json
{
	"error": "Daily meal analysis limit reached. You can analyze 20 meals per day.",
	"rateLimitInfo": {
		"used": 20,
		"remaining": 0,
		"resetDate": "2024-01-15"
	}
}
```

### Configuration

The rate limiter can be easily configured for different use cases:

```typescript
// Create a new rate limiter with custom limits
const customLimiter = new RateLimiter(50, 24 * 60 * 60 * 1000); // 50 requests per day
const hourlyLimiter = new RateLimiter(10, 60 * 60 * 1000); // 10 requests per hour
```

### Testing

Comprehensive tests are included in `__tests__/rateLimiter.test.ts` covering:

- Basic limit enforcement
- Daily reset functionality
- Usage tracking
- Multiple user isolation
- Error scenarios

## Future Enhancements

1. **Database persistence**: Store usage data in database for server restarts
2. **Redis integration**: Use Redis for distributed rate limiting
3. **Tiered limits**: Different limits for different user types
4. **Analytics**: Track usage patterns and abuse detection
5. **Dynamic limits**: Adjust limits based on user behavior

## Monitoring

The rate limiter includes logging for monitoring:

- Successful requests include usage information
- Rate limit errors are logged with user details
- Cleanup operations are logged for debugging

## Security Considerations

- User ID validation prevents manipulation
- In-memory storage is cleared on server restart
- No sensitive data is stored in rate limit tracking
- Automatic cleanup prevents memory exhaustion
