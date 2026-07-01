import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Import", end: true },
  { to: "/invoices", label: "Shipments", end: false },
];

function NavItem({ to, label, end }: { to: string; label: string; end: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `nav-link${isActive ? " nav-link-active" : ""}`}
    >
      {label}
    </NavLink>
  );
}

export default function AppShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-brand">
          <span className="brand-mark">K</span>
          <div>
            <div className="brand-name">KATO</div>
            <div className="brand-tag">Manifest Console</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="sidebar-foot-label">Super Will import pipeline</span>
        </div>
      </aside>

      <div className="app-main">
        <main className="app-content">
          <Outlet />
        </main>
      </div>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>
    </div>
  );
}
