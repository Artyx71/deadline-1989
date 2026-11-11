import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';

// Primary YouTube oEmbed metadata identifies this upload as DevolverDigital's
// "Hotline Miami - Launch Trailer". No video file is bundled with the game.
const TRAILER_ID = 'UgXM7ivgYTo';
const PLAYER_ORIGIN = 'https://www.youtube-nocookie.com';
const SOURCE_URL = 'https://www.devolverdigital.com/games/hotline-miami';
type Signal = 'connecting' | 'playing' | 'blocked';
interface TelevisionPanelProps {
  onClose: () => void;
}

export function TelevisionPanel({ onClose }: TelevisionPanelProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [connection, setConnection] = useState(0);
  const [signal, setSignal] = useState<Signal>('connecting');
  const parameters = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    controls: '0',
    disablekb: '1',
    loop: '1',
    playlist: TRAILER_ID,
    enablejsapi: '1',
    playsinline: '1',
    rel: '0',
    fs: '0',
    hl: 'ru',
    origin: window.location.origin,
  });

  function command(func: string, args: number[] = []) {
    frame.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args }),
      PLAYER_ORIGIN,
    );
  }
  function forceMute() {
    command('mute');
    command('setVolume', [0]);
  }
  function connect() {
    frame.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'listening', id: 'deadline-tv-player' }),
      PLAYER_ORIGIN,
    );
    forceMute();
    command('playVideo');
  }

  useEffect(() => {
    let playing = false;
    const sendCommand = (func: string, args: number[] = []) => {
      frame.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        PLAYER_ORIGIN,
      );
    };
    const mute = () => {
      sendCommand('mute');
      sendCommand('setVolume', [0]);
    };
    const timeout = window.setTimeout(() => {
      if (!playing) setSignal('blocked');
    }, 12000);
    const interval = window.setInterval(() => {
      frame.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'listening', id: 'deadline-tv-player' }),
        PLAYER_ORIGIN,
      );
      mute();
    }, 1000);
    const receive = (event: MessageEvent<unknown>) => {
      if (event.origin !== PLAYER_ORIGIN || event.source !== frame.current?.contentWindow) return;
      let payload: unknown = event.data;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          return;
        }
      }
      if (!payload || typeof payload !== 'object') return;
      const message = payload as { event?: unknown; info?: unknown };
      if (message.event === 'onError') {
        setSignal('blocked');
        return;
      }
      if (message.event === 'onReady') {
        mute();
        sendCommand('playVideo');
      }
      const info = message.info;
      const details =
        info && typeof info === 'object'
          ? (info as { playerState?: unknown; muted?: unknown; volume?: unknown })
          : null;
      const state = typeof info === 'number' ? info : details?.playerState;
      if (state === 1) {
        playing = true;
        window.clearTimeout(timeout);
        setSignal('playing');
      }
      if (details?.muted === false || (typeof details?.volume === 'number' && details.volume > 0))
        mute();
    };
    window.addEventListener('message', receive);
    return () => {
      window.removeEventListener('message', receive);
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [connection]);

  const status =
    signal === 'playing'
      ? 'ЭФИР ПОДКЛЮЧЁН'
      : signal === 'blocked'
        ? 'СИГНАЛ НЕДОСТУПЕН'
        : 'НАСТРОЙКА СИГНАЛА…';
  return (
    <Modal title="ТЕЛЕВИЗОР / КАНАЛ 03" onClose={onClose} className="television-panel">
      <div className="television-body">
        <div className="television-channel">
          <span>HOTLINE MIAMI / ОФИЦИАЛЬНЫЙ ТРЕЙЛЕР</span>
          <span className="television-muted">БЕЗ ЗВУКА</span>
        </div>
        <div className="television-cabinet">
          <div className="television-screen" data-signal={signal}>
            <iframe
              key={connection}
              ref={frame}
              id="deadline-tv-player"
              data-testid="television-frame"
              src={`${PLAYER_ORIGIN}/embed/${TRAILER_ID}?${parameters.toString()}`}
              title="Официальный трейлер Hotline Miami — воспроизведение без звука"
              allow="autoplay; encrypted-media"
              referrerPolicy="strict-origin-when-cross-origin"
              tabIndex={-1}
              onLoad={connect}
              onError={() => setSignal('blocked')}
            />
            <div className="television-scanlines" aria-hidden="true" />
            {signal === 'blocked' && (
              <div className="television-no-signal">
                <span aria-hidden="true">03 / — — —</span>
                <h3>НЕТ СИГНАЛА</h3>
                <p>
                  Не удалось запустить видео. Попробуй переподключиться или открой официальный
                  источник.
                </p>
              </div>
            )}
          </div>
          <div className="television-hardware" aria-hidden="true">
            <span />
            <span />
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
        <div className="television-reception">
          <p role="status">{status}</p>
          <span>ИГРА ПРИОСТАНОВЛЕНА · ESC — ВЫКЛЮЧИТЬ</span>
        </div>
        <p className="television-credit">
          Трейлер опубликован DevolverDigital. Видео загружается с YouTube; в состав игры не входит.
        </p>
        <div className="television-actions">
          <button
            className="button-secondary"
            onClick={() => {
              setSignal('connecting');
              setConnection((previous) => previous + 1);
            }}
          >
            ПЕРЕПОДКЛЮЧИТЬ
          </button>
          <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
            ОФИЦИАЛЬНЫЙ ИСТОЧНИК ↗
          </a>
          <button className="button-primary" data-testid="television-close" onClick={onClose}>
            ВЫКЛЮЧИТЬ ТВ
          </button>
        </div>
      </div>
    </Modal>
  );
}
