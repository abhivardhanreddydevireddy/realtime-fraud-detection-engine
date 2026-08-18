import { NavLink, Outlet } from "react-router-dom";

import {
  Activity,
  BarChart3,
  BellRing,
  Home,
  PlayCircle,
  ShieldCheck,
  Radar,
} from "lucide-react";

const nav = [
  {
    to: "/",
    label: "Dashboard",
    Icon: Home,
    end: true,
  },
  {
    to: "/live",
    label: "Live Monitor",
    Icon: Radar,
  },
  {
    to: "/analytics",
    label: "Analytics",
    Icon: BarChart3,
  },
  {
    to: "/investigation",
    label: "Investigation",
    Icon: BellRing,
  },
  {
    to: "/simulator",
    label: "Simulator",
    Icon: PlayCircle,
  },
];

export default function Layout() {
  return (
    <div className="app-shell">

      {/* =====================================================
          TOP NAVIGATION
      ===================================================== */}

      <header className="topbar">

        {/* BRAND */}

        <div className="brand">

          <div className="brand-mark">
            <ShieldCheck size={23} />
          </div>

          <div className="brand-text">

            <strong>
              FraudGuard
            </strong>

            <span>
              Real-time fraud intelligence
            </span>

          </div>

        </div>


        {/* NAVIGATION */}

        <nav className="top-nav">

          {nav.map(
            ({ to, label, Icon, end }) => (

              <NavLink
                key={to}
                to={to}
                end={Boolean(end)}
                className={({ isActive }) =>
                  `top-nav-item ${
                    isActive
                      ? "active"
                      : ""
                  }`
                }
              >

                <Icon size={17} />

                <span>
                  {label}
                </span>

              </NavLink>

            )
          )}

        </nav>


        {/* DETECTION ENGINE */}

        <div className="engine-status">

          <Activity size={16} />

          <div>

            <strong>
              Detection engine
            </strong>

            <span>
              ML + pseudo-streaming
            </span>

          </div>

        </div>

      </header>


      {/* =====================================================
          PAGE CONTENT
      ===================================================== */}

      <main className="main">

        <Outlet />

      </main>

    </div>
  );
}