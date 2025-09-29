import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { config } from './environment.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Photography Studio Management System API',
      version: '1.0.0',
      description: `
# Photography Studio Management System API

A comprehensive backend API for managing photography studio operations including appointments, albums, photos, and user management.

## Features
- **Appointment Management** - Book and manage photography sessions
- **Album & Photo Management** - Organize and share photo galleries
- **User Management** - Admin and photographer role-based access
- **Service Management** - Manage photography services and pricing
- **Audit Logging** - Track all system activities(still under development)
- **File Upload** - Cloudinary integration for photo storage

## Authentication
This API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:
\`Authorization: Bearer <your-token>\`

## Rate Limiting
API is rate limited to 100 requests per 15 minutes per IP address.

## Error Handling
All errors follow a consistent format:
\`\`\`json
{
  "success": false,
  "message": "Error description",
  "errors": [] // Optional detailed errors
}
\`\`\`

## Response Format
All successful responses follow this format:
\`\`\`json
{
  "success": true,
  "message": "Success message",
  "data": {} // Response data
}
\`\`\`
      `,
      contact: {
        name: 'API Support',
        email: 'support@studiocom'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.port}/api`,
        description: 'Development server'
      },
      {
        url: 'https://api.yourstudio.com/api',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        // Common Schemas
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error description'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    example: 'email'
                  },
                  message: {
                    type: 'string',
                    example: 'Email is required'
                  }
                }
              }
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Operation successful'
            },
            data: {
              type: 'object',
              description: 'Response data'
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              example: 1
            },
            limit: {
              type: 'integer',
              example: 10
            },
            total: {
              type: 'integer',
              example: 100
            },
            totalPages: {
              type: 'integer',
              example: 10
            },
            hasNext: {
              type: 'boolean',
              example: true
            },
            hasPrev: {
              type: 'boolean',
              example: false
            },
            nextPage: {
              type: 'integer',
              example: 2
            },
            prevPage: {
              type: 'integer',
              example: null
            }
          }
        },

        // User Schemas
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            username: {
              type: 'string',
              example: 'john_doe'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com'
            },
            fullName: {
              type: 'string',
              example: 'John Doe'
            },
            role: {
              type: 'string',
              enum: ['ADMIN', 'PHOTOGRAPHER'],
              example: 'ADMIN'
            },
            isActive: {
              type: 'boolean',
              example: true
            },
            lastLogin: {
              type: 'string',
              format: 'date-time'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        UserCreate: {
          type: 'object',
          required: ['username', 'email', 'password', 'fullName', 'role'],
          properties: {
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 30,
              example: 'john_doe'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com'
            },
            password: {
              type: 'string',
              minLength: 6,
              example: 'password123'
            },
            fullName: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              example: 'John Doe'
            },
            role: {
              type: 'string',
              enum: ['ADMIN', 'PHOTOGRAPHER'],
              example: 'ADMIN'
            }
          }
        },

        // Authentication Schemas
        Login: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'admin@studio.com'
            },
            password: {
              type: 'string',
              example: 'password123'
            }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            user: {
              $ref: '#/components/schemas/User'
            },
            token: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            }
          }
        },

        // Service Schemas
        Service: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            name: {
              type: 'string',
              example: 'Portrait Session'
            },
            description: {
              type: 'string',
              example: 'Professional portrait photography session'
            },
            durationMinutes: {
              type: 'integer',
              example: 60
            },
            price: {
              type: 'number',
              format: 'float',
              example: 199.99
            },
            isActive: {
              type: 'boolean',
              example: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },

        // Appointment Schemas
        Appointment: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            serviceId: {
              type: 'integer',
              example: 1
            },
            appointmentDate: {
              type: 'string',
              format: 'date'
            },
            appointmentTime: {
              type: 'string',
              pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
              example: '14:30'
            },
            customerName: {
              type: 'string',
              example: 'John Doe'
            },
            customerEmail: {
              type: 'string',
              format: 'email',
              example: 'john@example.com'
            },
            customerPhone: {
              type: 'string',
              example: '+1234567890'
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
              example: 'PENDING'
            },
            specialRequests: {
              type: 'string',
              example: 'Outdoor photoshoot preferred'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },

        // Album Schemas
        Album: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            title: {
              type: 'string',
              example: 'Summer Wedding'
            },
            description: {
              type: 'string',
              example: 'Beautiful outdoor wedding photos'
            },
            shootDate: {
              type: 'string',
              format: 'date'
            },
            coverPhotoUrl: {
              type: 'string',
              format: 'uri',
              example: 'https://cloudinary.com/cover.jpg'
            },
            isPublished: {
              type: 'boolean',
              example: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            createdBy: {
              $ref: '#/components/schemas/User'
            }
          }
        },

        // Photo Schemas
        Photo: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            photoUrl: {
              type: 'string',
              format: 'uri',
              example: 'https://cloudinary.com/photo.jpg'
            },
            filename: {
              type: 'string',
              example: 'portrait.jpg'
            },
            fileSize: {
              type: 'integer',
              example: 2048576
            },
            sortOrder: {
              type: 'integer',
              example: 1
            },
            uploadedAt: {
              type: 'string',
              format: 'date-time'
            },
            uploadedBy: {
              $ref: '#/components/schemas/User'
            }
          }
        },

        // Audit Log Schemas
        AuditLog: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            userId: {
              type: 'integer',
              example: 1
            },
            action: {
              type: 'string',
              example: 'CREATE'
            },
            tableName: {
              type: 'string',
              example: 'users'
            },
            recordId: {
              type: 'integer',
              example: 1
            },
            oldValues: {
              type: 'object',
              description: 'Previous values before change'
            },
            newValues: {
              type: 'object',
              description: 'New values after change'
            },
            ipAddress: {
              type: 'string',
              example: '192.168.1.1'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            user: {
              $ref: '#/components/schemas/User'
            }
          }
        }
      },
      parameters: {
        // Common parameters
        pageParam: {
          in: 'query',
          name: 'page',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1
          },
          description: 'Page number for pagination'
        },
        limitParam: {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 10
          },
          description: 'Number of items per page'
        },
        searchParam: {
          in: 'query',
          name: 'search',
          schema: {
            type: 'string',
            maxLength: 100
          },
          description: 'Search term'
        },
        sortByParam: {
          in: 'query',
          name: 'sortBy',
          schema: {
            type: 'string'
          },
          description: 'Field to sort by'
        },
        sortOrderParam: {
          in: 'query',
          name: 'sortOrder',
          schema: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'desc'
          },
          description: 'Sort order'
        }
      },
      responses: {
        // Common responses
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Access denied. No token provided.'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Access denied. Insufficient permissions.'
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Validation failed',
                errors: [
                  {
                    field: 'email',
                    message: 'Email is required'
                  }
                ]
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Resource not found'
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    join(__dirname, '../routes/*.js'),
    join(__dirname, '../controllers/*.js')
  ],
};

const specs = swaggerJsdoc(options);

export { specs, swaggerUi };