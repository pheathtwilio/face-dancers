import { EventEmitter } from 'events'
import { createClient, DeepgramClient, ListenLiveClient, LiveTranscriptionEvents } from "@deepgram/sdk"

type DeepgramSTTOptions = {
  apiKey: string
  config: {
    language?: string
    punctuate?: boolean
    interimResults?: boolean
    timeslice: number
  }
}

enum STTEvent {
    CONNECTED = 'stt-connected',
    CLOSED = 'stt-closed',
    DISCONNECTED = 'stt-disconnected',
    ERROR = 'stt-error',
    SENDING = 'stt-sending',
    TRANSCRIPT = 'stt-transcript',
}

class DeepgramSTTHandler extends EventEmitter {
  private deepgram?: DeepgramClient
  private connection?: ListenLiveClient
  private audioStream?: MediaStream
  private audioRecorder?: MediaRecorder

  constructor(private options: DeepgramSTTOptions) {
    super();
    if (!options.apiKey) {
      throw new Error('Deepgram API key is required.');
    }

    this.deepgram = createClient(options.apiKey)
  }

/**
 * Connects to the Deepgram streaming endpoint.
 * @param audioDeviceId - An audio device ID
 */
public async connect(audioDeviceId: string): Promise<void> {

    // get the audiodevice media recorder object
    if(!audioDeviceId) throw new Error("STT Service -> No Audio Device Id")

    const constraints = {
        audio: { deviceId: audioDeviceId }
    };

    this.audioStream = await navigator.mediaDevices.getUserMedia(constraints)

    if(!this.audioStream) throw new Error("STT Service -> No Audio Stream Created")

    this.audioRecorder = new MediaRecorder(this.audioStream)

    if(!this.audioRecorder) throw new Error("STT Service -> No Audio Recorder Created")

    try {
        this.connection = await this.deepgram?.listen.live(this.options.config)

        if(!this.connection){
            throw new Error("STT Service -> No Deepgram connection created")
        }

        this.connection?.on(LiveTranscriptionEvents.Open, () => {
            this.emit(STTEvent.CONNECTED)
            this.audioRecorder?.start(this.options.config.timeslice) // TODO create a shared constant that can be set in config
            
            if(this.audioRecorder){
                this.audioRecorder.ondataavailable = e => {
                    this.emit(STTEvent.SENDING)
                    this.connection?.send(e.data)
                }   
            }

        })

        this.connection?.on(LiveTranscriptionEvents.Transcript, (data) => {
            if(data.speech_final){
                this.emit(STTEvent.TRANSCRIPT, data.channel.alternatives[0].transcript)
            }
        })

        this.connection?.on(LiveTranscriptionEvents.Close, () => {this.emit(STTEvent.CLOSED); console.log("STT Service -> Deepgram connection closed")})

        this.connection?.on(LiveTranscriptionEvents.Error, (e) => {this.emit(STTEvent.ERROR); console.error(e)})

    }catch(e){console.error(e)}

}

  /**
   * Disconnects the WebSocket connection.
   */
  public disconnect(): void {
    if (this.connection) {
        this.connection.disconnect()
        this.connection = undefined
    }
  }
}

export { DeepgramSTTHandler, STTEvent } 
export type { DeepgramSTTOptions }

