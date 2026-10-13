import React, { useState } from "react";
import {
  ArrowRight,
  Mail,
  Check,
  Lock,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import City from "./City.jsx";
import { Modal } from "./Modal.jsx";
import { MAPS, BOARD } from "../shared/board.js";
import { draftMap } from "../shared/maps.js";

function useTask(emit) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function run(event, data) {
    setBusy(true);
    setMessage("");
    const result = await emit(event, data, true);
    setBusy(false);
    if (!result || result.error) {
      setMessage(result?.error || "Connection lost. Try again.");
      return null;
    }
    return result;
  }
  return { run, busy, message, setMessage };
}
export function Verification({ profile, emit }) {
  const [email, setEmail] = useState(
      profile.email || profile.pendingEmail || "",
    ),
    [code, setCode] = useState("");
  const { run, busy, message, setMessage } = useTask(emit);
  if (profile.verified)
    return (
      <p className="verified-line">
        <Check size={18} /> Email verified · All six cities and Map Studio
        unlocked.
      </p>
    );
  return (
    <section className="verification-box" aria-label="Email verification">
      <h3>Own your corner of the city.</h3>
      <p>
        Verify your email to unlock four extra cities and save up to ten custom
        maps. Everyone in your room can play your map.
      </p>
      {!profile.emailAvailable && (
        <p className="panel-notice">
          Email delivery is being set up. You can still play The Trenches and
          Night Shift.
        </p>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await run("profile-email-request", { email }))
            setMessage(
              "Code sent. Check your inbox and spam folder. Codes expire in 15 minutes; wait one minute before resending.",
            );
        }}
      >
        <label htmlFor="verify-email">Email address</label>
        <div className="inline-form">
          <input
            id="verify-email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            className="button secondary"
            disabled={busy || !profile.emailAvailable}
          >
            Send code
          </button>
        </div>
      </form>
      {profile.pendingEmail && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (await run("profile-email-verify", { code }))
              setMessage("Verified. Your city collection is unlocked.");
          }}
        >
          <label htmlFor="verify-code">
            Six-digit code sent to {profile.pendingEmail}
          </label>
          <div className="inline-form">
            <input
              id="verify-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
            <button className="button" disabled={busy || code.length !== 6}>
              Verify email
            </button>
          </div>
        </form>
      )}
      {message && (
        <p role="status" className="panel-notice">
          {message}
        </p>
      )}
    </section>
  );
}
export function EntryPage({ profile, emit, authenticated, enter, disabled }) {
  const [mode, setMode] = useState("login"),
    [username, setUsername] = useState(""),
    [password, setPassword] = useState("");
  const { run, busy, message } = useTask(emit);
  return (
    <main className="entry-page">
      <section className="entry-world">
        <a className="entry-brand" href="/">
          SPIN THE BLOCK<span>PROPERTY. PRESSURE. PAYBACK.</span>
        </a>
        <div className="entry-city">
          <City />
        </div>
        <div className="entry-headline">
          <h1>
            Small block.
            <br />
            Big problems.
          </h1>
          <p>
            Buy the turf. Dodge the Oppas. Settle rent with a shootout. Bring
            your crew or let the bots talk tough.
          </p>
        </div>
        <div className="entry-stamp">
          40 BLOCKS <span>01 CITY TO OWN</span>
        </div>
      </section>
      <section className="entry-desk" aria-label="Join Spin the Block">
        <h2>
          {profile?.registered
            ? "Welcome back, " + profile.name + "."
            : "Claim your street name."}
        </h2>
        {profile?.registered ? (
          <>
            <Verification profile={profile} emit={emit} />
            <button className="button entry-play" onClick={enter}>
              Enter the city <ArrowRight size={18} />
            </button>
          </>
        ) : (
          <>
            <p>
              Play now as a guest, or sign in to keep your crew, looks, and
              match history across devices.
            </p>
            <button
              className="button entry-play"
              disabled={disabled || !profile}
              onClick={enter}
            >
              Continue as guest <ArrowRight size={18} />
            </button>
            <div className="entry-divider">
              <span>OR SAVE YOUR REPUTATION</span>
            </div>
            <div className="chat-channel">
              <button
                className={mode === "login" ? "active" : ""}
                onClick={() => setMode("login")}
              >
                Sign in
              </button>
              <button
                className={mode === "register" ? "active" : ""}
                onClick={() => setMode("register")}
              >
                Create account
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const r = await run("profile-" + mode, { username, password });
                if (r) {
                  authenticated(r);
                  setPassword("");
                }
              }}
            >
              <label htmlFor="entry-user">Username</label>
              <input
                id="entry-user"
                autoComplete="username"
                required
                minLength={3}
                maxLength={20}
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
              />
              <label htmlFor="entry-password">
                Password {mode === "register" && "· 12 characters minimum"}
              </label>
              <input
                id="entry-password"
                type="password"
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                minLength={mode === "register" ? 12 : 1}
                maxLength={128}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                className="button secondary entry-play"
                disabled={disabled || busy || !profile}
              >
                {busy
                  ? "One moment…"
                  : mode === "register"
                    ? "Create your account"
                    : "Sign in"}{" "}
                <ArrowRight size={18} />
              </button>
            </form>
            {message && (
              <p className="panel-notice" role="alert">
                {message}
              </p>
            )}
            <p className="entry-unlocks">
              <Mail size={18} /> Verify your email after signing in for extra
              cities and your own Map Studio.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
export function MapPicker({
  value,
  onChange,
  profile,
  editable = true,
  openStudio,
  openAccount,
}) {
  const maps = [
    ...MAPS,
    ...(profile?.savedMaps || []).map((m) => ({
      id: "custom:" + m.id,
      name: m.definition.name,
      description:
        "Your custom city · " +
        MAPS.find((p) => p.id === m.definition.base)?.name,
      colors: m.definition.districts.map((d) => d.color),
      verified: true,
    })),
  ];
  return (
    <section className="map-collection">
      <div className="map-collection-heading">
        <div>
          <h3>Choose a city</h3>
        </div>
        {editable && (
          <button
            className="button secondary"
            onClick={profile?.verified ? openStudio : openAccount}
          >
            <Pencil size={16} /> Map Studio{" "}
            {!profile?.verified && <Lock size={14} />}
          </button>
        )}
      </div>
      <div className="map-choices">
        {maps.map((m) => {
          const locked = m.verified && !profile?.verified;
          return (
            <button
              type="button"
              className={"map-choice " + (value === m.id ? "selected" : "")}
              key={m.id}
              disabled={!editable}
              aria-pressed={value === m.id}
              onClick={() => (locked ? openAccount() : onChange(m.id))}
            >
              <div
                className={"map-swatch theme-" + m.id.replace("custom:", "")}
              >
                {(
                  m.colors || [
                    "#a3ba86",
                    "#95bdd2",
                    "#d8a580",
                    "#b3a0cc",
                    "#d399b2",
                    "#d9c784",
                    "#86bfa4",
                    "#c4ad80",
                  ]
                ).map((color, i) => (
                  <span key={i} style={{ background: color }} />
                ))}
                <MapPin size={20} />
              </div>
              <strong>
                {m.name}{" "}
                {locked ? (
                  <Lock size={14} aria-label="Email verification required" />
                ) : (
                  value === m.id && <Check size={14} />
                )}
              </strong>
              <small>{m.description}</small>
            </button>
          );
        })}
      </div>
      {!profile?.verified && (
        <p className="micro-note">
          Two cities are open to everyone. Verify your email to host the other
          four and create your own. Friends can join any map as guests.
        </p>
      )}
    </section>
  );
}
export function MapStudio({ profile, emit, close, select }) {
  const [draft, setDraft] = useState(draftMap()),
    [id, setId] = useState(null);
  const { run, busy, message, setMessage } = useTask(emit);
  const update = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const preview = {
    board: BOARD.map((t) => ({ ...t, type: draft.events[t.id] || t.type })),
  };
  return (
    <Modal title="Map Studio · your block, your rules" close={close} wide>
      <p>
        Make the city personal. Prices, rent, and essential spaces stay
        balanced. Saved changes apply to new tables; a match already in progress
        keeps its map.
      </p>
      <div className="studio-shelf">
        <button
          className="button secondary"
          onClick={() => {
            setId(null);
            setDraft(draftMap());
            setMessage("");
          }}
        >
          <Plus size={16} /> New map
        </button>
        {profile.savedMaps?.map((m) => (
          <button
            className={"studio-saved " + (id === m.id ? "selected" : "")}
            key={m.id}
            onClick={() => {
              setId(m.id);
              setDraft(structuredClone(m.definition));
              setMessage("");
            }}
          >
            {m.definition.name}
          </button>
        ))}
      </div>
      <form
        className="map-studio"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await run("map-save", { id, definition: draft });
          if (r) {
            setId(r.map.id);
            setMessage("Map saved. Ready for your next table.");
          }
        }}
      >
        <div className="settings-grid">
          <label>
            Map name
            <input
              required
              maxLength={32}
              value={draft.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </label>
          <label>
            Base city
            <select
              value={draft.base}
              onChange={(e) => {
                setDraft(draftMap(e.target.value));
                setId(null);
              }}
            >
              {MAPS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="studio-preview" aria-label="Custom city preview">
          <City
            palette={draft.districts.map((d) => d.color)}
            theme={draft.base}
          />
          <strong>{draft.name || "Name your city"}</strong>
        </div>
        <h3>Eight districts. Your colors.</h3>
        <div className="studio-districts">
          {draft.districts.map((d, i) => (
            <div key={i}>
              <input
                aria-label={"District " + (i + 1) + " color"}
                type="color"
                value={d.color}
                onChange={(e) =>
                  update(
                    "districts",
                    draft.districts.map((x, j) =>
                      j === i ? { ...x, color: e.target.value } : x,
                    ),
                  )
                }
              />
              <input
                aria-label={"District " + (i + 1) + " name"}
                required
                maxLength={24}
                value={d.name}
                onChange={(e) =>
                  update(
                    "districts",
                    draft.districts.map((x, j) =>
                      j === i ? { ...x, name: e.target.value } : x,
                    ),
                  )
                }
              />
            </div>
          ))}
        </div>
        <h3>Rename the blocks. Move the surprises.</h3>
        <p className="micro-note">
          Change card, roulette, and Oppa Stoppa spaces into any of those three
          events.
        </p>
        <div className="studio-blocks">
          {preview.board.map((t) => (
            <div
              key={t.id}
              style={{
                "--district":
                  t.group === undefined
                    ? "#b6b6a6"
                    : draft.districts[t.group].color,
              }}
            >
              <span>{String(t.id).padStart(2, "0")}</span>
              <input
                aria-label={"Block " + t.id + " name"}
                required
                maxLength={32}
                value={draft.names[t.id]}
                onChange={(e) =>
                  update(
                    "names",
                    draft.names.map((n, i) =>
                      i === t.id ? e.target.value : n,
                    ),
                  )
                }
              />
              {["card", "roulette", "stoppa"].includes(BOARD[t.id].type) ? (
                <select
                  aria-label={"Block " + t.id + " event"}
                  value={t.type}
                  onChange={(e) =>
                    update("events", {
                      ...draft.events,
                      [t.id]: e.target.value,
                    })
                  }
                >
                  <option value="card">Luck card</option>
                  <option value="roulette">Roulette</option>
                  <option value="stoppa">Oppa Stoppa</option>
                </select>
              ) : (
                <small>{t.type}</small>
              )}
            </div>
          ))}
        </div>
        <div className="studio-actions">
          <button className="button" disabled={busy}>
            Save map
          </button>
          {id && (
            <>
              <button
                className="button secondary"
                type="button"
                disabled={busy}
                onClick={() => select("custom:" + id)}
              >
                Use saved map
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={busy}
                onClick={async () => {
                  if (await run("map-delete", { id })) {
                    setId(null);
                    setDraft(draftMap());
                    setMessage("Map deleted. Existing tables keep their map.");
                  }
                }}
              >
                <Trash2 size={16} /> Delete map
              </button>
            </>
          )}
        </div>
      </form>
      {message && (
        <p className="panel-notice" role="status">
          {message}
        </p>
      )}
    </Modal>
  );
}
