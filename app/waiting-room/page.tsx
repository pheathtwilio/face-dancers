"use client"

import { useState, useEffect } from "react"
import { Button, Form, Container, Row, Col } from "react-bootstrap"
import { useSearchParams, useRouter } from "next/navigation"

export default function WaitingRoom() {
  const [username, setUsername] = useState("")
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedAudioDevice, setSelectedAudioDevice] = useState("")
  const [selectedVideoDevice, setSelectedVideoDevice] = useState("")

  const searchParams = useSearchParams()
  const router = useRouter()
  const urlUsername = searchParams.get("username")

  // Set username from the URL when the component mounts
  useEffect(() => {
    if (urlUsername) {
      setUsername(urlUsername)
    }
  }, [urlUsername])

  // Get media devices when the component mounts
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        // Request permission to access media devices
        await navigator.mediaDevices.getUserMedia(
          { audio: {
              noiseSuppression: true,
              echoCancellation: true,
              autoGainControl: true
          }, 
            video: true 
          })

        // List available devices
        const devices = await navigator.mediaDevices.enumerateDevices()
        setAudioDevices(devices.filter((device) => device.kind === "audioinput"))
        setVideoDevices(devices.filter((device) => device.kind === "videoinput"))
      } catch (err) {
        console.error("Error accessing media devices:", err)
      }
    }

    fetchDevices()
  }, [])

  const handleJoinRoom = () => {

    // console.log({
    //   username,
    //   audioDeviceId: selectedAudioDevice,
    //   videoDeviceId: selectedVideoDevice,
    // })

    // Navigate to the video room page with parameters
    router.push(
      `/video-room?username=${encodeURIComponent(username)}&audioDeviceId=${encodeURIComponent(
        selectedAudioDevice
      )}&videoDeviceId=${encodeURIComponent(selectedVideoDevice)}`
    )
  }

  return (
    <Container className="mt-5">
      <h1 className="text-center">Waiting Room</h1>
      <Row className="justify-content-center">
        <Col md={6}>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Username</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                readOnly={!!urlUsername} // Make the field read-only if username is from the URL
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Audio Device</Form.Label>
              <Form.Select
                value={selectedAudioDevice}
                onChange={(e) => setSelectedAudioDevice(e.target.value)}
              >
                <option value="">Select Audio Device</option>
                {audioDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${device.deviceId}`}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Video Device</Form.Label>
              <Form.Select
                value={selectedVideoDevice}
                onChange={(e) => setSelectedVideoDevice(e.target.value)}
              >
                <option value="">Select Video Device</option>
                {videoDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${device.deviceId}`}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Button
              variant="primary"
              onClick={handleJoinRoom}
              className="w-100"
              disabled={!username || !selectedAudioDevice || !selectedVideoDevice} // Disable until all fields are filled
            >
              Join Room
            </Button>
          </Form>
        </Col>
      </Row>
    </Container>
  )
}
