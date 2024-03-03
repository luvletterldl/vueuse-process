# 借助 VueUse 写一个丝滑的播放器进度条有多简单

要写一个简单的音频或者视频播放器的进度条还是要考虑不少东西的，看看借助于 `VueUse` 来实现能有多省事～

# 首先确定播放器进度条的功能

1. 有播放暂停按钮
2. 进度条可以跟随播放丝滑更新
3. 有当前播放时间和总时间可以根据播放更新当前时间
4. 可以点击进度条的某一处跳转到指定处进行播放

我们先简单梳理这四个功能，我们的重心是在这个进度条的渲染和交互上。

嫌子弹飞慢的，直接看最后上任鹅城那段（doge）

# 根据既定的功能来确定我们的结构

## 要有风🌬️，要有肉🥩

要有一个可以包含实际进度条的壳子（风），再来一个另外一种颜色实际进度条的条子（肉），后面再加一个小圆点表示当前播放到哪了。
```html
<div class="process-bar" rounded-8px h-8px flex-1 bg-gray-200 cursor-pointer flex items-center>
  <div h-full bg-purple-400 rounded-8px :style="{ width: `${playTime / duration * 100}%` }" />
  <div w-10px h-10px rounded-full bg-purple-500 ml--6px shadow hover:w-12px hover:h-12px />
</div>
```

## 要有火锅🍲，要有雾🌁

这里再来一个 `audio` 的资源（火锅），然后来个封面（雾）

```html
<audio ref="audioRef" src="https://rust-fe-shared.pages.dev/The%20Sun%20Also%20Rises.mp3" @play="onAudioPlay" @loadedmetadata="onLoadedmetadata" @pause="onAudioPause" @ended="onAudioEnded" />
<div class="preview-audio-cover" :class="`${playing ? 'motion-safe:animate-spin' : ''}`">
  <img w-full src="https://rust-fe-shared.pages.dev/record.png" alt="">
  <img class="audio-cover" src="https://rust-fe-shared.pages.dev/cover.webp" alt="">
</div>
```

## 要有美女👩，要有驴🫏

要有一个播放暂停按钮吧（美女），要展示当前时间和总时间吧（驴）

> 正经备注，需要用到图标库：`@iconify-json/carbon` 配合 `UnoCSS` 来使用。
```html
<div class="play-btn" @click="playOrPause">
  <div v-if="playing" m-auto i-carbon:pause-filled />
  <div v-else m-auto i-carbon:play-filled-alt />
</div>
<p tabular-nums>
  {{ fmtTime(playTime) }} / {{ fmtTime(duration) }}
</p>
```

# 起来起来，一起吃一起唱

让我们开始这些实现功能吧

## 资源加载完成更新总时长

在资源元数据加载完成之后更新总时长

```js
function onLoadedmetadata() {
  duration.value = audioRef.value.duration
}
```

借助 `dayjs` 处理时间展示
```ts
function fmtTime(duration: number) {
  const hours = Boolean(Math.floor(duration / 3600))
  return dayjs(duration * 1000)
    .subtract(8, 'hour')
    .format(`${hours ? 'HH:' : ''}mm:ss`)
}
```

## 进度条、当前时间更新
使用 `VueUse` 提供的 [useRafFn](https://vueuse.org/core/useRafFn/#useraffn) 和 [useFps](https://vueuse.org/core/useFps/#usefps) 配合来处理播放过程中进度条的更新：

`useFafFn` 是一个便携使用 `requestAnimationFrame API` 来更加顺畅更新动画的方法，会返回两个方法：`resume、pause` 和一个状态 `isActive` 这次我们只需要用到两个控制的方法。`pause` 用来控制暂停当前的逻辑执行，`resume` 是继续执行每帧间隔内的逻辑。

`useFps` 是为了获取当前显示设备刷新率的方法，用来适配不同设备（主要是为适配高刷新率屏幕）更新画面的频率。

当资源开始播放的时候每更新一帧就更新一次当前播放时间 `playTime` 的值（下面代码第6行开始），进度条中当前进度的展示逻辑就是根据 `playTime / duration * 100%` 所计算出来的百分比，所以自动会更新样式，当前播放时长的更新也会随着 `{{ fmtTime(playTime) }} / {{ fmtTime(duration) }}` 这段逻辑来更新，所以我们的进度条和当前播放时间的丝滑更新就这么完成了，当资源被暂停或者播放结束就结束更新。

有同学会说了我用 [timeupdat](https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLMediaElement/timeupdate_event) 事件更新不简单吗？当然可以啊，但是这个事件触发的频率太低了：每秒触发 4-66 次，触发频率由系统决定，所以如果用这个来做，当资源市场比较短的时候你会看到进度条的画面卡顿式更新，体验及其不友好。

```ts
// 拿到当前的fps
const fps = useFps()

// 在播放中中每帧都要更新当前播放到的时长
// 这样进度条更新就更加顺畅
const { resume, pause } = useRafFn(() => {
  playTime.value += 1 / fps.value
  // 如果当前时间超出了音频总时长，就结束
  if (playTime.value > duration.value)
    onAudioEnded()
})

// 初始要暂停执行帧间隔配置的逻辑
pause()

// 音频播放结束要暂停
function onAudioEnded() {
  onAudioPause()
}

// 暂停的时候也要把暂停
function onAudioPause() {
  playing.value = false
  pause()
}

// 当资源开始播放的时候就开始执行每帧进度条更新
function onAudioPlay() {
  playing.value = true
  resume()
}
```

## 点击进度条的某一处跳转指定位置

我们这里需要根据点击的位置在进度条上所占的百分位来按比例跳转到总时长的百分位，说白了我们需要获取到点击位置在进度条上所占的百分比，[useMouseInElement](https://vueuse.org/core/useMouseInElement/#usemouseinelement) 可以祝我们一臂之力，这个方法提供了当前鼠标在指定 `DOM` 元素上的信息，我们只需要两个信息 `elementX, elementWidth` 第一个是当前鼠标在元素上的 `X` 坐标，第二个是当前元素的宽度，完美～

```js
// 进度条元素的ref
const processRef = ref()
// 音频元素的ref
const audioRef = ref()
// 音频的时长
const duration = ref(0)

const { elementX, elementWidth } = useMouseInElement(processRef)

function seekAudio() {
  // 根据百分比计算出要跳转的时间
  const currentTime = elementX.value / elementWidth.value * duration.value
  // 跳转到当前鼠标点击位置的百分位时间
  audioRef.value.currentTime = currentTime
  playTime.value = currentTime
}
```

## 处理播放暂停和状态展示

这部分就简单多了

```js
// 播放或者暂停
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
```

# 让代码飞一会

使用了 `UnoCSS` 还用了 `@iconify-json/carbon` 的图标，记得安装 `@vueuse/core, dayjs， @iconify-json/carbon`，所有的代码：

```html
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
```
