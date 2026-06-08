import React, { useState } from 'react';
import Chart from 'react-apexcharts';
import { Activity, MapPin, Compass, Battery, Mic, Cpu, FileJson, Thermometer, Droplets } from 'lucide-react';

const SensorApp = () => {
  // Estados dos Sensores
  const [accel, setAccel] = useState({ x: 0, y: 0, z: 0 });
  const [orientation, setOrientation] = useState({ alpha: 0, beta: 0, gamma: 0 });
  const [location, setLocation] = useState({ lat: null, lon: null });
  const [battery, setBattery] = useState({ level: 0, charging: false });
  const [volume, setVolume] = useState(0);
  const [sysInfo, setSysInfo] = useState({ cores: 0, resolution: "" });
  
  // NOVO: Estado para o Clima (Temperatura e Umidade)
  const [weather, setWeather] = useState({ temp: null, humidity: null });
  
  const [chartData, setChartData] = useState([]);
  const [active, setActive] = useState(false);

  const requestPermissions = async () => {
    try {
      // 1. Movimento e Orientação (iOS exige permissão)
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        const res = await DeviceMotionEvent.requestPermission();
        if (res === 'granted') startHardwareFeatures();
      } else {
        startHardwareFeatures();
      }

      // 2. Localização contínua
      navigator.geolocation.watchPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );

      // 3. NOVO: Buscar Clima (Dispara apenas uma vez pegando a posição atual)
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m`);
          const data = await response.json();
          if (data.current) {
            setWeather({
              temp: data.current.temperature_2m,
              humidity: data.current.relative_humidity_2m
            });
          }
        } catch (error) {
          console.error("Erro ao buscar clima via API", error);
        }
      });

      // 4. Microfone
      startAudioMonitor();

      // 5. Bateria
      if (navigator.getBattery) {
        navigator.getBattery().then(bat => {
          setBattery({ level: (bat.level * 100).toFixed(0), charging: bat.charging });
        });
      }

      // 6. Info do Sistema
      setSysInfo({
        cores: navigator.hardwareConcurrency || "N/A",
        resolution: `${window.screen.width}x${window.screen.height}`
      });

      setActive(true);
    } catch (err) {
      alert("Erro ao ativar sensores: " + err);
    }
  };

  const startHardwareFeatures = () => {
    window.addEventListener('devicemotion', (event) => {
      const x = event.accelerationIncludingGravity.x || 0;
      setAccel({ 
        x, 
        y: event.accelerationIncludingGravity.y || 0, 
        z: event.accelerationIncludingGravity.z || 0 
      });
      setChartData(prev => [...prev, x.toFixed(2)].slice(-20));
    });

    window.addEventListener('deviceorientation', (event) => {
      setOrientation({
        alpha: event.alpha?.toFixed(0) || 0,
        beta: event.beta?.toFixed(0) || 0,
        gamma: event.gamma?.toFixed(0) || 0
      });
    });
  };

  const startAudioMonitor = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      microphone.connect(analyser);
      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let values = 0;
        for (let i = 0; i < dataArray.length; i++) values += dataArray[i];
        setVolume((values / dataArray.length).toFixed(0));
        requestAnimationFrame(updateVolume);
      };
      updateVolume();
    } catch (err) { console.log("Som desativado"); }
  };

  const exportJSON = () => {
    // Adicionamos o clima ao relatório exportado
    const data = { accel, orientation, location, weather, battery, sysInfo, timestamp: new Date() };
    console.log("Relatório Completo:", JSON.stringify(data, null, 2));
    alert("Dados enviados para o console!");
  };

  const chartOptions = {
    chart: { id: 'realtime', animations: { enabled: false }, toolbar: { show: false }, background: 'transparent' },
    stroke: { curve: 'smooth', width: 3, colors: ['#3b82f6'] },
    xaxis: { labels: { show: false }, axisBorder: { show: false } },
    yaxis: { min: -15, max: 15, labels: { style: { colors: '#666' } } },
    grid: { borderColor: '#333' },
    theme: { mode: 'dark' }
  };

  const cardStyle = {
    background: '#1e1e1e',
    padding: '15px',
    borderRadius: '15px',
    border: '1px solid #333',
    color: 'white'
  };

  return (
    <div style={{ 
      backgroundColor: '#000000', 
      minHeight: '100vh', 
      color: 'white', 
      fontFamily: 'sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: !active ? 'center' : 'flex-start',
      padding: '20px'
    }}>
      
      {!active ? (
        <div style={{ textAlign: 'center' }}>
          <Activity color="#3b82f6" size={60} style={{ marginBottom: '20px' }} />
          <h1 style={{ marginBottom: '10px' }}>Sensor Hub Pro</h1>
          <p style={{ color: '#888', marginBottom: '30px' }}>Sistema de Diagnóstico de Hardware</p>
          <button 
            onClick={requestPermissions}
            style={{ 
              padding: '20px 40px', 
              background: '#3b82f6', 
              color: 'white', 
              border: 'none', 
              borderRadius: '50px', 
              fontSize: '18px', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)'
            }}
          >
            INICIAR SENSORES
          </button>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <header style={{ textAlign: 'center', marginBottom: '10px' }}>
            <h2 style={{ color: '#3b82f6', margin: 0 }}>SISTEMA ATIVO</h2>
            <small style={{ color: '#666' }}>Monitorando Dispositivo via Web</small>
          </header>

          {/* Gráfico Acelerômetro */}
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#3b82f6' }}><Activity size={16} /> MOVIMENTO (EIXO X)</h3>
            <Chart options={chartOptions} series={[{ data: chartData }]} type="line" height={130} />
          </div>

          {/* NOVO: Grid de Clima */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div style={cardStyle}>
              <h4 style={{ margin: 0, fontSize: '12px', color: '#888' }}><Thermometer size={14} /> TEMP. AMBIENTE</h4>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '10px 0' }}>
                {weather.temp ? `${weather.temp}°C` : 'Buscando...'}
              </p>
            </div>
            <div style={cardStyle}>
              <h4 style={{ margin: 0, fontSize: '12px', color: '#888' }}><Droplets size={14} /> UMIDADE</h4>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '10px 0' }}>
                {weather.humidity ? `${weather.humidity}%` : 'Buscando...'}
              </p>
            </div>
          </div>

          {/* Grid de Sensores Rápidos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div style={cardStyle}>
              <h4 style={{ margin: 0, fontSize: '12px', color: '#888' }}><Compass size={14} /> BÚSSOLA</h4>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '10px 0' }}>{orientation.alpha}°</p>
            </div>
            <div style={cardStyle}>
              <h4 style={{ margin: 0, fontSize: '12px', color: '#888' }}><Mic size={14} /> RUÍDO</h4>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '10px 0' }}>{volume}</p>
            </div>
          </div>

          {/* GPS */}
          <div style={cardStyle}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#888' }}><MapPin size={14} /> LOCALIZAÇÃO GPS</h4>
            <div style={{ fontSize: '14px', fontFamily: 'monospace' }}>
              <div>LAT: {location.lat?.toFixed(6) || '---'}</div>
              <div>LON: {location.lon?.toFixed(6) || '---'}</div>
            </div>
          </div>

          {/* Hardware & Bateria */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div style={cardStyle}>
              <h4 style={{ margin: 0, fontSize: '12px', color: '#888' }}><Battery size={14} /> BATERIA</h4>
              <p style={{ fontSize: '16px', marginTop: '10px' }}>{battery.level > 0 ? `${battery.level}%` : "N/A (iOS)"}</p>
            </div>
            <div style={cardStyle}>
              <h4 style={{ margin: 0, fontSize: '12px', color: '#888' }}><Cpu size={14} /> CPU</h4>
              <p style={{ fontSize: '16px', marginTop: '10px' }}>{sysInfo.cores} Cores</p>
            </div>
          </div>

          {/* Ações */}
          <button 
            onClick={exportJSON}
            style={{ 
              padding: '15px', 
              background: 'transparent', 
              color: '#10b981', 
              border: '1px solid #10b981', 
              borderRadius: '10px', 
              fontWeight: 'bold',
              marginTop: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <FileJson size={18} /> EXPORTAR RELATÓRIO
          </button>

          <footer style={{ textAlign: 'center', fontSize: '10px', color: '#444', marginTop: '20px' }}>
            PROJETO ACADÊMICO - SEGURANÇA WEB BY @JVBENETTI
          </footer>
        </div>
      )}
    </div>
  );
};

export default SensorApp;