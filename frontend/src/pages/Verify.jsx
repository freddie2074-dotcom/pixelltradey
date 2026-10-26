import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const BUCKET = "kyc";
const MAX_MB = 5;
const DOC_TYPES = [
  { id: "national_id", label: "National ID", back: true },
  { id: "passport", label: "Passport", back: false },
  { id: "driver_license", label: "Driver's license", back: true },
];

const css = `
.vf {
  --bg: #0a0e1a;
  --surface: #121a2e;
  --border: #1f2842;
  --text: #8a93b3;
  --strong: #f2f4ff;
  --blue: var(--accent, #5b6ef5);
  --blue-bg: color-mix(in srgb, var(--blue) 12%, transparent);
  --blue-border: color-mix(in srgb, var(--blue) 28%, transparent);
  --green: #1fd18b;
  --red: #ff3b4e;
  --amber: #f5b13d;
  max-width: 760px;
  margin: 0 auto;
  padding: 88px 24px 48px;
  color: var(--text);
  box-sizing: border-box;
}
.vf *, .vf *::before, .vf *::after { box-sizing: border-box; }
.vf h1 { margin: 0 0 6px; font-size: 26px; font-weight: 700; color: var(--strong); }
.vf__sub { margin: 0 0 24px; font-size: 14px; }

/* ---------- top bar ---------- */
.vf__bar {
  display: flex; align-items: center; gap: 14px; margin-bottom: 36px; padding-bottom: 14px;
  border-bottom: 1px solid var(--border); font-size: 14px; color: var(--text);
}
.vf__back {
  display: grid; place-items: center; width: 34px; height: 34px; padding: 0; cursor: pointer;
  color: var(--text); background: none; border: 0; border-radius: 8px; transition: color .15s, background .15s;
}
.vf__back:hover { color: var(--strong); background: var(--surface); }
.vf__back svg { width: 20px; height: 20px; }

/* ---------- intro ---------- */
.vf__intro { max-width: 448px; margin: 0 auto; text-align: center; }
.vf__hero {
  display: grid; place-items: center; width: 64px; height: 64px; margin: 0 auto 26px;
  border-radius: 50%; color: var(--blue); background: var(--blue-bg); border: 1px solid var(--blue-border);
}
.vf__hero svg { width: 26px; height: 26px; }
.vf__intro h1 { margin: 0 0 16px; font-size: 26px; line-height: 1.2; }
.vf__lead { margin: 0 0 28px; font-size: 15px; line-height: 1.7; }
.vf__lead b { color: var(--strong); font-weight: 600; }
.vf__feat {
  display: flex; align-items: center; gap: 14px; margin-bottom: 12px; padding: 14px 16px; text-align: left;
  background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
}
.vf__feat-ic { flex-shrink: 0; width: 28px; font-size: 20px; line-height: 1; text-align: center; }
.vf__feat b { display: block; font-size: 14.5px; font-weight: 600; color: var(--strong); }
.vf__feat span { display: block; margin-top: 2px; font-size: 12.5px; }
.vf__privacy {
  display: flex; align-items: flex-start; gap: 12px; margin-top: 24px; padding: 14px 16px; text-align: left;
  font-size: 12.5px; line-height: 1.7; background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
}
.vf__privacy-ic { flex-shrink: 0; width: 28px; font-size: 18px; line-height: 1.5; text-align: center; }
.vf__privacy b { color: var(--strong); font-weight: 600; }
.vf__start {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  width: 100%; height: 44px; margin-top: 24px; font-family: inherit; font-size: 14px; font-weight: 600;
  color: #fff; background: var(--blue); border: 1px solid var(--blue); border-radius: 8px;
  cursor: pointer; transition: opacity .15s;
}
.vf__start:hover { opacity: .9; }
.vf__start svg { width: 16px; height: 16px; }

/* ---------- cards + form ---------- */
.vf__card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 20px; }
.vf__card h2 { margin: 0 0 14px; font-size: 15px; font-weight: 600; color: var(--strong); }
.vf__status { display: flex; gap: 14px; align-items: flex-start; }
.vf__badge {
  flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  width: 44px; height: 44px; border-radius: 50%; border: 1px solid;
}
.vf__badge svg { width: 22px; height: 22px; }
.vf__badge--pending { color: var(--amber); border-color: color-mix(in srgb, var(--amber) 35%, transparent); background: color-mix(in srgb, var(--amber) 12%, transparent); }
.vf__badge--approved { color: var(--green); border-color: color-mix(in srgb, var(--green) 35%, transparent); background: color-mix(in srgb, var(--green) 12%, transparent); }
.vf__badge--rejected { color: var(--red); border-color: color-mix(in srgb, var(--red) 35%, transparent); background: color-mix(in srgb, var(--red) 12%, transparent); }
.vf__status b { display: block; margin-bottom: 4px; font-size: 16px; color: var(--strong); }
.vf__status p { margin: 0; font-size: 13px; line-height: 1.5; }
.vf__row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.vf__label { display: block; margin: 16px 0 8px; font-size: 12px; font-weight: 500; }
.vf__row2 .vf__label, .vf__card h2 + .vf__label { margin-top: 0; }
.vf__field { margin-top: 16px; }
.vf__row2 .vf__field { margin-top: 0; }
.vf__field > .vf__label { margin-top: 0; }
.vf__input {
  width: 100%; height: 42px; padding: 0 14px; font-family: inherit; font-size: 14px;
  background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
  color: var(--strong); outline: none; transition: border-color .15s;
}
.vf__input:focus { border-color: var(--blue-border); }
.vf__input::placeholder { color: var(--text); }
.vf__types { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.vf__type {
  height: 42px; padding: 0 10px; font-family: inherit; font-size: 13px; font-weight: 500;
  color: var(--text); background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
  cursor: pointer; transition: border-color .15s, color .15s;
}
.vf__type:hover { border-color: #2f3a5c; }
.vf__type.is-on { color: var(--blue); background: var(--blue-bg); border-color: var(--blue-border); }
.vf__uploads { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; margin-top: 16px; }
.vf__drop {
  position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 6px; min-height: 140px; padding: 14px; text-align: center; font-size: 12px; cursor: pointer;
  background: var(--bg); border: 1px dashed #2f3a5c; border-radius: 10px; overflow: hidden;
  transition: border-color .15s;
}
.vf__drop:hover, .vf__drop:focus-within { border-color: var(--blue-border); }
.vf__drop svg { width: 22px; height: 22px; color: var(--blue); }
.vf__drop b { color: var(--strong); font-size: 13px; }
.vf__drop input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
.vf__drop img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.vf__drop.has-file { border-style: solid; border-color: var(--blue-border); }
.vf__fname {
  position: absolute; left: 0; right: 0; bottom: 0; padding: 6px 8px; font-size: 11px;
  color: var(--strong); background: rgba(10,14,26,.85); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.vf__tips { margin: 16px 0 0; padding: 12px 14px 12px 30px; font-size: 12px; line-height: 1.6; border-radius: 8px; background: var(--blue-bg); border: 1px solid var(--blue-border); }
.vf__btn {
  width: 100%; height: 44px; margin-top: 18px; font-family: inherit; font-size: 14px; font-weight: 600;
  color: #fff; background: var(--blue); border: 1px solid var(--blue); border-radius: 8px;
  cursor: pointer; transition: opacity .15s;
}
.vf__btn:hover { opacity: .9; }
.vf__btn:disabled { opacity: .5; cursor: not-allowed; }
.vf__msg { margin-top: 14px; padding: 10px 12px; font-size: 13px; border-radius: 8px; border: 1px solid; }
.vf__msg--err { color: var(--red); border-color: color-mix(in srgb, var(--red) 35%, transparent); background: color-mix(in srgb, var(--red) 10%, transparent); }
.vf__reason { margin-top: 10px; padding: 10px 12px; font-size: 13px; border-radius: 8px; color: var(--red); background: color-mix(in srgb, var(--red) 10%, transparent); }
@media (max-width: 600px) {
  .vf { padding: 76px 14px 32px; }
  .vf__row2 { grid-template-columns: 1fr; }
  .vf__row2 .vf__field + .vf__field { margin-top: 16px; }
  .vf__types { grid-template-columns: 1fr; }
}
`;

const ICON_OK = <path d="m5 12 5 5L20 7" />;
const ICON_CLOCK = (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>
);
const ICON_X = <path d="M18 6 6 18M6 6l12 12" />;
const ICON_UP = (
  <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m17 8-5-5-5 5" />
    <path d="M12 3v12" />
  </>
);
const ICON_BACK = <path d="M19 12H5M12 19l-7-7 7-7" />;
const ICON_NEXT = <path d="m9 6 6 6-6 6" />;

function Icon({ children }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function FileDrop({ label, hint, file, onPick, id }) {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview(null);
  }, [file]);

  return (
    <label className={`vf__drop ${file ? "has-file" : ""}`} htmlFor={id}>
      {preview && <img src={preview} alt="" />}
      {!preview && (
        <>
          <Icon>{ICON_UP}</Icon>
          <b>{label}</b>
          <span>{file ? file.name : hint}</span>
        </>
      )}
      {file && <span className="vf__fname">{file.name}</span>}
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={(e) => onPick(e.target.files?.[0] || null)}
      />
    </label>
  );
}

export default function Verify() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState("intro"); // "intro" | "form"

  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [front, setFront] = useState(null);
  const [back, setBack] = useState(null);
  const [selfie, setSelfie] = useState(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function load() {
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      setUser(u);
      const { data, error } = await supabase
        .from("verifications")
        .select("*")
        .eq("user_id", u.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      setRecord(data?.[0] || null);
    } catch (e) {
      console.error("Failed to load verification:", e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function pick(setter) {
    return (file) => {
      setMsg(null);
      if (file && file.size > MAX_MB * 1024 * 1024) {
        setMsg({ text: `Each file must be under ${MAX_MB} MB.` });
        return;
      }
      setter(file);
    };
  }

  async function upload(file, tag) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${user.id}/${Date.now()}-${tag}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;
    return path;
  }

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    if (!fullName.trim() || !country.trim() || !docNumber.trim()) {
      setMsg({ text: "Fill in your name, country and document number." });
      return;
    }
    if (!front || (docType.back && !back) || !selfie) {
      setMsg({ text: "Upload every photo listed above before submitting." });
      return;
    }
    setBusy(true);
    try {
      const frontPath = await upload(front, "front");
      const backPath = docType.back && back ? await upload(back, "back") : null;
      const selfiePath = await upload(selfie, "selfie");

      const { error } = await supabase.from("verifications").insert({
        user_id: user.id,
        full_name: fullName.trim(),
        country: country.trim(),
        doc_type: docType.id,
        doc_number: docNumber.trim(),
        front_path: frontPath,
        back_path: backPath,
        selfie_path: selfiePath,
        status: "pending",
      });
      if (error) throw error;

      setFront(null);
      setBack(null);
      setSelfie(null);
      await load();
    } catch (err) {
      setMsg({ text: err.message || "Could not submit your documents. Try again." });
    } finally {
      setBusy(false);
    }
  }

  const status = record?.status;
  const showForm = !loading && status !== "pending" && status !== "approved";
  const showIntro = showForm && step === "intro";

  function goBack() {
    if (showForm && step === "form") setStep("intro");
    else navigate(-1);
  }

  const STATUS = {
    pending: {
      icon: ICON_CLOCK,
      title: "Review in progress",
      text: "We received your documents and are checking them. This usually takes 1–2 business days.",
    },
    approved: {
      icon: ICON_OK,
      title: "Identity verified",
      text: "Your account is fully verified. You don't need to do anything else.",
    },
    rejected: {
      icon: ICON_X,
      title: "Verification declined",
      text: "We couldn't verify your documents. Fix the issue below and submit them again.",
    },
  };

  return (
    <>
      <style>{css}</style>
      <div className="vf">
        <div className="vf__bar">
          <button className="vf__back" type="button" onClick={goBack} aria-label="Go back">
            <Icon>{ICON_BACK}</Icon>
          </button>
          <span>Identity Verification</span>
        </div>

        {loading && <div className="vf__card">Loading...</div>}

        {!loading && status && STATUS[status] && (
          <div className="vf__card">
            <div className="vf__status">
              <div className={`vf__badge vf__badge--${status}`}>
                <Icon>{STATUS[status].icon}</Icon>
              </div>
              <div>
                <b>{STATUS[status].title}</b>
                <p>{STATUS[status].text}</p>
                {status === "rejected" && record.rejection_reason && (
                  <div className="vf__reason">{record.rejection_reason}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {showIntro && (
          <div className="vf__intro">
            <div className="vf__hero">
              <Icon>{ICON_UP}</Icon>
            </div>
            <h1>Verify Your Identity</h1>
            <p className="vf__lead">
              Complete a quick identity check to unlock <b>higher withdrawal limits</b> and gain full
              access to all platform features.
            </p>

            <div className="vf__feat">
              <span className="vf__feat-ic" aria-hidden="true">🪪</span>
              <div>
                <b>Government-issued ID</b>
                <span>Passport, national ID, or driver's license</span>
              </div>
            </div>
            <div className="vf__feat">
              <span className="vf__feat-ic" aria-hidden="true">🤳</span>
              <div>
                <b>Live selfie</b>
                <span>A photo of your face taken in real time</span>
              </div>
            </div>
            <div className="vf__feat">
              <span className="vf__feat-ic" aria-hidden="true">⏱️</span>
              <div>
                <b>Quick process</b>
                <span>Takes less than 2 minutes to complete</span>
              </div>
            </div>

            <div className="vf__privacy">
              <span className="vf__privacy-ic" aria-hidden="true">🔒</span>
              <p style={{ margin: 0 }}>
                Your documents are <b>used solely for identity verification</b> and are permanently
                deleted from our systems once verification is complete. We do not share your data with
                third parties.
              </p>
            </div>

            <button className="vf__start" type="button" onClick={() => setStep("form")}>
              Start Verification
              <Icon>{ICON_NEXT}</Icon>
            </button>
          </div>
        )}

        {showForm && step === "form" && (
          <>
            <h1>Verify your identity</h1>
            <p className="vf__sub">Upload a government-issued ID and a selfie to unlock your full account.</p>

            <form className="vf__card" onSubmit={submit}>
              <h2>Your details</h2>
              <div className="vf__row2">
                <div className="vf__field">
                  <label className="vf__label" htmlFor="vf-name">Full name (as on your ID)</label>
                  <input id="vf-name" className="vf__input" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
                </div>
                <div className="vf__field">
                  <label className="vf__label" htmlFor="vf-country">Country of issue</label>
                  <input id="vf-country" className="vf__input" value={country} onChange={(e) => setCountry(e.target.value)} autoComplete="country-name" />
                </div>
              </div>

              <div className="vf__field">
                <span className="vf__label">Document type</span>
                <div className="vf__types">
                  {DOC_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`vf__type ${t.id === docType.id ? "is-on" : ""}`}
                      onClick={() => {
                        setDocType(t);
                        if (!t.back) setBack(null);
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="vf__field">
                <label className="vf__label" htmlFor="vf-num">Document number</label>
                <input id="vf-num" className="vf__input" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} autoComplete="off" />
              </div>

              <div className="vf__uploads">
                <FileDrop id="vf-front" label={docType.back ? "Front of ID" : "Photo page"} hint="JPG, PNG or PDF" file={front} onPick={pick(setFront)} />
                {docType.back && (
                  <FileDrop id="vf-back" label="Back of ID" hint="JPG, PNG or PDF" file={back} onPick={pick(setBack)} />
                )}
                <FileDrop id="vf-selfie" label="Selfie holding your ID" hint="JPG or PNG" file={selfie} onPick={pick(setSelfie)} />
              </div>

              <ul className="vf__tips">
                <li>All four corners of the document must be visible.</li>
                <li>Text must be sharp and free of glare.</li>
                <li>Your face and the ID must both be clear in the selfie.</li>
                <li>Files must be under {MAX_MB} MB each.</li>
              </ul>

              <button className="vf__btn" type="submit" disabled={busy}>
                {busy ? "Uploading..." : "Submit for review"}
              </button>
              {msg && <div className="vf__msg vf__msg--err">{msg.text}</div>}
            </form>
          </>
        )}
      </div>
    </>
  );
}
