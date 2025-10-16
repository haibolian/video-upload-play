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

      <div v-if="loading" class="loading">
        <el-icon class="is-loading"><Loading /></el-icon>
      </div>

      <div v-else-if="courseList.length === 0" class="empty">
        <el-empty description="暂无课程" />
      </div>

      <div v-else class="course-grid">
        <el-card v-for="course in courseList" :key="course.id" class="course-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="course-title">{{ course.title }}</span>
              <div class="actions">
                <el-button type="primary" size="small" :icon="Edit" @click="openDialog('edit', course)" />
                <el-button type="danger" size="small" :icon="Delete" @click="handleDelete(course)" />
              </div>
            </div>
          </template>
          <div class="course-info">
            <p class="description">{{ course.description || '暂无描述' }}</p>
            <div class="meta">
              <span><el-icon><VideoCamera /></el-icon> {{ course.video_count || 0 }} 个视频</span>
              <span><el-icon><Clock /></el-icon> {{ formatDate(course.created_at) }}</span>
            </div>
          </div>
        </el-card>
      </div>

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
        width="800px"
        :close-on-click-modal="false"
      >
        <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
          <el-form-item label="课程标题" prop="title">
            <el-input v-model="form.title" placeholder="请输入课程标题" />
          </el-form-item>
          <el-form-item label="课程描述" prop="description">
            <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入课程描述（可选）" />
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
              class="upload-area"
            >
              <el-icon class="el-icon--upload"><upload-filled /></el-icon>
              <div class="el-upload__text">拖拽视频文件到此处或<em>点击上传</em></div>
              <template #tip>
                <div class="el-upload__tip">支持批量上传视频文件</div>
              </template>
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
                  <el-button type="danger" size="small" :icon="Delete" @click="removeVideo($index)" />
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
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessageBox, ElMessage } from 'element-plus';
import { Edit, Delete, VideoCamera, Clock, Loading, UploadFilled } from '@element-plus/icons-vue';
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
const form = ref({
  title: '',
  description: '',
  id: null
});
const rules = {
  title: [{ required: true, message: '请输入课程标题', trigger: 'blur' }]
};

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
    if (err !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('zh-CN');
};

const openDialog = (mode, course = null) => {
  dialogMode.value = mode;
  if (mode === 'edit' && course) {
    form.value = { title: course.title, description: course.description || '', id: course.id };
  } else {
    form.value = { title: '', description: '', id: null };
    fileList.value = [];
    videoItems.value = [];
  }
  dialogVisible.value = true;
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
    
    if (dialogMode.value === 'create' && videoItems.value.length > 0) {
      const formData = new FormData();
      formData.append('courseId', courseResult.id);
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
  overflow: hidden;
}

.auth-card :deep(.el-card__body) {
  padding: 40px 30px;
}

.auth-card h2 {
  margin: 0 0 30px 0;
  text-align: center;
  color: #303133;
  font-weight: 500;
}

.content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
}

.header h1 {
  margin: 0;
  color: #303133;
  font-size: 32px;
  font-weight: 500;
}

.header div {
  display: flex;
  gap: 12px;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  font-size: 32px;
  color: #6ba3ff;
}

.empty {
  min-height: 300px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.course-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.course-card {
  border-radius: 12px;
  border: 1px solid #e4e7ed;
  transition: all 0.3s ease;
  background: #ffffff;
}

.course-card :deep(.el-card__header) {
  background: linear-gradient(135deg, #fafbfc 0%, #ffffff 100%);
  border-bottom: 1px solid #e4e7ed;
  padding: 20px;
}

.course-card :deep(.el-card__body) {
  padding: 20px;
}

.course-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.course-title {
  font-size: 18px;
  font-weight: 500;
  color: #303133;
}

.actions {
  display: flex;
  gap: 8px;
}

.actions :deep(.el-button) {
  border-radius: 8px;
  transition: all 0.3s ease;
}

.actions :deep(.el-button:hover) {
  transform: scale(1.05);
}

.course-info {
  min-height: 100px;
}

.description {
  color: #606266;
  margin: 0 0 20px 0;
  line-height: 1.8;
  font-size: 14px;
}

.meta {
  display: flex;
  justify-content: space-between;
  color: #909399;
  font-size: 13px;
}

.meta span {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 40px;
}

.upload-area {
  width: 100%;
}

.upload-area :deep(.el-upload-dragger) {
  width: 100%;
  border: 2px solid #e4e7ed;
  border-radius: 12px;
  background: #e8f3ff;
  transition: all 0.3s ease;
}

.upload-area :deep(.el-upload-dragger:hover) {
  border-color: #6ba3ff;
  background: #dceeff;
}

.upload-area :deep(.el-icon--upload) {
  color: #6ba3ff;
}

.upload-area :deep(.el-upload__text) {
  color: #303133;
}

.upload-area :deep(.el-upload__text em) {
  color: #6ba3ff;
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, #6ba3ff 0%, #5a92ee 100%);
  border: none;
  border-radius: 8px;
  transition: all 0.3s ease;
}

:deep(.el-button--primary:hover) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(107, 163, 255, 0.4);
}

:deep(.el-dialog) {
  border-radius: 16px;
  overflow: hidden;
}

:deep(.el-dialog__header) {
  background: linear-gradient(135deg, #fafbfc 0%, #ffffff 100%);
  padding: 24px 30px;
  border-bottom: 1px solid #e4e7ed;
}

:deep(.el-dialog__body) {
  padding: 30px;
}

:deep(.el-form-item) {
  margin-bottom: 24px;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
  transition: all 0.3s ease;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #6ba3ff inset;
}

:deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.el-table th) {
  background: #f5f7fa;
  color: #303133;
  font-weight: 500;
}

:deep(.el-table tr:hover > td) {
  background: #fafafa;
}

:deep(.el-table td),
:deep(.el-table th) {
  border-color: #e4e7ed;
}

@media (max-width: 768px) {
  .course-grid {
    grid-template-columns: 1fr;
  }
  
  .header {
    flex-direction: column;
    gap: 20px;
    align-items: flex-start;
  }
  
  .header h1 {
    font-size: 24px;
  }
}
</style>