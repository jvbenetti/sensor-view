import React, { useState, useEffect, useRef } from 'react';
import Chart from 'react-apexcharts';
import { Activity, MapPin, Compass, Battery, Mic, Cpu, FileJson, Thermometer, Droplets, Download } from 'lucide-react';

const SensorApp = () => {
  const [accel, setAccel] = useState({ x: 0, y: 0, z: 0 });
  const [orientation, setOrientation] = useState({ alpha: 0, beta: 0, gamma: 0 });
  const [location, setLocation] = useState({ lat: null, lon: null });
  const [battery, setBattery] = useState({ level: 0, charging: false });
  const [volume, setVolume] = useState(0);
  const [sysInfo, setSysInfo] = useState({ cores: 0, resolution: "" });
  const [weather, setWeather] = useState({ temp: null, humidity: null });
  
  const [chartData, setChartData] = useState([]);
  const [active, setActive] = useState(false);

  // NOVO: Estados e Refs para o Histórico de 20 segundos
  const [history, setHistory] = useState([]);
  const latestDataRef = useRef();

  // NOVO: Mantém a referência sempre atualizada com os dados mais recentes dos sensores
  useEffect(() => {
    latestDataRef.current = { accel, orientation, location, weather, battery, volume, sysInfo };
  }, [accel, orientation, location, weather, battery, volume, sysInfo]);

  // NOVO: Salva um "snapshot" a cada 1 segundo, mantendo apenas os últimos 20
  useEffect(() => {
    let interval;
    if (active) {
      interval = setInterval(() => {
        if (latestDataRef.current) {
          setHistory(prev => {
            const newRecord = { timestamp: new Date().toISOString(), ...latestDataRef.current };
            // Adiciona o novo e corta o array para manter no máximo 20 itens (20 segundos)
            return [...prev, newRecord].slice(-20);
          });
        }
      }, 1000); // 1000 ms = 1 segundo
    }
    return () => clearInterval(interval);
  }, [active]);

  const requestPermissions = async () => {
    try {
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        const res = await DeviceMotionEvent.requestPermission();
        if (res === 'granted') startHardwareFeatures();
      } else {
        startHardwareFeatures();
      }

      navigator.geolocation.watchPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );

      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m`);
          const data = await response.json();
          if (data.current) {
            setWeather({ temp: data.current.temperature_2m, humidity: data.current.relative_humidity_2m });
          }
        } catch (error) { console.error("Erro ao buscar clima via API", error); }
      });

      startAudioMonitor();

      if (navigator.getBattery) {
        navigator.getBattery().then(bat => {
          setBattery({ level: (bat.level * 100).toFixed(0), charging: bat.charging });
        });
      }

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
        x: x.toFixed(2), 
        y: (event.accelerationIncludingGravity.y || 0).toFixed(2), 
        z: (event.accelerationIncludingGravity.z || 0).toFixed(2) 
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
    // Exporta todo o histórico para JSON também
    console.log(`Relatório de Histórico (${history.length} seg):`, JSON.stringify(history, null, 2));
    alert("Histórico enviado para o console!");
  };

  // NOVO: Função exportCSV refeita para iterar sobre o Histórico
  const exportCSV = () => {
    if (history.length === 0) {
      alert("Aguarde alguns segundos para coletar dados no histórico...");
      return;
    }

    const headers = [
      "Timestamp", "Accel_X", "Accel_Y", "Accel_Z", 
      "Orient_Alpha", "Orient_Beta", "Orient_Gamma", 
      "Latitude", "Longitude", "Temperatura_C", "Umidade_%", 
      "Bateria_%", "Ruido_Audio", "CPU_Cores", "Resolucao"
    ];

    // Mapeia todas as linhas armazenadas nos últimos X segundos
    const rows = history.map(row => [
      row.timestamp,
      row.accel.x, row.accel.y, row.accel.z,
      row.orientation.alpha, row.orientation.beta, row.orientation.gamma,
      row.location.lat || "N/A", row.location.lon || "N/A",
      row.weather.temp || "N/A", row.weather.humidity || "N/A",
      row.battery.level, row.volume, row.sysInfo.cores, row.sysInfo.resolution
    ].join(","));

    const csvContent = headers.join(",") + "\n" + rows.join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `historico_sensores_20s_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    background: '#1e1e1e', padding: '15px', borderRadius: '15px', border: '1px solid #333', color: 'white'
  };

  const buttonStyle = {
    padding: '15px', background: 'transparent', borderRadius: '10px', fontWeight: 'bold', display: 'flex',
    alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', flex: 1
  };

  return (
    <div style={{ 
      backgroundColor: '#000000', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: !active ? 'center' : 'flex-start', padding: '20px'
    }}>
      
      {!active ? (
        <div style={{ textAlign: 'center' }}>
          <Activity color="#3b82f6" size={60} style={{ marginBottom: '20px' }} />
          <h1 style={{ marginBottom: '10px' }}>Sensor Hub Pro</h1>
          <p style={{ color: '#888', marginBottom: '30px' }}>Sistema de Diagnóstico de Hardware</p>
          <button 
            onClick={requestPermissions}
            style={{ 
              padding: '20px 40px', background: '#3b82f6', color: 'white', border: 'none', 
              borderRadius: '50px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer',
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
            <small style={{ color: '#666' }}>Monitorando Dispositivo via Web - SEGURANÇA WEB BY @JVBENETTI</small>
          </header>

          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#3b82f6' }}><Activity size={16} /> MOVIMENTO (EIXO X)</h3>
            <Chart options={chartOptions} series={[{ data: chartData }]} type="line" height={130} />
          </div>

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

          <div style={cardStyle}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#888' }}><MapPin size={14} /> LOCALIZAÇÃO GPS</h4>
            <div style={{ fontSize: '14px', fontFamily: 'monospace' }}>
              <div>LAT: {location.lat?.toFixed(6) || '---'}</div>
              <div>LON: {location.lon?.toFixed(6) || '---'}</div>
            </div>
          </div>

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

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button 
              onClick={exportJSON}
              style={{ ...buttonStyle, color: '#10b981', border: '1px solid #10b981' }}
            >
              <FileJson size={18} /> JSON ({history.length}s)
            </button>
            
            <button 
              onClick={exportCSV}
              style={{ ...buttonStyle, color: '#f59e0b', border: '1px solid #f59e0b' }}
            >
              <Download size={18} /> CSV ({history.length}s)
            </button>
          </div>

          <footer style={{ textAlign: 'center', fontSize: '10px', color: '#444', marginTop: '20px' }}>
            PROJETO ACADÊMICO - SEGURANÇA WEB BY @JVBENETTI
          </footer>
        </div>
      )}
    </div>
  );
};

export default SensorApp;