"use client";

const BUBBLES = [
  { top: "12%", left: "18%", size: 3, delay: 0, duration: 18 },
  { top: "28%", left: "82%", size: 4, delay: 2, duration: 22 },
  { top: "55%", left: "8%", size: 2, delay: 1, duration: 16 },
  { top: "72%", left: "68%", size: 3, delay: 3, duration: 20 },
  { top: "38%", left: "52%", size: 2, delay: 0.5, duration: 14 },
  { top: "85%", left: "28%", size: 4, delay: 1.5, duration: 24 },
  { top: "18%", left: "62%", size: 2, delay: 2.5, duration: 17 },
];

export function HubBackgroundDecor() {
  return (
    <div className="yappie-bg-decor" aria-hidden="true">
      <svg
        className="yappie-bg-line"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <linearGradient id="yappie-line-grad" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#9333ea" stopOpacity="0" />
            <stop offset="30%" stopColor="#a855f7" stopOpacity="0.35" />
            <stop offset="70%" stopColor="#9333ea" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#9333ea" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          className="yappie-bg-line-path"
          d="M -20 820
             C 80 720, 160 680, 240 740
             C 320 800, 280 860, 200 830
             C 360 760, 520 640, 720 560
             C 920 480, 1100 440, 1280 460
             C 1380 475, 1420 520, 1360 550"
          stroke="url(#yappie-line-grad)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      <div className="yappie-bg-bubbles">
        {BUBBLES.map((b, i) => (
          <span
            key={i}
            className="yappie-bg-bubble"
            style={{
              top: b.top,
              left: b.left,
              width: b.size,
              height: b.size,
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.duration}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
