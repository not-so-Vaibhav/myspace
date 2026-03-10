const express = require('express');
const router = express.Router();
const { 
    getAllUsers, 
    getStudents, 
    getTeachers, 
    getAllFiles,
    deleteUser, 
    deleteFile, 
    getStats 
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.get('/users', getAllUsers);
router.get('/students', getStudents);
router.get('/teachers', getTeachers);
router.get('/files', getAllFiles);
router.delete('/user/:id', deleteUser);
router.delete('/file/:id', deleteFile);
router.get('/stats', getStats);

module.exports = router;
