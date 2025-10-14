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
          <h3>{{ course.title }}</h3>
          <p>{{ course.description }}</p>
        </div>
      </div>
    </div>

    <!-- 播放页面 -->
    <div v-else class="player-page">
      <button @click="$router.push('/')" class="back-btn">← 返回课程列表</button>
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else class="player-container">
        <div class="video-section">
          <VideoPlayer :src="currentVideoSrc" />
        </div>
        <div class="playlist">
          <h3>视频列表</h3>
          <div v-for="video in videos" :key="video.id" 
               :class="['video-item', { active: video.id === currentVideoId }]"
               @click="playVideo(video)">
            <span class="episode">第{{ video.episode_number }}集</span>
            <span class="title">{{ video.title }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { courses } from '../api';
import VideoPlayer from '../components/VideoPlayer.vue';

const route = useRoute();
const courseId = computed(() => route.params.courseId);

const loading = ref(false);
const error = ref('');
const coursesList = ref([]);
const videos = ref([]);
const currentVideoId = ref(null);

const currentVideoSrc = computed(() => {
  if (!currentVideoId.value) return '';
  return `http://localhost:3000/hls/${currentVideoId.value}/index.m3u8`;
});

const loadCourses = async () => {
  loading.value = true;
  error.value = '';
  try {
    const res = await courses.list();
    coursesList.value = res.data;
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

onMounted(() => {
  if (courseId.value) {
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
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.course-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.course-card h3 {
  margin: 0 0 10px 0;
}

.course-card p {
  margin: 0;
  color: #666;
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