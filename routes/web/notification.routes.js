const express = require('express');
const NotificationController = require('../../controllers/web/NotificationController');

// Mount: '/notifications' + requireAuth (server.js'te)
const router = express.Router();

router.get('/recent.json',  NotificationController.recentJson);
router.get('/',             NotificationController.showList);
router.post('/read-all',    NotificationController.markAllRead);
router.post('/delete-all',  NotificationController.deleteAll);
router.post('/:id/read',    NotificationController.markRead);
router.post('/:id/delete',  NotificationController.deleteOne);

module.exports = router;
