const User = require('../models/User');
const File = require('../models/File');
const { deleteFromCloudinary } = require('../utils/uploadCloudinary');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });

        res.json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

// @desc    Get students
// @route   GET /api/admin/students
// @access  Private (Admin)
exports.getStudents = async (req, res) => {
    try {
        const students = await User.find({ role: 'student' })
            .select('-password')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: students.length,
            users: students
        });
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
};

// @desc    Get teachers
// @route   GET /api/admin/teachers
// @access  Private (Admin)
exports.getTeachers = async (req, res) => {
    try {
        const teachers = await User.find({ role: 'teacher' })
            .select('-password')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: teachers.length,
            users: teachers
        });
    } catch (error) {
        console.error('Get teachers error:', error);
        res.status(500).json({ error: 'Failed to fetch teachers' });
    }
};

// @desc    Get all files
// @route   GET /api/admin/files
// @access  Private (Admin)
exports.getAllFiles = async (req, res) => {
    try {
        const files = await File.find()
            .sort({ createdAt: -1 })
            .populate('uploadedBy', 'name email');

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

// @desc    Delete user
// @route   DELETE /api/admin/user/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await user.deleteOne();

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

// @desc    Delete file
// @route   DELETE /api/admin/file/:id
// @access  Private (Admin)
exports.deleteFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
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
        console.error('Delete file error:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
};

// @desc    Get stats
// @route   GET /api/admin/stats
// @access  Private (Admin)
exports.getStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalStudents = await User.countDocuments({ role: 'student' });
        const totalTeachers = await User.countDocuments({ role: 'teacher' });
        const totalAdmins = await User.countDocuments({ role: 'admin' });

        const totalFiles = await File.countDocuments();
        const totalNotes = await File.countDocuments({ type: 'note' });
        const totalAssignments = await File.countDocuments({ type: 'assignment' });
        const totalResources = await File.countDocuments({ type: 'resource' });

        res.json({
            success: true,
            stats: {
                users: {
                    total: totalUsers,
                    students: totalStudents,
                    teachers: totalTeachers,
                    admins: totalAdmins
                },
                files: {
                    total: totalFiles,
                    notes: totalNotes,
                    assignments: totalAssignments,
                    resources: totalResources
                }
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};