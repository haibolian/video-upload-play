const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../storage/original'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

router.post('/auth', async (req, res) => {
  const { password } = req.body;
  
  if (password !== process.env.UPLOAD_PASSWORD) {
    return res.status(401).json({ error: '密码错误' });
  }

  const token = jwt.sign({ authorized: true }, process.env.JWT_SECRET, { expiresIn: '24h' });
  res.json({ token });
});

router.post('/course', authMiddleware, async (req, res) => {
  const { title, description } = req.body;
  
  try {
    const [result] = await pool.query(
      'INSERT INTO courses (title, description) VALUES (?, ?)',
      [title, description]
    );
    res.json({ id: result.insertId, title, description });
  } catch (error) {
    res.status(500).json({ error: '创建课程失败' });
  }
});

router.post('/video', authMiddleware, upload.single('video'), async (req, res) => {
  const { courseId, title, description } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: '未上传视频文件' });
  }

  const conn = await pool.getConnection();
  
  try {
    await conn.beginTransaction();

    const [videoResult] = await conn.query(
      'INSERT INTO videos (course_id, title, description, original_path, status) VALUES (?, ?, ?, ?, ?)',
      [courseId, title, description, file.path, 'processing']
    );

    const videoId = videoResult.insertId;

    await conn.query(
      'INSERT INTO task_queue (video_id, input_path, status) VALUES (?, ?, ?)',
      [videoId, file.path, 'pending']
    );

    await conn.commit();
    res.json({ id: videoId, title, status: 'processing' });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ error: '上传视频失败' });
  } finally {
    conn.release();
  }
});

module.exports = router;