export const RECITATION_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4'
]

export function getSupportedMimeType(MediaRecorderCtor = globalThis.MediaRecorder) {
  if (!MediaRecorderCtor || typeof MediaRecorderCtor.isTypeSupported !== 'function') return ''
  for (const type of RECITATION_MIME_TYPES) {
    try {
      if (MediaRecorderCtor.isTypeSupported(type)) return type
    } catch {
      // Some browsers throw for an unknown codec; continue with the next candidate.
    }
  }
  return ''
}

export function isRecordingSupported(MediaRecorderCtor = globalThis.MediaRecorder, mediaDevices = globalThis.navigator?.mediaDevices) {
  return Boolean(MediaRecorderCtor && mediaDevices && typeof mediaDevices.getUserMedia === 'function')
}

export async function requestMicrophoneStream(mediaDevices = globalThis.navigator?.mediaDevices) {
  if (!mediaDevices || typeof mediaDevices.getUserMedia !== 'function') throw new Error('Microphone recording is not supported in this browser.')
  return mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false })
}

export function createRecitationRecorder(stream, MediaRecorderCtor = globalThis.MediaRecorder) {
  if (!MediaRecorderCtor) throw new Error('Microphone recording is not supported in this browser.')
  const mimeType = getSupportedMimeType(MediaRecorderCtor)
  const recorder = mimeType ? new MediaRecorderCtor(stream, { mimeType }) : new MediaRecorderCtor(stream)
  const chunks = []
  recorder.addEventListener?.('dataavailable', event => { if (event.data?.size) chunks.push(event.data) })
  const finish = () => new Promise((resolve, reject) => {
    const complete = () => {
      try { resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' })) } catch (error) { reject(error) }
    }
    recorder.addEventListener?.('stop', complete, { once: true })
    try { if (recorder.state !== 'inactive') recorder.stop(); else complete() } catch (error) { reject(error) }
  })
  return { recorder, finish, mimeType: recorder.mimeType || mimeType || 'audio/webm' }
}

export function stopMediaStream(stream) {
  stream?.getTracks?.().forEach(track => track.stop())
}
