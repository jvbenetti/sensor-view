import React, { useState, useEffect, useRef } from 'react';
import Chart from 'react-apexcharts';
import { Activity, MapPin, Smartphone, Compass, Battery, Mic, Cpu, FileJson } from 'lucide-react';

const SensorApp = () => {
  // Estados dos Sensores
  const [accel, setAccel] = useState({ x: 0, y: 0, z: 0 });
  const [orientation, setOrientation] = useState({ alpha: 0, beta: 0, gamma: 0 });
  const [location, setLocation] = useState({ lat: null, lon: null });
  const [battery, setBattery] = useState({ level: 0, charging: false });
  const [volume, setVolume] = useState(0);
  const [sysInfo, setSysInfo] = useState({ cores: 0, resolution: "" });
  
  const [chartData, setChartData] = useState([]);
  const [active, setActive] = useState(false);
  const audioContextRef = useRef(null);

  const requestPermissions = async () => {
    try {
      // 1. Permissão de Movimento e Orientação (iOS)
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        const res = await DeviceMotionEvent.requestPermission();
        if (res === 'granted') startHardwareFeatures();
      } else {
        startHardwareFeatures();
      }

      // 2. Permissão de Localização
      navigator.geolocation.watchPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );

      // 3. Permissão de Microfone (Decibelímetro)
      startAudioMonitor();

      // 4. Bateria (Não suportado no Safari/iOS, mas funciona no Android)
      if (navigator.getBattery) {
        navigator.getBattery().then(bat => {
          setBattery({ level: (bat.level * 100).toFixed(0), charging: bat.charging });
          bat.addEventListener('levelchange', () => setBattery(prev => ({ ...prev, level: (bat.level * 100).toFixed(0) })));
        });
      }

      // 5. Info do Sistema
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
    // Acelerômetro
    window.addEventListener('devicemotion', (event) => {
      const x = event.accelerationIncludingGravity.x || 0;
      setAccel({ 
        x, 
        y: event.accelerationIncludingGravity.y || 0, 
        z: event.accelerationIncludingGravity.z || 0 
      });
      setChartData(prev => [...prev, x.toFixed(2)].slice(-20));
    });

    // Bússola / Orientação
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
    } catch (err) {
      console.log("Microfone bloqueado ou não suportado");
    }
  };

  const exportJSON = () => {
    const data = { accel, orientation, location, battery, sysInfo, timestamp: new Date() };
    console.log("Relatório do Dispositivo:", data);
    alert("Relatório gerado no Console do Navegador!");
  };

  const chartOptions = {
    chart: { id: 'realtime', animations: { enabled: false }, toolbar: { show: false } },
    stroke: { curve: 'smooth', width: 3, colors: ['#3b82f6'] },
    xaxis: { labels: { show: false } },
    yaxis: { min: -15, max: 15 },
    grid: { borderColor: '#e7e7e7' }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: 'auto', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <header style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#1f2937' }}>
          <Activity color="#3b82f6" size={32} /> Sensor Hub Pro
        </h1>
        <p style={{ color: '#6b7280' }}>Monitoramento de Hardware em Tempo Real</p>
      </header>

      {!active ? (
        <button 
          onClick={requestPermissions}
          style={{ width: '100%', padding: '20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
        >
          INICIAR DIAGNÓSTICO COMPLETO
        </button>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          
          {/* Acelerômetro - Ocupa 2 colunas */}
          <div style={{ gridColumn: 'span 2', background: 'white', padding: '15px', borderRadius: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><Smartphone size={18} /> Movimento (G)</h3>
            <Chart options={chartOptions} series={[{ name: 'Eixo X', data: chartData }]} type="line" height={120} />
          </div>

          {/* Bússola */}
          <div style={{ background: 'white', padding: '15px', borderRadius: '15px' }}>
            <h4 style={{ margin: '0', display: 'flex', alignItems: 'center', gap: '5px' }}><Compass size={16} /> Bússola</h4>
            <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '10px 0' }}>{orientation.alpha}° <small>N</small></p>
          </div>

          {/* Som */}
          <div style={{ background: 'white', padding: '15px', borderRadius: '15px' }}>
            <h4 style={{ margin: '0', display: 'flex', alignItems: 'center', gap: '5px' }}><Mic size={16} /> Nível de Som</h4>
            <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '10px 0' }}>{volume} <small>un</small></p>
          </div>

          {/* Localização */}
          <div style={{ gridColumn: 'span 2', background: 'white', padding: '15px', borderRadius: '15px' }}>
            <h4 style={{ margin: '0', display: 'flex', alignItems: 'center', gap: '5px' }}><MapPin size={16} /> GPS</h4>
            <p style={{ fontSize: '14px', margin: '5px 0' }}>Lat: {location.lat?.toFixed(5) || '...'}</p>
            <p style={{ fontSize: '14px', margin: '5px 0' }}>Lon: {location.lon?.toFixed(5) || '...'}</p>
          </div>

          {/* Bateria e Sistema */}
          <div style={{ background: 'white', padding: '15px', borderRadius: '15px' }}>
            <h4 style={{ margin: '0', display: 'flex', alignItems: 'center', gap: '5px' }}><Battery size={16} /> Bateria</h4>
            <p style={{ fontSize: '14px' }}>{battery.level > 0 ? `${battery.level}%` : "N/A (iOS)"}</p>
          </div>

          <div style={{ background: 'white', padding: '15px', borderRadius: '15px' }}>
            <h4 style={{ margin: '0', display: 'flex', alignItems: 'center', gap: '5px' }}><Cpu size={16} /> Hardware</h4>
            <p style={{ fontSize: '12px' }}>Cores: {sysInfo.cores}</p>
            <p style={{ fontSize: '12px' }}>{sysInfo.resolution}</p>
          </div>

          {/* Botão Exportar */}
          <button 
            onClick={exportJSON}
            style={{ gridColumn: 'span 2', padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 'bold' }}
          >
            <FileJson size={18} /> GERAR RELATÓRIO JSON
          </button>

          <footer style={{ gridColumn: 'span 2', textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: '10px' }}>
            By @jvbenetti | iPhone 16 Labs
          </footer>
        </div>
      )}
    </div>
  );
};

export default SensorApp;