import React, { useState, useEffect } from 'react';
import Chart from 'react-apexcharts';
import { Activity, MapPin, Smartphone } from 'lucide-react';

const SensorApp = () => {
  const [accel, setAccel] = useState({ x: 0, y: 0, z: 0 });
  const [location, setLocation] = useState({ lat: null, lon: null });
  const [chartData, setChartData] = useState([]);
  const [active, setActive] = useState(false);

  const requestPermissions = async () => {
    // 1. Permissão de Movimento (iOS)
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      const res = await DeviceMotionEvent.requestPermission();
      if (res === 'granted') startSensors();
    } else {
      startSensors();
    }

    // 2. Permissão de Localização
    navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
  };

  const startSensors = () => {
    setActive(true);
    window.addEventListener('devicemotion', (event) => {
      const x = event.accelerationIncludingGravity.x || 0;
      setAccel({ x, y: event.accelerationIncludingGravity.y, z: event.accelerationIncludingGravity.z });
      
      // Atualiza o gráfico (mantém apenas os últimos 20 registros para performance)
      setChartData(prev => [...prev, x.toFixed(2)].slice(-20));
    });
  };

  const chartOptions = {
    chart: { id: 'realtime', animations: { enabled: false }, toolbar: { show: false } },
    stroke: { curve: 'smooth', width: 3, colors: ['#3b82f6'] },
    xaxis: { labels: { show: false } },
    yaxis: { min: -15, max: 15 },
    grid: { borderColor: '#e7e7e7' }
  };

  const series = [{ name: 'Eixo X', data: chartData }];

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '500px', margin: 'auto' }}>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Activity color="#3b82f6" /> Sensor Hub
      </h1>

      {!active ? (
        <button 
          onClick={requestPermissions}
          style={{ width: '100%', padding: '15px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold' }}
        >
          ATIVAR SENSORES E GPS
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Card de Acelerômetro */}
          <div style={{ background: '#f3f4f6', padding: '15px', borderRadius: '12px' }}>
            <h3 style={{ margin: '0 0 10px 0' }}><Smartphone size={18} /> Acelerômetro</h3>
            <div style={{ display: 'flex', justifyContent: 'space-around' }}>
              <span>X: {Number(accel.x).toFixed(2)}</span>
              <span>Y: {Number(accel.y).toFixed(2)}</span>
              <span>Z: {Number(accel.z).toFixed(2)}</span>
            </div>
            <Chart options={chartOptions} series={series} type="line" height={150} />
          </div>

          {/* Card de Localização */}
          <div style={{ background: '#f3f4f6', padding: '15px', borderRadius: '12px' }}>
            <h3 style={{ margin: '0 0 10px 0' }}><MapPin size={18} /> Localização Atual</h3>
            <p>Lat: {location.lat || 'Buscando...'}</p>
            <p>Lon: {location.lon || 'Buscando...'}</p>
            <small>Para ver cidade/estado, você precisaria de uma API como Google Maps.</small>
          </div>

        </div>
      )}
    </div>
  );
};

export default SensorApp;