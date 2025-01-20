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
    INTERIM = 'stt-interim',
    SENDING = 'stt-sending',
    TRANSCRIPT = 'stt-transcript',
}

class DeepgramSTTHandler extends EventEmitter {

  static _instance:DeepgramSTTHandler | null = null

  private deepgram?: DeepgramClient
  private connection?: ListenLiveClient
  private audioStream?: MediaStream
  private audioRecorder?: MediaRecorder

  constructor(private options: DeepgramSTTOptions) {
    if(DeepgramSTTHandler._instance){
      throw new Error("Use DeepgramSTTHandler.getInstance() to access this property")
    }

    super()
    if (!options.apiKey) {
      throw new Error(STTEvent.ERROR+ ' Deepgram API key is required.');
    }

    this.deepgram = createClient(options.apiKey)

    DeepgramSTTHandler._instance = this
  }

  // ES6 modules can do alternative export of instance variable
  static getInstance(options: DeepgramSTTOptions) {
    if (!DeepgramSTTHandler._instance) {
      console.log("No instance, instantiating a new STT instance")
      DeepgramSTTHandler._instance = new DeepgramSTTHandler(options)
    }
    return DeepgramSTTHandler._instance
  }

/**
 * Connects to the Deepgram streaming endpoint.
 * @param audioDeviceId - An audio device ID
 */
public async connect(audioDeviceId: string): Promise<void> {

    if(this.connection){

      console.warn("Attempting to connect to deepgram when connection is alive")

    }else{

      // get the audiodevice media recorder object
    if(!audioDeviceId) throw new Error(STTEvent.ERROR + " No Audio Device Id")

      const constraints = {
          audio: { deviceId: audioDeviceId }
      };
  
      this.audioStream = await navigator.mediaDevices.getUserMedia(constraints)
  
      if(!this.audioStream) throw new Error(STTEvent.ERROR + " No Audio Stream Created")
  
      this.audioRecorder = new MediaRecorder(this.audioStream)
  
      if(!this.audioRecorder) throw new Error(STTEvent.ERROR + " No Audio Recorder Created")
  
      try {
          this.connection = await this.deepgram?.listen.live(this.options.config)
  
          if(!this.connection){
              throw new Error(STTEvent.ERROR + " No Deepgram connection created")
          }
  
          this.connection?.on(LiveTranscriptionEvents.Open, () => {
              this.emit(STTEvent.CONNECTED)
              console.log(STTEvent.CONNECTED)
              this.audioRecorder?.start(this.options.config.timeslice) // TODO create a shared constant that can be set in config
              
              if(this.audioRecorder){
                  this.audioRecorder.ondataavailable = e => {
                      this.emit(STTEvent.SENDING)
                      console.log(STTEvent.SENDING)
                      this.connection?.send(e.data)
                  }   

                  this.audioRecorder.onstop = () => {
                    this.audioRecorder?.stop()
                  }
              }
  
          })
  
          let is_finals:string[] = []
  
          this.connection?.on(LiveTranscriptionEvents.Transcript, (data) => {
  
            const sentence = data.channel.alternatives[0].transcript
  
            if(sentence.length == 0) return // ignore empty transcripts
  
            if(data.is_final){
              //  concatenate the pieces
              is_finals.push(sentence)
  
              if(data.speech_final){
                const utterance = is_finals.join(" ")
                is_finals = []
                this.emit(STTEvent.TRANSCRIPT, utterance)
                console.log(STTEvent.TRANSCRIPT, utterance)
              }else{
                console.log(STTEvent.INTERIM, sentence) // good for real-time captioning
              }
  
            }else{
              console.log(STTEvent.INTERIM, sentence) // good for real-time captioning
            }
  
              
          })
  
          this.connection?.on(LiveTranscriptionEvents.Close, () => {this.emit(STTEvent.CLOSED); this.connection?.disconnect(); console.log(STTEvent.CLOSED + " Deepgram connection closed")})
  
          this.connection?.on(LiveTranscriptionEvents.Error, (e) => {this.emit(STTEvent.ERROR); this.connection?.disconnect(); console.error(e)})
  
      }catch(e){console.error(e)}

    }

}

  /**
   * Disconnects the WebSocket connection.
   */
  public disconnect(): void {
    if(this.connection) {
        this.connection.disconnect()
        this.connection = undefined
        console.log(STTEvent.DISCONNECTED)
        this.emit(STTEvent.DISCONNECTED)
    }
    if(this.audioRecorder){
      this.audioRecorder.stop()
    }
  }
}

export { DeepgramSTTHandler, STTEvent } 
export type { DeepgramSTTOptions }

