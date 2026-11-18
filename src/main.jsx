import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api, categories, facebook, instagram, searchProducts, productUrl, priceLabel } from './lib.js';
import { AppContext, Link, Icon, Photo, Loading, ErrorBox } from './ui.jsx';
import { Home, Category, Product, Design, Wishlist, NotFound } from './shop.jsx';
import { Cart, Checkout, OrderConfirmation } from './orders.jsx';
import { Auth, Account, Contact } from './user.jsx';
import { Admin } from './admin.jsx';
import './styles.css';

const decodeRoute = value => { try { return decodeURIComponent(value); } catch { return value; } };
const nav = [...Object.entries(categories).map(([key, label]) => [`/kategorie/${key}`, label]), ['/design', 'Dein Design'], ['/#ueber-uns', 'Über uns'], ['/kontakt', 'Kontakt']];
function Header() {
  const { user, cart, products, location, navigate } = React.useContext(AppContext);
  const [search, setSearch] = useState(false); const [query, setQuery] = useState(''); const [menu, setMenu] = useState(false);
  useEffect(() => { setSearch(false); setMenu(false); setQuery(''); }, [location.key]);
  const results = searchProducts(products, query);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  return <><div className="announcement">Handgefertigt. Individuell. Für deinen Regentag. <Icon name="sun" size={14}/></div><header className="header"><div className="header-inner"><Link to="/" className="brand" aria-label="Rainbow.design – Startseite"><Photo src="/assets/logo.svg" alt="Rainbow.design"/></Link><nav className={menu ? 'main-nav open' : 'main-nav'} aria-label="Hauptnavigation">{nav.map(([to, label]) => <Link key={to} to={to} className={location.pathname === to ? 'active' : ''}>{label}</Link>)}</nav><div className="header-actions"><button className="icon-button" aria-label="Suche öffnen" aria-expanded={search} onClick={() => { setSearch(!search); setMenu(false); }}><Icon name="search"/></button><Link className="icon-button" to={user ? '/konto' : '/login'} aria-label="Benutzerkonto"><Icon name="user"/></Link><Link className="icon-button" to="/wunschliste" aria-label="Wunschliste"><Icon name="heart"/></Link><Link className="icon-button cart-icon" to="/warenkorb" aria-label={`Warenkorb${count ? `, ${count} Artikel` : ''}`}><Icon name="bag"/>{count > 0 && <span className="cart-count">{count}</span>}</Link><button className="icon-button mobile-menu" aria-label="Menü öffnen" aria-expanded={menu} onClick={() => { setMenu(!menu); setSearch(false); }}><Icon name={menu ? 'close' : 'menu'}/></button></div></div>
    {search && <section className="search-panel" aria-label="Produktsuche"><div className="search-top"><label htmlFor="product-search">Was suchst du?</label><button className="icon-button" aria-label="Suche schließen" onClick={() => setSearch(false)}><Icon name="close"/></button></div><div className="search-input"><Icon name="search"/><input autoFocus id="product-search" placeholder="Regenmantel, Damen, Blau …" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setSearch(false); }}/></div>{query.trim() && <div className="search-results" aria-live="polite">{results.length ? results.map(({ product, color, image }) => <Link key={`${product.id}-${color}`} to={productUrl(product, color)} className="search-result"><Photo src={image} alt={product.name}/><span>{product.name}<small>{categories[product.category]}</small></span><span>{priceLabel(product)}</span></Link>) : <p>Keine Produkte gefunden.</p>}</div>}</section>}
  </header></>;
}
function Footer() { return <footer className="footer"><div className="footer-top"><div><Link to="/" className="footer-brand"><Photo src="/assets/logo.svg" alt="Rainbow.design"/></Link><p>Ein bisschen Regen.<br/>Ganz viel Persönlichkeit.</p></div><nav aria-label="Footer-Navigation">{nav.map(([to, label]) => <Link key={to} to={to}>{label}</Link>)}</nav><div className="footer-social"><p className="eyebrow">Bleib inspiriert</p><a href={instagram} target="_blank" rel="noreferrer">Instagram ↗</a><a href={facebook} target="_blank" rel="noreferrer">Facebook ↗</a></div></div><div className="footer-bottom"><span>© Rainbow.design</span><span>Mit Liebe gestaltet. Für dich gemacht.</span></div></footer>; }
function App() {
  const getLocation = () => ({ pathname: window.location.pathname, search: window.location.search, hash: window.location.hash, key: Date.now() + Math.random() });
  const [location, setLocation] = useState(getLocation); const [user, setUser] = useState(null); const [products, setProducts] = useState([]); const [cart, setCart] = useState([]); const [wishlist, setWishlist] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [notice, setNotice] = useState(null); const [confirmation, setConfirmation] = useState(null);
  const navigate = useCallback((to, replace = false) => { window.history[replace ? 'replaceState' : 'pushState']({}, '', to); setNotice(null); setLocation(getLocation()); }, []);
  useEffect(() => { const pop = () => { setNotice(null); setLocation(getLocation()); }; window.addEventListener('popstate', pop); return () => window.removeEventListener('popstate', pop); }, []);
  useEffect(() => { if (location.hash) requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })); else window.scrollTo(0, 0); }, [location.key, loading]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(null), 5500); return () => clearTimeout(timer); }, [notice]);
  const notify = (message, kind = 'success') => setNotice({ message, kind, key: Date.now() });
  const refreshCart = async () => { const data = await api('/cart'); setCart(data); return data; };
  const refreshWishlist = async () => { const data = await api('/wishlist'); setWishlist(data); return data; };
  const refreshUser = async () => { const data = await api('/me'); setUser(data); return data; };
  const refreshProducts = async () => { const data = await api('/products'); setProducts(data); return data; };
  async function initialize() {
    setLoading(true); setError('');
    try { const [loadedProducts, loadedCart, me] = await Promise.all([api('/products'), api('/cart'), api('/me').catch(e => { if (e.status === 401) return null; throw e; })]); setProducts(loadedProducts); setCart(loadedCart); setUser(me); if (me && me.role === 'user') setWishlist(await api('/wishlist')); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  }
  useEffect(() => { initialize(); }, []);
  const admin = ['admin', 'main_admin'].includes(user?.role);
  useEffect(() => { if (loading) return; if (admin && !location.pathname.startsWith('/admin')) navigate('/admin/produkte', true); else if (!user && ['/konto', '/wunschliste'].includes(location.pathname)) navigate('/login', true); else if (!user && location.pathname.startsWith('/admin')) navigate('/login', true); else if (user && !admin && location.pathname.startsWith('/admin')) navigate('/konto', true); }, [loading, user, location.pathname]);
  async function logout() { try { await api('/logout', 'POST'); setUser(null); setWishlist([]); await refreshCart(); navigate('/'); } catch (e) { notify(e.message, 'error'); } }
  async function toggleWishlist(product, color) {
    if (!user) { navigate('/login'); return; }
    const item = wishlist.find(item => item.productId === product.id && item.color === color);
    await api(item ? `/wishlist/${item.itemId}` : '/wishlist', item ? 'DELETE' : 'POST', item ? undefined : { productId: product.id, color });
    await refreshWishlist(); notify(item ? 'Aus der Wunschliste entfernt.' : 'Zur Wunschliste hinzugefügt.');
  }
  async function addToCart(item) { await api('/cart', 'POST', { ...item, quantity: 1 }); await refreshCart(); notify('Dein Regenmantel ist im Warenkorb.'); }
  const value = { user, setUser, products, refreshProducts, cart, setCart, refreshCart, wishlist, setWishlist, refreshWishlist, toggleWishlist, addToCart, refreshUser, logout, location, navigate, notify, confirmation, setConfirmation };
  let page;
  const path = location.pathname;
  if (loading) page = <Loading/>;
  else if (error) page = <div className="container section"><ErrorBox>{error}</ErrorBox><button className="button" onClick={initialize}>Erneut versuchen</button></div>;
  else if (admin) page = <Admin/>;
  else if (path === '/') page = <Home/>;
  else if (/^\/kategorie\/(women|men|kids|dogs)$/.test(path)) page = <Category key={path} category={path.split('/')[2]}/>;
  else if (/^\/produkt\/[^/]+$/.test(path)) page = <Product key={path + location.search} id={decodeRoute(path.split('/')[2])}/>;
  else if (path === '/design') page = <Design key={location.key}/>;
  else if (path === '/wunschliste') page = user ? <Wishlist/> : <Loading/>;
  else if (path === '/warenkorb') page = <Cart/>;
  else if (path === '/kasse') page = <Checkout/>;
  else if (path === '/bestellbestaetigung') page = <OrderConfirmation/>;
  else if (path === '/login' || path === '/registrieren') page = <Auth key={path} register={path === '/registrieren'}/>;
  else if (path === '/konto') page = user ? <Account/> : <Loading/>;
  else if (path === '/kontakt') page = <Contact/>;
  else if (path.startsWith('/admin') && !user) page = <Loading/>;
  else page = <NotFound/>;
  return <AppContext.Provider value={value}><a className="skip-link" href="#main">Zum Inhalt springen</a>{!loading && !admin && <Header/>}<main id="main" tabIndex="-1">{page}</main>{!loading && !admin && <Footer/>}{notice && <div role={notice.kind === 'error' ? 'alert' : 'status'} className={`toast ${notice.kind === 'error' ? 'toast-error' : ''}`} key={notice.key}><Icon name={notice.kind === 'error' ? 'close' : 'check'} size={19}/><span>{notice.message}</span><button className="icon-button" onClick={() => setNotice(null)} aria-label="Hinweis schließen"><Icon name="close" size={17}/></button></div>}</AppContext.Provider>;
}

createRoot(document.getElementById('root')).render(<App/>);
