import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'
import path from 'path'
import mime from 'mime'


interface VideoResolution {
  width: number
  height: number
}

async function getVideoResolution(videoPath: string): Promise<VideoResolution> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err)
        }

        if (metadata && metadata.streams && metadata.streams[0]) {
          const { width, height } = metadata.streams[0]
          if (width && height) {
            resolve({ width, height })
          }
        } else {
          reject(new Error('Failed to get video width and height'))
        }
    });
  })
}

const VIDEO_DIR = './src/input' // put your video there
const OUTPUT_DIR = './src/output' // get your processed video
const WATERMARK_PATH = './src/watermark.png' // replace by your watermark

async function applyWatermark() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const processVideo = async (videoFile: string) => {
    if (!fs.existsSync(WATERMARK_PATH)) {
      console.error(`Watermark file not found at: ${WATERMARK_PATH}`)

      return
    }

    const VIDEO_PATH = path.join(VIDEO_DIR, videoFile)
    const OUTPUT_PATH = path.join(OUTPUT_DIR, `${path.basename(videoFile, path.extname(videoFile))}_processed.mp4`)

    console.log(`Processing video file: ${VIDEO_PATH}`)
    console.log(`Output will be saved to: ${OUTPUT_PATH}`)

    fs.access(OUTPUT_DIR, fs.constants.W_OK, (err) => {
      if (err) {
        console.error(`Cannot write to output directory: ${OUTPUT_DIR}`)

        return
      }
    })

    try {
      const dimensions: VideoResolution = await getVideoResolution(VIDEO_PATH)
      const width = dimensions?.width
      const height = dimensions?.height

      if (!width) throw Error('failed to get video width')

      const getWatermarkSize = () => {
        // Set the watermark width to be 10% of the video width
        return Math.round((width + height) * 0.1)
      }

      const watermarkWidth = getWatermarkSize()
      return new Promise((resolve, reject) => {
        ffmpeg(VIDEO_PATH)
          .input(WATERMARK_PATH)
          .complexFilter(
            `[1:v]scale=${watermarkWidth}:-1[wm];[0:v][wm]overlay=x='W/2-pow(-1,lt(mod(t,20),10))*((W-w)/2-10)-w/2':y='H/2-pow(-1,lt(mod(t,10),5))*((H-h)/2-10)-h/2'`,
          )
          .outputOptions('-movflags frag_keyframe+empty_moov')
          .toFormat('mp4')
          .save(OUTPUT_PATH)
          .on('end', () => {
            fs.unlinkSync(VIDEO_PATH);
            resolve(`Finished processing video: ${VIDEO_PATH}`)
          })
          .on('error', (error) => {
            reject(`Error processing video file: ${error}`)
          })
      })
    } catch (err) {
      console.error(err)
    }

  }

  const files = fs.readdirSync(VIDEO_DIR)
  const videoFiles = files.filter((file) => mime.getType(file)?.startsWith('video'))

  for (const videoFile of videoFiles) {
    try {
      await processVideo(videoFile)
    } catch (error) {
      console.error(error)
    }
  }
}

while(true) {
  await applyWatermark()
  setTimeout(() => {}, 2000);
}
