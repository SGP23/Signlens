import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Trash2, Volume2, Camera, CameraOff } from 'lucide-react'
import WebcamPreview from '../components/WebcamPreview'
import PredictionDisplay from '../components/PredictionDisplay'
import WordSuggestions from '../components/WordSuggestions'
import GradientCard from '../components/GradientCard'
import { getSocket, disconnectSocket } from '../services/websocket'
import { postSpeak, getSuggestions } from '../services/api'

// ─── Letter Acceptance Settings ──────────────────────────
// How many consecutive frames the SAME letter must appear before it's accepted
const HOLD_FRAMES_REQUIRED = 8        // ~0.8s at 10fps — adjust up/down to taste
// After a letter is accepted, ignore all predictions for this many ms
const COOLDOWN_MS = 1800              // 1.8 seconds cooldown between accepted letters
// ─────────────────────────────────────────────────────────

export default function LiveRecognition() {
  const [isActive, setIsActive] = useState(true)
  const [letter, setLetter] = useState(null)
  const [confidence, setConfidence] = useState(0)
  const [word, setWord] = useState('')
  const [sentence, setSentence] = useState('')
  const [history, setHistory] = useState([])
  const [connected, setConnected] = useState(false)
  const [threshold, setThreshold] = useState(0.4)
  const [landmarks, setLandmarks] = useState(null)
  const [suggestions, setSuggestions] = useState(['', '', '', ''])

  // ─── Letter detection state ───────────────────────────
  // Tracks the current candidate letter and how many frames it's been held
  const holdLetterRef = useRef(null)      // current candidate letter being held
  const holdCountRef = useRef(0)          // how many frames it's been seen consecutively
  const cooldownUntilRef = useRef(0)      // timestamp until which we ignore predictions
  // ─────────────────────────────────────────────────────

  const socketRef = useRef(null)
  const suggestTimerRef = useRef(null)

  // Load settings from localStorage on mount
  const savedSettings = useMemo(() => {
    try {
      const saved = localStorage.getItem('slr_settings')
      if (saved) {
        const s = JSON.parse(saved)
        return { threshold: s.threshold || 0.4, deviceId: s.deviceId || '' }
      }
    } catch { /* ignore */ }
    return { threshold: 0.4, deviceId: '' }
  }, [])

  const [deviceId] = useState(savedSettings.deviceId)

  useEffect(() => {
    setThreshold(savedSettings.threshold)
  }, [savedSettings])

  useEffect(() => {
    const socket = getSocket()
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('prediction', (data) => {
      // Always update landmarks and displayed letter/confidence for visual feedback
      setLandmarks(data.landmarks || null)

      if (!data.letter) {
        // No hand detected — reset hold counter but keep displaying last letter
        holdLetterRef.current = null
        holdCountRef.current = 0
        setConfidence(data.confidence || 0)
        return
      }

      setLetter(data.letter)
      setConfidence(data.confidence || 0)

      const now = Date.now()

      // ── Cooldown check ────────────────────────────────
      // If we're still in cooldown after the last accepted letter, skip
      if (now < cooldownUntilRef.current) {
        return
      }

      // ── Hold counter ──────────────────────────────────
      // If the incoming letter matches our current candidate, increment hold count
      if (data.letter === holdLetterRef.current) {
        holdCountRef.current += 1
      } else {
        // New letter — reset candidate and counter
        holdLetterRef.current = data.letter
        holdCountRef.current = 1
      }

      // ── Accept letter ─────────────────────────────────
      // Only accept the letter once it's been held for HOLD_FRAMES_REQUIRED frames
      if (holdCountRef.current >= HOLD_FRAMES_REQUIRED) {
        // Accept the letter!
        const acceptedLetter = holdLetterRef.current

        setWord((prev) => prev + acceptedLetter)

        setHistory((prev) => [
          {
            letter: acceptedLetter,
            confidence: data.confidence,
            time: new Date().toLocaleTimeString(),
          },
          ...prev.slice(0, 9),
        ])

        // Start cooldown and reset hold state
        cooldownUntilRef.current = now + COOLDOWN_MS
        holdLetterRef.current = null
        holdCountRef.current = 0
      }
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('prediction')
      disconnectSocket()
    }
  }, [])

  const handleFrame = useCallback(
    (dataUrl) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('predict_frame', {
          frame: dataUrl,
          threshold,
        })
      }
    },
    [threshold]
  )

  const addSpace = () => {
    if (word) {
      setSentence((prev) => (prev ? prev + ' ' + word : word))
      setWord('')
      holdLetterRef.current = null
      holdCountRef.current = 0
      cooldownUntilRef.current = 0
    }
  }

  const clearAll = () => {
    setWord('')
    setSentence('')
    setLetter(null)
    setConfidence(0)
    holdLetterRef.current = null
    holdCountRef.current = 0
    cooldownUntilRef.current = 0
  }

  const speakText = async () => {
    const text = sentence + (word ? ' ' + word : '')
    if (text.trim()) {
      try {
        await postSpeak(text.trim())
      } catch (e) {
        console.error('TTS failed:', e)
      }
    }
  }

  const backspace = () => {
    if (word.length > 0) {
      setWord((prev) => prev.slice(0, -1))
    } else if (sentence.length > 0) {
      const words = sentence.trim().split(' ')
      const lastWord = words.pop()
      setSentence(words.length > 0 ? words.join(' ') + ' ' : '')
      setWord(lastWord || '')
    }
    holdLetterRef.current = null
    holdCountRef.current = 0
    cooldownUntilRef.current = 0
  }

  // Fetch word suggestions when word changes
  useEffect(() => {
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current)
    const fullText = sentence + (word ? (sentence ? ' ' : '') + word : '')
    if (!word) {
      setSuggestions(['', '', '', ''])
      return
    }
    suggestTimerRef.current = setTimeout(async () => {
      try {
        const result = await getSuggestions(fullText)
        setSuggestions(result.suggestions || ['', '', '', ''])
      } catch {
        setSuggestions(['', '', '', ''])
      }
    }, 300)
    return () => {
      if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current)
    }
  }, [word, sentence])

  const handleSuggestionSelect = (suggestion) => {
    if (!suggestion) return
    setWord('')
    setSentence((prev) => (prev ? prev + ' ' + suggestion : suggestion))
    setSuggestions(['', '', '', ''])
    holdLetterRef.current = null
    holdCountRef.current = 0
    cooldownUntilRef.current = 0
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Connection indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {connected ? 'Connected to server' : 'Disconnected - Recognition paused'}
          </span>
          {!connected && (
            <button
              onClick={() => socketRef.current?.connect()}
              className="ml-2 px-2 py-0.5 text-xs bg-[#334eac] text-white rounded hover:bg-[#2a4094] transition"
            >
              Reconnect
            </button>
          )}
        </div>
        <button
          onClick={() => setIsActive(!isActive)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            isActive
              ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
          }`}
        >
          {isActive ? <CameraOff size={16} /> : <Camera size={16} />}
          {isActive ? 'Stop Camera' : 'Start Camera'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Webcam feed - takes 2 columns */}
        <GradientCard className="lg:col-span-2 p-4">
          <WebcamPreview onFrame={handleFrame} isActive={isActive} deviceId={deviceId} landmarks={landmarks} />
        </GradientCard>

        {/* Prediction panel */}
        <GradientCard className="p-6">
          <PredictionDisplay letter={letter} confidence={confidence} word={word} />

          {/* Action buttons */}
          <div className="mt-6 grid grid-cols-2 gap-2">
            <button
              onClick={addSpace}
              className="py-2.5 bg-[#334eac] text-white rounded-xl text-sm font-medium hover:bg-[#2a4094] transition"
            >
              Add Space
            </button>
            <button
              onClick={backspace}
              className="py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              Backspace
            </button>
            <button
              onClick={speakText}
              className="py-2.5 bg-gradient-to-r from-[#334eac] to-[#7096d1] text-white rounded-xl text-sm font-medium hover:shadow-lg transition flex items-center justify-center gap-1.5"
            >
              <Volume2 size={14} /> Speak
            </button>
            <button
              onClick={clearAll}
              className="py-2.5 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition flex items-center justify-center gap-1.5"
            >
              <Trash2 size={14} /> Clear All
            </button>
          </div>

          {/* Word Suggestions */}
          <WordSuggestions suggestions={suggestions} onSelect={handleSuggestionSelect} />
        </GradientCard>
      </div>

      {/* Sentence display */}
      {(sentence || word) && (
        <GradientCard className="p-5">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
            Formed Sentence
          </h3>
          <p className="text-xl font-semibold text-[#081f5c] dark:text-white tracking-wide">
            {sentence}
            <span className="text-[#334eac]">{word}</span>
            <span className="animate-pulse text-[#7096d1]">|</span>
          </p>
        </GradientCard>
      )}

      {/* Prediction History */}
      <GradientCard className="p-5">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
          Recent Predictions
        </h3>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
            No predictions yet. Show your hand to the camera to start.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {history.map((h, i) => (
              <motion.div
                key={`${h.time}-${i}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg"
              >
                <span className="text-lg font-bold text-[#334eac]">{h.letter}</span>
                <span className="text-xs text-gray-400">
                  {(h.confidence * 100).toFixed(0)}%
                </span>
                <span className="text-xs text-gray-400">{h.time}</span>
              </motion.div>
            ))}
          </div>
        )}
      </GradientCard>
    </div>
  )
}
