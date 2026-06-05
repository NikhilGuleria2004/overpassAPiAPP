import { useState, useEffect, useRef } from "react";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand",
  "Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
  "Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
  "Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman and Nicobar Islands","Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu","Delhi",
  "Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry"
];

const C = {
  bg:      "#0e0e10",
  surface: "#18181c",
  raised:  "#222228",
  border:  "#2e2e38",
  borderHover: "#44444f",
  text:    "#f0eff4",
  muted:   "#8a8a9a",
  dim:     "#55556a",
  accent:  "#f26522",
  green:   "#138808",
  highlight: "#2a2318",
};

function buildDistrictQuery(stateName) {
  return `[out:json][timeout:60];
(
  area["name"="${stateName}"]["admin_level"~"^[2345]$"]["boundary"="administrative"];
  area["name:en"="${stateName}"]["admin_level"~"^[2345]$"]["boundary"="administrative"];
)->.state;
(
  rel(area.state)["admin_level"="6"]["boundary"="administrative"];
  rel(area.state)["admin_level"="7"]["boundary"="administrative"];
);
out tags;`;
}

function buildCityQuery(districtName) {
  return `[out:json][timeout:90];
(
  area["name"="${districtName}"]["boundary"="administrative"];
  area["name:en"="${districtName}"]["boundary"="administrative"];
)->.district;
(
  node(area.district)["place"~"^(city|town|village|suburb|municipality)$"];
  way(area.district)["place"~"^(city|town|village|suburb|municipality)$"];
);
out center tags;`;
}

async function fetchWithFallback(query) {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(query),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data && data.elements !== undefined) return data;
    } catch (e) {}
  }
  throw new Error("All endpoints failed");
}

function highlightMatch(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <span>
      {text.slice(0, idx)}
      <span style={{ background: C.highlight, color: C.accent, borderRadius: "2px", padding: "0 1px" }}>
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </span>
  );
}

function SearchableDropdown({ label, step, value, onChange, options, placeholder, loading, error, onRetry }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setQuery(value || "");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [value]);

  useEffect(() => { setQuery(value || ""); }, [value]);

  const select = (opt) => { onChange(opt); setQuery(opt); setOpen(false); };

  return (
    <div style={{ marginBottom: "1.75rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
        <span style={{
          width: "22px", height: "22px", borderRadius: "50%",
          background: value ? C.green : C.raised,
          border: `1px solid ${value ? C.green : C.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "11px", color: value ? "#fff" : C.dim,
          flexShrink: 0, transition: "all 0.2s",
          fontFamily: "monospace",
        }}>{step}</span>
        <label style={{ fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted, fontFamily: "monospace" }}>{label}</label>
        {options.length > 0 && !loading && (
          <span style={{ fontSize: "11px", color: C.dim, fontFamily: "monospace", marginLeft: "auto" }}>{options.length}</span>
        )}
      </div>

      {loading && (
        <div style={{
          padding: "13px 16px", background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: "8px", color: C.muted, fontSize: "13px",
          fontFamily: "monospace", display: "flex", alignItems: "center", gap: "10px"
        }}>
          <span style={{ animation: "spin 1s linear infinite", display: "inline-block", fontSize: "15px" }}>⟳</span>
          Fetching {label.toLowerCase()}…
        </div>
      )}

      {!loading && error && (
        <div style={{ padding: "13px 16px", background: "#1a0f0f", border: "1px solid #3d1f1f", borderRadius: "8px", fontSize: "13px" }}>
          <div style={{ color: "#e07070", marginBottom: "10px" }}>{error}</div>
          <button onClick={onRetry} style={{
            padding: "5px 14px", background: "none", border: "1px solid #3d1f1f",
            borderRadius: "5px", color: "#e07070", cursor: "pointer",
            fontSize: "12px", fontFamily: "monospace",
          }}>Retry</button>
        </div>
      )}

      {!loading && !error && options.length > 0 && (
        <div ref={wrapperRef} style={{ position: "relative" }}>
          <div style={{ position: "relative" }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(""); }}
              onFocus={() => { setQuery(""); setOpen(true); }}
              onKeyDown={e => {
                if (e.key === "Escape") { setOpen(false); setQuery(value || ""); inputRef.current?.blur(); }
                if (e.key === "Enter" && filtered.length === 1) select(filtered[0]);
              }}
              placeholder={placeholder}
              style={{
                width: "100%", padding: "13px 44px 13px 16px",
                background: open ? C.raised : C.surface,
                border: `1px solid ${open ? C.borderHover : C.border}`,
                borderRadius: open ? "8px 8px 0 0" : "8px",
                fontSize: "14px", color: C.text, outline: "none",
                fontFamily: "inherit", boxSizing: "border-box",
                transition: "background 0.15s, border-color 0.15s",
              }}
            />
            <span onClick={() => { setOpen(o => !o); if (!open) { setQuery(""); inputRef.current?.focus(); } }}
              style={{
                position: "absolute", right: "14px", top: "50%",
                transform: `translateY(-50%) rotate(${open ? "180deg" : "0deg"})`,
                color: C.dim, fontSize: "11px", cursor: "pointer",
                transition: "transform 0.2s", userSelect: "none",
              }}>▼</span>
          </div>

          {open && (
            <div ref={listRef} style={{
              position: "absolute", top: "100%", left: 0, right: 0,
              background: C.raised, border: `1px solid ${C.borderHover}`,
              borderTop: "none", borderRadius: "0 0 8px 8px",
              maxHeight: "240px", overflowY: "auto", zIndex: 100,
            }}>
              {filtered.length === 0
                ? <div style={{ padding: "12px 16px", fontSize: "13px", color: C.dim, fontFamily: "monospace" }}>No matches</div>
                : filtered.map((opt) => (
                  <div key={opt} onMouseDown={() => select(opt)}
                    style={{
                      padding: "10px 16px", fontSize: "14px",
                      color: opt === value ? C.accent : C.text,
                      background: opt === value ? "#1e1510" : "transparent",
                      borderLeft: opt === value ? `2px solid ${C.accent}` : "2px solid transparent",
                      cursor: "pointer", transition: "background 0.1s",
                    }}
                    onMouseEnter={e => { if (opt !== value) e.currentTarget.style.background = C.surface; }}
                    onMouseLeave={e => { if (opt !== value) e.currentTarget.style.background = "transparent"; }}
                  >
                    {query ? highlightMatch(opt, query) : opt}
                  </div>
                ))
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [selectedState, setSelectedState] = useState("");
  const [stateQuery, setStateQuery] = useState("");
  const [stateOpen, setStateOpen] = useState(false);
  const stateRef = useRef(null);
  const stateInputRef = useRef(null);

  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [districtLoading, setDistrictLoading] = useState(false);
  const [districtError, setDistrictError] = useState("");
  const [districtAttempt, setDistrictAttempt] = useState(0);

  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [cityLoading, setCityLoading] = useState(false);
  const [cityError, setCityError] = useState("");
  const [cityAttempt, setCityAttempt] = useState(0);

  const filteredStates = INDIAN_STATES.filter(s => s.toLowerCase().includes(stateQuery.toLowerCase()));

  useEffect(() => {
    const handler = (e) => {
      if (stateRef.current && !stateRef.current.contains(e.target)) {
        setStateOpen(false);
        setStateQuery(selectedState || "");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [selectedState]);

  useEffect(() => { setStateQuery(selectedState || ""); }, [selectedState]);

  useEffect(() => {
    if (!selectedState) return;
    setDistricts([]); setSelectedDistrict(""); setDistrictError("");
    setCities([]); setSelectedCity(""); setDistrictLoading(true);
    fetchWithFallback(buildDistrictQuery(selectedState))
      .then(data => {
        const names = [...new Set(data.elements.map(el => el.tags?.name || el.tags?.["name:en"]).filter(Boolean))].sort((a,b) => a.localeCompare(b));
        names.length === 0 ? setDistrictError("No districts found for this state in OpenStreetMap.") : setDistricts(names);
      })
      .catch(() => setDistrictError("Could not reach Overpass API. Check your connection."))
      .finally(() => setDistrictLoading(false));
  }, [selectedState, districtAttempt]);

  useEffect(() => {
    if (!selectedDistrict) return;
    setCities([]); setSelectedCity(""); setCityError(""); setCityLoading(true);
    fetchWithFallback(buildCityQuery(selectedDistrict))
      .then(data => {
        const names = [...new Set(data.elements.map(el => el.tags?.name || el.tags?.["name:en"]).filter(Boolean))].sort((a,b) => a.localeCompare(b));
        names.length === 0 ? setCityError("No cities or towns found for this district.") : setCities(names);
      })
      .catch(() => setCityError("Could not fetch cities. Please try again."))
      .finally(() => setCityLoading(false));
  }, [selectedDistrict, cityAttempt]);

  const handleStateChange = (val) => {
    setSelectedState(val);
    setDistricts([]); setSelectedDistrict(""); setDistrictError("");
    setCities([]); setSelectedCity(""); setCityError("");
  };

  const handleDistrictChange = (val) => {
    setSelectedDistrict(val);
    setCities([]); setSelectedCity(""); setCityError("");
  };

  const done = selectedCity && selectedDistrict && selectedState;

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', 'Helvetica Neue', sans-serif", padding: "2.5rem 1.5rem",
    }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>

        {/* Header */}
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>🇮🇳</span>
            <span style={{ fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.2em", color: C.dim, textTransform: "uppercase" }}>India · Location</span>
          </div>
          <h1 style={{ margin: "0 0 4px", fontSize: "1.6rem", fontWeight: 600, color: C.text, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
            Find your city
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: C.muted }}>State → district → city</p>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: C.border, marginBottom: "2rem" }} />

        {/* Step 1 — State */}
        <div style={{ marginBottom: "1.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <span style={{
              width: "22px", height: "22px", borderRadius: "50%",
              background: selectedState ? C.green : C.raised,
              border: `1px solid ${selectedState ? C.green : C.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "11px", color: selectedState ? "#fff" : C.dim,
              flexShrink: 0, transition: "all 0.2s", fontFamily: "monospace",
            }}>1</span>
            <label style={{ fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted, fontFamily: "monospace" }}>State / UT</label>
            <span style={{ fontSize: "11px", color: C.dim, fontFamily: "monospace", marginLeft: "auto" }}>36</span>
          </div>
          <div ref={stateRef} style={{ position: "relative" }}>
            <input
              ref={stateInputRef}
              type="text"
              value={stateQuery}
              onChange={e => { setStateQuery(e.target.value); setStateOpen(true); if (!e.target.value) handleStateChange(""); }}
              onFocus={() => { setStateQuery(""); setStateOpen(true); }}
              onKeyDown={e => {
                if (e.key === "Escape") { setStateOpen(false); setStateQuery(selectedState || ""); stateInputRef.current?.blur(); }
                if (e.key === "Enter" && filteredStates.length === 1) { handleStateChange(filteredStates[0]); setStateOpen(false); }
              }}
              placeholder="Search a state…"
              style={{
                width: "100%", padding: "13px 44px 13px 16px",
                background: stateOpen ? C.raised : C.surface,
                border: `1px solid ${stateOpen ? C.borderHover : C.border}`,
                borderRadius: stateOpen ? "8px 8px 0 0" : "8px",
                fontSize: "14px", color: C.text, outline: "none",
                fontFamily: "inherit", boxSizing: "border-box",
                transition: "background 0.15s, border-color 0.15s",
              }}
            />
            <span onClick={() => { setStateOpen(o => !o); if (!stateOpen) { setStateQuery(""); stateInputRef.current?.focus(); } }}
              style={{ position: "absolute", right: "14px", top: "50%", transform: `translateY(-50%) rotate(${stateOpen ? "180deg" : "0deg"})`, color: C.dim, fontSize: "11px", cursor: "pointer", transition: "transform 0.2s", userSelect: "none" }}>▼</span>
            {stateOpen && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.raised, border: `1px solid ${C.borderHover}`, borderTop: "none", borderRadius: "0 0 8px 8px", maxHeight: "240px", overflowY: "auto", zIndex: 100 }}>
                {filteredStates.length === 0
                  ? <div style={{ padding: "12px 16px", fontSize: "13px", color: C.dim, fontFamily: "monospace" }}>No matches</div>
                  : filteredStates.map(s => (
                    <div key={s} onMouseDown={() => { handleStateChange(s); setStateOpen(false); }}
                      style={{ padding: "10px 16px", fontSize: "14px", color: s === selectedState ? C.accent : C.text, background: s === selectedState ? "#1e1510" : "transparent", borderLeft: s === selectedState ? `2px solid ${C.accent}` : "2px solid transparent", cursor: "pointer" }}
                      onMouseEnter={e => { if (s !== selectedState) e.currentTarget.style.background = C.surface; }}
                      onMouseLeave={e => { if (s !== selectedState) e.currentTarget.style.background = "transparent"; }}
                    >
                      {stateQuery ? highlightMatch(s, stateQuery) : s}
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        </div>

        {/* Step 2 — District */}
        {selectedState && (
          <SearchableDropdown
            label="District" step="2"
            value={selectedDistrict} onChange={handleDistrictChange}
            options={districts} placeholder="Search a district…"
            loading={districtLoading} error={districtError}
            onRetry={() => setDistrictAttempt(a => a + 1)}
          />
        )}

        {/* Step 3 — City */}
        {selectedDistrict && (
          <SearchableDropdown
            label="City / Town" step="3"
            value={selectedCity} onChange={setSelectedCity}
            options={cities} placeholder="Search a city…"
            loading={cityLoading} error={cityError}
            onRetry={() => setCityAttempt(a => a + 1)}
          />
        )}

        {/* Result card */}
        {done && (
          <div style={{
            marginTop: "0.5rem", padding: "16px 18px",
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: "10px",
            borderLeft: `3px solid ${C.green}`,
            animation: "fadeUp 0.3s ease",
          }}>
            <div style={{ fontSize: "10px", color: C.dim, fontFamily: "monospace", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "8px" }}>Selected location</div>
            <div style={{ fontSize: "17px", fontWeight: 600, color: C.text, marginBottom: "4px", letterSpacing: "-0.01em" }}>{selectedCity}</div>
            <div style={{ fontSize: "13px", color: C.muted }}>
              {selectedDistrict}
              <span style={{ color: C.border, margin: "0 6px" }}>·</span>
              {selectedState}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: "2.5rem", display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: C.green, opacity: 0.7 }} />
          <span style={{ fontSize: "11px", color: C.dim, fontFamily: "monospace", letterSpacing: "0.04em" }}>OpenStreetMap · Overpass API</span>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        input::placeholder { color: ${C.dim}; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${C.surface}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: ${C.borderHover}; }
      `}</style>
    </div>
  );
}