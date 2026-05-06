import { useState, useEffect, useCallback } from 'react';
import { Search, Compass, X, Filter, Sun, Moon, RefreshCw, Menu, Trees } from 'lucide-react';
import MapView from './components/MapView';
import RouteCard from './components/RouteCard';
import RouteDetail from './components/RouteDetail';
import { parseKML } from './utils/kmlParser';
import './index.css';



export default function App() {
  const [routes, setRoutes] = useState([]);
  const [activeRoute, setActiveRoute] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [showFilters, setShowFilters] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('ht-theme') || 'dark');
  const [loadingState, setLoadingState] = useState({ status: 'idle', progress: 0, total: 0, loaded: 0, errors: [] });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isLoading, setIsLoading] = useState(true);
  const [detailPanelHeight, setDetailPanelHeight] = useState(0);

  // When a route is activated, pre-calculate the default panel height
  const handleDetailPanelHeightChange = (h) => setDetailPanelHeight(h);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'day' ? 'day' : '');
    localStorage.setItem('ht-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'day' : 'dark');

  // Load KML files from /kml/manifest.json at startup
  const loadKMLFolder = useCallback(async () => {
    setLoadingState({ status: 'loading', progress: 0, total: 0, loaded: 0, errors: [] });
    setRoutes([]);

    try {
      const manifestRes = await fetch('/kml/routes-metadata.json?t=' + Date.now());
      if (!manifestRes.ok) throw new Error('routes-metadata.json not found in /public/kml/');
      const metadataMap = await manifestRes.json();
      const fileNames = Object.keys(metadataMap);

      if (fileNames.length === 0) {
        setLoadingState({ status: 'done', progress: 100, total: 0, loaded: 0, errors: ['No KML files listed in routes-metadata.json'] });
        return;
      }

      const loadedRoutes = Object.entries(metadataMap).map(([fileName, meta]) => {
        return {
          id: Math.random().toString(36).substr(2, 9),
          fileName: fileName,
          name: meta.name,
          description: meta.description,
          difficulty: meta.difficultyOverride !== "Auto" ? meta.difficultyOverride : meta.calculatedDifficulty,
          stats: {
             ...meta.stats,
             estimatedHours: meta.hoursOverride !== "Auto" ? meta.hoursOverride : meta.stats?.estimatedHours
          },
          bounds: meta.bounds,
          coordinates: meta.startPos ? [meta.startPos, meta.startPos] : [], 
          isLazyLoaded: false
        };
      });

      setRoutes(loadedRoutes);
      setLoadingState({ status: 'done', progress: 100, total: loadedRoutes.length, loaded: loadedRoutes.length, errors: [] });
    } catch (e) {
      setLoadingState({ status: 'error', progress: 0, total: 0, loaded: 0, errors: [e.message] });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadKMLFolder(); }, [loadKMLFolder]);

  const handleRouteClick = async (route) => {
    // On mobile, hide the sidebar so the map + elevation card are visible
    if (isMobile) setSidebarOpen(false);

    if (!route.isLazyLoaded) {
      setIsLoading(true);
      try {
        const res = await fetch(`/kml/${encodeURIComponent(route.fileName)}?t=${Date.now()}`);
        const text = await res.text();
        const fullParsed = parseKML(text, route.fileName);
        
        if (fullParsed) {
          const updatedRoute = {
            ...fullParsed,
            id: route.id, 
            name: route.name, 
            description: route.description,
            difficulty: route.difficulty,
            isLazyLoaded: true
          };
          updatedRoute.stats.estimatedHours = route.stats.estimatedHours;
          
          setRoutes(prev => prev.map(r => r.id === route.id ? updatedRoute : r));
          setActiveRoute(updatedRoute);
        }
      } catch (err) {
        console.error("Failed to load KML", err);
      } finally {
        setIsLoading(false);
      }
    } else {
      setActiveRoute(route);
    }
  };

  const handleDeleteRoute = (id) => {
    setRoutes(prev => prev.filter(r => r.id !== id));
    if (activeRoute?.id === id) setActiveRoute(null);
  };

  const filteredRoutes = routes
    .filter(r => {
      const matchSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDiff = filterDifficulty === 'All' || r.difficulty === filterDifficulty;
      return matchSearch && matchDiff;
    })
    .sort((a, b) => {
      if (sortBy === 'distance') return b.stats.distance - a.stats.distance;
      if (sortBy === 'gain') return b.stats.elevationGain - a.stats.elevationGain;
      if (sortBy === 'difficulty') { const o = {Easy:0,Moderate:1,Hard:2,Extreme:3}; return o[b.difficulty] - o[a.difficulty]; }
      return a.name.localeCompare(b.name);
    });

  const totalStats = routes.reduce((acc, r) => ({
    distance: acc.distance + (r.stats?.distance || 0),
    gain: acc.gain + (r.stats?.elevationGain || 0),
  }), { distance: 0, gain: 0 });

  const isDark = theme === 'dark';

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg-primary)', position: 'relative' }}>

      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? (isMobile ? '100%' : 340) : 0,
        minWidth: sidebarOpen ? (isMobile ? '100%' : 340) : 0,
        overflow:'hidden', transition:'all 0.35s cubic-bezier(0.4,0,0.2,1)',
        display:'flex', flexDirection:'column',
        background:'var(--sidebar-bg)',
        borderRight:`1px solid var(--sidebar-border)`,
        position: isMobile ? 'absolute' : 'relative',
        height: '100%',
        zIndex: 2000,
      }}>
        <div style={{ width: isMobile ? '100%' : 340, display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

          {/* Header */}
          <div style={{ padding:'16px 16px 0', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              {/* Sidebar toggle */}
              <button className="theme-toggle" onClick={() => setSidebarOpen(false)} title="Close Sidebar" style={{ border: 'none', background: 'transparent' }}>
                <Menu size={18} />
              </button>
              {/* Logo */}
              <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg, #10b981 0%, #059669 100%)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(16,185,129,0.3)', flexShrink:0 }}>
                <Trees size={18} style={{ color:'white' }} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)', fontFamily:'Playfair Display, serif', letterSpacing:'-0.02em' }}>Kathmandu Valley Hikes</div>
                <a 
                  href="https://www.walknepalwalk.com.np/trail-maps" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ display:'block', fontSize:9, color:'var(--text-muted)', letterSpacing:'0.06em', textTransform:'uppercase', fontWeight:600, textDecoration:'none', transition:'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color='var(--accent-primary)'}
                  onMouseLeave={e => e.target.style.color='var(--text-muted)'}
                >
                  WalkNepalWalk Community Data
                </a>
              </div>
              {/* Theme toggle */}
              <button className="theme-toggle" onClick={toggleTheme} title={isDark ? 'Switch to Day Mode' : 'Switch to Dark Mode'}>
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>

            {/* Stats bar */}
            {routes.length > 0 && (
              <div style={{ marginTop:12, display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8 }}>
                <MicroStat label="Routes" value={routes.length} />
                <MicroStat label="km total" value={totalStats.distance.toFixed(0)} />
                <MicroStat label="m gain" value={`${(totalStats.gain/1000).toFixed(1)}k`} />
              </div>
            )}

            {/* Loading state */}
            <LoadingStatus state={loadingState} onReload={loadKMLFolder} />

            {/* Search */}
            <div style={{ marginTop:12 }}>
              <div style={{ position:'relative', marginBottom:8 }}>
                <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search routes…"
                  style={{
                    width:'100%', background:'var(--input-bg)', border:`1px solid var(--border)`,
                    borderRadius:8, padding:'8px 10px 8px 30px',
                    color:'var(--text-primary)', fontSize:12, outline:'none',
                  }}
                  onFocus={e => e.target.style.borderColor='var(--accent-primary)'}
                  onBlur={e => e.target.style.borderColor='var(--border)'}
                />
              </div>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  style={{
                    display:'flex', alignItems:'center', gap:4, padding:'5px 10px',
                    background: showFilters ? 'rgba(249,115,22,0.15)' : 'var(--bg-card)',
                    border:`1px solid ${showFilters ? 'var(--accent-primary)' : 'var(--border)'}`,
                    borderRadius:6, cursor:'pointer',
                    color: showFilters ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontSize:11,
                  }}>
                  <Filter size={11} /> Filter
                </button>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  style={{
                    flex:1, background:'var(--bg-card)', border:`1px solid var(--border)`,
                    borderRadius:6, padding:'5px 8px', color:'var(--text-secondary)',
                    fontSize:11, outline:'none', cursor:'pointer',
                  }}>
                  <option value="name">Name</option>
                  <option value="distance">Distance</option>
                  <option value="gain">Elev. Gain</option>
                  <option value="difficulty">Difficulty</option>
                </select>
              </div>
              {showFilters && (
                <div style={{ marginTop:8, display:'flex', gap:5, flexWrap:'wrap' }}>
                  {['All','Easy','Moderate','Hard','Extreme'].map(d => (
                    <button key={d} onClick={() => setFilterDifficulty(d)} style={{
                      padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:600, cursor:'pointer',
                      background: filterDifficulty===d ? 'var(--accent-primary)' : 'rgba(249,115,22,0.08)',
                      color: filterDifficulty===d ? 'white' : 'var(--text-secondary)',
                      border:`1px solid ${filterDifficulty===d ? 'var(--accent-primary)' : 'var(--border)'}`,
                    }}>{d}</button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop:12, marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span className="section-label">{filteredRoutes.length} of {routes.length} routes</span>
              {activeRoute && (
                <button onClick={() => setActiveRoute(null)} style={{ fontSize:10, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                  <X size={10}/> Clear
                </button>
              )}
            </div>
          </div>

          {/* Route list */}
          <div style={{ flex:1, overflowY:'auto', padding:'0 16px 20px', display:'flex', flexDirection:'column', gap:8 }}>
            {isLoading && routes.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text-muted)' }}>
                <div style={{ width:28, height:28, border:`2px solid var(--accent-primary)`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }} />
                <div style={{ fontSize:13, fontWeight:500 }}>Loading...</div>
              </div>
            ) : filteredRoutes.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text-muted)' }}>
                <Compass size={32} style={{ marginBottom:12, opacity:0.4 }} />
                <div style={{ fontSize:13, fontWeight:500, marginBottom:4 }}>No routes found</div>
              </div>
            ) : (
              filteredRoutes.map(route => {
                const globalIdx = routes.findIndex(r => r.id === route.id);
                return (
                  <RouteCard
                    key={route.id}
                    route={route}
                    index={globalIdx}
                    isActive={activeRoute?.id === route.id}
                    onClick={() => handleRouteClick(route)}
                    onDelete={handleDeleteRoute}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Map area */}
      <div style={{ flex:1, position:'relative', overflow:'hidden' }}>

        {/* Floating logo when sidebar closed */}
        {!sidebarOpen && (
          <div style={{ position:'absolute', top: isMobile ? 12 : 16, left: isMobile ? 12 : 16, zIndex:1000 }}>
            <div style={{ padding: isMobile ? '6px 10px' : '8px 14px', background:'var(--bg-primary)', border:`1px solid var(--border)`, borderRadius:12, backdropFilter:'blur(12px)', display:'flex', alignItems:'center', gap:8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <button className="theme-toggle" onClick={() => setSidebarOpen(true)} title="Open Sidebar" style={{ border:'none', background:'transparent', color: 'var(--text-primary)' }}>
                <Menu size={18}/>
              </button>
              <div style={{ width:24, height:24, borderRadius:6, background:'linear-gradient(135deg, #10b981 0%, #059669 100%)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Trees size={12} style={{ color:'white' }}/>
              </div>
              <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', fontFamily:'Playfair Display, serif' }}>Kathmandu Valley Hikes</span>
              {!isMobile && <span style={{ fontSize:11, color:'var(--text-muted)' }}>• {routes.length} routes</span>}
              <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme" style={{ marginLeft:4 }}>
                {isDark ? <Sun size={14}/> : <Moon size={14}/>}
              </button>
            </div>
          </div>
        )}

        <MapView
          routes={filteredRoutes}
          activeRoute={activeRoute}
          onRouteClick={handleRouteClick}
          theme={theme}
          detailPanelHeight={activeRoute ? detailPanelHeight : 0}
        />

        {/* Route legend removed */}

        {activeRoute && (
          <RouteDetail
            route={activeRoute}
            index={routes.findIndex(r => r.id === activeRoute.id)}
            onClose={() => { setActiveRoute(null); setDetailPanelHeight(0); }}
            onClick={() => handleRouteClick(activeRoute)}
            isMobile={isMobile}
            onHeightChange={handleDetailPanelHeightChange}
          />
        )}
      </div>
    </div>
  );
}

function MicroStat({ label, value }) {
  return (
    <div style={{ background:'var(--bg-card)', borderRadius:8, padding:'8px', textAlign:'center', border:`1px solid var(--border)` }}>
      <div style={{ fontSize:16, fontWeight:700, color:'var(--accent-primary)', fontFamily:'JetBrains Mono, monospace' }}>{value}</div>
      <div className="section-label" style={{ marginTop:2 }}>{label}</div>
    </div>
  );
}

function LoadingStatus({ state, onReload }) {
  if (state.status === 'idle') return null;

  if (state.status === 'loading') {
    return (
      <div style={{ marginTop:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <span style={{ fontSize:11, color:'var(--text-muted)' }}>
            Loading routes… {state.loaded}/{state.total}
          </span>
          <span style={{ fontSize:11, color:'var(--accent-primary)', fontFamily:'JetBrains Mono, monospace' }}>{state.progress}%</span>
        </div>
        <div className="loading-bar-track">
          <div className="loading-bar-fill" style={{ width:`${state.progress}%` }} />
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div style={{ marginTop:12, padding:'8px 12px', borderRadius:8, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)' }}>
        <div style={{ fontSize:11, color:'#ef4444', marginBottom:4 }}>⚠ Failed to load KML files</div>
        <div style={{ fontSize:10, color:'var(--text-muted)' }}>{state.errors[0]}</div>
        <button onClick={onReload} style={{ marginTop:6, fontSize:10, color:'var(--accent-primary)', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
          <RefreshCw size={10}/> Retry
        </button>
      </div>
    );
  }

  if (state.status === 'done' && state.errors.length > 0) {
    return (
      <div style={{ marginTop:10, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:10, color:'var(--text-muted)' }}>
          {state.loaded} loaded{state.errors.length > 0 ? `, ${state.errors.length} failed` : ''}
        </span>
        <button onClick={onReload} style={{ fontSize:10, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:3 }}>
          <RefreshCw size={10}/> Reload
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop:10, display:'flex', alignItems:'center', justifyContent:'flex-end' }}>
      <button onClick={onReload} style={{ fontSize:10, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:3 }}>
        <RefreshCw size={10}/> Reload
      </button>
    </div>
  );
}
