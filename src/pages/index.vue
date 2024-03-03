<script setup lang="ts">
import dayjs from 'dayjs'

const processRef = ref()
const audioRef = ref()
const playTime = ref(0)
const duration = ref(0)
const playing = ref(false)
const fps = useFps()

const { elementX, elementWidth } = useMouseInElement(processRef)

const { resume, pause } = useRafFn(() => {
  playTime.value += 1 / fps.value
  if (playTime.value > duration.value)
    onAudioEnded()
})

pause()

function onLoadedmetadata() {
  duration.value = audioRef.value.duration
}
function playOrPause() {
  if (playing.value) {
    audioRef.value.pause()
  }
  else {
    if (audioRef.value.ended)
      playTime.value = 0

    audioRef.value.play()
  }
}

function onAudioEnded() {
  onAudioPause()
}

function onAudioPause() {
  playing.value = false
  pause()
}

function onAudioPlay() {
  playing.value = true
  resume()
}

function seekAudio() {
  const currentTime = elementX.value / elementWidth.value * duration.value
  audioRef.value.currentTime = currentTime
  playTime.value = currentTime
}

function fmtTime(duration: number) {
  const hours = Boolean(Math.floor(duration / 3600))
  return dayjs(duration * 1000)
    .subtract(8, 'hour')
    .format(`${hours ? 'HH:' : ''}mm:ss`)
}
</script>

<template>
  <div class="preview-audio">
    <div class="preview-audio-cover" :class="`${playing ? 'motion-safe:animate-spin' : ''}`">
      <img w-full src="https://rust-fe-shared.pages.dev/record.png" alt="">
      <img class="audio-cover" src="https://rust-fe-shared.pages.dev/cover.webp" alt="">
    </div>
    <div class="play-btn" @click="playOrPause">
      <div v-if="playing" m-auto i-carbon:pause-filled />
      <div v-else m-auto i-carbon:play-filled-alt />
    </div>
    <div class="audio-process">
      <div ref="processRef" class="process-bar" @click="seekAudio">
        <div h-full bg-purple-400 w-full rounded-8px :style="{ width: `${playTime / duration * 100}%` }" />
        <div w-10px h-10px rounded-full bg-purple-500 ml--6px shadow hover:w-12px hover:h-12px />
      </div>
      <p tabular-nums>
        {{ fmtTime(playTime) }} / {{ fmtTime(duration) }}
      </p>
    </div>
    <audio ref="audioRef" src="https://rust-fe-shared.pages.dev/The%20Sun%20Also%20Rises.mp3" @play="onAudioPlay" @loadedmetadata="onLoadedmetadata" @pause="onAudioPause" @ended="onAudioEnded" />
  </div>
</template>

<style scoped>
.preview-audio {
  --at-apply: p-3 flex flex-col items-center;
}
.preview-audio-cover {
  --at-apply: relative w-180px h-180px;
}
.audio-cover {
  --at-apply: absolute rounded-full left-0 top-0 w-120px h-120px m-30px;
}
.play-btn {
  --at-apply: my-24px bg-purple-400 w-64px h-62px text-white text-3xl flex rounded-full cursor-pointer;
}
.audio-process {
  --at-apply: flex items-center gap-12px w-full;
}
.process-bar {
  --at-apply: rounded-8px h-8px flex-1 bg-gray-200 cursor-pointer flex items-center;
}
</style>
