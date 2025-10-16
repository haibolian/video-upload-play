const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
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

router.post('/video', authMiddleware, upload.array('videos', 20), async (req, res) => {
  const { courseId, titles, description } = req.body;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ error: '未上传视频文件' });
  }

  const conn = await pool.getConnection();
  const uploadedVideos = [];
  
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT COALESCE(MAX(episode), 0) as maxEpisode FROM videos WHERE course_id = ?',
      [courseId]
    );
    let episode = rows[0].maxEpisode + 1;

    const videoTitles = titles ? JSON.parse(titles) : [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const videoTitle = videoTitles[i] || path.parse(file.originalname).name;

      const [videoResult] = await conn.query(
        'INSERT INTO videos (course_id, title, description, episode, original_path, status) VALUES (?, ?, ?, ?, ?, ?)',
        [courseId, videoTitle, description, episode, file.path, 'processing']
      );

      const videoId = videoResult.insertId;

      await conn.query(
        'INSERT INTO task_queue (video_id, input_path, status) VALUES (?, ?, ?)',
        [videoId, file.path, 'pending']
      );

      uploadedVideos.push({ id: videoId, title: videoTitle, episode });
      episode++;
    }

    await conn.commit();
    res.json({
      message: `成功上传 ${files.length} 个视频`,
      videos: uploadedVideos
    });
  } catch (error) {
    console.log(error);
    await conn.rollback();
    
    for (const file of files) {
      await fs.unlink(file.path).catch(() => {});
    }
    
    res.status(500).json({ error: '上传视频失败' });
  } finally {
    conn.release();
  }
});

router.put('/course/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;
  
  try {
    const [result] = await pool.query(
      'UPDATE courses SET title = ?, description = ? WHERE id = ?',
      [title, description, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '课程不存在' });
    }
    
    res.json({ id, title, description });
  } catch (error) {
    res.status(500).json({ error: '更新课程失败' });
  }
});

router.delete('/course/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const conn = await pool.getConnection();
  
  try {
    await conn.beginTransaction();
    
    const [videos] = await conn.query('SELECT original_path, hls_path FROM videos WHERE course_id = ?', [id]);
    
    for (const video of videos) {
      if (video.original_path) {
        await fs.unlink(video.original_path).catch(() => {});
      }
      if (video.hls_path) {
        const hlsDir = path.dirname(video.hls_path);
        await fs.rm(hlsDir, { recursive: true, force: true }).catch(() => {});
      }
    }
    
    const [result] = await conn.query('DELETE FROM courses WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: '课程不存在' });
    }
    
    await conn.commit();
    res.json({ message: '删除成功' });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ error: '删除课程失败' });
  } finally {
    conn.release();
  }
});

router.delete('/video/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const conn = await pool.getConnection();
  
  try {
    await conn.beginTransaction();
    
    const [videos] = await conn.query('SELECT original_path, hls_path FROM videos WHERE id = ?', [id]);
    
    if (videos.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: '视频不存在' });
    }
    
    const video = videos[0];
    if (video.original_path) {
      await fs.unlink(video.original_path).catch(() => {});
    }
    if (video.hls_path) {
      const hlsDir = path.dirname(video.hls_path);
      await fs.rm(hlsDir, { recursive: true, force: true }).catch(() => {});
    }
    
    await conn.query('DELETE FROM videos WHERE id = ?', [id]);
    
    await conn.commit();
    res.json({ message: '删除成功' });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ error: '删除视频失败' });
  } finally {
    conn.release();
  }
});

module.exports = router;