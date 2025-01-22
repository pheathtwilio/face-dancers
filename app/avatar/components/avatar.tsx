import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation" // Use from next/navigation for App Router
import { Card, CardBody, Spinner } from "react-bootstrap"
import { LLM, LLMEvents } from "@/app/services/llm"
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskMode,
  TaskType,
  VoiceEmotion,
} from "@heygen/streaming-avatar"

// Define the avatars
const AVATARS = [
  { avatar_id: "Eric_public_pro2_20230608", name: "Edward in Blue Shirt" },
  { avatar_id: "Tyler-incasualsuit-20220721", name: "Tyler in Casual Suit" },
  { avatar_id: "Anna_public_3_20240108", name: "Anna in Brown T-shirt" },
  { avatar_id: "Susan_public_2_20240328", name: "Susan in Black Shirt" },
  { avatar_id: "josh_lite3_20230714", name: "Joshua Heygen CEO" },
  { avatar_id: "37f4d912aa564663a1cf8d63acd0e1ab", name: "Sofia"}
]

const InteractiveAvatar = () => {
  const [isLoadingSession, setIsLoadingSession] = useState(false)
  const [isLoadingRepeat, setIsLoadingRepeat] = useState(false)
  const [stream, setStream] = useState<MediaStream>()
  const avatar = useRef<StreamingAvatar | null>(null)

  const [data, setData] = useState<any>()
  const [text, setText] = useState<string>("")
  const mediaStream = useRef<HTMLVideoElement>(null)
  const [isUserTalking, setIsUserTalking] = useState(false)
  const [avatarId, setAvatarId] = useState<string>(AVATARS[5].avatar_id)
  const [language, setLanguage] = useState<string>('en')

  const pathname = usePathname() // Get current path

  const fetchAccessToken = async () => {
    try {
      const response = await fetch("/api/avatar-token", { method: "POST" })
      const wallet = await response.json()
      console.log("Access Token:", wallet.token)
      return wallet.token
    } catch (e) {
      console.error("Error fetching access token:", e)
    }
    return ""
  }

  const startSession = async () => {
    setIsLoadingSession(true)
    const newToken = await fetchAccessToken()

    avatar.current = new StreamingAvatar({ token: newToken })
    
    // Register events
    avatar.current.on(StreamingEvents.AVATAR_START_TALKING, (e) => console.log("Avatar started talking", e))
    avatar.current.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => console.log("Avatar stopped talking", e))
    avatar.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      endSession()
    })
    avatar.current?.on(StreamingEvents.STREAM_READY, (e) => {
      console.log(">>>>> Stream ready:", e.detail)
      setStream(e.detail)
    })
    avatar.current?.on(StreamingEvents.USER_START, (e) => {
      console.log(">>>>> User started talking:", e)
      setIsUserTalking(true)
    })
    avatar.current?.on(StreamingEvents.USER_STOP, (e) => {
      console.log(">>>>> User stopped talking:", e)
      setIsUserTalking(false)
    })

    try {
      const res = await avatar.current.createStartAvatar({
        quality: AvatarQuality.High,
        avatarName: avatarId,
        voice: { rate: 1.5, emotion: VoiceEmotion.EXCITED },
        language: language,
        disableIdleTimeout: true,
      })
      setData(res)
    } catch (e) {
      console.error("Error starting avatar session:", e)
    } finally {
      setIsLoadingSession(false)
    }
  }

  const endSession = async () => {
    console.log("avatar-disconnected")
    await avatar.current?.stopAvatar()
    setStream(undefined)
  }

  useEffect(() => {
    const llm = LLM.getInstance(process.env.NEXT_PUBLIC_GROQ_API_KEY)
    const onResponse = (response: string) => {
      setText(response)
      handleSpeak(response)
    }
    llm.on(LLMEvents.COMPLETION_RESPONSE, onResponse)

    return () => {
      llm.off(LLMEvents.COMPLETION_RESPONSE, onResponse) // Clean up listener
    }
  }, [])

  const handleSpeak = async (text: string) => {
    setIsLoadingRepeat(true)
    if (!avatar.current) {
      console.log("Avatar API not initialized")
      return
    }

    // Interrupt if speaking
    await avatar.current.interrupt().catch((e) => console.log(e.message))
    await avatar.current.speak({ text: text, taskType: TaskType.REPEAT, taskMode: TaskMode.SYNC }).catch((e) => console.log(e.message))
    setIsLoadingRepeat(false)
  }

  // End session when component is unmounted or when navigating away
  useEffect(() => {
    const handleBeforeUnload = () => {
      endSession()
    }

    // Set up the event listener for when the user navigates away or refreshes the page
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload) // Clean up listener
      endSession() // Also clean up session when the component unmounts
    }
  }, [pathname]) // Dependency on pathname ensures cleanup if user navigates away

  useEffect(() => {

      startSession()

      return () => {
          endSession()
      }
  }, [])


  // Handle the media stream
  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play()
      }
    }
  }, [stream])

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
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              >
                {/* <track kind="captions" /> */}
              </video>
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
