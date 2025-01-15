"use client";

import { useEffect, useState } from "react";
import { connect, Room } from "twilio-video";
import { useSearchParams } from "next/navigation";
import { Container, Form, Button, Row, Col } from "react-bootstrap";

export default function VideoRoom() {
  const searchParams = useSearchParams();
  const username = searchParams.get("username") || "Guest";
  const roomName = "defaultRoom";
  const [room, setRoom] = useState<Room | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string | undefined>(undefined);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string | undefined>(undefined);

  const joinRoom = async () => {
    try {

        const response = await fetch("/api/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
                { username: username, roomName: roomName }
            ),
        })

        if (!response.ok) {
            throw new Error("Failed to fetch Twilio token");
        }

        const wallet = await response.json()

        console.log(wallet.token)


        // Connect to Twilio Video Room
        // const twilioRoom = await connect(token, {
        //     name: roomName,
        //     audio: true,
        //     video: { deviceId: selectedVideoDevice },
        // });

        // setRoom(twilioRoom);
    } catch (err) {
    console.error("Failed to connect to Twilio Video:", err);
    }
}


  // Enumerate available media devices
  useEffect(() => {
    // const getDevices = async () => {
    //   const devices = await navigator.mediaDevices.enumerateDevices();
    //   const video = devices.filter((device) => device.kind === "videoinput");
    //   const audio = devices.filter((device) => device.kind === "audioinput");
    //   setVideoDevices(video);
    //   setAudioDevices(audio);
    // };

    // getDevices();

    
 
    joinRoom()

  }, []);



//   useEffect(() => {
//     const joinRoom = async () => {
//       try {
//         const response = await fetch("/api/token", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ username, roomName }),
//         });

//         if (!response.ok) {
//           throw new Error("Failed to fetch Twilio token");
//         }

//         const { token } = await response.json();

//         console.log("TOKEN ")

//         // Connect to Twilio Video Room
//         const twilioRoom = await connect(token, {
//           name: roomName,
//           audio: true,
//           video: { deviceId: selectedVideoDevice },
//         });

//         setRoom(twilioRoom);
//       } catch (err) {
//         console.error("Failed to connect to Twilio Video:", err);
//       }
//     };

//     if (selectedAudioDevice && selectedVideoDevice) {
//       joinRoom();
//     }
//   }, [username, roomName, selectedAudioDevice, selectedVideoDevice]);

//     try {
//     const response = await fetch("/api/token", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ username, roomName }),
//     });

//     if (!response.ok) {
//       throw new Error("Failed to fetch Twilio token");
//     }

//     const { token } = await response.json();

//     console.log("TOKEN ")

//     // Connect to Twilio Video Room
//     const twilioRoom = await connect(token, {
//       name: roomName,
//       audio: true,
//       video: { deviceId: selectedVideoDevice },
//     });

//     setRoom(twilioRoom);
//   } catch (err) {
//     console.error("Failed to connect to Twilio Video:", err);
//   }

// console.log(username)


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
    </Container>
  );
}
