<template>
  <div class="course-management">
    <div v-if="!isAuth" class="auth-container">
      <el-card class="auth-card">
        <h2>请输入密码</h2>
        <el-input v-model="password" type="password" placeholder="密码" @keyup.enter="login" />
        <el-button type="primary" @click="login" style="margin-top: 15px; width: 100%">登录</el-button>
        <el-alert v-if="error" :title="error" type="error" :closable="false" style="margin-top: 15px" />
      </el-card>
    </div>

    <div v-else class="content">
      <div class="header">
        <h1>课程管理</h1>
        <div>
          <el-button type="primary" @click="openDialog('create')">创建课程</el-button>
          <el-button @click="logout">退出登录</el-button>
        </div>
      </div>

      <el-table v-loading="loading" :data="courseList" style="width: 100%">
        <el-table-column label="封面" width="120">
          <template #default="{ row }">
            <img v-if="row.cover_image" :src="`http://192.168.31.39:3000/${row.cover_image}`" class="cover-img" />
            <div v-else class="no-cover">无封面</div>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="课程标题" min-width="200" />
        <el-table-column prop="description" label="课程描述" min-width="250" show-overflow-tooltip />
        <el-table-column label="视频数量" width="100">
          <template #default="{ row }">{{ row.video_count || 0 }}</template>
        </el-table-column>
        <el-table-column label="创建时间" width="120">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="openDialog('edit', row)">编辑</el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="total > 0" class="pagination">
        <el-pagination
          :current-page="currentPage"
          :page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>

      <el-dialog
        v-model="dialogVisible"
        :title="dialogMode === 'create' ? '创建课程' : '编辑课程'"
        width="900px"
        :close-on-click-modal="false"
      >
        <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
          <el-form-item label="课程标题" prop="title">
            <el-input v-model="form.title" placeholder="请输入课程标题" />
          </el-form-item>
          <el-form-item label="课程描述" prop="description">
            <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入课程描述（可选）" />
          </el-form-item>
          <el-form-item label="封面图片">
            <el-upload
              :auto-upload="false"
              :show-file-list="false"
              :on-change="handleCoverChange"
              accept="image/*"
              class="cover-upload"
            >
              <img v-if="coverPreview" :src="coverPreview" class="cover-preview" />
              <el-icon v-else class="cover-icon"><Plus /></el-icon>
            </el-upload>
          </el-form-item>
          
          <el-form-item v-if="dialogMode === 'edit'" label="课时列表">
            <el-table :data="videoList" style="width: 100%">
              <el-table-column prop="episode" label="集数" width="80" />
              <el-table-column prop="title" label="标题" min-width="150" />
              <el-table-column prop="description" label="描述" min-width="150" show-overflow-tooltip />
              <el-table-column prop="status" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.status === 'completed' ? 'success' : row.status === 'processing' ? 'warning' : 'info'">
                    {{ statusMap[row.status] }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150">
                <template #default="{ row }">
                  <el-button type="primary" size="small" @click="editVideo(row)">编辑</el-button>
                  <el-button type="danger" size="small" @click="deleteVideo(row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-button type="primary" style="margin-top: 10px" @click="showUploadVideo = true">上传新课时</el-button>
          </el-form-item>

          <el-form-item v-if="dialogMode === 'create'" label="批量上传" prop="videos">
            <el-upload
              ref="uploadRef"
              :auto-upload="false"
              :multiple="true"
              :file-list="fileList"
              :on-change="handleFileChange"
              :on-remove="handleFileRemove"
              accept="video/*"
              drag
            >
              <el-icon class="el-icon--upload"><upload-filled /></el-icon>
              <div class="el-upload__text">拖拽视频文件到此处或<em>点击上传</em></div>
            </el-upload>
          </el-form-item>
          <el-form-item v-if="dialogMode === 'create' && videoItems.length > 0" label="课时列表">
            <el-table :data="videoItems" style="width: 100%">
              <el-table-column label="文件名" prop="fileName" />
              <el-table-column label="大小" prop="size" width="100" />
              <el-table-column label="课时标题" width="200">
                <template #default="{ row }">
                  <el-input v-model="row.title" placeholder="课时标题" size="small" />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="80">
                <template #default="{ $index }">
                  <el-button type="danger" size="small" @click="removeVideo($index)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="uploading" @click="handleSubmit">确定</el-button>
        </template>
      </el-dialog>

      <el-dialog v-model="videoDialogVisible" title="编辑课时" width="500px">
        <el-form :model="videoForm" label-width="80px">
          <el-form-item label="集数">
            <el-input-number v-model="videoForm.episode" :min="1" />
          </el-form-item>
          <el-form-item label="标题">
            <el-input v-model="videoForm.title" />
          </el-form-item>
          <el-form-item label="描述">
            <el-input v-model="videoForm.description" type="textarea" :rows="3" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="videoDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="updateVideo">确定</el-button>
        </template>
      </el-dialog>

      <el-dialog v-model="showUploadVideo" title="上传新课时" width="600px">
        <el-upload
          ref="newVideoUploadRef"
          :auto-upload="false"
          :multiple="true"
          :file-list="newVideoFiles"
          :on-change="handleNewVideoChange"
          :on-remove="handleNewVideoRemove"
          accept="video/*"
          drag
        >
          <el-icon class="el-icon--upload"><upload-filled /></el-icon>
          <div class="el-upload__text">拖拽视频文件到此处或<em>点击上传</em></div>
        </el-upload>
        <el-table v-if="newVideoItems.length > 0" :data="newVideoItems" style="width: 100%; margin-top: 10px">
          <el-table-column label="文件名" prop="fileName" />
          <el-table-column label="课时标题" width="200">
            <template #default="{ row }">
              <el-input v-model="row.title" placeholder="课时标题" size="small" />
            </template>
          </el-table-column>
        </el-table>
        <template #footer>
          <el-button @click="showUploadVideo = false">取消</el-button>
          <el-button type="primary" :loading="uploadingNewVideo" @click="uploadNewVideos">上传</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessageBox, ElMessage } from 'element-plus';
import { Edit, Delete, VideoCamera, Clock, Loading, UploadFilled, Plus } from '@element-plus/icons-vue';
import { auth, courses, videos } from '../api';

const isAuth = ref(false);
const password = ref('');
const error = ref('');
const loading = ref(false);
const courseList = ref([]);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const dialogVisible = ref(false);
const dialogMode = ref('create');
const formRef = ref(null);
const uploadRef = ref(null);
const uploading = ref(false);
const fileList = ref([]);
const videoItems = ref([]);
const form = ref({ title: '', description: '', id: null });
const rules = { title: [{ required: true, message: '请输入课程标题', trigger: 'blur' }] };
const coverFile = ref(null);
const coverPreview = ref('');
const videoList = ref([]);
const videoDialogVisible = ref(false);
const videoForm = ref({ id: null, episode: 1, title: '', description: '' });
const showUploadVideo = ref(false);
const newVideoFiles = ref([]);
const newVideoItems = ref([]);
const newVideoUploadRef = ref(null);
const uploadingNewVideo = ref(false);
const statusMap = { pending: '待处理', processing: '处理中', completed: '已完成', failed: '失败' };

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
  loading.value = true;
  try {
    const { data } = await courses.list({ page: currentPage.value, pageSize: pageSize.value });
    courseList.value = data.courses;
    total.value = data.total;
  } catch {
    ElMessage.error('加载课程失败');
  } finally {
    loading.value = false;
  }
};

const handlePageChange = (page) => {
  currentPage.value = page;
  loadCourses();
};

const handleSizeChange = (size) => {
  pageSize.value = size;
  currentPage.value = 1;
  loadCourses();
};

const handleDelete = async (course) => {
  try {
    await ElMessageBox.confirm(`确定要删除课程"${course.title}"吗？`, '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    await courses.delete(course.id);
    ElMessage.success('删除成功');
    loadCourses();
  } catch (err) {
    if (err !== 'cancel') ElMessage.error('删除失败');
  }
};

const formatDate = (date) => new Date(date).toLocaleDateString('zh-CN');

const openDialog = async (mode, course = null) => {
  dialogMode.value = mode;
  coverFile.value = null;
  coverPreview.value = '';
  videoList.value = [];
  
  if (mode === 'edit' && course) {
    form.value = { title: course.title, description: course.description || '', id: course.id };
    if (course.cover_image) {
      coverPreview.value = `http://192.168.31.39:3000/${course.cover_image}`;
    }
    try {
      const { data } = await courses.get(course.id);
      videoList.value = data.videos || [];
    } catch {
      ElMessage.error('加载课时列表失败');
    }
  } else {
    form.value = { title: '', description: '', id: null };
    fileList.value = [];
    videoItems.value = [];
  }
  dialogVisible.value = true;
};

const handleCoverChange = (file) => {
  coverFile.value = file.raw;
  coverPreview.value = URL.createObjectURL(file.raw);
};

const handleFileChange = (file) => {
  const fileName = file.name;
  const fileSize = (file.size / 1024 / 1024).toFixed(2) + ' MB';
  const title = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
  videoItems.value.push({ file: file.raw, fileName, size: fileSize, title, uid: file.uid });
};

const handleFileRemove = (file) => {
  const index = videoItems.value.findIndex(item => item.uid === file.uid);
  if (index > -1) videoItems.value.splice(index, 1);
};

const removeVideo = (index) => {
  const item = videoItems.value[index];
  videoItems.value.splice(index, 1);
  const fileIndex = fileList.value.findIndex(f => f.uid === item.uid);
  if (fileIndex > -1) fileList.value.splice(fileIndex, 1);
};

const handleSubmit = async () => {
  try {
    await formRef.value.validate();
    if (dialogMode.value === 'create' && videoItems.value.length === 0) {
      ElMessage.error('请至少上传一个视频');
      return;
    }
    uploading.value = true;
    const courseData = { title: form.value.title, description: form.value.description };
    const { data: courseResult } = dialogMode.value === 'create'
      ? await courses.create(courseData)
      : await courses.update(form.value.id, courseData);
    
    const courseId = dialogMode.value === 'create' ? courseResult.id : form.value.id;
    
    if (coverFile.value) {
      await courses.uploadCover(courseId, coverFile.value);
    }
    
    if (dialogMode.value === 'create' && videoItems.value.length > 0) {
      const formData = new FormData();
      formData.append('courseId', courseId);
      videoItems.value.forEach(item => formData.append('videos', item.file));
      formData.append('titles', JSON.stringify(videoItems.value.map(item => item.title)));
      await videos.upload(formData);
    }
    
    ElMessage.success(dialogMode.value === 'create' ? '创建成功' : '更新成功');
    dialogVisible.value = false;
    loadCourses();
  } catch (err) {
    if (err !== 'cancel') ElMessage.error('操作失败');
  } finally {
    uploading.value = false;
  }
};

const editVideo = (video) => {
  videoForm.value = { id: video.id, episode: video.episode, title: video.title, description: video.description || '' };
  videoDialogVisible.value = true;
};

const updateVideo = async () => {
  try {
    await videos.update(videoForm.value.id, {
      episode: videoForm.value.episode,
      title: videoForm.value.title,
      description: videoForm.value.description
    });
    ElMessage.success('更新成功');
    videoDialogVisible.value = false;
    const { data } = await courses.get(form.value.id);
    videoList.value = data.videos || [];
  } catch {
    ElMessage.error('更新失败');
  }
};

const deleteVideo = async (video) => {
  try {
    await ElMessageBox.confirm(`确定要删除课时"${video.title}"吗？`, '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    await videos.delete(video.id);
    ElMessage.success('删除成功');
    const { data } = await courses.get(form.value.id);
    videoList.value = data.videos || [];
  } catch (err) {
    if (err !== 'cancel') ElMessage.error('删除失败');
  }
};

const handleNewVideoChange = (file) => {
  const fileName = file.name;
  const title = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
  newVideoItems.value.push({ file: file.raw, fileName, title, uid: file.uid });
};

const handleNewVideoRemove = (file) => {
  const index = newVideoItems.value.findIndex(item => item.uid === file.uid);
  if (index > -1) newVideoItems.value.splice(index, 1);
};

const uploadNewVideos = async () => {
  if (newVideoItems.value.length === 0) {
    ElMessage.error('请选择要上传的视频');
    return;
  }
  uploadingNewVideo.value = true;
  try {
    const formData = new FormData();
    formData.append('courseId', form.value.id);
    newVideoItems.value.forEach(item => formData.append('videos', item.file));
    formData.append('titles', JSON.stringify(newVideoItems.value.map(item => item.title)));
    await videos.upload(formData);
    ElMessage.success('上传成功');
    showUploadVideo.value = false;
    newVideoFiles.value = [];
    newVideoItems.value = [];
    const { data } = await courses.get(form.value.id);
    videoList.value = data.videos || [];
  } catch {
    ElMessage.error('上传失败');
  } finally {
    uploadingNewVideo.value = false;
  }
};
</script>

<style scoped>
.course-management {
  min-height: 100vh;
  background: linear-gradient(135deg, #f0f2f5 0%, #fafbfc 100%);
}

.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
}

.auth-card {
  width: 100%;
  max-width: 400px;
  border-radius: 16px;
}

.auth-card h2 {
  margin: 0 0 30px 0;
  text-align: center;
  color: #303133;
}

.content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.header h1 {
  margin: 0;
  color: #303133;
  font-size: 32px;
}

.header div {
  display: flex;
  gap: 12px;
}

.cover-img {
  width: 80px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
}

.no-cover {
  width: 80px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  color: #909399;
  font-size: 12px;
  border-radius: 4px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 30px;
}

.cover-upload {
  width: 150px;
  height: 150px;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  overflow: hidden;
}

.cover-upload:hover {
  border-color: #409eff;
}

.cover-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-icon {
  font-size: 28px;
  color: #8c939d;
  width: 150px;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.el-table) {
  border-radius: 8px;
}

:deep(.el-dialog) {
  border-radius: 16px;
}
</style>