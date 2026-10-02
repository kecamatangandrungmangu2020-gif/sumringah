"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { db } from '../../lib/firebase';
import { collection, doc, query, where, orderBy, onSnapshot, getDocs, Timestamp } from 'firebase/firestore';
import TvPlayer from '../../../components/TvPlayer';

const formatHeroImage = (raw) => {
  if (!raw || typeof raw !== 'string') return '/hero-Kecamatan.jpg';
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:') || raw.startsWith('/')) {
    return raw;
  }
  return `data:image/jpeg;base64,${raw}`;
};

export default function Display() {
  const [settings, setSettings] = useState(() => {
    const defaults = {
      instansi_nama: 'Kecamatan Gandrungmangu',
      instansi_alamat: 'Jl. Pertiwi Nomor 1, Gandrungmangu, Cilacap',
      running_text: 'Selamat Datang di Sistem Antrian Pelayanan Terpadu Kecamatan Gandrungmangu. Budayakan Antri Untuk Kenyamanan Bersama.',
      bell_sound_volume: '0.8',
      display_video_url: 'https://www.youtube.com/watch?v=FkbZshiiS-k'
    };
    if (typeof window !== 'undefined') {
      try {
        const cachedUrl = localStorage.getItem('antrian_display_video_url');
        if (cachedUrl && cachedUrl.trim() !== '') {
          defaults.display_video_url = cachedUrl.trim();
        }
      } catch (e) {}
    }
    return defaults;
  });

  const [heroBg, setHeroBg] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('village_profile_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          const raw = parsed.heroPhotoUrl || parsed.heroPhotoBase64;
          if (raw) return formatHeroImage(raw);
        }
      } catch (e) { }
    }
    return '/hero-Kecamatan.jpg';
  });

  const [lokets, setLokets] = useState(['Loket 1', 'Loket 2', 'Loket 3', 'Loket 4']);
  const [activeCalls, setActiveCalls] = useState({});
  const [latestCalling, setLatestCalling] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);

  // TV MODE
  const [displayMode, setDisplayMode] = useState('antrian'); // 'antrian' | 'tv'
  const [tvChannel, setTvChannel] = useState(null); // { name, url, logo }
  const [isTvMuted, setIsTvMuted] = useState(false);

  const videoIframeRef = useRef(null);
  const videoMediaRef = useRef(null);
  const lastProcessedCall = useRef(null);
  const maxProcessedPanggilAt = useRef(0);
  const isInitialSnapshot = useRef(true);

  const [logoKecamatan, setLogoKecamatan] = useState('');
  const [logoTambahan, setLogoTambahan] = useState('/img/logo-tambahan.png');

  // Toggle Mute / Unmute Suara Video Display (YouTube Iframe & Video HTML5)
  const toggleVideoAudio = () => {
    const nextMuted = !isVideoMuted;
    setIsVideoMuted(nextMuted);

    // 1. YouTube Iframe via postMessage
    try {
      const iframe = videoIframeRef.current || document.getElementById('antrian-youtube-iframe');
      if (iframe && iframe.contentWindow) {
        const cmd = nextMuted ? 'mute' : 'unMute';
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: cmd, args: '' }), '*');
        if (!nextMuted) {
          const vol = Math.round((parseFloat(settings.display_video_volume) || 0.8) * 100);
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [vol] }), '*');
        }
      }
    } catch (err) {
      console.warn("YouTube audio toggle err:", err);
    }

    // 2. Direct HTML5 Video element
    try {
      if (videoMediaRef.current) {
        videoMediaRef.current.muted = nextMuted;
        if (!nextMuted) videoMediaRef.current.volume = parseFloat(settings.display_video_volume) || 0.8;
      }
    } catch (err) {
      console.warn("Video tag audio toggle err:", err);
    }
  };

  // Toggle Fullscreen untuk TV / Monitor PC Kiosk
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Helper untuk membuka izin pemutaran audio browser (Autoplay Policy)
  const unlockAudio = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.001; // nyaris senyap
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(0);
        osc.stop(0.05);
      }
    } catch (e) {
      console.warn("Audio unlock notice:", e);
    }
    setAudioUnlocked(true);
  };

  // Event listener interaksi pengguna pertama kali
  useEffect(() => {
    const handleFirstInteraction = () => {
      unlockAudio();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  // Ambil background Foto Halaman Utama & Logo dari Pengaturan (/settings/ - settings/village)
  useEffect(() => {
    // 1. Fetch cepat dari API /api/village-profile/
    fetch('/api/village-profile/?t=' + Date.now(), { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          const raw = data.heroPhotoUrl || data.heroPhotoBase64;
          if (raw) setHeroBg(formatHeroImage(raw));
          if (data.logoUrl || data.logoKecamatanUrl) setLogoKecamatan(data.logoUrl || data.logoKecamatanUrl);
          if (data.logoTambahanUrl) setLogoTambahan(data.logoTambahanUrl);
        }
      })
      .catch(() => { });

    // 2. Real-time snapshot dari Firestore settings/village
    if (db) {
      const unsubVillage = onSnapshot(doc(db, 'settings', 'village'), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          const raw = d.heroPhotoUrl || d.heroPhotoBase64;
          if (raw) setHeroBg(formatHeroImage(raw));
          if (d.logoUrl || d.logoKecamatanUrl) setLogoKecamatan(d.logoUrl || d.logoKecamatanUrl);
          if (d.logoTambahanUrl) setLogoTambahan(d.logoTambahanUrl);
        }
      }, (err) => {
        console.warn("Gagal memuat snapshot settings/village:", err);
      });
      return () => unsubVillage();
    }
  }, []);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearInterval(timer);
  }, []);

  // Lokets Snapshot
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'loket'), (snap) => {
      if (!snap.empty) {
        const list = [];
        snap.forEach(docSnap => {
          if (docSnap.data().nama) {
            list.push(docSnap.data().nama);
          }
        });
        list.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
        setLokets(list);
      }
    });
    return () => unsub();
  }, []);

  // Speak Queue Voice function
  const speakQueue = (nomorLengkap, loketText) => {
    const parts = nomorLengkap.split('-');
    const prefix = parts[0];
    const num = parseInt(parts[1] || '1', 10);
    const text = `Nomor antrian, ${prefix}, ${num}, silakan menuju ke, ${loketText}`;

    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=id-ID&client=tw-ob&q=${encodeURIComponent(text)}`;
    const ttsAudio = new Audio(url);
    ttsAudio.volume = 1.0;
    
    const playPromise = ttsAudio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setAudioUnlocked(true);
        })
        .catch(err => {
          if (err.name === 'NotAllowedError') {
            console.warn("Audio autoplay diblokir browser. Silakan klik layar untuk mengaktifkan suara antrian.");
            setAudioUnlocked(false);
          } else {
            console.error("Google TTS failed:", err);
          }

          // Fallback lokal dengan SpeechSynthesis
          try {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
              const speech = new SpeechSynthesisUtterance(text);
              speech.lang = "id-ID";
              const voices = window.speechSynthesis.getVoices();
              const idVoices = voices.filter(v => v.lang.replace('_', '-').toLowerCase().includes('id'));
              let female = idVoices.find(v => {
                const n = v.name.toLowerCase();
                return n.includes('gadis') || n.includes('female') || n.includes('perempuan') || n.includes('google');
              });
              if (!female && idVoices.length > 1) female = idVoices[idVoices.length - 1];
              if (female) speech.voice = female;
              speech.rate = 0.85;
              window.speechSynthesis.speak(speech);
            }
          } catch (speechErr) {
            console.warn("SpeechSynthesis fallback error:", speechErr);
          }
        });
    }
  };

  // Settings Snapshot & API Fallback
  useEffect(() => {
    // 1. Fetch cepat via API internal
    fetch('/api/antrian/manage/?t=' + Date.now(), { cache: 'no-store' })
      .then(res => res.json())
      .then(resData => {
        if (resData?.success && resData?.settings) {
          setSettings(prev => {
            const next = { ...prev, ...resData.settings };
            if (next.display_video_url && typeof window !== 'undefined') {
              try { localStorage.setItem('antrian_display_video_url', next.display_video_url); } catch (e) {}
            }
            return next;
          });
        }
      })
      .catch(() => {});

    // 2. Real-time snapshot dari Firestore collection 'settings'
    if (db) {
      getDocs(collection(db, 'settings'))
        .then(snap => {
          if (!snap.empty) {
            setSettings(prev => {
              const next = { ...prev };
              snap.forEach(docSnap => {
                const id = docSnap.id;
                const val = docSnap.data()?.value;
                if (val !== undefined && val !== null) {
                  if (id === 'display_mode') {
                    setDisplayMode(val);
                  } else if (id === 'tv_channel_url') {
                    setTvChannel(prev => prev ? { ...prev, url: val } : { url: val, name: '', logo: '' });
                  } else if (id === 'tv_channel_name') {
                    setTvChannel(prev => prev ? { ...prev, name: val } : { name: val, url: '', logo: '' });
                  } else if (id === 'tv_channel_logo') {
                    setTvChannel(prev => prev ? { ...prev, logo: val } : { logo: val, url: '', name: '' });
                  } else {
                    next[id] = val;
                  }
                }
              });
              return next;
            });
          }
        })
        .catch(err => console.warn("Initial settings fetch error:", err));

      const unsub = onSnapshot(collection(db, 'settings'), (snap) => {
        setSettings(prev => {
          const next = { ...prev };
          snap.forEach(docSnap => {
            const id = docSnap.id;
            const val = docSnap.data()?.value;
            if (val !== undefined && val !== null) {
              if (id === 'display_mode') {
                setDisplayMode(val);
              } else if (id === 'tv_channel_url') {
                setTvChannel(prev => prev ? { ...prev, url: val } : { url: val, name: '', logo: '' });
              } else if (id === 'tv_channel_name') {
                setTvChannel(prev => prev ? { ...prev, name: val } : { name: val, url: '', logo: '' });
              } else if (id === 'tv_channel_logo') {
                setTvChannel(prev => prev ? { ...prev, logo: val } : { logo: val, url: '', name: '' });
              } else {
                next[id] = val;
                if (id === 'display_video_url' && typeof window !== 'undefined') {
                  try { localStorage.setItem('antrian_display_video_url', val); } catch (e) {}
                }
              }
            }
          });
          return next;
        });
      }, (err) => {
        console.warn("Snapshot settings error:", err);
      });

      return () => unsub();
    }
  }, []);

  // Queue Snapshot
  useEffect(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const startOfDay = Timestamp.fromDate(now);

    const q = query(
      collection(db, 'antrian'),
      where('created_at', '>=', startOfDay),
      orderBy('created_at', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const allQueues = [];
      snap.forEach(d => allQueues.push({ id: d.id, ...d.data() }));

      let latest = null;
      const activeMap = {};

      lokets.forEach(lok => {
        // Cari yang dipanggil
        let call = allQueues.find(q => q.loket === lok && q.status === 'dipanggil');
        // Jika tidak ada, cari yang selesai
        if (!call) {
          call = allQueues.find(q => q.loket === lok && q.status === 'selesai');
        }
        if (call) {
          activeMap[lok] = call;
        }
      });

      // Cari panggilan terbaru (dipanggil) yang ada panggil_at
      const calledQueues = allQueues.filter(q => q.status === 'dipanggil' && q.panggil_at);
      calledQueues.sort((a, b) => b.panggil_at.toMillis() - a.panggil_at.toMillis());

      if (calledQueues.length > 0) {
        latest = calledQueues[0];
      } else {
        // Fallback jika tidak ada yang sedang dipanggil
        const finishedQueues = allQueues.filter(q => (q.status === 'selesai' || q.status === 'lewat') && q.panggil_at);
        finishedQueues.sort((a, b) => b.panggil_at.toMillis() - a.panggil_at.toMillis());
        if (finishedQueues.length > 0) latest = finishedQueues[0];
      }

      setActiveCalls(activeMap);
      setLatestCalling(latest);

      // Guard: Pada inisialisasi awal (refresh/load halaman), sinkronkan riwayat tanpa menyuarakan panggilan lama
      if (isInitialSnapshot.current) {
        isInitialSnapshot.current = false;
        if (latest && latest.panggil_at) {
          maxProcessedPanggilAt.current = latest.panggil_at.toMillis();
          lastProcessedCall.current = `${latest.id}-${maxProcessedPanggilAt.current}-${latest.panggil_ulang || 0}`;
        } else {
          maxProcessedPanggilAt.current = Date.now();
        }
        return;
      }

      // Trigger Voice untuk panggilan baru atau panggilan ulang
      if (latest && latest.status === 'dipanggil') {
        const panggilTime = latest.panggil_at.toMillis();
        const callSig = `${latest.id}-${panggilTime}-${latest.panggil_ulang}`;

        if (panggilTime > maxProcessedPanggilAt.current) {
          maxProcessedPanggilAt.current = panggilTime;
          lastProcessedCall.current = callSig;
          speakQueue(latest.nomor_lengkap, latest.loket);
        } else if (panggilTime === maxProcessedPanggilAt.current && lastProcessedCall.current !== callSig) {
          lastProcessedCall.current = callSig;
          speakQueue(latest.nomor_lengkap, latest.loket);
        }
      }
    });

    return () => unsub();
  }, [lokets]);

  // Helper Render Video Player (YouTube embed / Video File)
  const renderVideoPlayer = (url) => {
    const defaultUrl = 'https://www.youtube.com/watch?v=FkbZshiiS-k';
    let targetUrl = (url && typeof url === 'string' && url.trim() !== '') ? url.trim() : defaultUrl;

    // Jika user menginput tag embed iframe lengkap <iframe src="...">
    const iframeTagMatch = targetUrl.match(/src=["']([^"']+)["']/i);
    if (iframeTagMatch && iframeTagMatch[1]) {
      targetUrl = iframeTagMatch[1].trim();
    }

    const isDirectVideo = /\.(mp4|webm|ogg|mov)($|\?)/i.test(targetUrl);
    if (isDirectVideo) {
      return (
        <video
          key={targetUrl}
          ref={videoMediaRef}
          src={targetUrl}
          autoPlay
          loop
          muted={isVideoMuted}
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      );
    }

    // Ekstraksi playlist dan YouTube Video ID
    let videoId = '';
    const playlistMatch = targetUrl.match(/[?&]list=([a-zA-Z0-9_-]+)/i);
    const playlistId = playlistMatch ? playlistMatch[1] : null;

    // Pattern matching untuk berbagai format URL YouTube (watch, shorts, live, embed, youtu.be, atau ID langsung)
    const shortMatch = targetUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
    const watchMatch = targetUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
    const embedMatch = targetUrl.match(/youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{11})/i);
    const shortsMatch = targetUrl.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i);
    const liveMatch = targetUrl.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/i);

    if (shortMatch) videoId = shortMatch[1];
    else if (watchMatch) videoId = watchMatch[1];
    else if (embedMatch) videoId = embedMatch[1];
    else if (shortsMatch) videoId = shortsMatch[1];
    else if (liveMatch) videoId = liveMatch[1];
    else if (/^[a-zA-Z0-9_-]{11}$/.test(targetUrl)) {
      videoId = targetUrl;
    }

    // Jika berhasil mendeteksi YouTube ID
    if (videoId) {
      const loopParam = playlistId
        ? `&list=${playlistId}&loop=1`
        : `&playlist=${videoId}&loop=1`;
      const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1${loopParam}&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&enablejsapi=1`;

      return (
        <iframe
          key={videoId}
          ref={videoIframeRef}
          id="antrian-youtube-iframe"
          src={embedUrl}
          title="Display Video Antrian"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block'
          }}
        />
      );
    }

    // Jika berupa Playlist YouTube
    if (playlistId) {
      const embedPlaylistUrl = `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1&mute=1&loop=1&controls=0&rel=0&enablejsapi=1`;
      return (
        <iframe
          key={playlistId}
          ref={videoIframeRef}
          id="antrian-youtube-iframe"
          src={embedPlaylistUrl}
          title="Display Video Antrian Playlist"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block'
          }}
        />
      );
    }

    // Fallback URL jika berupa URL embed lainnya
    if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
      return (
        <iframe
          key={targetUrl}
          ref={videoIframeRef}
          id="antrian-youtube-iframe"
          src={targetUrl}
          title="Display Video Antrian"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block'
          }}
        />
      );
    }

    // Default Fallback
    const fallbackId = 'FkbZshiiS-k';
    const fallbackEmbed = `https://www.youtube.com/embed/${fallbackId}?autoplay=1&mute=1&loop=1&playlist=${fallbackId}&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&enablejsapi=1`;
    return (
      <iframe
        key={fallbackId}
        ref={videoIframeRef}
        id="antrian-youtube-iframe"
        src={fallbackEmbed}
        title="Display Video Antrian"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block'
        }}
      />
    );
  };

  // Pastikan tepat 4 loket untuk tata letak 2x2 sesuai konsep
  const displayLokets = lokets && lokets.length >= 4
    ? lokets.slice(0, 4)
    : ['Loket 1', 'Loket 2', 'Loket 3', 'Loket 4'].map((defName, idx) => lokets[idx] || defName);

  return (
    <div
      className="antrian-display-root"
      style={{
        backgroundImage: `linear-gradient(rgba(10, 15, 29, 0.86), rgba(10, 15, 29, 0.95)), url("${heroBg}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        height: '100vh',
        maxHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '12px 18px',
        boxSizing: 'border-box',
        color: '#ffffff',
        overflow: 'hidden',
        transition: 'background-image 0.5s ease-in-out'
      }}
    >

      {/* ══ MODE ANTRIAN (tampilan normal + Mode TV dalam layout yang sama) ══ */}
      {/* Floating Audio Activation Prompt (Jika browser memblokir autoplay) */}
      {!audioUnlocked && (
        <div
          onClick={unlockAudio}
          className="position-fixed top-0 start-50 translate-middle-x mt-2 shadow-lg d-flex align-items-center gap-2 px-3.5 py-1.5 rounded-pill"
          style={{
            zIndex: 9999,
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#000000',
            cursor: 'pointer',
            border: '2px solid rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 25px rgba(245, 158, 11, 0.45)'
          }}
          title="Klik untuk mengaktifkan suara panggilan"
        >
          <i className="bi bi-volume-mute-fill fs-6 text-dark"></i>
          <span className="fw-bold small">Klik layar di mana saja untuk mengaktifkan suara</span>
          <span className="badge bg-dark text-warning ms-1">Aktifkan</span>
        </div>
      )}

      {/* ── 1. HEADER LOGO DAN ALAMAT ────────────────────────────── */}
      <div
        className="d-flex justify-content-between align-items-center mb-2.5 antrian-glass"
        style={{
          flexShrink: 0,
          padding: '10px 22px',
          borderRadius: '18px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Sisi Kiri: Tombol Portal, Fullscreen & Logo + Identitas Instansi */}
        <div className="d-flex align-items-center gap-3">
          <Link
            href="/Antrian"
            className="btn btn-sm rounded-pill px-3 py-1 text-white d-inline-flex align-items-center gap-1.5 shadow-sm"
            style={{
              backdropFilter: 'blur(8px)',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
            title="Kembali ke Portal Antrian"
          >
            <i className="bi bi-arrow-left text-warning"></i>
            <span className="small d-none d-xl-inline fw-semibold">Portal</span>
          </Link>

          <button
            onClick={toggleFullscreen}
            className="btn btn-sm rounded-pill px-2.5 py-1 text-white d-inline-flex align-items-center shadow-sm"
            style={{
              backdropFilter: 'blur(8px)',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
            title={isFullscreen ? "Keluar Layar Penuh" : "Mode TV Layar Penuh"}
          >
            <i className={isFullscreen ? "bi bi-fullscreen-exit text-warning" : "bi bi-arrows-fullscreen text-warning"}></i>
          </button>

          {(logoTambahan || "/img/logo-tambahan.png") && (
            <img
              src={logoTambahan || "/img/logo-tambahan.png"}
              alt="Logo Instansi"
              style={{
                height: '48px',
                maxWidth: '280px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.6))'
              }}
            />
          )}

          <div>
            <h2
              className="fw-extrabold m-0 text-white"
              style={{
                fontSize: 'clamp(1.15rem, 1.6vw, 1.75rem)',
                letterSpacing: '-0.3px',
                lineHeight: 1.15,
                textShadow: '0 2px 8px rgba(0,0,0,0.8)'
              }}
            >
              {settings.instansi_nama}
            </h2>
            <p
              className="m-0 text-white-50 fw-medium"
              style={{ fontSize: 'clamp(0.72rem, 0.9vw, 0.9rem)', lineHeight: 1.2 }}
            >
              {settings.instansi_alamat}
            </p>
          </div>
        </div>

        {/* Sisi Kanan: Jam Digital & Tanggal */}
        <div className="text-end">
          <div
            className="fw-extrabold"
            style={{
              fontSize: 'clamp(1.8rem, 2.7vw, 2.9rem)',
              color: '#fbbf24',
              lineHeight: 1,
              fontWeight: 900,
              textShadow: '0 0 25px rgba(251, 191, 36, 0.4), 0 2px 4px rgba(0,0,0,0.8)'
            }}
          >
            {mounted ? currentTime.toLocaleTimeString('id-ID', { hour12: false }) : '--.--.--'}
          </div>
          <div
            className="text-white-50 fw-semibold mt-0.5"
            style={{ fontSize: 'clamp(0.72rem, 0.9vw, 0.9rem)' }}
          >
            {mounted
              ? currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
              : 'Memuat Tanggal...'}
          </div>
        </div>
      </div>

      {/* ── 2. MAIN LAYOUT (KIRI: VIDEO + RUNNING TEKS, KANAN: PANGGILAN + 4 LOKET) ── */}
      <div
        className="display-main-grid"
        style={{
          flex: '1 1 0%',
          minHeight: 0,
          display: 'flex',
          gap: '14px',
          overflow: 'hidden'
        }}
      >
        {/* ═══ KOLOM KIRI (VIDEO DI ATAS, RUNNING TEKS DI BAWAH) ═══ */}
        <div
          className="display-left-col"
          style={{
            flex: '1 1 57%',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minHeight: 0
          }}
        >
          {/* Box Video / TV Player */}
          <div
            className="display-video-box antrian-glass"
            style={{
              flex: '1 1 0%',
              minHeight: 0,
              borderRadius: '20px',
              overflow: 'hidden',
              border: displayMode === 'tv'
                ? '2px solid rgba(239, 68, 68, 0.55)'
                : '1.5px solid rgba(255, 255, 255, 0.18)',
              boxShadow: displayMode === 'tv'
                ? '0 0 0 1px rgba(239,68,68,0.15), 0 15px 40px rgba(239,68,68,0.25)'
                : '0 15px 40px rgba(0, 0, 0, 0.6)',
              background: '#000000',
              position: 'relative',
              transition: 'border 0.4s ease, box-shadow 0.4s ease'
            }}
          >
            {/* Konten: TvPlayer (mode TV) atau YouTube/Video (mode antrian) */}
            {displayMode === 'tv'
              ? <TvPlayer channel={tvChannel} isMuted={isTvMuted} onMuteToggle={setIsTvMuted} volume={parseFloat(settings.display_video_volume) || 0.8} />
              : renderVideoPlayer(settings.display_video_url)
            }

            {/* Tombol Mute / Hidupkan Suara Video */}
            <button
              type="button"
              onClick={displayMode === 'tv' ? () => setIsTvMuted(m => !m) : toggleVideoAudio}
              className="btn btn-sm d-flex align-items-center rounded-pill shadow-lg"
              style={{
                position: 'absolute',
                bottom: '12px',
                right: '14px',
                zIndex: 25,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                background: (displayMode === 'tv' ? isTvMuted : isVideoMuted)
                  ? 'rgba(15, 23, 42, 0.85)'
                  : 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                border: (displayMode === 'tv' ? isTvMuted : isVideoMuted)
                  ? '1.5px solid rgba(255, 255, 255, 0.35)'
                  : '1.5px solid rgba(16, 185, 129, 0.7)',
                padding: '7px 10px',
                fontSize: '1.1rem',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.7)',
                transition: 'all 0.25s ease'
              }}
              title={(displayMode === 'tv' ? isTvMuted : isVideoMuted) ? 'Aktifkan suara' : 'Matikan suara'}
            >
              <i className={(displayMode === 'tv' ? isTvMuted : isVideoMuted) ? 'bi bi-volume-mute-fill text-warning fs-5' : 'bi bi-volume-up-fill text-white fs-5'}></i>
            </button>
          </div>

          {/* Running Teks (Tepat di bawah Video sesuai gambar konsep) */}
          <div
            className="display-running-box"
            style={{
              flexShrink: 0,
              height: '44px',
              background: 'rgba(10, 15, 29, 0.90)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1.5px solid rgba(251, 191, 36, 0.4)',
              borderRadius: '14px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              overflow: 'hidden'
            }}
          >
            <div
              className="px-3 fw-black text-uppercase text-dark d-flex align-items-center gap-1.5 h-100"
              style={{
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                fontSize: '0.85rem',
                flexShrink: 0,
                borderTopLeftRadius: '12px',
                borderBottomLeftRadius: '12px',
                letterSpacing: '0.5px'
              }}
            >
              <i className="bi bi-megaphone-fill"></i>
              <span>INFO</span>
            </div>

            <div className="flex-grow-1 overflow-hidden" style={{ whiteSpace: 'nowrap' }}>
              <p
                style={{
                  display: 'inline-block',
                  paddingLeft: '100%',
                  margin: 0,
                  animation: 'scroll-text 26s linear infinite',
                  fontSize: 'clamp(0.95rem, 1.1vw, 1.15rem)',
                  fontWeight: 800,
                  color: '#fbbf24',
                  textShadow: '0 0 15px rgba(251, 191, 36, 0.35)'
                }}
              >
                {settings.running_text}
              </p>
            </div>
          </div>
        </div>

        {/* ═══ KOLOM KANAN (PANGGILAN SAAT INI + 2x2 ANTRIAN BERLANGSUNG) ═══ */}
        <div
          className="display-right-col"
          style={{
            flex: '1 1 43%',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minHeight: 0
          }}
        >
          {/* 1. Box Panggilan Saat Ini (Atas - Maskot Utama: Tinggi Diperpanjang & Terpisah Kanan Kiri) */}
          <div
            className="antrian-glass"
            style={{
              flex: '1 1 58%',
              minHeight: 0,
              borderRadius: '20px',
              border: '2.5px solid rgba(251, 191, 36, 0.85)',
              background: latestCalling
                ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(251, 191, 36, 0.10), rgba(15, 23, 42, 0.75))'
                : 'linear-gradient(135deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.92))',
              boxShadow: latestCalling
                ? '0 0 0 1px rgba(251,191,36,0.25), 0 18px 50px rgba(245,158,11,0.30), inset 0 0 40px rgba(251, 191, 36, 0.14)'
                : '0 18px 50px rgba(0, 0, 0, 0.65)',
              padding: '12px 14px',
              display: 'flex',
              overflow: 'hidden',
              backdropFilter: 'blur(18px)',
              position: 'relative',
              transition: 'all 0.5s ease'
            }}
          >
            <div
              className="d-flex w-100 h-100 align-items-center display-panggilan-split"
              style={{ minHeight: 0 }}
            >
              {/* ══ SISI KIRI: PANGGILAN SAAT INI & NOMOR BESAR (B-13) ══ */}
              <div
                className="d-flex flex-column align-items-center justify-content-center text-center h-100"
                style={{
                  flex: '1 1 50%',
                  padding: '8px 12px',
                  borderRight: '2px dashed rgba(251, 191, 36, 0.35)',
                  minWidth: 0
                }}
              >
                {/* Header Badge */}
                <div
                  className="d-inline-flex align-items-center gap-2 px-3.5 py-1 rounded-pill shadow mb-1.5"
                  style={{
                    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                    color: '#0f172a'
                  }}
                >
                  <span className="spinner-grow spinner-grow-sm text-dark" role="status" style={{ width: '8px', height: '8px' }}></span>
                  <span
                    className="fw-black text-uppercase"
                    style={{ fontSize: 'clamp(0.85rem, 1.1vw, 1.18rem)', letterSpacing: '1px' }}
                  >
                    PANGGILAN SAAT INI
                  </span>
                </div>

                {/* Nomor Antrian Panggilan Besar */}
                <div
                  className="fw-black my-auto"
                  style={{
                    fontSize: 'clamp(4.6rem, 7.2vw, 8.4rem)',
                    lineHeight: 0.9,
                    fontWeight: 900,
                    letterSpacing: '-2px',
                    color: '#fbbf24',
                    textShadow: '0 0 45px rgba(251, 191, 36, 0.6), 0 4px 20px rgba(0, 0, 0, 0.95)'
                  }}
                >
                  {latestCalling ? latestCalling.nomor_lengkap : '---'}
                </div>
              </div>

              {/* ══ SISI KANAN: MENUJU, LOKET (Loket 4), & NAMA LAYANAN (Kependudukan) ══ */}
              <div
                className="d-flex flex-column align-items-center justify-content-center text-center h-100"
                style={{
                  flex: '1 1 50%',
                  padding: '8px 12px',
                  minWidth: 0,
                  gap: '6px'
                }}
              >
                {/* Teks MENUJU */}
                <div
                  className="text-white-50 fw-black text-uppercase"
                  style={{
                    fontSize: 'clamp(1.05rem, 1.45vw, 1.65rem)',
                    letterSpacing: '3px'
                  }}
                >
                  MENUJU
                </div>

                {/* Nama Loket (e.g. Loket 4) */}
                <div
                  className="fw-black text-center"
                  style={{
                    fontSize: 'clamp(2.5rem, 3.8vw, 4.4rem)',
                    fontWeight: 900,
                    lineHeight: 1,
                    color: '#38bdf8',
                    textShadow: '0 0 35px rgba(56, 189, 248, 0.65), 0 3px 14px rgba(0,0,0,0.85)',
                    letterSpacing: '-0.5px'
                  }}
                >
                  {latestCalling ? latestCalling.loket : '---'}
                </div>

                {/* Nama Layanan (e.g. Kependudukan) */}
                <div
                  className="px-3.5 py-1.5 rounded-pill fw-bold text-white text-center shadow-md text-truncate"
                  style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    border: '1.5px solid rgba(255, 255, 255, 0.25)',
                    fontSize: 'clamp(0.9rem, 1.2vw, 1.3rem)',
                    maxWidth: '92%',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                  }}
                >
                  {latestCalling?.pelayanan_nama || 'Pelayanan Terpadu'}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Grid 2x2 Antrian Berlangsung Loket 1, 2, 3, 4 (Bawah - Diperkecil agar Panggilan Saat Ini Dominan) */}
          <div
            className="display-loket-grid"
            style={{
              flex: '1 1 42%',
              minHeight: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gridTemplateRows: 'repeat(2, 1fr)',
              gap: '8px'
            }}
          >
            {displayLokets.map((lok) => {
              const active = activeCalls[lok];
              return (
                <div
                  key={lok}
                  className="antrian-glass"
                  style={{
                    borderRadius: '14px',
                    padding: '6px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: 0,
                    /* MELAYANI = emerald green vivid | KOSONG = cool dark slate */
                    background: active
                      ? 'linear-gradient(135deg, rgba(5, 150, 105, 0.32), rgba(16, 185, 129, 0.18), rgba(6, 78, 59, 0.45))'
                      : 'linear-gradient(135deg, rgba(30, 41, 59, 0.80), rgba(15, 23, 42, 0.88))',
                    border: active
                      ? '1.5px solid rgba(52, 211, 153, 0.65)'
                      : '1px solid rgba(71, 85, 105, 0.55)',
                    borderLeft: `7px solid ${active ? '#10b981' : '#334155'}`,
                    boxShadow: active
                      ? '0 0 0 1px rgba(52,211,153,0.15), 0 10px 30px rgba(5, 150, 105, 0.35)'
                      : '0 8px 24px rgba(0, 0, 0, 0.5)',
                    transition: 'all 0.4s ease'
                  }}
                >
                  {/* Top Bar Card Loket */}
                  <div className="d-flex justify-content-between align-items-center">
                    <h4
                      className="fw-black m-0 text-uppercase"
                      style={{
                        fontSize: 'clamp(0.85rem, 1.1vw, 1.2rem)',
                        letterSpacing: '-0.2px',
                        color: active ? '#a7f3d0' : '#94a3b8'
                      }}
                    >
                      {lok}
                    </h4>
                    <span
                      className="badge rounded-pill fw-bold"
                      style={{
                        fontSize: 'clamp(0.58rem, 0.7vw, 0.72rem)',
                        padding: '3px 10px',
                        background: active
                          ? 'linear-gradient(135deg, #059669, #10b981)'
                          : 'rgba(51, 65, 85, 0.85)',
                        color: active ? '#ffffff' : '#64748b',
                        border: active ? '1px solid rgba(52,211,153,0.5)' : '1px solid rgba(71,85,105,0.6)',
                        boxShadow: active ? '0 2px 8px rgba(5,150,105,0.45)' : 'none'
                      }}
                    >
                      {active ? 'MELAYANI' : 'KOSONG'}
                    </span>
                  </div>

                  {/* Nomor Antrian Sedang Dilayani */}
                  <div className="text-center my-auto py-0">
                    <div
                      className="fw-black"
                      style={{
                        fontSize: 'clamp(1.7rem, 2.5vw, 2.9rem)',
                        lineHeight: 1,
                        fontWeight: 900,
                        color: active ? '#34d399' : '#475569',
                        textShadow: active
                          ? '0 0 22px rgba(52, 211, 153, 0.55), 0 2px 8px rgba(0,0,0,0.8)'
                          : 'none',
                        opacity: active ? 1 : 0.55
                      }}
                    >
                      {active ? active.nomor_lengkap : '- - -'}
                    </div>
                  </div>

                  {/* Keterangan Pelayanan */}
                  <div className="text-center">
                    <span
                      className="text-truncate d-block fw-semibold"
                      style={{
                        fontSize: 'clamp(0.62rem, 0.72vw, 0.8rem)',
                        color: active ? 'rgba(167, 243, 208, 0.85)' : 'rgba(100, 116, 139, 0.75)'
                      }}
                    >
                      {active?.pelayanan_nama || 'Standby'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Global Style & Responsive Media Queries */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes scroll-text {
          0% { transform: translate(0, 0); }
          100% { transform: translate(-100%, 0); }
        }

        @media (max-width: 991px) {
          .antrian-display-root {
            height: auto !important;
            max-height: none !important;
            overflow-y: auto !important;
          }
          .display-main-grid {
            flex-direction: column !important;
          }
          .display-left-col, .display-right-col {
            flex: 1 1 auto !important;
            width: 100% !important;
          }
          .display-video-box {
            height: 300px !important;
            flex: none !important;
          }
          .display-loket-grid {
            min-height: 380px !important;
          }
        }

        @media (max-width: 576px) {
          .display-panggilan-split {
            flex-direction: column !important;
          }
          .display-panggilan-split > div:first-child {
            border-right: none !important;
            border-bottom: 2px dashed rgba(251, 191, 36, 0.35) !important;
          }
        }

        @keyframes pulse-live {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.4); }
        }
      `}} />
    </div>
  );
}


