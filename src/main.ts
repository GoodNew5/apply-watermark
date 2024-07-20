import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'
import path from 'path'
import mime from 'mime'

const VIDEO_DIR = './src/media' // put your video there
const OUTPUT_DIR = './src/output' // get your processed video
const WATERMARK_PATH = './src/watermark.png' // replace by your watermark

async function applyWatermark() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const processVideo = (videoFile: string) => {
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

    return new Promise((resolve, reject) => {
      ffmpeg(VIDEO_PATH)
        .input(WATERMARK_PATH)
        .complexFilter(
          "overlay=x='W/2-pow(-1,lt(mod(t,20),10))*((W-w)/2-10)-w/2':y='H/2-pow(-1,lt(mod(t,10),5))*((H-h)/2-10)-h/2'",
        )
        .outputOptions('-movflags frag_keyframe+empty_moov')
        .toFormat('mp4')
        .save(OUTPUT_PATH)
        .on('end', () => {
          resolve(`Finished processing video: ${VIDEO_PATH}`)
        })
        .on('error', (error) => {
          reject(`Error processing video file: ${error}`)
        })
    })
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

applyWatermark()
