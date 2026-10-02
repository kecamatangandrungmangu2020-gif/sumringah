'use client';

import { useEffect, useRef, useState } from 'react';

export interface TvChannel {
  name: string;
  url: string;
  logo?: string;
  group?: string;
}

interface TvPlayerProps {
  channel: TvChannel | null;
  isMuted?: boolean;
  onMuteToggle?: (muted: boolean) => void;
  volume?: number; // 0.0 - 1.0
}

export default function TvPlayer({ channel, isMuted = false, onMuteToggle, volume = 0.8 }: TvPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [status, setStatus] = useState<'loading' | 'playing' | 'error' | 'idle'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  // Cleanup hls instance
  const destroyHls = () => {
    if (hlsRef.current) {
      try { hlsRef.current.destroy(); } catch (e) {}
      hlsRef.current = null;
    }
  };

  useEffect(() => {
    if (!channel?.url || !videoRef.current) {
      setStatus('idle');
      return;
    }

    setStatus('loading');
    setErrorMsg('');
    destroyHls();

    const video = videoRef.current;
    const url = channel.url;

    const tryPlay = async (Hls: any) => {
      // Native HLS (Safari / iOS)
      if (video.canPlayType('application/vnd.apple.mpegurl') && !Hls) {
        video.src = url;
        video.muted = isMuted;
        try {
          await video.play();
          setStatus('playing');
        } catch (e) {
          setStatus('error');
          setErrorMsg('Gagal memutar stream. Coba klik tombol Play di bawah.');
        }
        return;
      }

      if (Hls && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30,
          xhrSetup: (xhr: XMLHttpRequest) => {
            xhr.withCredentials = false;
          }
        });

        hls.loadSource(url);
        hls.attachMedia(video);
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, async () => {
          video.muted = isMuted;
          video.volume = volume;
          try {
            await video.play();
            setStatus('playing');
          } catch (e) {
            // Autoplay diblokir — tetap set playing agar UI tampil normal
            setStatus('playing');
          }
        });

        hls.on(Hls.Events.ERROR, (_: any, data: any) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              // Retry jaringan
              hls.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            } else {
              setStatus('error');
              setErrorMsg(`Stream tidak tersedia (${data.type}). Channel mungkin offline atau CORS-blocked.`);
              destroyHls();
            }
          }
        });
      } else {
        // Browser tidak support HLS.js
        video.src = url;
        video.muted = isMuted;
        try {
          await video.play();
          setStatus('playing');
        } catch (e) {
          setStatus('error');
          setErrorMsg('Browser tidak mendukung stream ini.');
        }
      }
    };

    // Import hls.js secara dinamis (client-side only)
    import('hls.js').then((mod) => {
      const Hls = mod.default;
      tryPlay(Hls);
    }).catch(() => {
      tryPlay(null);
    });

    return () => {
      destroyHls();
      if (video) {
        video.pause();
        video.src = '';
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel?.url, retryCount]);

  // Sinkronkan muted state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Sinkronkan volume
  useEffect(() => {
    if (videoRef.current && !isMuted) {
      videoRef.current.volume = volume;
    }
  }, [volume, isMuted]);

  const handleRetry = () => {
    setStatus('loading');
    setErrorMsg('');
    setRetryCount(c => c + 1);
  };

  const handleManualPlay = () => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.play().then(() => setStatus('playing')).catch(() => {});
    }
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#000',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'inherit',
        overflow: 'hidden'
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: status === 'error' ? 'none' : 'block',
          background: '#000'
        }}
        playsInline
        controls={false}
        onPlay={() => setStatus('playing')}
        onWaiting={() => {
          if (status === 'playing') setStatus('loading');
        }}
        onPlaying={() => setStatus('playing')}
        onError={() => {
          setStatus('error');
          setErrorMsg('Stream tidak tersedia atau CORS-blocked.');
        }}
      />

      {/* Loading Overlay */}
      {status === 'loading' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)', color: '#fff', gap: '12px'
        }}>
          <div className="spinner-border text-warning" role="status" style={{ width: '2.5rem', height: '2.5rem' }} />
          <span style={{ fontSize: '0.95rem', color: '#fbbf24', fontWeight: 600 }}>
            Memuat siaran{channel?.name ? ` — ${channel.name}` : ''}...
          </span>
        </div>
      )}

      {/* Error State */}
      {status === 'error' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(10,10,20,0.92)', color: '#fff', gap: '16px', padding: '24px', textAlign: 'center'
        }}>
          <i className="bi bi-wifi-off" style={{ fontSize: '3rem', color: '#ef4444' }} />
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fca5a5', marginBottom: '6px' }}>
              Siaran Tidak Tersedia
            </div>
            <div style={{ fontSize: '0.82rem', color: '#94a3b8', maxWidth: '320px' }}>
              {errorMsg || 'Channel mungkin offline atau tidak bisa diakses dari browser.'}
            </div>
          </div>
          <button
            onClick={handleRetry}
            className="btn btn-warning btn-sm fw-bold rounded-pill px-4"
            style={{ letterSpacing: '0.5px' }}
          >
            <i className="bi bi-arrow-clockwise me-1" /> Coba Lagi
          </button>
        </div>
      )}



      {/* Tombol Manual Play (jika autoplay diblokir) */}
      {status === 'playing' && (
        <button
          onClick={handleManualPlay}
          style={{
            position: 'absolute', inset: 0, background: 'transparent',
            border: 'none', cursor: 'pointer', opacity: 0
          }}
          title="Klik untuk memastikan video berjalan"
          aria-label="Play video"
        />
      )}

      {/* Idle state */}
      {status === 'idle' && (
        <div style={{
          color: '#64748b', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '8px'
        }}>
          <i className="bi bi-tv" style={{ fontSize: '3rem' }} />
          <span style={{ fontSize: '0.9rem' }}>Pilih channel untuk memulai siaran</span>
        </div>
      )}

      <style>{`
        @keyframes pulse-live {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
