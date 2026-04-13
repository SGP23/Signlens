import { io } from 'socket.io-client'
import { logError, logDebug } from './logger'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

let socket = null

export function getSocket() {
  if (!socket) {
    try {
      socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 10000,
      })

      socket.on('connect', () => {
        logDebug('Socket.IO connected, id:', socket.id)
      })

      socket.on('connect_error', (err) => {
        logError('socketClient.connect_error', err)
      })

      socket.on('reconnect_failed', () => {
        logError('socketClient', 'Reconnection failed after maximum attempts.')
      })

      socket.on('error', (err) => {
        logError('socketClient.error', err)
      })
    } catch (err) {
      logError('socketClient.init', err)
      socket = null
    }
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    try {
      socket.disconnect()
    } catch (err) {
      logError('socketClient.disconnect', err)
    }
    socket = null
  }
}
