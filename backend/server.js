const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cloudinary = require('cloudinary').v2;
const { initCronJobs } = require('./jobs/cronJobs');

dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const adminRoutes = require('./routes/adminRoutes');
const aiRoutes = require('./routes/aiRoutes');
const academicRulesRoutes = require('./routes/academicRulesRoutes');
const studentLifecycleRoutes = require('./routes/studentLifecycleRoutes');
const promotionRoutes = require('./routes/promotionRoutes');
const creditRoutes = require('./routes/creditRoutes');
const graduationRoutes = require('./routes/graduationRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const batchManagementRoutes = require('./routes/batchManagementRoutes');
const reportingRoutes = require('./routes/reportingRoutes');
const bulkDataRoutes = require('./routes/bulkDataRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const auditRoutes = require('./routes/auditRoutes');
const student360Routes = require('./routes/student360Routes');

const app = express();

// Middleware
app.use(cors());
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
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/academic-rules', academicRulesRoutes);
app.use('/api/student-lifecycle', studentLifecycleRoutes);
app.use('/api/academic-promotion', promotionRoutes);
app.use('/api/credits', creditRoutes);
app.use('/api/graduation', graduationRoutes);
app.use('/api/registration', registrationRoutes);
app.use('/api/academic-batches', batchManagementRoutes);
app.use('/api/reports', reportingRoutes);
app.use('/api/bulk-data', bulkDataRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-trail', auditRoutes);
app.use('/api/student-360', student360Routes);

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