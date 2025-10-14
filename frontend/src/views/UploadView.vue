<template>
  <div class="upload-view">
    <div class="header">
      <h1>视频上传</h1>
      <div>
        <router-link to="/">返回播放</router-link>
        <button v-if="isAuth" @click="logout" class="logout-btn">退出登录</button>
      </div>
    </div>

    <div v-if="!isAuth" class="auth-form">
      <h2>请输入密码</h2>
      <input v-model="password" type="password" placeholder="密码" @keyup.enter="login">
      <button @click="login">登录</button>
      <p v-if="error" class="error">{{ error }}</p>
    </div>

    <div v-else class="content">
      <div class="section">
        <h2>创建课程</h2>
        <input v-model="newCourse.title" placeholder="课程标题">
        <textarea v-model="newCourse.description" placeholder="课程描述"></textarea>
        <button @click="createCourse">创建</button>
      </div>

      <div class="section">
        <h2>上传视频</h2>
        <select v-model="upload.courseId">
          <option value="">选择课程</option>
          <option v-for="c in courseList" :key="c.id" :value="c.id">{{ c.title }}</option>
        </select>
        <input v-model="upload.title" placeholder="视频标题">
        <input v-model="upload.description" placeholder="视频描述（可选）">
        <input type="file" @change="selectFile" accept="video/*">
        <button @click="uploadVideo" :disabled="uploading">{{ uploading ? '上传中...' : '上传' }}</button>
        <div v-if="progress > 0" class="progress">
          <div class="progress-bar" :style="{ width: progress + '%' }">{{ progress }}%</div>
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="success" class="success">{{ success }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { auth, courses, videos } from '../api';

const isAuth = ref(false);
const password = ref('');
const error = ref('');
const success = ref('');
const courseList = ref([]);
const newCourse = ref({ title: '', description: '' });
const upload = ref({ courseId: '', title: '', description: '', file: null });
const uploading = ref(false);
const progress = ref(0);

onMounted(() => {
  isAuth.value = !!localStorage.getItem('token');
  if (isAuth.value) loadCourses();
});

const login = async () => {
  try {
    const { data } = await auth.login(password.value);
    localStorage.setItem('token', data.token);
    isAuth.value = true;
    error.value = '';
    loadCourses();
  } catch {
    error.value = '密码错误';
  }
};

const logout = () => {
  localStorage.removeItem('token');
  isAuth.value = false;
  password.value = '';
};

const loadCourses = async () => {
  try {
    const { data } = await courses.list();
    courseList.value = data;
  } catch {
    error.value = '加载课程失败';
  }
};

const createCourse = async () => {
  if (!newCourse.value.title) return;
  try {
    await courses.create(newCourse.value);
    newCourse.value = { title: '', description: '' };
    loadCourses();
    success.value = '课程创建成功';
    setTimeout(() => success.value = '', 3000);
  } catch {
    error.value = '创建课程失败';
  }
};

const selectFile = (e) => {
  upload.value.file = e.target.files[0];
};

const uploadVideo = async () => {
  if (!upload.value.courseId || !upload.value.title || !upload.value.file) {
    error.value = '请填写完整信息';
    return;
  }
  
  const formData = new FormData();
  formData.append('courseId', upload.value.courseId);
  formData.append('title', upload.value.title);
  formData.append('description', upload.value.description);
  formData.append('video', upload.value.file);

  uploading.value = true;
  error.value = '';
  progress.value = 0;

  try {
    await videos.upload(formData, (e) => {
      progress.value = Math.round((e.loaded / e.total) * 100);
    });
    upload.value = { courseId: '', title: '', description: '', file: null };
    progress.value = 0;
    success.value = '上传成功';
    setTimeout(() => success.value = '', 3000);
  } catch {
    error.value = '上传失败';
  } finally {
    uploading.value = false;
  }
};
</script>

<style scoped>
.upload-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.header div {
  display: flex;
  gap: 10px;
}

.logout-btn {
  background: #f44336;
  color: white;
  border: none;
  padding: 8px 16px;
  cursor: pointer;
  border-radius: 4px;
}

.auth-form, .section {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.auth-form h2, .section h2 {
  margin-bottom: 15px;
}

input, textarea, select {
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

textarea {
  min-height: 80px;
  resize: vertical;
}

button {
  background: #42b983;
  color: white;
  border: none;
  padding: 10px 20px;
  cursor: pointer;
  border-radius: 4px;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.progress {
  margin-top: 10px;
  background: #eee;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  background: #42b983;
  color: white;
  padding: 5px;
  text-align: center;
  transition: width 0.3s;
}

.error {
  color: #f44336;
  margin-top: 10px;
}

.success {
  color: #4caf50;
  margin-top: 10px;
}

a {
  color: #42b983;
  text-decoration: none;
}
</style>