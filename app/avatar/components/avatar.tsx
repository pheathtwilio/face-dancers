import type { StartAvatarResponse } from "@heygen/streaming-avatar"

// import { DeepgramSTTHandler, STTEvent } from "@/app/services/stt"
import { LLM, LLMEvents } from "@/app/services/llm"

import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents, TaskMode, TaskType, VoiceEmotion,
} from "@heygen/streaming-avatar"

import {
    Button,
    Card,
    CardBody,
    Spinner,
  } from "react-bootstrap"

const AVATARS = [
{
    avatar_id: "Eric_public_pro2_20230608",
    name: "Edward in Blue Shirt",
},
{
    avatar_id: "Tyler-incasualsuit-20220721",
    name: "Tyler in Casual Suit",
},
{
    avatar_id: "Anna_public_3_20240108",
    name: "Anna in Brown T-shirt",
},
{
    avatar_id: "Susan_public_2_20240328",
    name: "Susan in Black Shirt",
},
{
    avatar_id: "josh_lite3_20230714",
    name: "Joshua Heygen CEO",
}
]


import { useEffect, useRef, useState } from "react"
import { useMemoizedFn, usePrevious } from "ahooks"

const InteractiveAvatar = () => {
    const [isLoadingSession, setIsLoadingSession] = useState(false)
    const [isLoadingRepeat, setIsLoadingRepeat] = useState(false)
    const [stream, setStream] = useState<MediaStream>()
    const [debug, setDebug] = useState<string>()
    const avatar = useRef<StreamingAvatar | null>(null)

    const [data, setData] = useState<StartAvatarResponse>()
    const [text, setText] = useState<string>("")
    const mediaStream = useRef<HTMLVideoElement>(null)
    const [isUserTalking, setIsUserTalking] = useState(false)
    const [avatarId, setAvatarId] = useState<string>(AVATARS[1].avatar_id)
    const [language, setLanguage] = useState<string>('en')

    const fetchAccessToken = async () => {
        try {
            const response = await fetch("/api/avatar-token", {
            method: "POST",
            });
            const wallet = await response.json()

            console.log(wallet.token)
    
            console.log("Access Token:", wallet.token); // Log the token to verify
    
            return wallet.token
        } catch (error) {
            console.error("Error fetching access token:", error);
        }
    
        return "";
    }

    const startSession = async () => {

        setIsLoadingSession(true);
        const newToken = await fetchAccessToken();

        avatar.current = new StreamingAvatar({
            token: newToken,
        })

        avatar.current.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
            console.log("Avatar started talking", e)
        })

        avatar.current.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
            console.log("Avatar stopped talking", e)
        })

        avatar.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
            console.log("Stream disconnected")
            endSession();
        })

        avatar.current?.on(StreamingEvents.STREAM_READY, (event) => {
            console.log(">>>>> Stream ready:", event.detail)
            setStream(event.detail)
        })

        avatar.current?.on(StreamingEvents.USER_START, (event) => {
            console.log(">>>>> User started talking:", event)
            setIsUserTalking(true)
        })

        avatar.current?.on(StreamingEvents.USER_STOP, (event) => {
            console.log(">>>>> User stopped talking:", event)
        setIsUserTalking(false)
        })

        try {

            const res = await avatar.current.createStartAvatar({
                quality: AvatarQuality.High,
                avatarName: avatarId,
                // knowledgeId: knowledgeId, // Or use a custom `knowledgeBase`.
                voice: {
                  rate: 1.5, // 0.5 ~ 1.5
                  emotion: VoiceEmotion.EXCITED, 
                },
                language: language,
                disableIdleTimeout: true,
            })

            setData(res)

        } catch (error) {
            console.error("Error starting avatar session:", error)
        } finally {
            setIsLoadingSession(false)
        }
    }

    // mount the listener for completions once
    useEffect(() => {

        if(!process.env.NEXT_PUBLIC_GROQ_API_KEY) throw new Error("LLM KEY is null or undefined")
        
        const llm = LLM.getInstance(process.env.NEXT_PUBLIC_GROQ_API_KEY)

        const onResponse = (response: string) => {
            // console.log("RESPONSE ", response)
            setText(response)
            handleSpeak(response)
        }
    
        // console.log("LISTENER COUNT ", llm.listenerCount(LLMEvents.COMPLETION_RESPONSE))
        // if(!llm.listenerCount(LLMEvents.COMPLETION_RESPONSE)){ // prevent memory leaks
        //     console.log("LETS GO")
        llm.on(LLMEvents.COMPLETION_RESPONSE, onResponse)
        // }

        return () => {
            llm.off(LLMEvents.COMPLETION_RESPONSE, onResponse) // clean up
        }

    }, [])


    const handleSpeak = async (text: string) => {
        setIsLoadingRepeat(true)
        if (!avatar.current) {
            setDebug("Avatar API not initialized")
            return
        }

        // interrupt if speaking
        await avatar.current.interrupt()
        .catch((e) => {
          // console.log(e)
          setDebug(e.message)
        })

        // speak({ text: text, task_type: TaskType.REPEAT }) - what does TaskType.TALK do?
        await avatar.current.speak({ text: text, taskType: TaskType.REPEAT, taskMode: TaskMode.SYNC }).catch((e) => {
          // console.log("TEXT TO SPEAK: ", text)  
          setDebug(e.message)
        })
        setIsLoadingRepeat(false)
    }

    const endSession = async () => {
        await avatar.current?.stopAvatar()
        setStream(undefined)
    }

    // const previousText = usePrevious(text)
    // useEffect(() => {
    //     if (!previousText && text) {
    //     avatar.current?.startListening()
    //     } else if (previousText && !text) {
    //     avatar?.current?.stopListening()
    //     }
    // }, [text, previousText])

    useEffect(() => {
        return () => {
            endSession()
        }
    }, [])

    useEffect(() => {
        if (stream && mediaStream.current) {
            mediaStream.current.srcObject = stream
            mediaStream.current.onloadedmetadata = () => {
                mediaStream.current!.play()
                setDebug("Playing")
            }
        }
    }, [mediaStream, stream])

    return (
        <div>
          <Card>
            <CardBody>
              {stream ? (
                <div>
                  <video
                    ref={mediaStream}
                    autoPlay
                    playsInline
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  >
                    <track kind="captions" />
                  </video>
                  <div>
                    <Button
                      onClick={endSession}
                    >
                      End session
                    </Button>
                  </div>
                </div>
              ) : !isLoadingSession ? (
                <div>
                  <Button
                    onClick={startSession}
                  >
                    Start session
                  </Button>
                </div>
              ) : (
                <Spinner color="default" />
              )}
            </CardBody>
          </Card>
        </div>
      )

}

export default InteractiveAvatar

