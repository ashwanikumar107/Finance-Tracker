const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Pennywise – Personal Finance Manager API',
    version: '1.0.0',
    description:
      'Robust RESTful API for Pennywise Personal Finance Manager. Features role-based access control (Admin, User, Read-Only), transaction logging, budgeting, financial analytics, insights, and user audit trails.',
    contact: {
      name: 'Pennywise Engineering Team',
      email: 'support@pennywise.com',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'Current Environment API Base URL',
    },
    {
      url: 'https://finance-tracker-cynn.onrender.com/api',
      description: 'Production Server (Render)',
    },
    {
      url: 'http://localhost:5000/api',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token (Bearer <token>)',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Error message description' },
          errors: {
            type: 'array',
            items: { type: 'object' },
            example: [],
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Priya Sharma' },
          email: { type: 'string', example: 'priya@pennywise.com' },
          role: {
            type: 'string',
            enum: ['admin', 'user', 'read-only'],
            example: 'user',
          },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Transaction: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 101 },
          user_id: { type: 'integer', example: 1 },
          category_id: { type: 'integer', example: 3 },
          category_name: { type: 'string', example: 'Groceries' },
          category_color: { type: 'string', example: '#10B981' },
          title: { type: 'string', example: 'Weekly Supermarket Grocery' },
          amount: { type: 'number', example: 2450.5 },
          type: { type: 'string', enum: ['income', 'expense'], example: 'expense' },
          transaction_date: { type: 'string', format: 'date', example: '2026-11-20' },
          payment_method: { type: 'string', example: 'UPI' },
          description: { type: 'string', example: 'Organic vegetables and staples' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 3 },
          user_id: { type: 'integer', nullable: true, example: 1 },
          name: { type: 'string', example: 'Groceries' },
          type: { type: 'string', enum: ['income', 'expense'], example: 'expense' },
          color: { type: 'string', example: '#10B981' },
          is_default: { type: 'boolean', example: false },
        },
      },
      Budget: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 12 },
          user_id: { type: 'integer', example: 1 },
          category_id: { type: 'integer', example: 3 },
          category_name: { type: 'string', example: 'Groceries' },
          monthly_limit: { type: 'number', example: 15000 },
          spent: { type: 'number', example: 11450 },
          month: { type: 'integer', example: 11 },
          year: { type: 'integer', example: 2026 },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'System health check',
        tags: ['Health'],
        responses: {
          200: {
            description: 'API is alive and operational',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'healthy' },
                    timestamp: { type: 'string', format: 'date-time' },
                    service: { type: 'string', example: 'Pennywise API' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        summary: 'Register a new user',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Priya Sharma' },
                  email: { type: 'string', example: 'priya@pennywise.com' },
                  password: { type: 'string', example: 'Password123!' },
                  role: { type: 'string', enum: ['admin', 'user', 'read-only'], default: 'user' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'User registered successfully with tokens',
          },
          400: {
            description: 'Validation error or email already in use',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'User login with credentials',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'priya@pennywise.com' },
                  password: { type: 'string', example: 'Password123!' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful. Returns user details and JWT access/refresh tokens.',
          },
          401: {
            description: 'Invalid credentials',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get current authenticated user session',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Current session user details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        summary: 'Refresh expired access token',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'New access token granted' },
          401: { description: 'Invalid or revoked refresh token' },
        },
      },
    },
    '/auth/logout': {
      post: {
        summary: 'Logout user & revoke refresh token',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Logged out successfully' },
        },
      },
    },
    '/transactions': {
      get: {
        summary: 'List transactions with filtering, pagination, and sorting',
        tags: ['Transactions'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['income', 'expense'] } },
          { name: 'category_id', in: 'query', schema: { type: 'integer' } },
          { name: 'start_date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'end_date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'sort_by', in: 'query', schema: { type: 'string', default: 'transaction_date' } },
          { name: 'sort_order', in: 'query', schema: { type: 'string', enum: ['ASC', 'DESC'], default: 'DESC' } },
        ],
        responses: {
          200: { description: 'Paginated list of transactions' },
        },
      },
      post: {
        summary: 'Create a new transaction',
        tags: ['Transactions'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'amount', 'type', 'category_id', 'transaction_date'],
                properties: {
                  title: { type: 'string', example: 'Fresh Fruits & Groceries' },
                  amount: { type: 'number', example: 680.0 },
                  type: { type: 'string', enum: ['income', 'expense'], example: 'expense' },
                  category_id: { type: 'integer', example: 1 },
                  transaction_date: { type: 'string', format: 'date', example: '2026-11-21' },
                  payment_method: { type: 'string', example: 'Credit Card' },
                  description: { type: 'string', example: 'Supermarket purchase' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Transaction recorded successfully' },
          403: { description: 'Forbidden (Read-Only user role cannot record transactions)' },
        },
      },
    },
    '/transactions/{id}': {
      get: {
        summary: 'Get single transaction details',
        tags: ['Transactions'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Transaction details found' },
          404: { description: 'Transaction not found' },
        },
      },
      put: {
        summary: 'Update an existing transaction',
        tags: ['Transactions'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  amount: { type: 'number' },
                  type: { type: 'string', enum: ['income', 'expense'] },
                  category_id: { type: 'integer' },
                  transaction_date: { type: 'string', format: 'date' },
                  payment_method: { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Transaction updated successfully' },
          403: { description: 'Forbidden for Read-Only role' },
          404: { description: 'Transaction not found' },
        },
      },
      delete: {
        summary: 'Delete a transaction',
        tags: ['Transactions'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Transaction deleted' },
          403: { description: 'Forbidden for Read-Only role' },
        },
      },
    },
    '/analytics/overview': {
      get: {
        summary: 'Retrieve financial dashboard overview (totals, balance, MoM, health scores)',
        tags: ['Analytics'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'start_date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'end_date', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: { description: 'Calculated metrics and comparisons' },
        },
      },
    },
    '/analytics/monthly': {
      get: {
        summary: 'Get monthly income vs expense historical trends',
        tags: ['Analytics'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'months', in: 'query', schema: { type: 'integer', default: 6 } }],
        responses: {
          200: { description: 'List of monthly aggregated totals' },
        },
      },
    },
    '/analytics/categories': {
      get: {
        summary: 'Category-wise spending and income distribution',
        tags: ['Analytics'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['expense', 'income'], default: 'expense' } },
          { name: 'start_date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'end_date', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: { description: 'Breakdown by categories with totals and percentages' },
        },
      },
    },
    '/analytics/trends': {
      get: {
        summary: 'Yearly trends analysis and summary metrics',
        tags: ['Analytics'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'year', in: 'query', schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Monthly trend totals for the year' },
        },
      },
    },
    '/analytics/insights': {
      get: {
        summary: 'AI & rule-based smart financial insights and budget alerts',
        tags: ['Analytics'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Array of actionable recommendations and alerts' },
        },
      },
    },
    '/categories': {
      get: {
        summary: 'List default and user-defined categories',
        tags: ['Categories'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'List of categories' },
        },
      },
      post: {
        summary: 'Create custom category',
        tags: ['Categories'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'type'],
                properties: {
                  name: { type: 'string', example: 'Gym & Fitness' },
                  type: { type: 'string', enum: ['income', 'expense'], example: 'expense' },
                  color: { type: 'string', example: '#8B5CF6' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Category created' },
        },
      },
    },
    '/categories/{id}': {
      put: {
        summary: 'Update custom category',
        tags: ['Categories'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string', enum: ['income', 'expense'] },
                  color: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Category updated' },
        },
      },
      delete: {
        summary: 'Delete custom category',
        tags: ['Categories'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Category deleted' },
        },
      },
    },
    '/budgets': {
      get: {
        summary: 'List monthly category budgets and consumption progress',
        tags: ['Budgets'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'month', in: 'query', schema: { type: 'integer' } },
          { name: 'year', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Budgets with spending vs limit calculations' },
        },
      },
      post: {
        summary: 'Set or update budget target for a category',
        tags: ['Budgets'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['category_id', 'monthly_limit'],
                properties: {
                  category_id: { type: 'integer', example: 1 },
                  monthly_limit: { type: 'number', example: 12000 },
                  month: { type: 'integer', example: 11 },
                  year: { type: 'integer', example: 2026 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Budget saved successfully' },
        },
      },
    },
    '/budgets/{id}': {
      delete: {
        summary: 'Delete category budget',
        tags: ['Budgets'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Budget deleted' },
        },
      },
    },
    '/users': {
      get: {
        summary: 'Admin: List all users',
        tags: ['Admin Management'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Array of registered user profiles' },
          403: { description: 'Forbidden. Requires admin role.' },
        },
      },
    },
    '/users/activity-logs': {
      get: {
        summary: 'Admin: System-wide audit activity logs',
        tags: ['Admin Management'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: { description: 'Paginated user audit activity logs' },
          403: { description: 'Forbidden. Admin role required.' },
        },
      },
    },
    '/users/{id}/role': {
      put: {
        summary: 'Admin: Modify user role (admin, user, read-only)',
        tags: ['Admin Management'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['role'],
                properties: {
                  role: { type: 'string', enum: ['admin', 'user', 'read-only'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'User role updated successfully' },
          403: { description: 'Forbidden. Admin role required.' },
        },
      },
    },
    '/users/{id}': {
      delete: {
        summary: 'Admin: Delete user and their associated data',
        tags: ['Admin Management'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'User deleted' },
          403: { description: 'Forbidden. Admin role required.' },
        },
      },
    },
  },
};

const swaggerOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Pennywise API Documentation',
};

module.exports = {
  swaggerUi,
  swaggerSpec: swaggerDefinition,
  swaggerOptions,
};
