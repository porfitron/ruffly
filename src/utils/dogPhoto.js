const MAX_EDGE = 320
const JPEG_QUALITY = 0.72
const MAX_INPUT_BYTES = 15 * 1024 * 1024

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Couldn't read that photo. Try a JPEG or PNG."))
    }
    img.src = url
  })
}

async function bitmapFromFile(file) {
  if (typeof createImageBitmap !== 'function') {
    return loadImageElement(file)
  }
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return createImageBitmap(file)
  }
}

/** Resize + square-crop a picked image to a small JPEG data URL for `photoUrl`. */
export async function fileToDogPhotoDataUrl(file) {
  if (!file || (file.type && !file.type.startsWith('image/'))) {
    throw new Error('Choose a photo')
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('That photo is too large')
  }

  const source = await bitmapFromFile(file)
  try {
    const width = source.width
    const height = source.height
    if (!width || !height) {
      throw new Error("Couldn't read that photo. Try a JPEG or PNG.")
    }

    const side = Math.min(width, height)
    const sx = (width - side) / 2
    const sy = (height - side) / 2
    const edge = Math.min(MAX_EDGE, side)

    const canvas = document.createElement('canvas')
    canvas.width = edge
    canvas.height = edge
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error("Couldn't process that photo.")
    }
    ctx.drawImage(source, sx, sy, side, side, 0, 0, edge, edge)

    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
    if (!dataUrl.startsWith('data:image/jpeg')) {
      throw new Error("Couldn't process that photo.")
    }
    return dataUrl
  } finally {
    if (typeof source.close === 'function') source.close()
  }
}
