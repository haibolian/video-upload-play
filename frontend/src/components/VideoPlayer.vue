<template>
  <div>
    <video ref="videoRef" class="video-js" controls></video>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import 'videojs-theme-kit/videojs-skin.js';
import 'videojs-theme-kit/style.css';

const props = defineProps({
  src: String
});

const videoRef = ref(null);
let player = null;

// 暴露 player 实例给父组件
defineExpose({
  getPlayer: () => player
});

onMounted(() => {
  player = videojs(videoRef.value, {
    controls: true,
    fluid: true,
    preload: 'auto',
    controlBar: {
      fullscreenToggle: true
    },
    userActions: {
      hotkeys: true
    }
  });
  
  // 应用 sleek 主题
  player.on('ready', () => {
    player.theme({
      skin: 'sleek',
      color: '#ffffff'  // 使用 Element Plus 的主题色
    });
  });
  
  if (props.src) {
    player.src({ src: props.src, type: 'application/x-mpegURL' });
  }
});

watch(() => props.src, (newSrc) => {
  if (player && newSrc) {
    player.src({ src: newSrc, type: 'application/x-mpegURL' });
    player.load();
  }
});

onBeforeUnmount(() => {
  if (player) {
    player.dispose();
  }
});
</script>

<style scoped>
.video-js {
  width: 100%;
  height: 100%;
}
</style>

<style>
/* 全局样式用于 Video.js 控件 */
.vjs-fullscreen-control .vjs-icon-placeholder::before {
  font-size: 2.4em !important;
  line-height: 1;
}
</style>