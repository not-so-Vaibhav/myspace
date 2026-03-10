const File = require('../models/File');
const multer = require('multer');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/uploadCloudinary');

// Configure multer
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
}).single('file');

// @desc    Upload file
// @route   POST /api/teacher/upload
// @access  Private (Teacher)
exports.uploadFile = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ error: 'File upload error', message: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        try {
            const { title, description, course, type, deadline } = req.body;

            if (!title || !course || !type) {
                return res.status(400).json({ error: 'Please provide all required fields' });
            }

            // Upload to Cloudinary
            const result = await uploadToCloudinary(req.file.buffer, 'mit-learn/resources');

            // Create file record
            const file = await File.create({
                title,
                description,
                course,
                type,
                fileName: req.file.originalname,
                fileUrl: result.secure_url,
                cloudinaryId: result.public_id,
                uploadedBy: req.user.id,
                uploaderName: req.user.name,
                deadline: deadline || null
            });

            res.status(201).json({
                success: true,
                message: 'File uploaded successfully',
                file
            });
        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ error: 'Failed to upload file', message: error.message });
        }
    });
};

// @desc    Get teacher's files
// @route   GET /api/teacher/files
// @access  Private (Teacher)
exports.getMyFiles = async (req, res) => {
    try {
        const files = await File.find({ uploadedBy: req.user.id })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: files.length,
            files
        });
    } catch (error) {
        console.error('Get files error:', error);
        res.status(500).json({ error: 'Failed to fetch files' });
    }
};

// @desc    Delete file
// @route   DELETE /api/teacher/file/:id
// @access  Private (Teacher)
exports.deleteFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Check ownership
        if (file.uploadedBy.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to delete this file' });
        }

        // Delete from Cloudinary
        await deleteFromCloudinary(file.cloudinaryId);

        // Delete from database
        await file.deleteOne();

        res.json({
            success: true,
            message: 'File deleted successfully'
        });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
};

// @desc    Update file
// @route   PUT /api/teacher/file/:id
// @access  Private (Teacher)
exports.updateFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Check ownership
        if (file.uploadedBy.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to update this file' });
        }

        const { title, description, course, deadline } = req.body;

        file.title = title || file.title;
        file.description = description || file.description;
        file.course = course || file.course;
        file.deadline = deadline || file.deadline;

        await file.save();

        res.json({
            success: true,
            message: 'File updated successfully',
            file
        });
    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({ error: 'Failed to update file' });
    }
};