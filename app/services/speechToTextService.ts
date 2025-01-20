import { useEffect, useRef, useState } from "react";

import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk"

interface DeepgramOptions {
  diarize?: boolean;
  model?: string;
  smart_format?: boolean;
}

const useDeepgramTranscription = (
  audioDeviceId: string | null,
  deepgramApiKey: string,
  options?: DeepgramOptions
) => {
  const [transcribedText, setTranscribedText] = useState<string>("");
  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    if (!audioDeviceId || !deepgramApiKey){
        throw new Error(`Attempting to connect to Deepgram with AudioDeviceId ${audioDeviceId} and API KEY is ${(deepgramApiKey === null || deepgramApiKey === undefined)? "null or undefined" : "is good"}`)   
    }

    const connectToDeepgram = async () => {
      try {


        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: audioDeviceId },
        })

        const deepgram = createClient(deepgramApiKey)

        console.log(deepgram)

        let is_finals:any = []

        const connection = deepgram.listen.live({
            language: "en-US",
            model: "nova-2",
            smart_format: true,
            interim_results: true,
            utterance_end_ms: 1000,
            vad_events: true,
            endpointing: 300
        })
    
        connection.on(LiveTranscriptionEvents.Open, () => {

            mediaRecorderRef.current = new MediaRecorder(stream)

            mediaRecorderRef.current.ondataavailable = (event) => {
                if(event.data.size > 0){
                    connection.send(event.data)
                }
            }

            mediaRecorderRef.current.start(250)

            mediaRecorderRef.current.onstop = () => {
                if(mediaRecorderRef.current){
                    mediaRecorderRef.current.stop()
                }
            }

            connection.on(LiveTranscriptionEvents.Close, () => {
                if(mediaRecorderRef.current){
                    mediaRecorderRef.current.stop()
                }
                console.log("Connection Closed")
            })

            connection.on(LiveTranscriptionEvents.Metadata, (data) => {
                console.log(`Deepgram Metadata: ${data}`)
            })

            connection.on(LiveTranscriptionEvents.Transcript, (data) => {
                const sentence = data.channel.alternatives[0].transcript

                // ignore empty transcripts
                if(sentence.length == 0) return

                // if(data.is_final){
                    
                //     is_finals.push(sentence)
        
                //     if(data.speech_final){
                //         const utterance = is_finals.join(" ")
                //         console.log(`Speech Final: ${utterance}`)
                //         setTranscribedText(utterance)
                //         is_finals = []
                //     }else{
                //         console.log(`Is Final ${sentence}`)
                //         setTranscribedText(sentence)
                //     }

                // }else{
                //     console.log(`Is Final: ${sentence}`)
                //     setTranscribedText(sentence)
                // }

                if(data.speech_final){ // TODO send to LLM Service
                    setTranscribedText(data.channel.alternatives[0].transcript)
                }

            })

        })

        connection.on(LiveTranscriptionEvents.UtteranceEnd, (_data) => {
            const utterance = is_finals.join(" ")
            console.log(`Deepgram Utterance End: ${utterance}`)
            setTranscribedText(utterance)
            is_finals = []
        })

        connection.on(LiveTranscriptionEvents.SpeechStarted, (_data) => {
            console.log("Deepgram Speech Started")
        })

        connection.on(LiveTranscriptionEvents.Error, (err) => {
            if(mediaRecorderRef.current){
                mediaRecorderRef.current.stop()
            }
            console.error(err)
        })




      } catch (err) {
        console.error("Failed to initialize Deepgram transcription:", err)
      }

    }

    connectToDeepgram()
  }, [audioDeviceId, deepgramApiKey, options])

  return { transcribedText }
}

export default useDeepgramTranscription;
