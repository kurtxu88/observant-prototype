/* ============================================================
   SUBSPACE — Brand / logo explorations (design canvas content)
   Marks built from type + simple geometry only (dots, rings, tiles).
   ============================================================ */
const { useEffect } = React;

function Board({ children, dark, pad = 0 }) {
  return (
    <div style={{
      height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
      background: dark ? "var(--night)" : "var(--canvas)", padding: pad || "0",
    }}>{children}</div>
  );
}

/* small caption under a concept */
function Cap({ children }) {
  return <div className="cap">{children}</div>;
}

function Brand() {
  return (
    <DesignCanvas>

      {/* ============ WORDMARK ============ */}
      <DCSection id="wordmark" title="Wordmark directions" subtitle="The lowercase serif voice — four refinements of the placeholder">

        <DCArtboard id="w-a" label="A · The full stop" width={420} height={240}>
          <Board>
            <div style={{ textAlign: "center" }}>
              <div className="lw">subspace<span className="ac">.</span></div>
              <Cap>a period, not a bullet — a complete, recorded observation</Cap>
            </div>
          </Board>
        </DCArtboard>

        <DCArtboard id="w-b" label="B · The pair" width={420} height={240}>
          <Board>
            <div style={{ textAlign: "center" }}>
              <div className="lw" style={{ display: "inline-flex", alignItems: "center", gap: "0.34em" }}>
                <span className="pair"><i></i><i></i></span>subspace
              </div>
              <Cap>two dots = a 1:1 — the mark and the positioning are the same thing</Cap>
            </div>
          </Board>
        </DCArtboard>

        <DCArtboard id="w-c" label="C · The diaeresis" width={420} height={240}>
          <Board>
            <div style={{ textAlign: "center" }}>
              <div className="lw" style={{ position: "relative", display: "inline-block" }}>
                <span style={{ position: "relative" }}>
                  e
                  <span className="diaer"><i></i><i></i></span>
                </span>dda
              </div>
              <Cap>Nordic diacritic — Icelandic lore, and the two-dot device, in one move</Cap>
            </div>
          </Board>
        </DCArtboard>

        <DCArtboard id="w-d" label="D · Stamped" width={420} height={240}>
          <Board>
            <div style={{ textAlign: "center" }}>
              <div className="stamp">
                <span className="rule"></span>
                E&thinsp;D&thinsp;D&thinsp;A
                <span className="rule"></span>
              </div>
              <Cap>an ex-libris / archival stamp — the documentary-observer register</Cap>
            </div>
          </Board>
        </DCArtboard>

      </DCSection>

      {/* ============ MARKS ============ */}
      <DCSection id="marks" title="Marks & glyphs" subtitle="A standalone symbol for the app icon, favicon, avatar">

        <DCArtboard id="m-seal" label="E · Ex-libris seal" width={300} height={300}>
          <Board>
            <div style={{ textAlign: "center" }}>
              <span className="seal">e</span>
              <Cap>a book stamp — knowledge / lore</Cap>
            </div>
          </Board>
        </DCArtboard>

        <DCArtboard id="m-colon" label="F · The 1:1 tile" width={300} height={300}>
          <Board dark>
            <div style={{ textAlign: "center" }}>
              <span className="tile night"><span className="pair lg"><i></i><i></i></span></span>
              <Cap dark>the pair as an app icon</Cap>
            </div>
          </Board>
        </DCArtboard>

        <DCArtboard id="m-ripple" label="G · Listening" width={300} height={300}>
          <Board>
            <div style={{ textAlign: "center" }}>
              <span className="ripple"><i className="r1"></i><i className="r2"></i><i className="rd"></i></span>
              <Cap>attention — a quiet, listening signal</Cap>
            </div>
          </Board>
        </DCArtboard>

        <DCArtboard id="m-mono" label="H · Monogram" width={300} height={300}>
          <Board>
            <div style={{ textAlign: "center" }}>
              <span className="tile warm">e</span>
              <Cap>serif monogram tile</Cap>
            </div>
          </Board>
        </DCArtboard>

      </DCSection>

      {/* ============ RECOMMENDED SYSTEM ============ */}
      <DCSection id="system" title="Recommended · “the pair”" subtitle="Wordmark subspace + a two-dot mark that means 1:1 — and a reusable device across the UI">

        <DCArtboard id="s-icon" label="App icon" width={300} height={300}>
          <Board>
            <div style={{ textAlign: "center" }}>
              <span className="tile night"><span className="pair lg"><i></i><i></i></span></span>
              <Cap>night tile · terracotta pair</Cap>
            </div>
          </Board>
        </DCArtboard>

        <DCArtboard id="s-lockup" label="Primary lockup" width={420} height={300}>
          <Board>
            <div style={{ textAlign: "center" }}>
              <div className="lw" style={{ display: "inline-flex", alignItems: "center", gap: "0.34em", fontSize: "3.4rem" }}>
                <span className="pair"><i></i><i></i></span>subspace
              </div>
              <div className="tagline">the modern user-learning pipeline</div>
            </div>
          </Board>
        </DCArtboard>

        <DCArtboard id="s-dark" label="On night" width={420} height={300}>
          <Board dark>
            <div style={{ textAlign: "center" }}>
              <div className="lw dark" style={{ display: "inline-flex", alignItems: "center", gap: "0.34em", fontSize: "3.4rem" }}>
                <span className="pair"><i></i><i></i></span>subspace
              </div>
              <div className="tagline dark">1:1, continuously, at scale</div>
            </div>
          </Board>
        </DCArtboard>

        <DCArtboard id="s-device" label="The device, in use" width={460} height={300}>
          <Board pad="28px">
            <div style={{ width: "100%" }}>
              <div className="dev-row"><span className="pair sm"><i></i><i></i></span><span className="dev-mono">how it works</span></div>
              <div className="dev-row"><span className="dotlive"></span><span className="dev-txt">Live · in a 1:1 right now</span></div>
              <div className="dev-row"><span className="pair sm"><i></i><i></i></span><span className="dev-txt">a list marker, a divider, a status</span></div>
              <Cap>two dots recur as eyebrow rule, bullet, and live indicator</Cap>
            </div>
          </Board>
        </DCArtboard>

      </DCSection>

    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Brand />);
