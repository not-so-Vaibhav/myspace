const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cloudinary = require('cloudinary').v2;
const { initCronJobs } = require('./jobs/cronJobs');

dotenv.config();

// Import routes
// All route modules are lazy-loaded in app.use() below for instant server startup

const app = express();

// Middleware
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://myspace-dbq.pages.dev',        // deployed Cloudflare Pages frontend
    process.env.FRONTEND_URL,               // override via env var if needed
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Using Supabase PostgreSQL database
console.log("⚡ Enterprise University ERP connected to Supabase / PostgreSQL database");

// Routes
app.use('/api/auth', (req, res, next) => require('./routes/authRoutes')(req, res, next));
app.use('/api/student', (req, res, next) => require('./routes/studentRoutes')(req, res, next));
app.use('/api/teacher', (req, res, next) => require('./routes/teacherRoutes')(req, res, next));
app.use('/api/admin', (req, res, next) => require('./routes/adminRoutes')(req, res, next));
app.use('/api/ai', (req, res, next) => require('./routes/aiRoutes')(req, res, next));
app.use('/api/academic-rules', (req, res, next) => require('./routes/academicRulesRoutes')(req, res, next));
app.use('/api/student-lifecycle', (req, res, next) => require('./routes/studentLifecycleRoutes')(req, res, next));
app.use('/api/academic-promotion', (req, res, next) => require('./routes/promotionRoutes')(req, res, next));
app.use('/api/credits', (req, res, next) => require('./routes/creditRoutes')(req, res, next));
app.use('/api/graduation', (req, res, next) => require('./routes/graduationRoutes')(req, res, next));
app.use('/api/registration', (req, res, next) => require('./routes/registrationRoutes')(req, res, next));
app.use('/api/academic-batches', (req, res, next) => require('./routes/batchManagementRoutes')(req, res, next));
app.use('/api/reports', (req, res, next) => require('./routes/reportingRoutes')(req, res, next));
app.use('/api/bulk-data', (req, res, next) => require('./routes/bulkDataRoutes')(req, res, next));
app.use('/api/notifications', (req, res, next) => require('./routes/notificationRoutes')(req, res, next));
app.use('/api/audit-trail', (req, res, next) => require('./routes/auditRoutes')(req, res, next));
app.use('/api/student-360', (req, res, next) => require('./routes/student360Routes')(req, res, next));

// Health check
app.get('/', (req, res) => {
    res.json({ message: 'MIT-Learn API Server Running' });
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 fallback for unknown routes
app.use((req, res) => {
    res.status(404).json({ status: 'error', message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler — respects status codes set by service layers
app.use((err, req, res, next) => {
    const statusCode = err.status || err.statusCode || 500;
    const isDev = process.env.NODE_ENV !== 'production';

    console.error(`[${new Date().toISOString()}] ${statusCode} ${req.method} ${req.originalUrl} — ${err.message}`);
    if (isDev) console.error(err.stack);

    res.status(statusCode).json({
        status: 'error',
        message: err.message || 'Internal Server Error',
        ...(isDev && { stack: err.stack }),
    });
});


const PORT = process.env.PORT || 5001;

if (require.main === module) {
    const server = app.listen(PORT, () => {
        console.log(`✅ Server running on port ${PORT}`);
        console.log(`✅ Cloudinary configured`);

        // Initialize background jobs
        initCronJobs();
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`⚠️ Port ${PORT} is already in use. Server is already running!`);
            process.exit(0);
        } else {
            console.error('Server error:', err);
            process.exit(1);
        }
    });
}

module.exports = app;