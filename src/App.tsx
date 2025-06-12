import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, CameraOff, Circle, Bluetooth, BluetoothOff, Eye, RotateCcw, Loader2, AlertCircle } from 'lucide-react';
import Tesseract from 'tesseract.js';

// Mapeo de Braille a bits, exactamente como en el código de Arduino
const brailleMap = {
  'A': 0b000001, // 1
  'B': 0b000011, // 1,2
  'C': 0b001001, // 1,4
  'D': 0b011001, // 1,4,5
  'E': 0b010001, // 1,5
  'F': 0b001011, // 1,2,4
  'G': 0b011011, // 1,2,4,5
  'H': 0b010011, // 1,2,5
  'I': 0b001010, // 2,4
  'J': 0b011010, // 2,4,5
  'K': 0b000101, // 1,3
  'L': 0b000111, // 1,2,3
  'M': 0b001101, // 1,3,4
  'N': 0b011101, // 1,3,4,5
  'O': 0b010101, // 1,3,5
  'P': 0b001111, // 1,2,3,4
  'Q': 0b011111, // 1,2,3,4,5
  'R': 0b010111, // 1,2,3,5
  'S': 0b001110, // 2,3,4
  'T': 0b011110, // 2,3,4,5
  'U': 0b100101, // 1,3,6
  'V': 0b100111, // 1,2,3,6
  'W': 0b111010, // 2,4,5,6
  'X': 0b101101, // 1,3,4,6
  'Y': 0b111101, // 1,3,4,5,6
  'Z': 0b110101, // 1,3,5,6
  '1': 0b000001, // A
  '2': 0b000011, // B
  '3': 0b001001, // C
  '4': 0b011001, // D
  '5': 0b010001, // E
  '6': 0b001011, // F
  '7': 0b011011, // G
  '8': 0b010011, // H
  '9': 0b001010, // I
  '0': 0b000000, // Todos los puntos abajo
  ' ': 0b000000  // Espacio en blanco
};

// Component to visualize a Braille cell
const BrailleCell = ({ brailleCode, isActive = false }) => {
  // Array of 6 booleans indicating if each dot is active
  // Braille dots arrangement: 1 4
  //                          2 5
  //                          3 6
  const dots = [
    (brailleCode >> 0) & 1, // dot 1
    (brailleCode >> 1) & 1, // dot 2
    (brailleCode >> 2) & 1, // dot 3
    (brailleCode >> 3) & 1, // dot 4
    (brailleCode >> 4) & 1, // dot 5
    (brailleCode >> 5) & 1  // dot 6
  ];

  return (
    <div className={`relative p-4 rounded-xl transition-all duration-300 ${
      isActive 
        ? 'bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-900/30 dark:to-blue-900/30 border-2 border-indigo-300 dark:border-indigo-600 shadow-lg' 
        : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
    }`}>
      <div className="grid grid-cols-2 gap-3 w-20">
        {/* Left column: dots 1, 2, 3 */}
        <div className="flex flex-col gap-2">
          <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
            dots[0] 
              ? 'bg-indigo-600 dark:bg-indigo-400 shadow-md scale-110' 
              : 'bg-gray-300 dark:bg-gray-600'
          }`}></div>
          <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
            dots[1] 
              ? 'bg-indigo-600 dark:bg-indigo-400 shadow-md scale-110' 
              : 'bg-gray-300 dark:bg-gray-600'
          }`}></div>
          <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
            dots[2] 
              ? 'bg-indigo-600 dark:bg-indigo-400 shadow-md scale-110' 
              : 'bg-gray-300 dark:bg-gray-600'
          }`}></div>
        </div>
        
        {/* Right column: dots 4, 5, 6 */}
        <div className="flex flex-col gap-2">
          <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
            dots[3] 
              ? 'bg-indigo-600 dark:bg-indigo-400 shadow-md scale-110' 
              : 'bg-gray-300 dark:bg-gray-600'
          }`}></div>
          <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
            dots[4] 
              ? 'bg-indigo-600 dark:bg-indigo-400 shadow-md scale-110' 
              : 'bg-gray-300 dark:bg-gray-600'
          }`}></div>
          <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
            dots[5] 
              ? 'bg-indigo-600 dark:bg-indigo-400 shadow-md scale-110' 
              : 'bg-gray-300 dark:bg-gray-600'
          }`}></div>
        </div>
      </div>
      
      {isActive && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
      )}
    </div>
  );
};

// Status indicator component
const StatusIndicator = ({ status, message }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'success': return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700';
      case 'error': return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700';
      case 'warning': return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700';
      case 'info': return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700';
      case 'processing': return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700';
      default: return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'processing': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className={`p-4 rounded-lg border transition-all duration-300 ${getStatusColor()}`}>
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  );
};

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [recognizedText, setRecognizedText] = useState('');
  const [displayedChar, setDisplayedChar] = useState('');
  const [currentBrailleDots, setCurrentBrailleDots] = useState(0b000000);
  const [statusMessage, setStatusMessage] = useState('Listo para iniciar la cámara.');
  const [statusType, setStatusType] = useState('info');
  const [charIndex, setCharIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  const [arduinoPort, setArduinoPort] = useState(null);
  const [arduinoWriter, setArduinoWriter] = useState(null);
  const [arduinoConnected, setArduinoConnected] = useState(false);

  // Function to update status with type
  const updateStatus = useCallback((message, type = 'info') => {
    setStatusMessage(message);
    setStatusType(type);
  }, []);

  // Function to start the camera
  const startCamera = useCallback(async () => {
    updateStatus('Iniciando cámara...', 'info');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      videoRef.current.srcObject = mediaStream;
      setStream(mediaStream);
      updateStatus('Cámara iniciada correctamente. ¡Puedes capturar una foto!', 'success');
    } catch (err) {
      console.error('Error al acceder a la cámara:', err);
      updateStatus('Error: No se pudo acceder a la cámara. Asegúrate de dar permisos.', 'error');
    }
  }, [updateStatus]);

  // Function to stop the camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      updateStatus('Cámara detenida.', 'info');
    }
  }, [stream, updateStatus]);

  // Function to capture an image from the video stream
  const captureImage = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      setIsProcessing(true);
      updateStatus('Capturando imagen...', 'processing');
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Ensure the canvas has the same dimensions as the video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageDataUrl = canvas.toDataURL('image/png');
      setCapturedImage(imageDataUrl);
      
      // Start OCR processing
      performOCR(imageDataUrl);
    } else {
      updateStatus('Error: No se pudo capturar la imagen. Asegúrate de que la cámara esté activa.', 'error');
    }
  }, [updateStatus]);

  // Function to perform OCR on the captured image
  const performOCR = useCallback(async (imageDataUrl) => {
    updateStatus('Procesando imagen con OCR...', 'processing');
    setOcrProgress(0);
    
    try {
      const result = await Tesseract.recognize(
        imageDataUrl,
        'eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              const progress = Math.round(m.progress * 100);
              setOcrProgress(progress);
              updateStatus(`Reconociendo texto: ${progress}%`, 'processing');
            }
          }
        }
      );
      
      const text = result.data.text.trim().toUpperCase();
      
      if (text.length > 0) {
        // Filter only valid characters that exist in our Braille map
        const validText = text.split('').filter(char => brailleMap[char]).join('');
        
        if (validText.length > 0) {
          setRecognizedText(validText);
          setCharIndex(0);
          updateStatus(`Texto reconocido: "${validText}". Enviando al Arduino...`, 'success');
        } else {
          updateStatus('No se encontró texto válido en la imagen. Intenta con una imagen más clara.', 'warning');
        }
      } else {
        updateStatus('No se detectó texto en la imagen. Asegúrate de que haya texto visible.', 'warning');
      }
      
      setIsProcessing(false);
      setOcrProgress(0);
      
    } catch (error) {
      console.error('Error en OCR:', error);
      updateStatus(`Error al procesar la imagen: ${error.message}`, 'error');
      setIsProcessing(false);
      setOcrProgress(0);
    }
  }, [updateStatus]);

  // Effect to display the Braille text character by character
  useEffect(() => {
    let timeout;

    const displayNextChar = () => {
      if (recognizedText && charIndex < recognizedText.length) {
        const char = recognizedText[charIndex].toUpperCase();
        setDisplayedChar(char);
        const brailleCode = brailleMap[char] || brailleMap['0'];
        setCurrentBrailleDots(brailleCode);
        
        if (arduinoConnected && arduinoWriter) {
          sendToArduino(char);
          updateStatus(`Mostrando '${char}' (${charIndex + 1}/${recognizedText.length}). Enviado al Arduino.`, 'info');
        } else {
          updateStatus(`Mostrando '${char}' (${charIndex + 1}/${recognizedText.length}). Arduino no conectado.`, 'warning');
        }
        
        setCharIndex(prev => prev + 1);
        timeout = setTimeout(displayNextChar, 3000);
      } else if (recognizedText && charIndex >= recognizedText.length) {
        updateStatus("Texto Braille completado.", 'success');
        setDisplayedChar('');
        setCurrentBrailleDots(0b000000);
        if (arduinoConnected && arduinoWriter) {
          sendToArduino('0');
        }
      }
    };

    if (recognizedText && charIndex === 0) {
      timeout = setTimeout(displayNextChar, 500);
    } else if (recognizedText && charIndex < recognizedText.length) {
      timeout = setTimeout(displayNextChar, 3000);
    }

    return () => clearTimeout(timeout);
  }, [recognizedText, charIndex, arduinoConnected, arduinoWriter, updateStatus]);

  // Reset function
  const resetDisplay = useCallback(() => {
    setRecognizedText('');
    setDisplayedChar('');
    setCurrentBrailleDots(0b000000);
    setCharIndex(0);
    setCapturedImage(null);
    setOcrProgress(0);
    updateStatus('Sistema reiniciado. Listo para nueva captura.', 'info');
    
    // Send reset command to Arduino
    if (arduinoConnected && arduinoWriter) {
      sendToArduino('0');
    }
  }, [updateStatus, arduinoConnected, arduinoWriter]);

  // Arduino connection functions
  const connectToArduino = useCallback(async () => {
    if (!('serial' in navigator)) {
      updateStatus('Error: La API Web Serial no es compatible con este navegador. Usa Chrome o Edge.', 'error');
      return;
    }
    
    updateStatus('Intentando conectar con Arduino...', 'processing');
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 }); // Coincide con el baudRate del Arduino
      setArduinoPort(port);
      const writer = port.writable.getWriter();
      setArduinoWriter(writer);
      setArduinoConnected(true);
      
      // Send initial reset command
      const encoder = new TextEncoder();
      await writer.write(encoder.encode('0'));
      
      updateStatus('Conectado al Arduino exitosamente. Listo para enviar comandos.', 'success');
    } catch (error) {
      console.error('Error al conectar con Arduino:', error);
      updateStatus(`Error al conectar con Arduino: ${error.message}`, 'error');
      setArduinoConnected(false);
    }
  }, [updateStatus]);

  const disconnectFromArduino = useCallback(async () => {
    try {
      if (arduinoWriter) {
        // Send reset command before disconnecting
        try {
          const encoder = new TextEncoder();
          await arduinoWriter.write(encoder.encode('0'));
        } catch (e) {
          console.log('Could not send reset command before disconnect');
        }
        
        await arduinoWriter.releaseLock();
        setArduinoWriter(null);
      }
      if (arduinoPort) {
        await arduinoPort.close();
        setArduinoPort(null);
      }
      setArduinoConnected(false);
      updateStatus('Desconectado del Arduino.', 'info');
    } catch (error) {
      updateStatus(`Error al desconectar: ${error.message}`, 'error');
    }
  }, [arduinoPort, arduinoWriter, updateStatus]);

  const sendToArduino = useCallback(async (data) => {
    if (arduinoWriter) {
      try {
        const encoder = new TextEncoder();
        await arduinoWriter.write(encoder.encode(data));
        console.log(`Carácter '${data}' enviado a Arduino.`);
      } catch (error) {
        console.error('Error al enviar datos a Arduino:', error);
        updateStatus(`Error al enviar datos: ${error.message}`, 'error');
      }
    }
  }, [arduinoWriter, updateStatus]);

  useEffect(() => {
    return () => {
      stopCamera();
      disconnectFromArduino();
    };
  }, [stopCamera, disconnectFromArduino]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-800 text-gray-900 dark:text-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Lector de Braille Inteligente
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Captura texto, reconoce con OCR y convierte a Braille físico con Arduino
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Camera Section */}
          <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                <Camera className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-xl font-semibold">Captura de Imagen</h2>
            </div>

            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
                {!stream && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-gray-400 text-center">
                      Cámara no iniciada<br />
                      <span className="text-sm">Presiona "Iniciar Cámara"</span>
                    </p>
                  </div>
                )}
              </div>

              <canvas ref={canvasRef} className="hidden" />

              <div className="flex gap-2">
                {!stream ? (
                  <button
                    onClick={startCamera}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                  >
                    <Camera className="w-4 h-4" />
                    Iniciar Cámara
                  </button>
                ) : (
                  <>
                    <button
                      onClick={captureImage}
                      disabled={isProcessing}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg disabled:cursor-not-allowed"
                    >
                      <Circle className="w-4 h-4" />
                      {isProcessing ? 'Procesando...' : 'Capturar'}
                    </button>
                    <button
                      onClick={stopCamera}
                      className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                    >
                      <CameraOff className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>

              {/* OCR Progress */}
              {isProcessing && ocrProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Procesando OCR</span>
                    <span>{ocrProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${ocrProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {capturedImage && (
                <div className="space-y-3">
                  <h3 className="font-medium text-center">Imagen Capturada</h3>
                  <img 
                    src={capturedImage} 
                    alt="Captura para OCR" 
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Braille Display Section */}
          <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Eye className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold">Visualización Braille</h2>
            </div>

            <div className="space-y-6 text-center">
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl p-6">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Carácter Actual
                  </p>
                  <div className="text-4xl font-bold text-indigo-700 dark:text-indigo-400 mb-4 h-12 flex items-center justify-center">
                    {displayedChar || '—'}
                  </div>
                  <div className="flex justify-center">
                    <BrailleCell brailleCode={currentBrailleDots} isActive={!!displayedChar} />
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium text-gray-600 dark:text-gray-400">Texto Reconocido</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 min-h-[3rem] flex items-center justify-center">
                    <p className="text-xl font-semibold break-words">
                      {recognizedText || 'Esperando reconocimiento OCR...'}
                    </p>
                  </div>
                  {recognizedText && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Progreso: {charIndex}/{recognizedText.length} caracteres
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={resetDisplay}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200"
              >
                <RotateCcw className="w-4 h-4" />
                Reiniciar
              </button>
            </div>
          </div>

          {/* Arduino Connection Section */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  {arduinoConnected ? (
                    <Bluetooth className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  ) : (
                    <BluetoothOff className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  )}
                </div>
                <h2 className="text-xl font-semibold">Conexión Arduino</h2>
              </div>

              <div className="space-y-4">
                <div className={`flex items-center gap-3 p-3 rounded-lg ${
                  arduinoConnected 
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  <div className={`w-3 h-3 rounded-full ${
                    arduinoConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                  }`}></div>
                  <span className="font-medium">
                    {arduinoConnected ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>

                {!arduinoConnected ? (
                  <button
                    onClick={connectToArduino}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                  >
                    <Bluetooth className="w-4 h-4" />
                    Conectar Arduino
                  </button>
                ) : (
                  <button
                    onClick={disconnectFromArduino}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                  >
                    <BluetoothOff className="w-4 h-4" />
                    Desconectar
                  </button>
                )}

                <div className="text-xs text-gray-500 dark:text-gray-400 text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="font-medium mb-1">Configuración Arduino:</p>
                  <p>• Baudrate: 9600</p>
                  <p>• Servos en pines 2-7</p>
                  <p>• Navegador: Chrome/Edge</p>
                  <p>• Conexión: USB Serial</p>
                </div>
              </div>
            </div>

            {/* Status Section */}
            <StatusIndicator status={statusType} message={statusMessage} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;