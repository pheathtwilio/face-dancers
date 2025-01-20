"use client"

import { useEffect, useState, useRef } from "react"
import { connect, Room, createLocalTracks, LocalVideoTrack } from "twilio-video"
import { useSearchParams, useRouter } from "next/navigation"
import { Container, Button, Row, Col } from "react-bootstrap"

import { DeepgramSTTHandler, STTEvent, DeepgramSTTOptions } from "../services/stt"
import { LLM, LLMEvents } from "../services/llm"
import InteractiveAvatar from "../avatar/components/avatar"

export default function VideoRoom() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const username = searchParams.get("username") || "Kwisatz Haderach"
  const roomName = "defaultRoom"
  const [room, setRoom] = useState<Room | null>(null)
  const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack | null>(null)
  const [transcribedText, setTranscribedText] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const deepgramAPIKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY
  const llmAPIKey = process.env.NEXT_PUBLIC_GROQ_API_KEY

  if (!deepgramAPIKey) throw new Error("API Key for Deepgram is undefined")
  if (!llmAPIKey) throw new Error("API Key for LLM is undefined")

  const sttOptions: DeepgramSTTOptions = {
    apiKey: deepgramAPIKey,
    config: {
      language: "en",
      punctuate: true,
      interimResults: true,
      timeslice: 500,
    },
  }

  const stt = DeepgramSTTHandler.getInstance(sttOptions)
  const llm = LLM.getInstance(llmAPIKey)

  const joinRoom = async () => {
    try {

      let audioDeviceIdRef = searchParams.get("audioDeviceId")
      if(!audioDeviceIdRef) throw new Error("Audio Device ID cannot be undefined")
      let videoDeviceIdRef = searchParams.get("videoDeviceId")
      if(!videoDeviceIdRef) throw new Error("Video Device ID cannot be undefined")

      const tracks = await createLocalTracks({
        audio: { deviceId: searchParams.get("audioDeviceId") || undefined },
        video: { deviceId: searchParams.get("videoDeviceId") || undefined },
      })

      const response = await fetch("/api/twilio-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, roomName }),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch Twilio token")
      }

      const wallet = await response.json()

      const twilioRoom = await connect(wallet.token, {
        name: roomName,
        tracks,
      })

      setRoom(twilioRoom)
      setLocalVideoTrack(null) // Remove the preview video once joined
    } catch (e) {
      console.error("Failed to join the room:", e)
    }
  }

  const leaveRoom = () => {
    if (room) {
      room.disconnect()
      setRoom(null)
    }

    stt.disconnect() // Disconnect STT when leaving
    router.push(`/?username=${username}`)
  }

  // Setup local video preview on page load
  useEffect(() => {
    const setupPreview = async () => {
      const videoTrack = await createLocalTracks({ video: true })
        .then((tracks) => tracks.find((track) => track.kind === "video") as LocalVideoTrack)

      setLocalVideoTrack(videoTrack)

      if (videoRef.current && videoTrack) {
        videoTrack.attach(videoRef.current)
      }
    }

    setupPreview()

    return () => {
      if (localVideoTrack) {
        localVideoTrack.stop()
        localVideoTrack.detach()
      }
    }
  }, [])

  // Handle STT and LLM event registration
  useEffect(() => {

    if(!searchParams.get("audioDeviceId")) throw new Error("Audio Device Id cannot be null or undefined")
    stt.connect(searchParams.get("audioDeviceId") || "")

    const handleTranscription = (data: string) => {
      llm.getCompletion(data) // Send transcribed text to the language model
    }

    const handleLLMCompletion = (response: string) => {
      setTranscribedText(response) // Update the UI with LLM response if necessary
    }

    stt.on(STTEvent.TRANSCRIPT, handleTranscription)
    llm.on(LLMEvents.COMPLETION_RESPONSE, handleLLMCompletion)

    return () => {
      stt.off(STTEvent.TRANSCRIPT, handleTranscription)
      llm.off(LLMEvents.COMPLETION_RESPONSE, handleLLMCompletion)
    }
  }, [stt, llm])

  return (
    <Container className="mt-4">
      <Row className="text-center">
        <Col>
          <h1>{room ? `Welcome to the Room: ${roomName}` : "Join Video Room"}</h1>
        </Col>
      </Row>
      <Row className="justify-content-center mt-4">
        {room ? (
          <Col xs={12} md={8} className="text-center">
            <InteractiveAvatar />
            <p>{transcribedText}</p>
            <Button variant="danger" className="mt-3" onClick={leaveRoom}>
              Leave Room
            </Button>
          </Col>
        ) : (
          <Col xs={12} md={6} className="text-center">
            <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", borderRadius: "8px" }} />
            <Button variant="primary" className="mt-3" onClick={joinRoom}>
              Join Room
            </Button>
          </Col>
        )}
      </Row>
    </Container>
  )
}
