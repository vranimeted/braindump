import { useState, useCallback, useRef } from 'react';

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const recognitionRef = useRef<any>(null);

  const initializeRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('Speech recognition started');
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const currentIndex = event.results.length - 1;
      if (event.results[currentIndex].isFinal) {
        const newTranscript = event.results[currentIndex][0].transcript;
        setTranscribedText(prev => prev ? `${prev} ${newTranscript}` : newTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const startRecording = useCallback(() => {
    if (!recognitionRef.current) {
      initializeRecognition();
    }
    
    try {
      recognitionRef.current?.start();
    } catch (error) {
      console.error('Error starting recognition:', error);
    }
  }, [initializeRecognition]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  const clearTranscription = useCallback(() => {
    setTranscribedText('');
  }, []);

  return {
    isRecording,
    transcribedText,
    startRecording,
    stopRecording,
    clearTranscription,
  };
} 