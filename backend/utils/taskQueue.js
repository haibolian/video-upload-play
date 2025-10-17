const pool = require('../config/db');
const { processVideo } = require('./ffmpeg');
const fs = require('fs').promises;

const processTaskQueue = async () => {
  const conn = await pool.getConnection();
  
  try {
    const [tasks] = await conn.query(
      'SELECT * FROM task_queue WHERE status = ? LIMIT 1',
      ['pending']
    );

    if (tasks.length === 0) return;

    const task = tasks[0];
    await conn.query(
      'UPDATE task_queue SET status = ? WHERE id = ?',
      ['processing', task.id]
    );

    try {
      await processVideo(task.video_id, task.input_path);
      
      await conn.query(
        'UPDATE task_queue SET status = ? WHERE id = ?',
        ['completed', task.id]
      );
      
      await conn.query(
        'UPDATE videos SET status = ?, hls_path = ? WHERE id = ?',
        ['completed', `storage/hls/${task.video_id}/index.m3u8`, task.video_id]
      );

      await fs.unlink(task.input_path).catch(() => {});
    } catch (error) {
      await conn.query(
        'UPDATE task_queue SET status = ?, error_message = ? WHERE id = ?',
        ['failed', error.message, task.id]
      );
    }
  } finally {
    conn.release();
  }
};

const startTaskQueue = () => {
  setInterval(processTaskQueue, 5000);
};

module.exports = { startTaskQueue };