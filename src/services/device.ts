/**
 * Device Hardware Integration Service for Android Companion
 * Covers Dialer, SMS, Contacts Picker, Camera, and Microphone.
 */

export interface ContactPickerResult {
  name: string;
  tel: string;
  email?: string;
}

/**
 * Checks if Contact Picker API is supported in current Android browser
 */
export function isContactPickerSupported(): boolean {
  return 'contacts' in navigator && 'ContactsManager' in window;
}

/**
 * Opens native Android Contact Picker to select a phone contact
 */
export async function pickNativeContact(): Promise<ContactPickerResult | null> {
  if (!isContactPickerSupported()) {
    return null;
  }

  try {
    const props = ['name', 'tel', 'email'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contacts = await (navigator as any).contacts.select(props, { multiple: false });
    if (contacts && contacts.length > 0) {
      const c = contacts[0];
      return {
        name: c.name?.[0] || 'مخاطب بدون نام',
        tel: c.tel?.[0] || '',
        email: c.email?.[0] || '',
      };
    }
  } catch (err) {
    console.warn('Contact picker was cancelled or failed:', err);
  }
  return null;
}

/**
 * Initiates phone call by triggering Android Dialer with selected number
 */
export function triggerPhoneCall(phoneNumber: string): void {
  const cleaned = phoneNumber.replace(/[^0-9+]/g, '');
  if (!cleaned) return;
  window.location.href = `tel:${cleaned}`;
}

/**
 * Opens Android default SMS app with recipient and prefilled body text
 */
export function triggerSendSms(phoneNumber: string, bodyText: string = ''): void {
  const cleaned = phoneNumber.replace(/[^0-9+]/g, '');
  const encodedBody = encodeURIComponent(bodyText);
  // Android supports sms:number?body=text
  window.location.href = `sms:${cleaned}?body=${encodedBody}`;
}

/**
 * Trigger subtle haptic vibration if supported on phone
 */
export function vibratePhone(durationOrPattern: number | number[] = 30): void {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(durationOrPattern);
    }
  } catch {
    // Ignore if not permitted
  }
}

/**
 * Audio Recorder Controller with Web Audio API for visualizer
 */
export class AudioRecorderController {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  async start(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(this.stream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Set up AudioContext for real-time waveform visualizer
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser);

      this.mediaRecorder.start(200);
      return true;
    } catch (err) {
      console.error('Error starting audio recording:', err);
      return false;
    }
  }

  getAudioFrequencyData(dataArray: Uint8Array): void {
    if (this.analyser) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.analyser.getByteFrequencyData(dataArray as any);
    }
  }

  stop(): Promise<{ blob: Blob; dataUrl: string; duration: number }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('Recorder not initialized'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          resolve({ blob, dataUrl, duration: 0 });
        };
        reader.readAsDataURL(blob);

        // Stop all audio tracks
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
          this.stream = null;
        }

        if (this.audioContext && this.audioContext.state !== 'closed') {
          this.audioContext.close();
          this.audioContext = null;
        }
      };

      this.mediaRecorder.stop();
    });
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}
