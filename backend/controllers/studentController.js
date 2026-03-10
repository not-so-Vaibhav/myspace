const File = require('../models/File');

// @desc    Get all files
// @route   GET /api/student/files
// @access  Private (Student)
exports.getAllFiles = async (req, res) => {
    try {
        const files = await File.find().sort({ createdAt: -1 }).populate('uploadedBy', 'name email');

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

// @desc    Get notes
// @route   GET /api/student/notes
// @access  Private (Student)
exports.getNotes = async (req, res) => {
    try {
        const notes = await File.find({ type: 'note' })
            .sort({ createdAt: -1 })
            .populate('uploadedBy', 'name email');

        res.json({
            success: true,
            count: notes.length,
            files: notes
        });
    } catch (error) {
        console.error('Get notes error:', error);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
};

// @desc    Get assignments
// @route   GET /api/student/assignments
// @access  Private (Student)
exports.getAssignments = async (req, res) => {
    try {
        const assignments = await File.find({ type: 'assignment' })
            .sort({ createdAt: -1 })
            .populate('uploadedBy', 'name email');

        res.json({
            success: true,
            count: assignments.length,
            files: assignments
        });
    } catch (error) {
        console.error('Get assignments error:', error);
        res.status(500).json({ error: 'Failed to fetch assignments' });
    }
};

// @desc    Get file by ID
// @route   GET /api/student/file/:id
// @access  Private (Student)
exports.getFileById = async (req, res) => {
    try {
        const file = await File.findById(req.params.id).populate('uploadedBy', 'name email');

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.json({
            success: true,
            file
        });
    } catch (error) {
        console.error('Get file error:', error);
        res.status(500).json({ error: 'Failed to fetch file' });
    }
};