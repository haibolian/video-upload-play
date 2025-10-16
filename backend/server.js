const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const uploadRoutes = require('./routes/upload');
const coursesRoutes = require('./routes/courses');
const { startTaskQueue } = require('./utils/taskQueue');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/hls', express.static(path.join(__dirname, '../storage/hls')));
app.use('/covers', express.static(path.join(__dirname, '../storage/covers')));

app.use('/api/upload', uploadRoutes);
app.use('/api/courses', coursesRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

startTaskQueue();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});