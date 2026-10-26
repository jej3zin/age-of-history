type Props = { onStart: () => void; onContinue: () => void };

export default function HomePage({ onStart, onContinue }: Props) {
  return (
    <main className="home-shell">
      <header className="home-nav">
        <a className="brand home-brand" href="/" aria-label="Age of History início">
          <span className="brand-mark">AH</span>
          <span><strong className="brand-title">AGE OF HISTORY</strong><small className="brand-subtitle">Construa. Governe. Transforme.</small></span>
        </a>
        <span className="version-pill"><span className="status-dot" /> PROTÓTIPO v0.1</span>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">UM MUNDO. MIL POSSIBILIDADES.</span>
          <h1>A história não está escrita.<br /><em>Está nas suas mãos.</em></h1>
          <p>Assuma o comando de uma nação, administre seus recursos e decida o rumo de um mundo em constante mudança.</p>
          <div className="hero-actions">
            <button className="button primary hero-primary" onClick={onStart}>Iniciar campanha <span>→</span></button>
            <button className="button secondary hero-secondary" onClick={onContinue}>Continuar campanha</button>
          </div>
          <div className="hero-footnote"><span className="status-dot" /> Salvamento local · Jogo offline</div>
        </div>
        <div className="hero-art" aria-label="Ilustração abstrata de um mapa estratégico">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="map-grid-art">
            <div className="map-land land-a" /><div className="map-land land-b" /><div className="map-land land-c" />
            <span className="map-pin pin-a" /><span className="map-pin pin-b" /><span className="map-pin pin-c" />
            <span className="map-label label-a">AURORA</span><span className="map-label label-b">BRUMÁRIA</span><span className="map-label label-c">SOLMAR</span>
          </div>
          <div className="art-coordinates">34° 08′ N<br />18° 42′ E</div>
          <div className="art-caption"><span>01 / MUNDO CONHECIDO</span><span>MAPA POLÍTICO</span></div>
        </div>
      </section>

      <section className="home-features">
        <article className="feature-card"><span className="feature-number">01</span><span className="feature-icon">⌖</span><h2>Controle territorial</h2><p>Explore o mapa político, selecione territórios e acompanhe suas características.</p></article>
        <article className="feature-card"><span className="feature-number">02</span><span className="feature-icon">↗</span><h2>Economia nacional</h2><p>Observe tesouro, produção, receitas e despesas a cada dia de simulação.</p></article>
        <article className="feature-card"><span className="feature-number">03</span><span className="feature-icon">◷</span><h2>História em movimento</h2><p>Avance o calendário e acompanhe os acontecimentos da sua campanha.</p></article>
      </section>
      <footer className="home-footer"><span>AGE OF HISTORY</span><span>Uma experiência estratégica em desenvolvimento</span></footer>
    </main>
  );
}
