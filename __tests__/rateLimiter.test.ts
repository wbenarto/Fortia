import RateLimiter from '../lib/rateLimiter';

describe('RateLimiter', () => {
	let rateLimiter: RateLimiter;

	beforeEach(() => {
		rateLimiter = new RateLimiter(20, 24 * 60 * 60 * 1000); // 20 requests per day
	});

	test('should allow requests within limit', () => {
		const userId = 'test-user-1';

		// Should allow first 20 requests
		for (let i = 0; i < 20; i++) {
			expect(rateLimiter.canMakeRequest(userId)).toBe(true);
			rateLimiter.recordRequest(userId);
		}

		// 21st request should be blocked
		expect(rateLimiter.canMakeRequest(userId)).toBe(false);
	});

	test('should reset daily limit', () => {
		const userId = 'test-user-2';

		// Use up all requests
		for (let i = 0; i < 20; i++) {
			rateLimiter.recordRequest(userId);
		}

		expect(rateLimiter.canMakeRequest(userId)).toBe(false);

		// Mock a new day by directly manipulating the date
		const usage = rateLimiter['userUsage'].get(userId);
		if (usage) {
			usage.date = '2023-01-01'; // Old date
		}

		// Should allow requests again on new day
		expect(rateLimiter.canMakeRequest(userId)).toBe(true);
	});

	test('should track usage correctly', () => {
		const userId = 'test-user-3';

		expect(rateLimiter.getRemainingRequests(userId)).toBe(20);

		rateLimiter.recordRequest(userId);
		expect(rateLimiter.getRemainingRequests(userId)).toBe(19);

		rateLimiter.recordRequest(userId);
		expect(rateLimiter.getRemainingRequests(userId)).toBe(18);
	});

	test('should provide usage info', () => {
		const userId = 'test-user-4';

		const initialInfo = rateLimiter.getUsageInfo(userId);
		expect(initialInfo.count).toBe(0);
		expect(initialInfo.remaining).toBe(20);

		rateLimiter.recordRequest(userId);
		rateLimiter.recordRequest(userId);

		const updatedInfo = rateLimiter.getUsageInfo(userId);
		expect(updatedInfo.count).toBe(2);
		expect(updatedInfo.remaining).toBe(18);
	});

	test('should handle multiple users independently', () => {
		const user1 = 'user-1';
		const user2 = 'user-2';

		// User 1 uses 10 requests
		for (let i = 0; i < 10; i++) {
			rateLimiter.recordRequest(user1);
		}

		// User 2 uses 15 requests
		for (let i = 0; i < 15; i++) {
			rateLimiter.recordRequest(user2);
		}

		expect(rateLimiter.getRemainingRequests(user1)).toBe(10);
		expect(rateLimiter.getRemainingRequests(user2)).toBe(5);

		// User 1 should still be able to make requests
		expect(rateLimiter.canMakeRequest(user1)).toBe(true);

		// User 2 should still be able to make requests
		expect(rateLimiter.canMakeRequest(user2)).toBe(true);
	});
});
