const pool = require('../config/db');
const { processVideo } = require('./ffmpeg');

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
        'UPDATE task_queue SET status = ?, completed_at = NOW() WHERE id = ?',
        ['completed', task.id]
      );
      
      await conn.query(
        'UPDATE videos SET status = ?, hls_path = ? WHERE id = ?',
        ['ready', `storage/hls/${task.video_id}/index.m3u8`, task.video_id]
      );
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