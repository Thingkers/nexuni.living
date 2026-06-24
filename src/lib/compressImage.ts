import imageCompression from 'browser-image-compression'

export async function compressImage(file: File): Promise<File> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    fileType: 'image/webp',
  })

  const webpName = file.name.replace(/\.[^.]+$/, '.webp')
  if (compressed.name === webpName) return compressed
  return new File([compressed], webpName, { type: 'image/webp' })
}
