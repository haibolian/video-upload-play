const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

const processVideo = async (videoId, inputPath) => {
  const outputDir = path.join(__dirname, '../../storage/hls', String(videoId));
  await fs.mkdir(outputDir, { recursive: true });
  
  const outputPath = path.join(outputDir, 'index.m3u8');
  const command = `ffmpeg -i "${inputPath}" -c copy -hls_time 10 -hls_list_size 0 -f hls "${outputPath}"`;

  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(outputPath);
      }
    });
  });
};

module.exports = { processVideo };