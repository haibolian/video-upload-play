<template>
  <div>
    <video ref="videoRef" class="video-js vjs-default-skin" controls></video>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

const props = defineProps({
  src: String
});

const videoRef = ref(null);
let player = null;

onMounted(() => {
  player = videojs(videoRef.value, {
    controls: true,
    fluid: true,
    preload: 'auto'
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