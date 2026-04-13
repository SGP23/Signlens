import axios from 'axios'
import { logError } from './logger'

// In dev, Vite proxy rewrites /api/* → http://localhost:8000/*
// In production, set VITE_API_URL to the backend origin
const API_BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
})

function normalizeApiError(error, fallbackMessage) {
  if (error?.response?.data?.detail) {
    return new Error(String(error.response.data.detail))
  }
  if (error?.code === 'ECONNABORTED') {
    return new Error('Request timed out. Please try again.')
  }
  if (error?.message) {
    return new Error(error.message)
  }
  return new Error(fallbackMessage)
}

async function safeRequest(requestFn, fallbackMessage, context) {
  try {
    const { data } = await requestFn()
    return data
  } catch (error) {
    const normalized = normalizeApiError(error, fallbackMessage)
    logError(context || 'apiClient', normalized)
    throw normalized
  }
}

export async function getModelStatus() {
  return safeRequest(() => api.get('/model-status'), 'Unable to fetch model status.', 'apiClient.getModelStatus')
}

export async function getDatasetInfo() {
  return safeRequest(() => api.get('/dataset-info'), 'Unable to fetch dataset info.', 'apiClient.getDatasetInfo')
}

export async function getLogs(level = 'all') {
  return safeRequest(() => api.get('/logs', { params: { level } }), 'Unable to fetch logs.', 'apiClient.getLogs')
}

export async function postSpeak(text) {
  return safeRequest(() => api.post('/speak', { text }), 'Unable to run speech request.', 'apiClient.postSpeak')
}

export async function getSuggestions(sentence, maxSuggestions = 4) {
  return safeRequest(
    () =>
      api.post('/suggest-words', {
        sentence,
        max_suggestions: maxSuggestions,
      }),
    'Unable to fetch word suggestions.',
    'apiClient.getSuggestions'
  )
}

export async function completeWord(sentence, suggestion) {
  return safeRequest(
    () => api.post('/complete-word', { sentence, suggestion }),
    'Unable to complete suggested word.',
    'apiClient.completeWord'
  )
}

export async function getHealth() {
  return safeRequest(() => api.get('/health'), 'Unable to reach backend health endpoint.', 'apiClient.getHealth')
}

/**
 * Predict from uploaded image file.
 * Uses a 30-second timeout for ML inference which can be slow on CPU.
 */
export async function postPredict(file) {
  const formData = new FormData()
  formData.append('file', file)
  return safeRequest(
    () => api.post('/predict', formData, { timeout: 30000 }),
    'Prediction request failed.',
    'apiClient.postPredict'
  )
}

export async function getTrainingStatus() {
  return safeRequest(() => api.get('/training-status'), 'Unable to fetch training status.', 'apiClient.getTrainingStatus')
}

// export async function startTraining(config = {}) {
//   const { data } = await api.post('/start-training', config)
//   return data
// }

// export async function stopTraining() {
//   const { data } = await api.post('/stop-training')
//   return data
// }

// export async function collectData(letter, frameBase64) {
//   const { data } = await api.post('/collect-data', { letter, frame: frameBase64 })
//   return data
// }

// export async function getConfidenceSettings() {
//   const { data } = await api.get('/confidence-settings')
//   return data
// }
