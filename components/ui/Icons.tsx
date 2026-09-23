// Set de iconițe SVG line (stroke) — aspect profesional, fără emoji.
// Toate acceptă className pentru dimensiune/culoare (folosesc currentColor).

type IconProps = { className?: string };

const base = (className?: string) =>
  `inline-block shrink-0 ${className ?? "h-5 w-5"}`;

function Svg({
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={base(className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconDashboard = ({ className }: IconProps) => (
  <Svg className={className}>
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </Svg>
);

export const IconCar = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M3 13l2-5a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 8l2 5" />
    <path d="M3 13h18v4a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H6v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
    <circle cx="7.5" cy="15.5" r="0.5" />
    <circle cx="16.5" cy="15.5" r="0.5" />
  </Svg>
);

export const IconChart = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M3 3v18h18" />
    <rect x="7" y="11" width="3" height="6" />
    <rect x="12" y="7" width="3" height="10" />
    <rect x="17" y="13" width="3" height="4" />
  </Svg>
);

export const IconShield = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
    <path d="M9.5 12l1.8 1.8L15 10" />
  </Svg>
);

export const IconUsers = ({ className }: IconProps) => (
  <Svg className={className}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20a6 6 0 0 1 12 0" />
    <path d="M16 5.5a3 3 0 0 1 0 5.5" />
    <path d="M17 14a6 6 0 0 1 4 6" />
  </Svg>
);

export const IconForm = ({ className }: IconProps) => (
  <Svg className={className}>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M9 8h6M9 12h6M9 16h4" />
  </Svg>
);

export const IconDownload = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M12 3v12" />
    <path d="M8 11l4 4 4-4" />
    <path d="M4 19h16" />
  </Svg>
);

export const IconEye = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);

export const IconLogout = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
    <path d="M10 17l-5-5 5-5" />
    <path d="M5 12h12" />
  </Svg>
);

export const IconMenu = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Svg>
);

export const IconWarning = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M12 3l9 16H3z" />
    <path d="M12 10v4M12 17h.01" />
  </Svg>
);

export const IconMoney = ({ className }: IconProps) => (
  <Svg className={className}>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M6 9v6M18 9v6" />
  </Svg>
);

export const IconCheck = ({ className }: IconProps) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12.5l2.2 2.2L16 9.5" />
  </Svg>
);

export const IconBookmark = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
  </Svg>
);

export const IconCube = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M12 2l9 5v10l-9 5-9-5V7z" />
    <path d="M3 7l9 5 9-5M12 12v10" />
  </Svg>
);

export const IconTrend = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M21 7v5h-5" />
  </Svg>
);

export const IconTrash = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
  </Svg>
);

export const IconClose = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const IconTasks = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M9 5h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1" />
    <path d="M9 3h6v4H9z" />
    <path d="M9 12l2 2 4-4" />
  </Svg>
);

export const IconCalendar = ({ className }: IconProps) => (
  <Svg className={className}>
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M3 9h18M8 2v4M16 2v4" />
  </Svg>
);

export const IconPhoto = ({ className }: IconProps) => (
  <Svg className={className}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="8.5" cy="9.5" r="1.5" />
    <path d="M21 16l-5-5-6 6-3-3-4 4" />
  </Svg>
);

export const IconWrench = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8 6.2 21l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.7 2.7-2.3-.6-.6-2.3z" />
  </Svg>
);

export const IconTruck = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M3 6h11v9H3z" />
    <path d="M14 9h4l3 3v3h-7z" />
    <circle cx="7" cy="18" r="1.6" />
    <circle cx="17" cy="18" r="1.6" />
  </Svg>
);

export const IconShare = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
    <path d="M12 15V3M8 7l4-4 4 4" />
  </Svg>
);

export const IconClock = ({ className }: IconProps) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);

export const IconUser = ({ className }: IconProps) => (
  <Svg className={className}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </Svg>
);

export const IconBell = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </Svg>
);

export const IconTarget = ({ className }: IconProps) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="0.6" fill="currentColor" />
  </Svg>
);
