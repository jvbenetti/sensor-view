import React, { useState, useEffect } from 'react';

const SensorTest = () => {
  const [data, setData] = useState({ x: 0, y: 0, z: 0 });
  const [isSupported, setIsSupported] = useState(false);

  const requestPermission = async () => {
    // Verifica se o navegador exige permissão (iOS)
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      const permission = await DeviceMotionEvent.requestPermission();
      if (permission === 'granted') {
        startListening();
      }
    } else {
      // Android e navegadores desktop
      startListening();
    }
  };

  const startListening = () => {
    window.addEventListener('devicemotion', (event) => {
      setData({
        x: event.accelerationIncludingGravity.x?.toFixed(2),
        y: event.accelerationIncludingGravity.y?.toFixed(2),
        z: event.accelerationIncludingGravity.z?.toFixed(2),
      });
    });
    setIsSupported(true);
  };

  return (
    <div className="flex flex-col items-center p-10">
      <h1 className="text-2xl font-bold">Sensor Test iPhone 16</h1>
      {!isSupported && (
        <button 
          onClick={requestPermission}
          className="bg-blue-500 text-white p-4 rounded-lg mt-5"
        >
          Ativar Sensores
        </button>
      )}
      <div className="mt-10">
        <p>Eixo X: {data.x}</p>
        <p>Eixo Y: {data.y}</p>
        <p>Eixo Z: {data.z}</p>
      </div>
    </div>
  );
};

export default SensorTest;