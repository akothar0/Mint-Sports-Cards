import {
  Archive,
  Brain,
  Eye,
  Gem,
  Layers,
  Search,
  Settings,
  Sparkles,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

function Section({ label, items, fallbackPath, isCardRoute }) {
  return (
    <div className="sidebar-section">
      <p className="section-label">{label}</p>
      <div className="section-items">
        {items.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            fallbackActive={isCardRoute && fallbackPath === item.to}
          >
            {item.label}
          </NavItem>
        ))}
      </div>
    </div>
  )
}

function NavItem({ to, icon, children, fallbackActive = false }) {
  const Icon = icon
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `sidebar-item${isActive || fallbackActive ? ' active' : ''}`
      }
    >
      <Icon size={16} />
      <span>{children}</span>
    </NavLink>
  )
}

export function Layout() {
  const location = useLocation()
  const isCardRoute = location.pathname.startsWith('/card/')
  const fallbackPath = isCardRoute ? location.state?.fromNav ?? '' : ''

  const discoverItems = [
    { to: '/swipe', label: 'Swipe', icon: Sparkles },
    { to: '/explore', label: 'Explore', icon: Search },
  ]
  const myCardsItems = [
    { to: '/watchlist', label: 'Watchlist', icon: Eye },
    { to: '/collection', label: 'Collection', icon: Archive },
    { to: '/sets', label: 'Sets', icon: Layers },
  ]
  const insightItems = [{ to: '/ai-picks', label: 'AI Picks', icon: Brain }]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <Gem size={14} />
            <span>Mint</span>
          </div>

          <Section
            label="DISCOVER"
            items={discoverItems}
            fallbackPath={fallbackPath}
            isCardRoute={isCardRoute}
          />
          <Section
            label="MY CARDS"
            items={myCardsItems}
            fallbackPath={fallbackPath}
            isCardRoute={isCardRoute}
          />
          <Section
            label="INSIGHTS"
            items={insightItems}
            fallbackPath={fallbackPath}
            isCardRoute={isCardRoute}
          />
        </div>

        <div className="sidebar-bottom">
          <NavItem
            to="/preferences"
            icon={Settings}
            fallbackActive={isCardRoute && fallbackPath === '/preferences'}
          >
            Preferences
          </NavItem>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
