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

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [courses] = await pool.query('SELECT * FROM courses WHERE id = ?', [id]);
    if (courses.length === 0) {
      return res.status(404).json({ error: '课程不存在' });
    }
    
    const [videos] = await pool.query(
      'SELECT * FROM videos WHERE course_id = ? ORDER BY episode ASC',
      [id]
    );
    
    res.json({ ...courses[0], videos });
  } catch (error) {
    res.status(500).json({ error: '获取课程详情失败' });
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