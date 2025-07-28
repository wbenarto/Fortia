import { neon } from '@neondatabase/serverless';

// Mock the neon database
jest.mock('@neondatabase/serverless', () => ({
	neon: jest.fn(() => jest.fn()),
}));

// Mock the environment variable
process.env.DATABASE_URL = 'test-database-url';

describe('Delete Account API', () => {
	let mockSql: jest.Mock;

	beforeEach(() => {
		mockSql = jest.fn();
		(neon as jest.Mock).mockReturnValue(mockSql);
	});

	it('should delete all user data from database', async () => {
		// Mock successful database operations
		mockSql.mockResolvedValue([]);

		// Import the DELETE function
		const deleteAccountModule = require('../app/(api)/delete-account+api');
		const DELETE = deleteAccountModule.DELETE;

		const request = new Request('http://localhost:3000/(api)/delete-account?clerkId=test-user-123');
		const response = await DELETE(request);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.message).toBe('Account and all associated data deleted successfully');

		// Verify all tables were targeted for deletion
		expect(mockSql).toHaveBeenCalledTimes(8); // 8 different DELETE operations
	});

	it('should return error when clerkId is missing', async () => {
		const deleteAccountModule = require('../app/(api)/delete-account+api');
		const DELETE = deleteAccountModule.DELETE;

		const request = new Request('http://localhost:3000/(api)/delete-account');
		const response = await DELETE(request);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toBe('Clerk ID is required');
	});

	it('should handle database errors gracefully', async () => {
		// Mock database error
		mockSql.mockRejectedValue(new Error('Database connection failed'));

		const deleteAccountModule = require('../app/(api)/delete-account+api');
		const DELETE = deleteAccountModule.DELETE;

		const request = new Request('http://localhost:3000/(api)/delete-account?clerkId=test-user-123');
		const response = await DELETE(request);
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data.error).toBe('Failed to delete account');
		expect(data.details).toBe('Database connection failed');
	});

	it('should delete user record and return deleted user ID', async () => {
		// Mock successful deletions for all tables
		mockSql.mockResolvedValueOnce([]); // api_logs
		mockSql.mockResolvedValueOnce([]); // deep_focus_sessions
		mockSql.mockResolvedValueOnce([]); // activities
		mockSql.mockResolvedValueOnce([]); // steps
		mockSql.mockResolvedValueOnce([]); // weights
		mockSql.mockResolvedValueOnce([]); // meals
		mockSql.mockResolvedValueOnce([]); // data_consent
		mockSql.mockResolvedValueOnce([]); // privacy_consent
		mockSql.mockResolvedValueOnce([{ id: 123 }]); // users

		const deleteAccountModule = require('../app/(api)/delete-account+api');
		const DELETE = deleteAccountModule.DELETE;

		const request = new Request('http://localhost:3000/(api)/delete-account?clerkId=test-user-123');
		const response = await DELETE(request);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.deletedUser).toBe(123);
	});

	it('should handle case where user record does not exist', async () => {
		// Mock successful deletions for all tables
		mockSql.mockResolvedValueOnce([]); // api_logs
		mockSql.mockResolvedValueOnce([]); // deep_focus_sessions
		mockSql.mockResolvedValueOnce([]); // activities
		mockSql.mockResolvedValueOnce([]); // steps
		mockSql.mockResolvedValueOnce([]); // weights
		mockSql.mockResolvedValueOnce([]); // meals
		mockSql.mockResolvedValueOnce([]); // data_consent
		mockSql.mockResolvedValueOnce([]); // privacy_consent
		mockSql.mockResolvedValueOnce([]); // users (no user found)

		const deleteAccountModule = require('../app/(api)/delete-account+api');
		const DELETE = deleteAccountModule.DELETE;

		const request = new Request('http://localhost:3000/(api)/delete-account?clerkId=test-user-123');
		const response = await DELETE(request);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.deletedUser).toBe(null);
	});
});
