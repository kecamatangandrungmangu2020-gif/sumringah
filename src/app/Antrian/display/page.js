"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
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

  // Kunci animasi panggilan agar setiap panggilan baru / panggil ulang memicu motion pop-in & sonar ring
  const callAnimKey = latestCalling
    ? `${latestCalling.id}-${latestCalling.panggil_ulang || 0}-${latestCalling.panggil_at?.toMillis ? latestCalling.panggil_at.toMillis() : '0'}`
    : 'idle';

  return (
    <div
      className="antrian-display-root"
      style={{
        background: 'linear-gradient(155deg, #f8fbfd 0%, #ebf5f8 52%, #dff0f6 100%)',
        height: '100vh',
        maxHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '12px 18px',
        boxSizing: 'border-box',
        color: '#061E2B',
        overflow: 'hidden',
        position: 'relative',
        transition: 'background 0.5s ease-in-out'
      }}
    >
      {/* Ambient Blue-White Glow + Subtle Light Pendopo Silhouette (Selaras Landing Page) */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          backgroundImage: `radial-gradient(circle at 12% 14%, rgba(14, 116, 144, 0.12), transparent 44%), radial-gradient(circle at 88% 86%, rgba(56, 189, 248, 0.14), transparent 44%)`
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 0.14,
          backgroundImage: "url('/images/gandrungmangu-pendopo-silhouette-light.webp')",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center bottom',
          backgroundSize: 'cover'
        }}
      />

      {/* ══ MODE ANTRIAN (tampilan normal + Mode TV dalam layout yang sama) ══ */}
      {/* Floating Audio Activation Prompt (Jika browser memblokir autoplay) */}
      <AnimatePresence>
        {!audioUnlocked && (
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            onClick={unlockAudio}
            className="position-fixed top-0 start-50 translate-middle-x mt-2 shadow-lg d-flex align-items-center gap-2 px-3.5 py-1.5 rounded-pill"
            style={{
              zIndex: 9999,
              background: 'linear-gradient(135deg, #0E7490, #061E2B)',
              color: '#ffffff',
              cursor: 'pointer',
              border: '2px solid rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 10px 30px rgba(14, 116, 144, 0.38)'
            }}
            title="Klik untuk mengaktifkan suara panggilan"
          >
            <i className="bi bi-volume-mute-fill fs-6 text-white"></i>
            <span className="fw-bold small font-hero">Klik layar di mana saja untuk mengaktifkan suara</span>
            <span className="badge rounded-pill ms-1" style={{ background: '#ffffff', color: '#0E7490' }}>Aktifkan</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 1. HEADER LOGO DAN ALAMAT (PORCELAIN WHITE + OCEAN BLUE BAR) ────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="d-flex justify-content-between align-items-center mb-2.5"
        style={{
          position: 'relative',
          zIndex: 10,
          flexShrink: 0,
          padding: '10px 20px',
          borderRadius: '20px',
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(14, 116, 144, 0.16)',
          boxShadow: '0 10px 30px rgba(6, 30, 43, 0.08)'
        }}
      >
        {/* Sisi Kiri: Tombol Portal, Fullscreen & Logo + Identitas Instansi */}
        <div className="d-flex align-items-center gap-3 min-w-0">
          <div className="d-flex align-items-center gap-2 shrink-0">
            <Link
              href="/Antrian/"
              className="btn btn-sm rounded-pill px-3 py-1.5 text-white d-inline-flex align-items-center gap-1.5 text-decoration-none font-hero"
              style={{
                background: 'linear-gradient(135deg, #0E7490, #061E2B)',
                border: '1px solid rgba(14, 116, 144, 0.25)',
                boxShadow: '0 4px 12px rgba(14, 116, 144, 0.22)',
                transition: 'all 0.25s ease'
              }}
              title="Kembali ke Portal Sistem Pelayanan"
            >
              <i className="bi bi-arrow-left text-white"></i>
              <span className="small d-none d-xl-inline fw-bold">Portal</span>
            </Link>

            <button
              onClick={toggleFullscreen}
              className="btn btn-sm rounded-pill px-2.5 py-1.5 d-inline-flex align-items-center"
              style={{
                background: '#ebf5f8',
                color: '#0E7490',
                border: '1px solid rgba(14, 116, 144, 0.22)'
              }}
              title={isFullscreen ? "Keluar Layar Penuh" : "Mode TV Layar Penuh"}
            >
              <i className={isFullscreen ? "bi bi-fullscreen-exit" : "bi bi-arrows-fullscreen"}></i>
            </button>
          </div>

          {(logoTambahan || "/img/logo-tambahan.png") && (
            <motion.img
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, delay: 0.1 }}
              src={logoTambahan || "/img/logo-tambahan.png"}
              alt="Logo Instansi"
              style={{
                height: '46px',
                maxWidth: '240px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 2px 6px rgba(6, 30, 43, 0.15))'
              }}
            />
          )}

          <div className="min-w-0">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <h2
                className="fw-extrabold m-0 font-hero text-truncate"
                style={{
                  fontSize: 'clamp(1.1rem, 1.55vw, 1.7rem)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.12,
                  color: '#061E2B'
                }}
              >
                {settings.instansi_nama}
              </h2>
              <span
                className="d-none d-md-inline-flex align-items-center gap-1.5 px-2.5 py-0.5 rounded-pill font-mono"
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  background: '#ebf5f8',
                  border: '1px solid rgba(14, 116, 144, 0.25)',
                  color: '#0E7490'
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '999px',
                    background: '#0E7490',
                    boxShadow: '0 0 8px rgba(14, 116, 144, 0.65)',
                    animation: 'pulse-live 2s ease-in-out infinite'
                  }}
                />
                SEMRINGAH LIVE
              </span>
            </div>
            <p
              className="m-0 fw-medium text-truncate"
              style={{
                fontSize: 'clamp(0.72rem, 0.88vw, 0.88rem)',
                lineHeight: 1.25,
                color: '#475569'
              }}
            >
              {settings.instansi_alamat}
            </p>
          </div>
        </div>

        {/* Sisi Kanan: Broadcast Digital Clock & Tanggal (Ocean Blue Capsule) */}
        <div
          className="text-end px-3.5 py-1.5 rounded-4 shrink-0"
          style={{
            background: 'linear-gradient(135deg, #0E7490, #061E2B)',
            border: '1px solid rgba(14, 116, 144, 0.35)',
            boxShadow: '0 8px 20px rgba(14, 116, 144, 0.22)'
          }}
        >
          <div className="d-flex align-items-baseline justify-content-end gap-1.5">
            <span
              className="font-mono fw-black"
              style={{
                fontSize: 'clamp(1.65rem, 2.45vw, 2.65rem)',
                color: '#ffffff',
                lineHeight: 1,
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
                textShadow: '0 2px 10px rgba(0,0,0,0.28)'
              }}
            >
              {mounted ? currentTime.toLocaleTimeString('id-ID', { hour12: false }) : '--.--.--'}
            </span>
            <span
              className="font-mono fw-bold"
              style={{ fontSize: '0.72rem', color: '#bae6fd', letterSpacing: '0.12em' }}
            >
              WIB
            </span>
          </div>
          <div
            className="font-mono fw-semibold mt-0.5 text-uppercase"
            style={{
              fontSize: 'clamp(0.65rem, 0.8vw, 0.82rem)',
              color: 'rgba(224, 242, 254, 0.90)',
              letterSpacing: '0.08em'
            }}
          >
            {mounted
              ? currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
              : 'Memuat Tanggal...'}
          </div>
        </div>
      </motion.div>

      {/* ── 2. MAIN LAYOUT (KIRI: VIDEO + RUNNING TEKS, KANAN: PANGGILAN + 4 LOKET) ── */}
      <div
        className="display-main-grid"
        style={{
          position: 'relative',
          zIndex: 10,
          flex: '1 1 0%',
          minHeight: 0,
          display: 'flex',
          gap: '14px',
          overflow: 'hidden'
        }}
      >
        {/* ═══ KOLOM KIRI (VIDEO DI ATAS, RUNNING TEKS DI BAWAH) ═══ */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="display-left-col"
          style={{
            flex: '1 1 56%',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minHeight: 0
          }}
        >
          {/* Box Video / TV Player (White Frame + Blue Shadow) */}
          <div
            className="display-video-box"
            style={{
              flex: '1 1 0%',
              minHeight: 0,
              borderRadius: '22px',
              overflow: 'hidden',
              border: displayMode === 'tv'
                ? '3px solid rgba(239, 68, 68, 0.7)'
                : '4px solid #ffffff',
              boxShadow: displayMode === 'tv'
                ? '0 16px 38px rgba(239, 68, 68, 0.22)'
                : '0 16px 40px rgba(6, 30, 43, 0.14)',
              background: '#061E2B',
              position: 'relative',
              transition: 'border 0.4s ease, box-shadow 0.4s ease'
            }}
          >
            {/* Corner Broadcast Pill */}
            <div
              className="d-inline-flex align-items-center gap-1.5 px-2.5 py-1 rounded-pill font-mono"
              style={{
                position: 'absolute',
                top: '12px',
                left: '14px',
                zIndex: 20,
                background: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(10px)',
                border: displayMode === 'tv'
                  ? '1px solid rgba(239, 68, 68, 0.35)'
                  : '1px solid rgba(14, 116, 144, 0.25)',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: displayMode === 'tv' ? '#dc2626' : '#0E7490',
                boxShadow: '0 4px 12px rgba(6, 30, 43, 0.14)'
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '999px',
                  background: displayMode === 'tv' ? '#ef4444' : '#0E7490',
                  animation: 'pulse-live 1.8s ease-in-out infinite'
                }}
              />
              {displayMode === 'tv' ? (tvChannel?.name || 'LIVE TV') : 'MEDIA INFORMASI'}
            </div>

            {/* Konten: TvPlayer (mode TV) atau YouTube/Video (mode antrian) */}
            {displayMode === 'tv'
              ? <TvPlayer channel={tvChannel} isMuted={isTvMuted} onMuteToggle={setIsTvMuted} volume={parseFloat(settings.display_video_volume) || 0.8} />
              : renderVideoPlayer(settings.display_video_url)
            }

            {/* Tombol Mute / Hidupkan Suara Video */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
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
                  ? 'rgba(255, 255, 255, 0.92)'
                  : 'linear-gradient(135deg, #0E7490, #061E2B)',
                color: (displayMode === 'tv' ? isTvMuted : isVideoMuted) ? '#061E2B' : '#ffffff',
                border: '1.5px solid rgba(14, 116, 144, 0.35)',
                padding: '7px 11px',
                fontSize: '1.05rem',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(6, 30, 43, 0.28)'
              }}
              title={(displayMode === 'tv' ? isTvMuted : isVideoMuted) ? 'Aktifkan suara' : 'Matikan suara'}
            >
              <i className={(displayMode === 'tv' ? isTvMuted : isVideoMuted) ? 'bi bi-volume-mute-fill fs-5' : 'bi bi-volume-up-fill text-white fs-5'} style={(displayMode === 'tv' ? isTvMuted : isVideoMuted) ? { color: '#0E7490' } : undefined}></i>
            </motion.button>
          </div>

          {/* Running Teks (Porcelain White + Ocean Blue INFO Pill) */}
          <div
            className="display-running-box"
            style={{
              flexShrink: 0,
              height: '46px',
              background: '#ffffff',
              border: '1.5px solid rgba(14, 116, 144, 0.22)',
              borderRadius: '15px',
              boxShadow: '0 8px 22px rgba(6, 30, 43, 0.08)',
              display: 'flex',
              alignItems: 'center',
              overflow: 'hidden'
            }}
          >
            <div
              className="px-3.5 fw-black text-uppercase d-flex align-items-center gap-1.5 h-100 font-hero text-white"
              style={{
                background: 'linear-gradient(135deg, #0E7490, #061E2B)',
                fontSize: '0.82rem',
                fontWeight: 800,
                flexShrink: 0,
                borderTopLeftRadius: '13px',
                borderBottomLeftRadius: '13px',
                letterSpacing: '0.12em'
              }}
            >
              <i className="bi bi-megaphone-fill"></i>
              <span>INFO</span>
            </div>

            <div
              className="flex-grow-1 overflow-hidden"
              style={{
                whiteSpace: 'nowrap',
                maskImage: 'linear-gradient(to right, transparent, black 3%, black 97%, transparent)',
                WebkitMaskImage: 'linear-gradient(to right, transparent, black 3%, black 97%, transparent)'
              }}
            >
              <p
                className="font-hero"
                style={{
                  display: 'inline-block',
                  paddingLeft: '100%',
                  margin: 0,
                  animation: 'scroll-text 28s linear infinite',
                  fontSize: 'clamp(0.92rem, 1.08vw, 1.12rem)',
                  fontWeight: 700,
                  color: '#061E2B',
                  letterSpacing: '0.01em'
                }}
              >
                {settings.running_text}
              </p>
            </div>
          </div>
        </motion.div>

        {/* ═══ KOLOM KANAN (PANGGILAN SAAT INI + 2x2 ANTRIAN BERLANGSUNG) ═══ */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
          className="display-right-col"
          style={{
            flex: '1 1 44%',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minHeight: 0
          }}
        >
          {/* 1. Box Panggilan Saat Ini (Vibrant Ocean Blue + Pure White Contrast) */}
          <div
            style={{
              flex: '1 1 56%',
              minHeight: 0,
              borderRadius: '22px',
              border: '2px solid rgba(255, 255, 255, 0.85)',
              background: 'linear-gradient(135deg, #0E7490 0%, #095972 52%, #061E2B 100%)',
              boxShadow: latestCalling
                ? '0 20px 48px rgba(14, 116, 144, 0.34), inset 0 0 36px rgba(186, 230, 253, 0.14)'
                : '0 16px 38px rgba(6, 30, 43, 0.22)',
              padding: '14px 16px',
              display: 'flex',
              overflow: 'hidden',
              position: 'relative',
              transition: 'box-shadow 0.4s ease'
            }}
          >
            {/* Subtle Semringah Watermark */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                right: '-10px',
                bottom: '-10px',
                width: '185px',
                height: '185px',
                opacity: 0.14,
                pointerEvents: 'none',
                backgroundImage: "url('/images/gandrungmangu-semringah-silhouette.webp')",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right bottom',
                backgroundSize: 'contain'
              }}
            />

            {/* Periodic Ambient Light Sweep */}
            <div
              aria-hidden="true"
              className="display-shimmer-sweep"
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                background: 'linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.12) 50%, transparent 65%)'
              }}
            />

            <div
              className="d-flex w-100 h-100 align-items-center display-panggilan-split"
              style={{ minHeight: 0, position: 'relative', zIndex: 5 }}
            >
              {/* ══ SISI KIRI: PANGGILAN SAAT INI & NOMOR BESAR ══ */}
              <div
                className="d-flex flex-column align-items-center justify-content-center text-center h-100 position-relative"
                style={{
                  flex: '1 1 52%',
                  padding: '8px 12px',
                  borderRight: '1.5px dashed rgba(255, 255, 255, 0.32)',
                  minWidth: 0
                }}
              >
                {/* Header Badge (Pure White + Ocean Blue Text) */}
                <div
                  className="d-inline-flex align-items-center gap-2 px-3.5 py-1 rounded-pill shadow mb-1.5 font-hero"
                  style={{
                    background: '#ffffff',
                    color: '#0E7490'
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '999px',
                      background: '#0E7490',
                      animation: 'pulse-live 1.2s ease-in-out infinite'
                    }}
                  />
                  <span
                    className="fw-black text-uppercase"
                    style={{ fontSize: 'clamp(0.76rem, 0.98vw, 1.05rem)', letterSpacing: '0.12em', fontWeight: 800 }}
                  >
                    PANGGILAN SAAT INI
                  </span>
                </div>

                {/* Nomor Antrian Panggilan Besar + Animated White Sonar Burst */}
                <div className="position-relative d-flex align-items-center justify-content-center my-auto w-100">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={callAnimKey}
                      initial={{ opacity: 0, scale: 0.72, y: 20, filter: 'blur(8px)' }}
                      animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, scale: 1.08, y: -14, filter: 'blur(6px)' }}
                      transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                      className="position-relative d-flex align-items-center justify-content-center"
                    >
                      {latestCalling && (
                        <motion.span
                          initial={{ scale: 0.5, opacity: 0.8 }}
                          animate={{ scale: 2.1, opacity: 0 }}
                          transition={{ duration: 0.95, ease: 'easeOut' }}
                          style={{
                            position: 'absolute',
                            width: '120px',
                            height: '120px',
                            borderRadius: '999px',
                            border: '3px solid rgba(255, 255, 255, 0.8)',
                            pointerEvents: 'none'
                          }}
                        />
                      )}
                      <div
                        className="font-hero fw-black"
                        style={{
                          fontSize: 'clamp(4.2rem, 6.8vw, 7.8rem)',
                          lineHeight: 0.92,
                          fontWeight: 900,
                          letterSpacing: '-0.03em',
                          color: '#ffffff',
                          fontVariantNumeric: 'tabular-nums',
                          textShadow: '0 0 36px rgba(186, 230, 253, 0.55), 0 6px 20px rgba(6, 30, 43, 0.5)'
                        }}
                      >
                        {latestCalling ? latestCalling.nomor_lengkap : '---'}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* ══ SISI KANAN: MENUJU, LOKET, & NAMA LAYANAN ══ */}
              <div
                className="d-flex flex-column align-items-center justify-content-center text-center h-100"
                style={{
                  flex: '1 1 48%',
                  padding: '8px 12px',
                  minWidth: 0,
                  gap: '8px'
                }}
              >
                <div
                  className="font-mono fw-bold text-uppercase"
                  style={{
                    fontSize: 'clamp(0.88rem, 1.15vw, 1.25rem)',
                    letterSpacing: '0.28em',
                    color: '#bae6fd'
                  }}
                >
                  MENUJU
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={`loket-${callAnimKey}`}
                    initial={{ opacity: 0, y: 16, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -12, scale: 0.94 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.06 }}
                    className="d-flex flex-column align-items-center gap-2 w-100"
                  >
                    <div
                      className="font-hero fw-black text-center"
                      style={{
                        fontSize: 'clamp(2.3rem, 3.5vw, 4.1rem)',
                        fontWeight: 900,
                        lineHeight: 1.02,
                        color: '#ffffff',
                        textShadow: '0 4px 16px rgba(6, 30, 43, 0.45)',
                        letterSpacing: '-0.02em'
                      }}
                    >
                      {latestCalling ? latestCalling.loket : '---'}
                    </div>

                    <div
                      className="px-3.5 py-1.5 rounded-pill fw-bold text-center text-truncate font-hero"
                      style={{
                        background: 'rgba(255, 255, 255, 0.94)',
                        border: '1px solid #ffffff',
                        color: '#061E2B',
                        fontSize: 'clamp(0.82rem, 1.08vw, 1.15rem)',
                        maxWidth: '94%',
                        boxShadow: '0 6px 18px rgba(6, 30, 43, 0.25)'
                      }}
                    >
                      {latestCalling?.pelayanan_nama || 'Pelayanan Terpadu'}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* 2. Grid 2x2 Antrian Berlangsung Loket 1, 2, 3, 4 (Crisp White + Ocean Blue Cards) */}
          <div
            className="display-loket-grid"
            style={{
              flex: '1 1 44%',
              minHeight: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gridTemplateRows: 'repeat(2, 1fr)',
              gap: '9px'
            }}
          >
            {displayLokets.map((lok, idx) => {
              const active = activeCalls[lok];
              const isCurrentCallingLoket =
                Boolean(latestCalling && latestCalling.status === 'dipanggil' && latestCalling.loket === lok);

              return (
                <motion.div
                  key={lok}
                  initial={{ opacity: 0, y: 18, scale: 0.96 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: isCurrentCallingLoket ? 1.02 : 1
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 280,
                    damping: 22,
                    delay: 0.12 + idx * 0.05
                  }}
                  style={{
                    borderRadius: '18px',
                    padding: '10px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: 0,
                    position: 'relative',
                    overflow: 'hidden',
                    background: isCurrentCallingLoket
                      ? 'linear-gradient(135deg, #0E7490 0%, #061E2B 100%)'
                      : active
                      ? 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)'
                      : '#ffffff',
                    border: isCurrentCallingLoket
                      ? '2px solid #0E7490'
                      : active
                      ? '1.5px solid rgba(14, 116, 144, 0.38)'
                      : '1px solid rgba(14, 116, 144, 0.16)',
                    borderLeft: `6px solid ${isCurrentCallingLoket ? '#38bdf8' : active ? '#0E7490' : '#cbd5e1'}`,
                    boxShadow: isCurrentCallingLoket
                      ? '0 14px 32px rgba(14, 116, 144, 0.34)'
                      : active
                      ? '0 10px 24px rgba(14, 116, 144, 0.12)'
                      : '0 6px 18px rgba(6, 30, 43, 0.06)',
                    transition: 'border 0.35s ease, box-shadow 0.35s ease, background 0.35s ease'
                  }}
                >
                  {/* Top Bar Card Loket */}
                  <div className="d-flex justify-content-between align-items-center gap-1">
                    <h4
                      className="font-hero fw-black m-0 text-uppercase text-truncate"
                      style={{
                        fontSize: 'clamp(0.84rem, 1.05vw, 1.15rem)',
                        letterSpacing: '0.02em',
                        color: isCurrentCallingLoket ? '#ffffff' : active ? '#061E2B' : '#64748b'
                      }}
                    >
                      {lok}
                    </h4>
                    <span
                      className="badge rounded-pill font-mono fw-bold d-inline-flex align-items-center gap-1"
                      style={{
                        fontSize: 'clamp(0.56rem, 0.68vw, 0.7rem)',
                        padding: '3px 9px',
                        letterSpacing: '0.08em',
                        background: isCurrentCallingLoket
                          ? '#ffffff'
                          : active
                          ? 'linear-gradient(135deg, #0E7490, #0891b2)'
                          : '#f1f5f9',
                        color: isCurrentCallingLoket ? '#0E7490' : active ? '#ffffff' : '#64748b',
                        border: isCurrentCallingLoket
                          ? '1px solid #ffffff'
                          : active
                          ? '1px solid rgba(14, 116, 144, 0.25)'
                          : '1px solid #e2e8f0'
                      }}
                    >
                      {(active || isCurrentCallingLoket) && (
                        <span
                          style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '999px',
                            background: isCurrentCallingLoket ? '#0E7490' : '#bae6fd',
                            animation: 'pulse-live 1.5s ease-in-out infinite'
                          }}
                        />
                      )}
                      {isCurrentCallingLoket ? 'DIPANGGIL' : active ? 'MELAYANI' : 'STANDBY'}
                    </span>
                  </div>

                  {/* Nomor Antrian Sedang Dilayani (Animated on Ticket Change) */}
                  <div className="text-center my-auto py-0">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={active ? `${lok}-${active.nomor_lengkap}` : `${lok}-empty`}
                        initial={{ opacity: 0, y: 10, scale: 0.88 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.92 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                        className="font-hero fw-black"
                        style={{
                          fontSize: 'clamp(1.75rem, 2.55vw, 2.95rem)',
                          lineHeight: 1,
                          fontWeight: 900,
                          fontVariantNumeric: 'tabular-nums',
                          color: isCurrentCallingLoket ? '#ffffff' : active ? '#0E7490' : '#cbd5e1',
                          textShadow: isCurrentCallingLoket
                            ? '0 2px 14px rgba(0, 0, 0, 0.35)'
                            : 'none'
                        }}
                      >
                        {active ? active.nomor_lengkap : '---'}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Keterangan Pelayanan */}
                  <div className="text-center">
                    <span
                      className="text-truncate d-block fw-semibold font-hero"
                      style={{
                        fontSize: 'clamp(0.64rem, 0.74vw, 0.8rem)',
                        color: isCurrentCallingLoket
                          ? '#bae6fd'
                          : active
                          ? '#0E7490'
                          : '#94a3b8'
                      }}
                    >
                      {active?.pelayanan_nama || 'Siap Melayani'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Global Style & Responsive Media Queries */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes scroll-text {
          0% { transform: translate(0, 0); }
          100% { transform: translate(-100%, 0); }
        }

        @keyframes display-shimmer {
          0% { transform: translateX(-120%); }
          45%, 100% { transform: translateX(140%); }
        }

        .display-shimmer-sweep {
          animation: display-shimmer 7s ease-in-out infinite;
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
            border-bottom: 1.5px dashed rgba(103, 232, 249, 0.35) !important;
          }
        }

        @keyframes pulse-live {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.35); }
        }
      `}} />
    </div>
  );
}


