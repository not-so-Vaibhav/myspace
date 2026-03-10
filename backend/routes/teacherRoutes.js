const express = require('express');
const router = express.Router();
const { 
    uploadFile, 
    getMyFiles, 
    deleteFile, 
    updateFile 
} = require('../controllers/teacherController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);
router.use(authorize('teacher', 'admin'));

router.post('/upload', uploadFile);
router.get('/files', getMyFiles);
router.delete('/file/:id', deleteFile);
router.put('/file/:id', updateFile);

module.exports = router;