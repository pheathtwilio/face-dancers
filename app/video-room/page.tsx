"use client"

import { useEffect, useState, useRef } from "react"
import { connect, Room, createLocalTracks } from "twilio-video"
import { useSearchParams, useRouter } from "next/navigation"
import { Container, Button } from "react-bootstrap"

export default function VideoRoom() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const username = searchParams.get("username") || "Kwisatz Haderach"
  const roomName = "defaultRoom"
  const [room, setRoom] = useState<Room | null>(null)

  let audioDeviceIdRef = useRef<string | null>(null)
  let videoDeviceIdRef = useRef<string | null>(null)

  audioDeviceIdRef.current = searchParams.get("audioDeviceId")
  videoDeviceIdRef.current = searchParams.get("videoDeviceId")

  const joinRoom = async () => {
    try {
      if (!audioDeviceIdRef.current && !videoDeviceIdRef.current) {
        throw new Error(`Video Device is ${videoDeviceIdRef.current} and Audio Device is ${audioDeviceIdRef.current}`)
      }

      const tracks = await createLocalTracks({ 
        audio: { deviceId: audioDeviceIdRef.current || undefined },
        video: { deviceId: videoDeviceIdRef.current || undefined }
      })

      const response = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username, roomName: roomName }),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch Twilio token")
      }

      const wallet = await response.json()

      // Connect to Twilio Video Room
      const twilioRoom = await connect(wallet.token, {
        name: roomName,
        tracks: tracks,
      })

      setRoom(twilioRoom)
    } catch (err) {
      console.error("Failed to connect to Twilio Video:", err)
    }
  }

  const leaveRoom = () => {
    if (room) {
      room.disconnect()
      setRoom(null)
      router.push("/waiting-room")
    }
  };

  useEffect(() => {
    joinRoom();

    return () => {
      if (room) {
        room.disconnect()
      }
    }
  }, [])

  return (
    <Container className="mt-4">
      <h1>Welcome to the Room: {roomName}</h1>

      <div id="video-container">
        {room?.participants.size ? (
          Array.from(room.participants).map(([sid, participant]) => (
            <div key={sid}>
              <h3>{participant.identity}</h3>
              <div id={`video-${sid}`}></div>
            </div>
          ))
        ) : (
          <p>No other participants yet.</p>
        )}
      </div>

      <Button variant="danger" onClick={leaveRoom}>Leave Room</Button> 
    </Container>
  )
}
