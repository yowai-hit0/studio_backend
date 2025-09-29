import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config/environment.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { specs, swaggerUi } from './config/swagger.js';

// Import routes
import authroutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import servicesRoutes from './routes/services.js'
import appointmentRoutes from './routes/appointments.js';
import albumRoutes from './routes/albums.js';
import photoRoutes from './routes/photos.js';
// import auditLogRoutes from './routes/audit-logs.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (config.nodeEnv === 'development') {
  app.use(morgan('tiny'));
} else {
  app.use(morgan('combined'));
}

// Swagger Docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Photography Studio API Documentation',
}));

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/auth', authroutes);
app.use('/api/users', usersRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/photos', photoRoutes);
// app.use('/api/audit-logs', auditLogRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
  console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
});
