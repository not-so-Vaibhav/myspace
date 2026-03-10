const express = require('express');
const router = express.Router();
const { 
    getAllFiles, 
    getNotes, 
    getAssignments, 
    getFileById 
} = require('../controllers/studentController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);
router.use(authorize('student', 'teacher', 'admin'));

router.get('/files', getAllFiles);
router.get('/notes', getNotes);
router.get('/assignments', getAssignments);
router.get('/file/:id', getFileById);

module.exports = router;