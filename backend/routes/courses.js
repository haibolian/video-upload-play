const express = require('express');
const pool = require('../config/db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [courses] = await pool.query('SELECT * FROM courses ORDER BY created_at DESC');
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: '获取课程列表失败' });
  }
});

router.get('/:id/videos', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [videos] = await pool.query(
      'SELECT * FROM videos WHERE course_id = ? ORDER BY created_at ASC',
      [id]
    );
    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: '获取视频列表失败' });
  }
});

module.exports = router;