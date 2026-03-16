// components/Visualizer/Visualizer.jsx
// Web Audio API frequency visualizer — animated bars synced to music

import React, { useEffect, useRef } from 'react';

export default function Visualizer({ audioRef, isPlaying }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const sourceRef = useRef(null);

  // Set up Web Audio API context once
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // We need a user gesture before creating AudioContext — attach on first play
    function setupContext() {
      if (audioCtxRef.current) return; // already set up
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128; // 64 frequency bins — good balance of detail vs perf
        analyser.smoothingTimeConstant = 0.82;

        const source = ctx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(ctx.destination);

        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
        sourceRef.current = source;
      } catch (e) {
        console.warn('Web Audio API unavailable:', e);
      }
    }

    audio.addEventListener('play', setupContext, { once: false });
    return () => audio.removeEventListener('play', setupContext);
  }, [audioRef]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function draw() {
      animRef.current = requestAnimationFrame(draw);

      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      if (canvas.width !== W) canvas.width = W;
      if (canvas.height !== H) canvas.height = H;

      ctx.clearRect(0, 0, W, H);

      const analyser = analyserRef.current;
      const dataArray = dataArrayRef.current;

      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);
        const bins = dataArray.length;
        const barW = (W / bins) - 1;

        for (let i = 0; i < bins; i++) {
          const v = dataArray[i] / 255;
          const barH = v * H * 0.88;
          const hue = 248 + i * 0.9;            // purple → pink sweep
          const lightness = 58 + v * 14;
          const alpha = 0.45 + v * 0.55;
          ctx.fillStyle = `hsla(${hue}, 72%, ${lightness}%, ${alpha})`;
          ctx.beginPath();
          ctx.roundRect(i * (barW + 1), H - barH, barW, barH, 2);
          ctx.fill();
        }
      } else {
        // Idle shimmer when no audio context yet
        const bins = 64;
        const barW = (W / bins) - 1;
        const t = Date.now() * 0.0015;
        for (let i = 0; i < bins; i++) {
          const barH = 2 + Math.sin(t + i * 0.25) * 2.5;
          ctx.fillStyle = `hsla(${248 + i * 0.9}, 60%, 75%, 0.35)`;
          ctx.beginPath();
          ctx.roundRect(i * (barW + 1), H - barH, barW, barH, 1);
          ctx.fill();
        }
      }
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div className="rounded-2xl overflow-hidden border"
      style={{ borderColor: 'rgba(108,92,231,0.13)', background: 'white' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '72px', display: 'block' }}
      />
    </div>
  );
}