import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'
import path from 'path'
import mime from 'mime'
import chockidar from 'chokidar';
import { fileURLToPath } from 'url'


const INPUT_DIR = './src/input' // put your video there
const OUTPUT_DIR = './src/output' // get your processed video
const WATERMARK_PATH = './src/watermark.png' // replace by your watermark

interface VideoResolution {
  width: number
  height: number
}

const watcher = chockidar.watch(INPUT_DIR, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true,
})

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

async function applyWatermark(mediaFile?: string) {
  if (!fs.existsSync(WATERMARK_PATH)) {
    console.error(`Watermark file not found at: ${WATERMARK_PATH}`)

    return
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const processMediaFile = async (mediaFile: string) => {
    const OUTPUT_PATH = path.join(
      OUTPUT_DIR,
      `${path.basename(mediaFile, path.extname(mediaFile))}${path.extname(mediaFile)}`,
    )

    console.log(`Processing file: ${mediaFile}`)

    console.log(`Output will be saved to: ${OUTPUT_DIR}`)
    console.log(`Output file: ${OUTPUT_PATH}`)

    fs.access(OUTPUT_DIR, fs.constants.W_OK, (err) => {
      if (err) {
        console.error(`Cannot write to output directory: ${OUTPUT_DIR}`)
        return
      }
    })

    const dimensions: VideoResolution = await getVideoResolution(mediaFile)
    const width = dimensions?.width
    const height = dimensions?.height

    if (!width) {
      console.error('failed to get video width')

      return false
    }

    const watermarkWidth = Math.round((width + height) * 0.1) // Set the watermark width to be 10% of the video width

    return new Promise((resolve, reject) => {
      ffmpeg(mediaFile)
        .input(WATERMARK_PATH)
        .complexFilter(
          `[1:v]scale=${watermarkWidth}:-1[wm];[0:v][wm]overlay=x='W/2-pow(-1,lt(mod(t,20),10))*((W-w)/2-10)-w/2':y='H/2-pow(-1,lt(mod(t,10),5))*((H-h)/2-10)-h/2'`,
        )
        .outputOptions('-movflags frag_keyframe+empty_moov')
        .save(OUTPUT_PATH)
        .on('end', () => {
          console.log(`Finished processing file: ${mediaFile}`)
          fs.unlinkSync(mediaFile)
          resolve(`Finished processing file: ${mediaFile}`)
        })
        .on('error', (error) => {
          console.error(`Error processing file: ${error}`)
          reject(`Error processing file: ${error}`)
        })
    })
  }

  function checkIsMedia(file: string) {
    return mime.getType(file)?.startsWith('video') || mime.getType(file)?.startsWith('image')
  }

  if (mediaFile) {
    const media = checkIsMedia(mediaFile)

    if (media) {
        processMediaFile(mediaFile)
    }
  }
}

console.log("Service started...")
const __filename = fileURLToPath(import.meta.url)

const __dirname = path.dirname(__filename)
console.log(__dirname)

watcher.on('add', (filePath) => {
  console.log(`File added: ${filePath}`)
  applyWatermark(filePath)
})
