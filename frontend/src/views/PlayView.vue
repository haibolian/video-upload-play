<template>
  <div class="play-view">
    <!-- 课程列表页 -->
    <div v-if="!courseId" class="course-list">
      <h1>课程列表</h1>
      <router-link to="/upload" class="upload-link">前往上传</router-link>
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else class="courses">
        <div v-for="course in coursesList" :key="course.id" class="course-card" @click="$router.push(`/play/${course.id}`)">
          <div v-if="course.cover_image" class="course-cover">
            <img :src="`${STATIC_BASE_URL}/${course.cover_image}`" :alt="course.title" />
          </div>
          <div v-else class="course-cover no-cover">
            <span>暂无封面</span>
          </div>
          <div class="course-info">
            <h3>{{ course.title }}</h3>
            <p>{{ course.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 播放页面 -->
    <div v-else class="player-page">
      <button @click="$router.push('/')" class="back-btn">← 返回课程列表</button>
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else class="player-container">
        <div>
          <div class="video-section">
            <VideoPlayer ref="videoPlayerRef" :src="currentVideoSrc" />
          </div>
          <button @click="toggleFullscreen" class="fullscreen-btn">全屏播放</button>
        </div>
        <div class="playlist">
          <h3>视频列表</h3>
          <div v-for="video in videos" :key="video.id" 
               :class="['video-item', { active: video.id === currentVideoId }]"
               @click="playVideo(video)">
            <!-- <span class="episode">第{{ video.episode_number }}集</span> -->
            <span class="title">{{ video.title }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { courses } from '../api';
import VideoPlayer from '../components/VideoPlayer.vue';

const STATIC_BASE_URL = import.meta.env.VITE_STATIC_BASE_URL;

const route = useRoute();
const courseId = computed(() => route.params.courseId);

const loading = ref(false);
const error = ref('');
const coursesList = ref([]);
const videos = ref([]);
const currentVideoId = ref(null);
const videoPlayerRef = ref(null);

const currentVideoSrc = computed(() => {
  if (!currentVideoId.value) return '';
  const video = videos.value.find(v => v.id === currentVideoId.value);
  if (!video) return '';
  return `${STATIC_BASE_URL}/hls/${video.course_id}/${currentVideoId.value}/index.m3u8`;
});

const loadCourses = async () => {
  loading.value = true;
  error.value = '';
  try {
    const res = await courses.list();
    coursesList.value = res.data.courses;
  } catch (err) {
    error.value = '加载课程列表失败';
  } finally {
    loading.value = false;
  }
};

const loadCourse = async () => {
  loading.value = true;
  error.value = '';
  try {
    const res = await courses.get(courseId.value);
    videos.value = res.data.videos.sort((a, b) => a.episode_number - b.episode_number);
    if (videos.value.length > 0) {
      playVideo(videos.value[0]);
    }
  } catch (err) {
    error.value = '加载课程详情失败';
  } finally {
    loading.value = false;
  }
};

const playVideo = (video) => {
  currentVideoId.value = video.id;
};

const toggleFullscreen = () => {
  // 通过暴露的方法获取 Video.js player 实例
  if (videoPlayerRef.value) {
    const player = videoPlayerRef.value.getPlayer();
    if (player) {
      if (player.isFullscreen()) {
        player.exitFullscreen();
      } else {
        player.requestFullscreen();
      }
    }
  }
};

onMounted(() => {
  if (courseId.value) {
    loadCourse();
  } else {
    loadCourses();
  }
});

// 监听路由参数变化
watch(courseId, (newId) => {
  if (newId) {
    loadCourse();
  } else {
    loadCourses();
  }
});
</script>

<style scoped>
.play-view {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.course-list h1 {
  margin-bottom: 20px;
}

.upload-link {
  display: inline-block;
  margin-bottom: 20px;
  color: #42b983;
  text-decoration: none;
}

.courses {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.course-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  overflow: hidden;
}

.course-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.course-cover {
  width: 100%;
  height: 180px;
  overflow: hidden;
  background: #f5f7fa;
}

.course-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.course-cover.no-cover {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 14px;
}

.course-info {
  padding: 20px;
}

.course-card h3 {
  margin: 0 0 10px 0;
  font-size: 20px;
  font-weight: 600;
}

.course-card p {
  margin: 0;
  color: #666;
  font-size: 14px;
  line-height: 1.6;
}

.back-btn {
  margin-bottom: 20px;
  padding: 8px 16px;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.player-container {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 20px;
}

.video-section {
  background: #000;
  aspect-ratio: 16/9;
  position: relative;
}

.fullscreen-btn {
  margin-top: 10px;
  padding: 10px 20px;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.fullscreen-btn:hover {
  background: #35a372;
}

.playlist {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  max-height: 600px;
  overflow-y: auto;
}

.playlist h3 {
  margin: 0 0 15px 0;
}

.video-item {
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid #eee;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  gap: 10px;
  transition: background 0.2s;
}

.video-item:hover {
  background: #f5f5f5;
}

.video-item.active {
  background: #42b983;
  color: white;
  border-color: #42b983;
}

.episode {
  font-weight: bold;
  white-space: nowrap;
}

.loading, .error {
  padding: 20px;
  text-align: center;
}

.error {
  color: #f56c6c;
}

@media (max-width: 768px) {
  .player-container {
    grid-template-columns: 1fr;
  }
  
  .playlist {
    max-height: 300px;
  }
}
</style>