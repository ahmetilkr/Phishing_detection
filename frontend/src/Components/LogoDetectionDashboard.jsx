import { useCallback, useEffect, useRef, useState } from 'react'
import {
    AlertTriangle,
    ArrowUpDown,
    CheckCircle2,
    ChevronDown,
    Download,
    Eye,
    EyeOff,
    ExternalLink,
    FileSearch,
    FileText,
    Globe,
    ImageIcon,
    Key,
    Link2,
    Lock,
    Loader2,
    Moon,
    Plus,
    Radar,
    ScanEye,
    ScanSearch,
    Search,
    Server,
    Settings2,
    ShieldAlert,
    ShieldCheck,
    ShieldOff,
    Sliders,
    Sparkles,
    Sun,
    Trash2,
    UploadCloud,
    Wifi,
    WifiOff,
    X,
} from 'lucide-react'


/* ------------------------------------------------------------------ */
/* Yardımcılar                                                         */
/* ------------------------------------------------------------------ */

const DEFAULT_API_BASE = 'http://localhost:8000'

function cn(...classes) {
    return classes.filter(Boolean).join(' ')
}

function trimBase(base) {
    return base.replace(/\/+$/, '')
}

function classifyRisk(durum) {
    const s = (durum || '').toLocaleUpperCase('tr-TR')
    if (s.includes('YÜKSEK')) return 'high'
    if (s.includes('ORTA')) return 'medium'
    if (s.includes('DÜŞÜK')) return 'low'
    if (s.includes('ORİJİNAL') || s.includes('GÜVENLİ')) return 'safe'
    return 'neutral'
}

/* ------------------------------------------------------------------ */
/* Risk Puanı Hesaplama (0-100)                                        */
/* ------------------------------------------------------------------ */
function calcRiskScore(site) {
    let score = 10  // taban puan

    // ── 1) Domain yaşı (max +50 puan) ──
    const ageRaw = String(site.domain_yasi ?? '')
    const ageMatch = ageRaw.match(/(\d+)/)
    if (ageMatch) {
        const days = parseInt(ageMatch[1], 10)
        if (days < 30)        score += 50  // çok yeni → en yüksek risk
        else if (days <= 90)  score += 35  // 31-90 gün
        else if (days <= 365) score += 15  // 91-365 gün
        // 365+ gün → +0
    }

    // ── 2) VirusTotal engelleme (max +40 puan) ──
    const vtCount = site.virustotal_analiz?.zararli_sayisi ?? 0
    if (vtCount >= 3)      score += 40
    else if (vtCount >= 1) score += 20
    // 0 ise +0

    return Math.min(Math.max(Math.round(score), 0), 100)
}

/* ------------------------------------------------------------------ */
/* Custom Glowing Cursor — anlık tek nokta, ring yok                  */
/* ------------------------------------------------------------------ */

function GlowCursor() {
    const dotRef = useRef(null)
    const [hovering, setHovering] = useState(false)

    useEffect(() => {
        const handleMove = (e) => {
            if (dotRef.current) {
                dotRef.current.style.left = `${e.clientX}px`
                dotRef.current.style.top = `${e.clientY}px`
            }
        }

        const handleOver = (e) => {
            const el = e.target
            const isInteractive =
                el.tagName === 'BUTTON' ||
                el.tagName === 'A' ||
                el.tagName === 'INPUT' ||
                el.tagName === 'LABEL' ||
                el.getAttribute('role') === 'button' ||
                el.closest('button') ||
                el.closest('a') ||
                el.closest('[role="button"]')
            setHovering(!!isInteractive)
        }

        window.addEventListener('mousemove', handleMove, { passive: true })
        document.addEventListener('mouseover', handleOver)

        return () => {
            window.removeEventListener('mousemove', handleMove)
            document.removeEventListener('mouseover', handleOver)
        }
    }, [])

    return <div ref={dotRef} className={cn('cursor-dot', hovering && 'hovering')} style={{ left: 0, top: 0 }} />
}

/* ------------------------------------------------------------------ */
/* Temel UI Bileşenleri                                                */
/* ------------------------------------------------------------------ */

function Button({ className, variant = 'default', size = 'default', ...props }) {
    const variantClass = {
        default: 'btn-primary',
        outline: 'btn-outline',
        secondary: 'btn-secondary',
    }[variant] || 'btn-primary'

    const sizeClass = {
        default: 'btn-default',
        sm: 'btn-sm',
        lg: 'btn-lg',
    }[size] || 'btn-default'

    return (
        <button
            className={cn('btn', variantClass, sizeClass, className)}
            {...props}
        />
    )
}

function Card({ className, children, style }) {
    return (
        <div className={cn('glass-card', className)} style={style}>
            {children}
        </div>
    )
}

function CardHeader({ title, description, icon, action }) {
    return (
        <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                {icon ? (
                    <div className="card-icon">{icon}</div>
                ) : null}
                <div>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#f0f4ff', lineHeight: 1.3 }}>
                        {title}
                    </h3>
                    {description ? (
                        <p style={{ marginTop: '4px', fontSize: '0.8125rem', color: '#6b7280', lineHeight: 1.6 }}>
                            {description}
                        </p>
                    ) : null}
                </div>
            </div>
            {action}
        </div>
    )
}

function Field({ label, htmlFor, hint, children }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor={htmlFor} className="field-label">{label}</label>
            {children}
            {hint ? <p className="field-hint">{hint}</p> : null}
        </div>
    )
}

function TextInput({ className, style, ...props }) {
    return (
        <input
            className={cn('input', className)}
            style={style}
            {...props}
        />
    )
}

function ConfSlider({ value, onChange, id }) {
    const pct = ((value - 0.1) / 0.9) * 100
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ position: 'relative', flex: 1, height: '24px', display: 'flex', alignItems: 'center' }}>
                <div style={{
                    position: 'absolute', inset: '0 0 0 0', height: '6px', margin: 'auto 0',
                    borderRadius: '9999px', background: 'rgba(255,255,255,0.07)',
                }} />
                <div style={{
                    position: 'absolute', left: 0, height: '6px', margin: 'auto 0',
                    top: '50%', transform: 'translateY(-50%)',
                    borderRadius: '9999px',
                    width: `${pct}%`,
                    background: 'linear-gradient(to right, #fbbf24, #f59e0b)',
                }} />
                <input
                    id={id}
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    style={{
                        position: 'relative', zIndex: 10, width: '100%',
                        WebkitAppearance: 'none', appearance: 'none',
                        background: 'transparent', height: '24px', margin: 0, padding: 0,
                    }}
                />
            </div>
            <span style={{
                minWidth: '52px', borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
                border: '1px solid rgba(245,158,11,0.2)',
                padding: '4px 8px', textAlign: 'center',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.8125rem', fontWeight: 500, color: '#f59e0b',
            }}>
                {value.toFixed(2)}
            </span>
        </div>
    )
}

function LoadingPanel({ message = 'Yükleniyor...' }) {
    return (
        <div className="loading-panel">
            <div className="loading-ring" />
            <p>{message}</p>
        </div>
    )
}

function RiskBadge({ level, children }) {
    const cls = {
        high: 'badge-high',
        medium: 'badge-medium',
        low: 'badge-low',
        safe: 'badge-safe',
        neutral: 'badge-neutral',
    }[level] || 'badge-neutral'
    return (
        <span className={cn('badge', cls)}>
            {children}
        </span>
    )
}

const DEFAULT_DOMAINS = [
    'vakifbank.com.tr',
    'vakifkart.com.tr',
    'vakifyatirim.com.tr',
    'vakifemeklilik.com.tr',
    'vakifgirisim.com.tr',
    'vakifleasing.com.tr',
    'vakiffaktor.com.tr',
    'vakifmenkul.com.tr',
    'instagram.com/vakifbank',
    'twitter.com/vakifbank',
    'x.com/vakifbank',
    'facebook.com/vakifbank',
    'youtube.com/vakifbank',
    'linkedin.com/company/vakifbank',
    'twitter.com/vakifbankdestek',
    'x.com/vakifbankdestek',
]

const INITIAL_DETECT_STATE = {
    file: null,
    previewUrl: null,
    conf: 0.4,
    loading: false,
    error: null,
    resultImg: null,
    detections: null,
}

const INITIAL_URL_STATE = {
    url: '',
    conf: 0.25,
    loading: false,
    error: null,
    resultImg: null,
}

/* ------------------------------------------------------------------ */
/* localStorage — 1 günlük TTL ile kayıt / okuma                       */
/* ------------------------------------------------------------------ */

const LS_KEY             = 'logo_scan_settings'
const LS_KEY_SSL         = 'ssl_scan_settings'
const LS_KEY_FAVICON     = 'favicon_scan_settings'
const LS_KEY_FULL_REPORT = 'full_report_settings'
const TTL_MS = 24 * 60 * 60 * 1000 // 24 saat

function lsSave(data, key = LS_KEY) {
    try {
        localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }))
    } catch (_) { /* private/incognito modda hata olabilir */ }
}

function lsLoad(key = LS_KEY) {
    try {
        const raw = localStorage.getItem(key)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        if (Date.now() - parsed.ts > TTL_MS) {
            localStorage.removeItem(key)
            return null
        }
        return parsed.data
    } catch (_) {
        return null
    }
}

function buildInitialScanState() {
    const saved = lsLoad()
    return {
        settingsOpen: false,
        serpKey:  saved?.serpKey  ?? '',
        vtKey:    saved?.vtKey    ?? '',
        query:    normalizeQuery(saved?.query) ?? 'vakifbank',
        conf:     saved?.conf     ?? 0.4,
        domains:  Array.isArray(saved?.domains) && saved.domains.length > 0
                      ? saved.domains
                      : [...DEFAULT_DOMAINS],
        newDomain: '',
        loading: false,
        error: null,
        result: null,
    }
}

const INITIAL_SCAN_STATE = buildInitialScanState()

/* ------------------------------------------------------------------ */
/* Sekme 1: Görsel Yükle & Tespit Et                                   */
/* ------------------------------------------------------------------ */

function DetectTab({ apiBase, state, setState }) {
    const { file, previewUrl, conf, loading, error, resultImg, detections } = state
    const [dragOver, setDragOver] = useState(false)
    const inputRef = useRef(null)

    const selectFile = useCallback((f) => {
        setState((prev) => {
            if (prev.resultImg) URL.revokeObjectURL(prev.resultImg)
            if (prev.previewUrl) URL.revokeObjectURL(prev.previewUrl)
            return {
                ...prev,
                file: f,
                previewUrl: f ? URL.createObjectURL(f) : null,
                resultImg: null,
                detections: null,
                error: null,
            }
        })
    }, [setState])

    async function analyze() {
        if (!file) return
        setState((prev) => {
            if (prev.resultImg) URL.revokeObjectURL(prev.resultImg)
            return { ...prev, loading: true, error: null, resultImg: null, detections: null }
        })
        const base = trimBase(apiBase)
        try {
            const imgForm = new FormData()
            imgForm.append('file', file)

            // Sadece resim endpoint'ine istek atıyoruz
            const imgRes = await fetch(`${base}/predict/image?conf=${conf}`, { method: 'POST', body: imgForm })

            if (!imgRes.ok) throw new Error(`Görsel isteği başarısız (${imgRes.status})`)

            const blob = await imgRes.blob()
            setState((prev) => ({
                ...prev,
                detections: [], // JSON kullanmıyorsan boş bırakabilirsin
                resultImg: URL.createObjectURL(blob),
                loading: false,
            }))
        } catch (e) {
            setState((prev) => ({
                ...prev,
                error: e instanceof Error
                    ? `Analiz yapılamadı: ${e.message}. API adresini kontrol edin.`
                    : 'Bilinmeyen bir hata oluştu.',
                loading: false,
            }))
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Card>
                <CardHeader
                    title="Görsel Yükle & Tespit Et"
                    description="Bir görsel yükleyin, YOLOv11 modeli üzerindeki logoları tespit etsin."
                    icon={<ScanSearch size={18} />}
                />
                <div style={{ padding: '20px', display: 'grid', gap: '20px', gridTemplateColumns: '1fr 280px' }}>
                    {/* Dropzone */}
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={() => inputRef.current?.click()}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => {
                            e.preventDefault(); setDragOver(false)
                            const f = e.dataTransfer.files?.[0]
                            if (f) selectFile(f)
                        }}
                        className={cn('dropzone', dragOver && 'drag-over')}
                        style={{
                            minHeight: '200px', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: '12px',
                            padding: '24px', textAlign: 'center', position: 'relative',
                        }}
                    >
                        {previewUrl ? (
                            <>
                                <img
                                    src={previewUrl || '/placeholder.svg'}
                                    alt="Yüklenen görsel önizlemesi"
                                    style={{ maxHeight: '160px', width: 'auto', borderRadius: '10px', objectFit: 'contain' }}
                                />
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); selectFile(null) }}
                                    style={{
                                        position: 'absolute', right: '12px', top: '12px',
                                        width: '28px', height: '28px', borderRadius: '50%',
                                        background: 'rgba(10,15,30,0.9)', border: '1px solid rgba(255,255,255,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#9ca3af', cursor: 'none',
                                    }}
                                    aria-label="Görseli kaldır"
                                >
                                    <X size={14} />
                                </button>
                                <p style={{ fontSize: '0.75rem', color: '#6b7280', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {file?.name}
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="upload-icon-ring">
                                    <UploadCloud size={22} />
                                </div>
                                <div>
                                    <p style={{ fontWeight: 500, color: '#f0f4ff', fontSize: '0.9375rem' }}>
                                        Resim Sürükleyin veya Seçin
                                    </p>
                                    <p style={{ marginTop: '4px', fontSize: '0.8125rem', color: '#6b7280' }}>
                                        PNG, JPG veya WEBP formatında görsel yükleyin
                                    </p>
                                </div>
                            </>
                        )}
                        <input
                            ref={inputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
                        />
                    </div>

                    {/* Controls */}
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px' }}>
                        <Field label="Güven Eşiği" htmlFor="detect-conf" hint="Bu değerin altındaki tespitler yok sayılır.">
                            <ConfSlider
                                id="detect-conf"
                                value={conf}
                                onChange={(value) => setState((prev) => ({ ...prev, conf: value }))}
                            />
                        </Field>
                        <Button
                            size="lg"
                            style={{ width: '100%' }}
                            disabled={!file || loading}
                            onClick={analyze}
                        >
                            {loading ? (
                                <><Loader2 size={16} className="spinner" />Yükleniyor...</>
                            ) : (
                                <><Sparkles size={16} />Resmi Analiz Et</>
                            )}
                        </Button>
                    </div>
                </div>
            </Card>

            {error ? (
                <div className="alert-error">
                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span>{error}</span>
                </div>
            ) : null}

            {/* Results */}
            <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
                <Card>
                    <CardHeader title="İşlenmiş Görsel" icon={<ImageIcon size={18} />} />
                    <div style={{ minHeight: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        {loading ? (
                            <LoadingPanel message="Görsel işleniyor, lütfen bekleyin..." />
                        ) : resultImg ? (
                            <img
                                src={resultImg || '/placeholder.svg'}
                                alt="Tespit kutuları çizilmiş işlenmiş görsel"
                                style={{ maxHeight: '400px', width: 'auto', borderRadius: '10px', objectFit: 'contain' }}
                            />
                        ) : (
                            <p style={{ fontSize: '0.875rem', color: '#4b5563', textAlign: 'center' }}>
                                Analiz sonucundaki görsel burada görünecek.
                            </p>
                        )}
                    </div>
                </Card>

                <Card>
                    <CardHeader
                        title="Tespit Edilen Logolar"
                        description={detections ? `${detections.length} tespit bulundu` : undefined}
                        icon={<ScanSearch size={18} />}
                    />
                    <div style={{ padding: '20px' }}>
                        {loading ? (
                            <LoadingPanel message="Tespit sonuçları alınıyor..." />
                        ) : detections && detections.length > 0 ? (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Sınıf</th>
                                            <th>Güven Oranı (%)</th>
                                            <th>Koordinatlar</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detections.map((d, i) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 500, color: '#f0f4ff' }}>{d.sinif}</td>
                                                <td>
                                                    <span className="conf-badge">{d.guven_orani.toFixed(2)}</span>
                                                </td>
                                                <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: '#6b7280' }}>
                                                    {`[${d.koordinatlar.xmin}, ${d.koordinatlar.ymin}, ${d.koordinatlar.xmax}, ${d.koordinatlar.ymax}]`}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : detections ? (
                            <p style={{ fontSize: '0.875rem', color: '#4b5563' }}>Bu görselde logo tespit edilmedi.</p>
                        ) : (
                            <p style={{ fontSize: '0.875rem', color: '#4b5563' }}>Tespit listesi analiz sonrası burada görünecek.</p>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Sekme 2: URL ile Tarama                                             */
/* ------------------------------------------------------------------ */

function UrlTab({ apiBase, state, setState }) {
    const { url, conf, loading, error, resultImg } = state

    async function detect() {
        if (!url.trim()) return
        setState((prev) => {
            if (prev.resultImg) URL.revokeObjectURL(prev.resultImg)
            return { ...prev, loading: true, error: null, resultImg: null }
        })
        const base = trimBase(apiBase)
        try {
            const res = await fetch(
                `${base}/predict/url?image_url=${encodeURIComponent(url.trim())}&conf=${conf}`,
                { method: 'POST' },
            )
            const contentType = res.headers.get('content-type') || ''
            if (!res.ok || contentType.includes('application/json')) {
                const data = await res.json().catch(() => null)
                throw new Error(data?.hata || `İstek başarısız oldu (${res.status})`)
            }
            const blob = await res.blob()
            setState((prev) => ({ ...prev, resultImg: URL.createObjectURL(blob), loading: false }))
        } catch (e) {
            setState((prev) => ({
                ...prev,
                error: e instanceof Error ? e.message : 'Görsel URL üzerinden analiz edilemedi.',
                loading: false,
            }))
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Card>
                <CardHeader
                    title="URL ile Tarama"
                    description="Bir görsel adresi girin, model doğrudan bağlantıdan indirip analiz etsin."
                    icon={<Link2 size={18} />}
                />
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <Field label="Görsel URL'si" htmlFor="url-input">
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <TextInput
                                id="url-input"
                                placeholder="Görsel URL'sini giriniz..."
                                value={url}
                                style={{ flex: 1, minWidth: '240px' }}
                                onChange={(e) => setState((prev) => ({ ...prev, url: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) detect() }}
                            />
                            <Button
                                size="lg"
                                style={{ flexShrink: 0, minWidth: '160px' }}
                                disabled={!url.trim() || loading}
                                onClick={detect}
                            >
                                {loading ? (
                                    <><Loader2 size={16} className="spinner" />Yükleniyor...</>
                                ) : (
                                    <><Radar size={16} />URL&apos;den Analiz Et</>
                                )}
                            </Button>
                        </div>
                    </Field>

                    <Field label="Güven Eşiği" htmlFor="url-conf">
                        <ConfSlider
                            id="url-conf"
                            value={conf}
                            onChange={(value) => setState((prev) => ({ ...prev, conf: value }))}
                        />
                    </Field>
                </div>
            </Card>

            {error ? (
                <div className="alert-error">
                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span>{error}</span>
                </div>
            ) : null}

            <Card>
                <CardHeader title="Sonuç Görseli" icon={<Radar size={18} />} />
                <div style={{ minHeight: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    {loading ? (
                        <LoadingPanel message="URL'den görsel indiriliyor ve analiz ediliyor..." />
                    ) : resultImg ? (
                        <img
                            src={resultImg || '/placeholder.svg'}
                            alt="URL'den indirilen ve işlenen görsel"
                            style={{ maxHeight: '440px', width: 'auto', borderRadius: '10px', objectFit: 'contain' }}
                        />
                    ) : (
                        <p style={{ fontSize: '0.875rem', color: '#4b5563', textAlign: 'center' }}>
                            Tespit sonucundaki görsel burada görünecek.
                        </p>
                    )}
                </div>
            </Card>
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Sekme 3: Multi-Engine Güvenlik Taraması                             */
/* ------------------------------------------------------------------ */

function SecretInput({ id, value, onChange, placeholder }) {
    const [show, setShow] = useState(false)
    return (
        <div style={{ position: 'relative' }}>
            <TextInput
                id={id}
                type={show ? 'text' : 'password'}
                className="input-mono"
                style={{ paddingRight: '40px' }}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                autoComplete="off"
            />
            <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="secret-toggle"
                aria-label={show ? 'Anahtarı gizle' : 'Anahtarı göster'}
            >
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
        </div>
    )
}

function SummaryCard({ label, value, icon, tone }) {
    const iconClass = {
        primary: 'stat-icon-primary',
        success: 'stat-icon-success',
        danger: 'stat-icon-danger',
    }[tone] || 'stat-icon-primary'

    return (
        <Card className="stat-card">
            <div className={cn('stat-icon', iconClass)}>{icon}</div>
            <div>
                <p style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f0f4ff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
                <p style={{ marginTop: '4px', fontSize: '0.8125rem', color: '#6b7280' }}>{label}</p>
            </div>
        </Card>
    )
}

function riskLabel(level) {
    switch (level) {
        case 'high':
            return <RiskBadge level="high"><ShieldAlert size={12} />YÜKSEK RİSK</RiskBadge>
        case 'medium':
            return <RiskBadge level="medium"><AlertTriangle size={12} />ORTA RİSK</RiskBadge>
        case 'low':
            return <RiskBadge level="low"><AlertTriangle size={12} />DÜŞÜK RİSK</RiskBadge>
        case 'safe':
            return <RiskBadge level="safe"><ShieldCheck size={12} />ORİJİNAL / GÜVENLİ</RiskBadge>
        default:
            return <RiskBadge level="neutral"><AlertTriangle size={12} />ŞÜPHELİ</RiskBadge>
    }
}

function Detail({ label, value, highlight }) {
    return (
        <div>
            <p className="detail-label">{label}</p>
            <p className={highlight ? 'detail-value detail-value-danger' : 'detail-value'}>{value}</p>
        </div>
    )
}

function SiteRow({ site, domains = [], onAddDomain, riskScore }) {
    const level = classifyRisk(site.durum)
    const vtCount = site.virustotal_analiz?.zararli_sayisi ?? 0
    const [imgError, setImgError] = useState(false)
    const [expanded, setExpanded] = useState(false)
    // 'idle' | 'added' | 'already'
    const [addState, setAddState] = useState(() =>
        domains.includes(site.site_adi) ? 'already' : 'idle'
    )

    // domains prop değiştiğinde butonu güncelle
    useEffect(() => {
        if (domains.includes(site.site_adi)) {
            setAddState('already')
        }
    }, [domains, site.site_adi])

    function handleAddToWhitelist() {
        if (addState !== 'idle') return
        onAddDomain?.(site.site_adi)
        setAddState('added')
        // 2 saniye sonra 'already' durumuna geç
        setTimeout(() => setAddState('already'), 2000)
    }

    const borderClass = {
        high: 'site-card-high',
        medium: 'site-card-medium',
        low: 'site-card-low',
        safe: 'site-card-safe',
        neutral: 'site-card-neutral',
    }[level] || 'site-card-neutral'

    /* --- Beyaz liste butonu için stil & içerik --- */
    const whitelistBtn = {
        idle: {
            icon: <ShieldOff size={13} />,
            label: 'Listeye Ekle',
            style: {
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.25)',
                color: '#a5b4fc',
            },
            hoverStyle: {
                background: 'rgba(99,102,241,0.18)',
                border: '1px solid rgba(99,102,241,0.5)',
                color: '#c7d2fe',
            },
            disabled: false,
        },
        added: {
            icon: <ShieldCheck size={13} />,
            label: 'Eklendi ✓',
            style: {
                background: 'rgba(16,185,129,0.12)',
                border: '1px solid rgba(16,185,129,0.35)',
                color: '#34d399',
            },
            hoverStyle: null,
            disabled: true,
        },
        already: {
            icon: <ShieldCheck size={13} />,
            label: 'Listede',
            style: {
                background: 'rgba(99,102,241,0.05)',
                border: '1px solid rgba(99,102,241,0.12)',
                color: '#4f5b8a',
            },
            hoverStyle: null,
            disabled: true,
        },
    }[addState]

    return (
        <>
            <Card className={borderClass} style={{ padding: '20px' }}>
                {/* Header row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    {/* Sol: domain adı */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <Globe size={15} style={{ color: '#6b7280', flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, color: '#f0f4ff', fontSize: '0.9375rem' }}>{site.site_adi}</span>
                        {/* Beyaz Listeye Ekle butonu — domain adının hemen yanında */}
                        <button
                            type="button"
                            title={addState === 'already' ? 'Zaten beyaz listede' : 'Beyaz listeye ekle'}
                            onClick={handleAddToWhitelist}
                            disabled={whitelistBtn.disabled}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '5px',
                                borderRadius: '9999px',
                                padding: '3px 9px',
                                fontSize: '0.72rem', fontWeight: 600,
                                letterSpacing: '0.01em',
                                cursor: whitelistBtn.disabled ? 'not-allowed' : 'none',
                                transition: 'all 0.2s ease',
                                flexShrink: 0,
                                ...whitelistBtn.style,
                            }}
                            onMouseEnter={(e) => {
                                if (!whitelistBtn.disabled && whitelistBtn.hoverStyle) {
                                    Object.assign(e.currentTarget.style, whitelistBtn.hoverStyle)
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!whitelistBtn.disabled) {
                                    Object.assign(e.currentTarget.style, whitelistBtn.style)
                                }
                            }}
                            aria-label={`${site.site_adi} sitesini beyaz listeye ekle`}
                        >
                            {whitelistBtn.icon}
                            {whitelistBtn.label}
                        </button>
                    </div>
                    {/* Sağ: Risk skoru badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {riskScore !== undefined && (() => {
                            const isHigh   = riskScore >= 65
                            const isMedium = riskScore >= 30 && riskScore < 65
                            const bg     = isHigh ? 'rgba(244,63,94,0.12)'   : isMedium ? 'rgba(245,158,11,0.12)'  : 'rgba(16,185,129,0.1)'
                            const border = isHigh ? 'rgba(244,63,94,0.3)'    : isMedium ? 'rgba(245,158,11,0.3)'   : 'rgba(16,185,129,0.3)'
                            const color  = isHigh ? '#fb7185'                 : isMedium ? '#fbbf24'                : '#34d399'
                            const label  = isHigh ? 'YÜKSEK RİSK'            : isMedium ? 'ORTA RİSK'              : 'DÜŞÜK RİSK'
                            return (
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                    borderRadius: '9999px', padding: '3px 10px',
                                    fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em',
                                    background: bg, border: `1px solid ${border}`, color,
                                }}>
                                    {label} (%{riskScore})
                                </span>
                            )
                        })()}
                    </div>
                </div>

                <p style={{ marginTop: '8px', fontSize: '0.8125rem', color: '#9ca3af', lineHeight: 1.6 }}>{site.durum}</p>

                {/* Original image preview */}
                {site.gorsel_linki && !imgError ? (
                    <div style={{ marginTop: '16px' }}>
                        <p style={{ marginBottom: '8px', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280' }}>
                            Tespit Edilen Görsel
                        </p>
                        <button
                            type="button"
                            onClick={() => setExpanded(true)}
                            className="img-preview-btn img-overlay-btn"
                            title="Görseli büyüt"
                        >
                            <img
                                src={site.gorsel_linki}
                                alt={`${site.site_adi} sitesinde tespit edilen görsel`}
                                onError={() => setImgError(true)}
                                style={{ maxHeight: '200px', width: '100%', borderRadius: '10px', objectFit: 'contain', display: 'block' }}
                            />
                            <span className="img-overlay">
                                <span className="img-overlay-label">
                                    <Eye size={13} />Büyüt
                                </span>
                            </span>
                        </button>
                    </div>
                ) : null}

                <div style={{ marginTop: '16px', display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', fontSize: '0.875rem' }}>
                    <Detail label="Domain Yaşı" value={site.domain_yasi} />
                    <Detail label="Arama Motoru" value={site.tespit_edildigi_motor} />
                    <Detail label="VirusTotal Engelleme" value={String(vtCount)} highlight={vtCount > 0} />
                    <Detail label="Bulunan Logo" value={String(site.bulunan_logo_sayisi)} />
                </div>

                <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <a href={site.kaynak_sayfa} target="_blank" rel="noopener noreferrer" className="link-btn">
                        <ExternalLink size={13} />Kaynak Sayfa
                    </a>
                    <a href={site.gorsel_linki} target="_blank" rel="noopener noreferrer" className="link-btn">
                        <ImageIcon size={13} />Görsel Linki
                    </a>
                </div>
            </Card>

            {/* Full-screen image modal */}
            {expanded ? (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Görsel önizleme"
                    className="modal-overlay"
                    onClick={() => setExpanded(false)}
                >
                    <div
                        className="glass-card modal-content"
                        style={{ position: 'relative', margin: '16px', maxHeight: '90vh', maxWidth: '900px', width: '100%', overflow: 'hidden' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: 500, color: '#f0f4ff' }}>
                                <Globe size={15} style={{ color: '#6b7280' }} />
                                {site.site_adi}
                                <span style={{ marginLeft: '4px' }}>{riskLabel(level)}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setExpanded(false)}
                                style={{
                                    width: '32px', height: '32px', borderRadius: '8px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#6b7280', background: 'transparent', border: 'none', cursor: 'none',
                                    transition: 'all 0.15s ease',
                                }}
                                aria-label="Kapat"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        {/* Modal image */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', padding: '20px' }}>
                            <img
                                src={site.gorsel_linki}
                                alt={`${site.site_adi} sitesinde tespit edilen orijinal görsel`}
                                style={{ maxHeight: '70vh', width: 'auto', borderRadius: '10px', objectFit: 'contain' }}
                            />
                        </div>
                        {/* Modal footer */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <p style={{ fontSize: '0.75rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                                {site.gorsel_linki}
                            </p>
                            <a href={site.gorsel_linki} target="_blank" rel="noopener noreferrer" className="link-btn">
                                <ExternalLink size={13} />Orijinali Aç
                            </a>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    )
}


function ScanTab({ apiBase, state, setState }) {
    const {
        settingsOpen, serpKey, vtKey, query, conf,
        domains, newDomain, loading, error, result,
    } = state

    function addDomain() {
        const raw = newDomain.trim().toLowerCase()
        const d = raw.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
        if (d && !domains.includes(d)) {
            setState((prev) => ({ ...prev, domains: [...prev.domains, d], newDomain: '' }))
        } else if (domains.includes(d)) {
            setState((prev) => ({ ...prev, newDomain: '' }))
        }
    }

    async function startScan() {
        if (!serpKey.trim()) {
            setState((prev) => ({
                ...prev,
                settingsOpen: true,
                error: 'SerpApi anahtarı zorunludur. Lütfen ayarlar bölümünden girin.',
            }))
            return
        }
        setState((prev) => ({ ...prev, loading: true, error: null, result: null }))
        const base = trimBase(apiBase)
        const params = new URLSearchParams({
            api_key: serpKey.trim(),
            query: query.trim() || 'vakifbank',
            conf: String(conf),
        })
        if (vtKey.trim()) params.set('vt_api_key', vtKey.trim())
        const engines = ['google_images', 'yandex_images', 'bing_images']
        engines.forEach((e) => params.append('engines', e))
        console.log('[ScanTab] Gönderilen official_domains:', domains)
        domains.forEach((d) => params.append('official_domains', d))

        try {
            const fullUrl = `${base}/scan/multi-engine?${params.toString()}`
            console.log('[ScanTab] Gönderilen tam URL:', fullUrl)
            const res = await fetch(fullUrl, { method: 'POST' })
            if (!res.ok) {
                const errData = await res.json().catch(() => null)
                throw new Error(errData?.detail || `Tarama başarısız oldu (${res.status})`)
            }
            const data = await res.json()
            setState((prev) => ({ ...prev, result: data, loading: false }))
        } catch (e) {
            setState((prev) => ({
                ...prev,
                error: e instanceof Error
                    ? `Tarama yapılamadı: ${e.message}`
                    : 'Tarama sırasında bilinmeyen bir hata oluştu.',
                loading: false,
            }))
        }
    }

    const suspiciousCount = result
        ? result.analiz_sonuclari.filter((s) => classifyRisk(s.durum) !== 'safe').length
        : 0

    const [searchTerm, setSearchTerm] = useState('')
    const [sortBy, setSortBy] = useState('risk_score') // 'risk_score' | 'virustotal' | 'domain_age'
    const [sortMenuOpen, setSortMenuOpen] = useState(false)

    const SORT_OPTIONS = [
        { key: 'risk_score',   label: 'Risk Skoruna Göre (En Yüksek)' },
        { key: 'virustotal',   label: 'VirusTotal Değerine Göre (En Yüksek)' },
        { key: 'domain_age',   label: 'Domain Yaşına Göre (En Yeni)' },
    ]

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Card>
                <CardHeader
                    title="Multi-Engine Güvenlik Taraması"
                    description="Google, Yandex ve Bing görsellerinde logo taraması yaparak şüpheli / dolandırıcı siteleri tespit eder."
                    icon={<ScanEye size={18} />}
                    action={
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setState((prev) => ({ ...prev, settingsOpen: !prev.settingsOpen }))}
                            aria-expanded={settingsOpen}
                        >
                            <Settings2 size={14} />
                            Ayarlar
                            <ChevronDown
                                size={14}
                                style={{
                                    transition: 'transform 0.25s ease',
                                    transform: settingsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                }}
                            />
                        </Button>
                    }
                />

                {settingsOpen ? (
                    <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                            <Field label="SerpApi Anahtarı" htmlFor="serp-key" hint="Zorunlu. Görsel arama motorlarına erişim için gereklidir.">
                                <SecretInput
                                    id="serp-key"
                                    value={serpKey}
                                    onChange={(value) => setState((prev) => ({ ...prev, serpKey: value }))}
                                    placeholder="SerpApi anahtarınızı girin"
                                />
                            </Field>
                            <Field label="VirusTotal API Anahtarı" htmlFor="vt-key" hint="İsteğe bağlı. Domain itibar analizi için kullanılır.">
                                <SecretInput
                                    id="vt-key"
                                    value={vtKey}
                                    onChange={(value) => setState((prev) => ({ ...prev, vtKey: value }))}
                                    placeholder="VirusTotal anahtarınızı girin (opsiyonel)"
                                />
                            </Field>
                            <Field label="Arama Terimi" htmlFor="query">
                                <TextInput
                                    id="query"
                                    value={query}
                                    onChange={(e) => setState((prev) => ({ ...prev, query: e.target.value }))}
                                    placeholder="Örn: VakıfBank"
                                />
                            </Field>
                            <Field label="Güven Eşiği" htmlFor="scan-conf">
                                <ConfSlider
                                    id="scan-conf"
                                    value={conf}
                                    onChange={(value) => setState((prev) => ({ ...prev, conf: value }))}
                                />
                            </Field>
                        </div>

                        {/* Excluded domains */}
                        <Field
                            label="Aranmayacak Siteler (Beyaz Liste)"
                            hint="Bu domainler resmi/güvenli kabul edilir. Yeni site ekleyebilir veya kaldırabilirsiniz."
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {domains.map((d) => (
                                        <span key={d} className="domain-pill">
                                            {d}
                                            <button
                                                type="button"
                                                onClick={() => setState((prev) => ({ ...prev, domains: prev.domains.filter((x) => x !== d) }))}
                                                className="domain-pill-remove"
                                                aria-label={`${d} sitesini kaldır`}
                                            >
                                                <X size={11} />
                                            </button>
                                        </span>
                                    ))}
                                    {domains.length === 0 ? (
                                        <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>Beyaz liste boş.</span>
                                    ) : null}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <TextInput
                                        value={newDomain}
                                        onChange={(e) => setState((prev) => ({ ...prev, newDomain: e.target.value }))}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                                e.preventDefault(); addDomain()
                                            }
                                        }}
                                        placeholder="ornek-site.com.tr"
                                    />
                                    <Button variant="secondary" style={{ flexShrink: 0 }} onClick={addDomain}>
                                        <Plus size={15} />Ekle
                                    </Button>
                                    <Button
                                        variant="outline"
                                        style={{ flexShrink: 0 }}
                                        onClick={() => setState((prev) => ({ ...prev, domains: [...DEFAULT_DOMAINS] }))}
                                    >
                                        <Trash2 size={15} />Sıfırla
                                    </Button>
                                </div>
                            </div>
                        </Field>
                    </div>
                ) : null}

                <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                    {!serpKey.trim() && (
                        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            Başlamadan önce ayarlardan SerpApi anahtarınızı girin.
                        </p>
                    )}
                    <Button size="lg" disabled={loading} onClick={startScan}>
                        {loading ? (
                            <><Loader2 size={16} className="spinner" />Yükleniyor...</>
                        ) : (
                            <><ScanEye size={16} />Taramayı Başlat</>
                        )}
                    </Button>
                </div>
            </Card>

            {error ? (
                <div className="alert-error">
                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span>{error}</span>
                </div>
            ) : null}

            {loading && !result ? (
                <Card style={{ padding: '40px' }}>
                    <LoadingPanel message="Arama motorları taranıyor ve domainler analiz ediliyor..." />
                </Card>
            ) : null}

            {result ? (
                <>
                    <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                        <SummaryCard
                            label="Taranan Görsel Sayısı"
                            value={result.taranan_gorsel_sayisi}
                            icon={<ImageIcon size={20} />}
                            tone="primary"
                        />
                        <SummaryCard
                            label="Logo Bulunan Görsel Sayısı"
                            value={result.logo_tespit_edilen_gorsel_sayisi}
                            icon={<CheckCircle2 size={20} />}
                            tone="success"
                        />
                        <SummaryCard
                            label="Şüpheli Site Sayısı"
                            value={suspiciousCount}
                            icon={<ShieldAlert size={20} />}
                            tone="danger"
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Başlık + Arama + Sıralama */}
                        <div style={{
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px',
                        }}>
                            {/* Sol: başlık + sayaç */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: 600, color: '#d1d5db' }}>
                                <Sliders size={15} style={{ color: '#6b7280' }} />
                                Analiz Sonuçları&nbsp;
                                <span style={{
                                    background: 'rgba(99,102,241,0.15)',
                                    border: '1px solid rgba(99,102,241,0.25)',
                                    borderRadius: '9999px',
                                    padding: '1px 8px',
                                    fontSize: '0.75rem',
                                    color: '#a5b4fc',
                                    fontVariantNumeric: 'tabular-nums',
                                }}>
                                    {result.analiz_sonuclari.filter((s) =>
                                        s.site_adi.toLowerCase().includes(searchTerm.toLowerCase())
                                    ).length}
                                </span>
                            </div>

                            {/* Sağ: Arama kutusu + Sırala butonu */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                {/* Arama */}
                                <div style={{ position: 'relative' }}>
                                    <Search size={14} style={{
                                        position: 'absolute', left: '10px', top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: '#4f5b8a', pointerEvents: 'none',
                                    }} />
                                    <input
                                        type="text"
                                        className="input"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Domain ara..."
                                        style={{ width: '220px', height: '34px', paddingLeft: '32px', fontSize: '0.8125rem' }}
                                    />
                                </div>

                                {/* Sıralama dropdown */}
                                <div style={{ position: 'relative' }}>
                                    <button
                                        type="button"
                                        onClick={() => setSortMenuOpen((o) => !o)}
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                            height: '34px', padding: '0 12px',
                                            borderRadius: '10px',
                                            background: sortMenuOpen
                                                ? 'rgba(99,102,241,0.16)'
                                                : 'rgba(99,102,241,0.07)',
                                            border: `1px solid ${
                                                sortMenuOpen
                                                    ? 'rgba(99,102,241,0.45)'
                                                    : 'rgba(99,102,241,0.22)'
                                            }`,
                                            color: '#a5b4fc',
                                            fontSize: '0.8125rem', fontWeight: 500,
                                            cursor: 'none',
                                            transition: 'all 0.2s ease',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        <ArrowUpDown size={13} />
                                        Sırala
                                        <ChevronDown size={13} style={{
                                            transition: 'transform 0.2s ease',
                                            transform: sortMenuOpen ? 'rotate(180deg)' : 'none',
                                        }} />
                                    </button>

                                    {/* Dropdown menü */}
                                    {sortMenuOpen && (
                                        <div
                                            style={{
                                                position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                                                zIndex: 50, minWidth: '280px',
                                                background: 'rgba(16,22,42,0.97)',
                                                backdropFilter: 'blur(16px)',
                                                border: '1px solid rgba(99,102,241,0.2)',
                                                borderRadius: '12px',
                                                boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.08)',
                                                overflow: 'hidden',
                                                animation: 'slideUp 0.18s ease',
                                            }}
                                        >
                                            <p style={{
                                                padding: '10px 14px 6px',
                                                fontSize: '0.68rem', fontWeight: 700,
                                                textTransform: 'uppercase', letterSpacing: '0.08em',
                                                color: '#4f5b8a',
                                            }}>Sıralama Kriteri</p>
                                            {SORT_OPTIONS.map((opt) => (
                                                <button
                                                    key={opt.key}
                                                    type="button"
                                                    onClick={() => { setSortBy(opt.key); setSortMenuOpen(false) }}
                                                    style={{
                                                        display: 'flex', alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        width: '100%', padding: '10px 14px',
                                                        background: sortBy === opt.key
                                                            ? 'rgba(99,102,241,0.1)'
                                                            : 'transparent',
                                                        border: 'none',
                                                        color: sortBy === opt.key ? '#c7d2fe' : '#9ca3af',
                                                        fontSize: '0.8125rem', fontWeight: sortBy === opt.key ? 600 : 400,
                                                        cursor: 'none',
                                                        textAlign: 'left',
                                                        transition: 'all 0.15s ease',
                                                        borderBottom: '1px solid rgba(99,102,241,0.06)',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (sortBy !== opt.key)
                                                            e.currentTarget.style.background = 'rgba(99,102,241,0.06)'
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (sortBy !== opt.key)
                                                            e.currentTarget.style.background = 'transparent'
                                                    }}
                                                >
                                                    <span>{opt.label}</span>
                                                    {sortBy === opt.key && (
                                                        <span style={{
                                                            width: '18px', height: '18px',
                                                            borderRadius: '50%',
                                                            background: 'rgba(16,185,129,0.18)',
                                                            border: '1px solid rgba(16,185,129,0.4)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            color: '#34d399', fontSize: '0.65rem', fontWeight: 800,
                                                            flexShrink: 0,
                                                        }}>✓</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Filtrelenmiş + Sıralanmış liste */}
                        {(() => {
                            const filtered = result.analiz_sonuclari.filter((s) =>
                                s.site_adi.toLowerCase().includes(searchTerm.toLowerCase())
                            )

                            // Risk skoru hesapla ve ekle
                            const withScore = filtered.map((s) => ({
                                ...s,
                                _riskScore: calcRiskScore(s),
                            }))

                            // Sıralama
                            const sorted = [...withScore].sort((a, b) => {
                                if (sortBy === 'virustotal') {
                                    return (b.virustotal_analiz?.zararli_sayisi ?? 0)
                                         - (a.virustotal_analiz?.zararli_sayisi ?? 0)
                                }
                                if (sortBy === 'domain_age') {
                                    // Küçük gün sayısı = daha yeni = önce
                                    const getDay = (s) => {
                                        const m = String(s.domain_yasi ?? '').match(/(\d+)/)
                                        return m ? parseInt(m[1], 10) : 99999
                                    }
                                    return getDay(a) - getDay(b)
                                }
                                // Varsayılan: risk_score
                                return b._riskScore - a._riskScore
                            })

                            if (result.analiz_sonuclari.length === 0) {
                                return (
                                    <Card style={{ padding: '32px', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
                                        Logo içeren site bulunamadı.
                                    </Card>
                                )
                            }
                            if (sorted.length === 0) {
                                return (
                                    <Card style={{ padding: '28px', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                        <Search size={20} style={{ color: '#4f5b8a' }} />
                                        <span>"<strong style={{ color: '#a5b4fc' }}>{searchTerm}</strong>" ile eşleşen sonuç bulunamadı.</span>
                                    </Card>
                                )
                            }
                            return sorted.map((site, i) => (
                                <SiteRow
                                    key={`${site.site_adi}-${i}`}
                                    site={site}
                                    riskScore={site._riskScore}
                                    domains={domains}
                                    onAddDomain={(domain) =>
                                        setState((prev) => ({
                                            ...prev,
                                            domains: prev.domains.includes(domain)
                                                ? prev.domains
                                                : [...prev.domains, domain],
                                        }))
                                    }
                                />
                            ))
                        })()}
                    </div>
                </>
            ) : null}
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Sekme 4: Favicon & HTML Phishing Taraması                          */
/* ------------------------------------------------------------------ */

function buildInitialFaviconState() {
    const mainSaved = lsLoad()
    const favSaved  = lsLoad(LS_KEY_FAVICON)
    return {
        scraperKey: mainSaved?.faviconScraperKey ?? mainSaved?.scraperKey ?? favSaved?.scraperKey ?? '',
        loading: false,
        error: null,
        results: null,
    }
}


function FaviconTab({ apiBase, state, setState }) {
    const { scraperKey, loading, error, results } = state

    async function startScan() {
        setState((prev) => ({ ...prev, loading: true, error: null, results: null }))
        const base = trimBase(apiBase)
        const params = new URLSearchParams()
        if (scraperKey.trim()) params.set('scraper_api_key', scraperKey.trim())
        try {
            const res = await fetch(`${base}/scan/favicon-html-arama?${params.toString()}`, { method: 'POST' })
            if (!res.ok) {
                const errData = await res.json().catch(() => null)
                throw new Error(errData?.detail || `İstek başarısız (${res.status})`)
            }
            const data = await res.json()
            setState((prev) => ({ ...prev, results: data.results ?? data, loading: false }))
        } catch (e) {
            setState((prev) => ({
                ...prev,
                error: e instanceof Error ? `Tarama yapılamadı: ${e.message}` : 'Bilinmeyen bir hata oluştu.',
                loading: false,
            }))
        }
    }

    /* Sonuç kartı için renk/rozet hesaplama */
    function getFaviconRisk(item) {
        const status = String(item.status ?? item.durum ?? '').toLowerCase()
        const isPhishing = status.includes('phish') || status.includes('malicious') || status.includes('zararlı') || status.includes('tehlikeli')
        const isSafe = status.includes('safe') || status.includes('güvenli') || status.includes('clean') || status.includes('temiz')
        if (isPhishing) return 'high'
        if (isSafe) return 'safe'
        return 'medium'
    }

    const riskColors = {
        high:    { bg: 'rgba(244,63,94,0.10)',  border: 'rgba(244,63,94,0.30)',  color: '#fb7185', label: 'PHİSHİNG / TEHLİKELİ' },
        medium:  { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.30)', color: '#fbbf24', label: 'ŞÜPHELİ'              },
        safe:    { bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.30)', color: '#34d399', label: 'GÜVENLİ'              },
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Card>
                <CardHeader
                    title="Favicon & HTML Phishing Taraması"
                    description="URLScan.io ve canlı Phishing kaynaklarını tarayarak favicon/HTML benzerliği yüksek sahte siteleri tespit eder."
                    icon={<ShieldAlert size={18} />}
                />
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <Field label="ScraperAPI Anahtarı" htmlFor="favicon-scraper-key">
                        <SecretInput
                            id="favicon-scraper-key"
                            value={scraperKey}
                            onChange={(value) => setState((prev) => ({ ...prev, scraperKey: value }))}
                            placeholder="ScraperAPI anahtarınızı girin"
                        />
                    </Field>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <Button size="lg" disabled={loading} onClick={startScan}>
                            {loading ? (
                                <><Loader2 size={16} className="spinner" />Taranıyor...</>
                            ) : (
                                <><Globe size={16} />URLScan ve Phishing Taramasını Başlat</>
                            )}
                        </Button>
                    </div>
                </div>
            </Card>

            {error ? (
                <div className="alert-error">
                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span>{error}</span>
                </div>
            ) : null}

            {loading && !results ? (
                <Card style={{ padding: '40px' }}>
                    <LoadingPanel message="URLScan.io ve Phishing kaynakları taranıyor, lütfen bekleyin..." />
                </Card>
            ) : null}

            {results && Array.isArray(results) && results.length === 0 ? (
                <Card style={{ padding: '32px', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
                    <ShieldCheck size={28} style={{ color: '#34d399', marginBottom: '10px' }} />
                    <p>Phishing sitesi tespit edilmedi.</p>
                </Card>
            ) : null}

            {results && Array.isArray(results) && results.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: 600, color: '#d1d5db' }}>
                        <FileSearch size={15} style={{ color: '#818cf8' }} />
                        Tarama Sonuçları&nbsp;
                        <span style={{
                            background: 'rgba(99,102,241,0.12)',
                            border: '1px solid rgba(99,102,241,0.25)',
                            borderRadius: '9999px',
                            padding: '1px 8px',
                            fontSize: '0.75rem',
                            color: '#a5b4fc',
                            fontVariantNumeric: 'tabular-nums',
                        }}>
                            {results.length} Sonuç
                        </span>
                    </div>
                    {results.map((item, idx) => {
                        const domain = item.domain ?? item.url ?? item.site ?? item.site_adi ?? `Sonuç #${idx + 1}`
                        const status = item.status ?? item.durum ?? item.verdict ?? '-'
                        const urlLink = item.url ?? item.link ?? item.kaynak_url ?? null
                        const score = item.score ?? item.puan ?? null
                        const tags = item.tags ?? item.etiketler ?? []
                        return (
                            <Card
                                key={idx}
                                style={{
                                    padding: '18px 20px',
                                    borderColor: 'rgba(99,102,241,0.22)',
                                    background: 'linear-gradient(135deg, rgba(30,27,75,0.35), rgba(16,22,42,0.85))',
                                }}
                            >
                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <Globe size={14} style={{ color: '#818cf8', flexShrink: 0 }} />
                                        <span style={{ fontWeight: 600, color: '#f0f4ff', fontSize: '0.9375rem' }}>{domain}</span>
                                    </div>
                                </div>

                                {status && status !== '-' ? (
                                    <p style={{ marginTop: '8px', fontSize: '0.8125rem', color: '#9ca3af' }}>{String(status)}</p>
                                ) : null}

                                <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                    {score !== null && (
                                        <span style={{
                                            fontSize: '0.75rem', fontWeight: 600,
                                            background: 'rgba(99,102,241,0.12)',
                                            border: '1px solid rgba(99,102,241,0.25)',
                                            borderRadius: '9999px', padding: '2px 9px', color: '#a5b4fc',
                                        }}>
                                            Skor: {score}
                                        </span>
                                    )}
                                    {Array.isArray(tags) && tags.map((tag, ti) => (
                                        <span key={ti} style={{
                                            fontSize: '0.72rem', fontWeight: 500,
                                            background: 'rgba(99,102,241,0.1)',
                                            border: '1px solid rgba(99,102,241,0.2)',
                                            borderRadius: '9999px', padding: '2px 8px', color: '#c7d2fe',
                                        }}>
                                            {String(tag)}
                                        </span>
                                    ))}
                                    {urlLink ? (
                                        <a href={urlLink} target="_blank" rel="noopener noreferrer" className="link-btn">
                                            <ExternalLink size={12} />Siteye Git
                                        </a>
                                    ) : null}
                                </div>
                            </Card>
                        )
                    })}
                </div>
            ) : null}

            {results && !Array.isArray(results) ? (
                <Card style={{ padding: '20px' }}>
                    <CardHeader title="Ham Sonuç" icon={<FileSearch size={18} />} />
                    <pre style={{
                        margin: '16px', padding: '16px',
                        background: 'rgba(0,0,0,0.3)', borderRadius: '10px',
                        fontSize: '0.78rem', color: '#9ca3af',
                        overflowX: 'auto', lineHeight: 1.7,
                        fontFamily: "'JetBrains Mono', monospace",
                    }}>{JSON.stringify(results, null, 2)}</pre>
                </Card>
            ) : null}
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Sekme 5: SSL / CRT.sh Domain Sorgulama                             */
/* ------------------------------------------------------------------ */

function buildInitialSslState() {
    const mainSaved = lsLoad()
    const sslSaved  = lsLoad(LS_KEY_SSL)
    return {
        keywords:   mainSaved?.sslKeywords   ?? mainSaved?.keywords   ?? sslSaved?.keywords   ?? '',
        vtKey:      mainSaved?.sslVtKey      ?? mainSaved?.vtKey      ?? sslSaved?.vtKey      ?? '',
        scraperKey: mainSaved?.sslScraperKey ?? mainSaved?.scraperKey ?? sslSaved?.scraperKey ?? '',
        loading: false,
        error: null,
        results: null,
    }
}


function SslTab({ apiBase, state, setState }) {
    const { keywords, vtKey, scraperKey, loading, error, results } = state
    // Accordion açık/kapalı takibi: { [keyword]: bool }
    const [openGroups, setOpenGroups] = useState({})

    function toggleGroup(kw) {
        setOpenGroups((prev) => ({ ...prev, [kw]: !prev[kw] }))
    }

    async function startScan() {
        if (!keywords.trim()) {
            setState((prev) => ({ ...prev, error: 'En az bir anahtar kelime giriniz.' }))
            return
        }
        setState((prev) => ({ ...prev, loading: true, error: null, results: null }))
        const base = trimBase(apiBase)
        const params = new URLSearchParams({ keywords: keywords.trim() })
        if (vtKey.trim()) params.set('vt_api_key', vtKey.trim())
        if (scraperKey.trim()) params.set('scraper_api_key', scraperKey.trim())
        try {
            const res = await fetch(`${base}/ssl-search?${params.toString()}`, { method: 'POST' })
            if (!res.ok) {
                const errData = await res.json().catch(() => null)
                throw new Error(errData?.detail || `İstek başarısız (${res.status})`)
            }
            const data = await res.json()
            // Swagger API formatı: { status: "success", results: { "vakifbank": [ ... ] } }
            const resContent = data?.results ?? data
            setState((prev) => ({ ...prev, results: resContent, loading: false }))
        } catch (e) {
            setState((prev) => ({
                ...prev,
                error: e instanceof Error ? `Tarama yapılamadı: ${e.message}` : 'Bilinmeyen bir hata oluştu.',
                loading: false,
            }))
        }
    }

    /* Gruplama: sonuçlar obje veya dizi olabilir */
    function parseGroups(data) {
        if (!data) return []
        const rawObj = (data && typeof data === 'object' && !Array.isArray(data) && data.results) ? data.results : data
        if (Array.isArray(rawObj)) return [{ keyword: 'Sonuçlar', items: rawObj }]
        if (typeof rawObj === 'object' && rawObj !== null) {
            return Object.entries(rawObj)
                .filter(([kw]) => kw !== 'status' && kw !== 'message' && kw !== 'detail')
                .map(([kw, items]) => ({
                    keyword: kw,
                    items: Array.isArray(items) ? items : [items],
                }))
        }
        return []
    }

    function getVtBadge(item) {
        const vtObj = item.virustotal ?? item.virustotal_analiz
        const count = typeof vtObj === 'object' && vtObj !== null
            ? (vtObj.zararli_sayisi ?? vtObj.malicious ?? null)
            : (item.vt_count ?? item.malicious ?? null)
        if (count === null || count === undefined) return null
        const isHigh = count >= 3
        const isMed = count >= 1
        return (
            <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                borderRadius: '9999px', padding: '2px 9px',
                fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.03em',
                background: isHigh ? 'rgba(244,63,94,0.12)' : isMed ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                border: `1px solid ${isHigh ? 'rgba(244,63,94,0.3)' : isMed ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.25)'}`,
                color: isHigh ? '#fb7185' : isMed ? '#fbbf24' : '#34d399',
            }}>
                <ShieldAlert size={10} />
                VT: {count} {isHigh ? 'ZARARLISIZ DEĞİL' : isMed ? 'Şüpheli' : 'Temiz'}
            </span>
        )
    }

    function getAgeBadge(item) {
        const raw = item.domain_yasi ?? item.age ?? item.age_days ?? null
        if (raw === null || raw === undefined) return null
        const days = parseInt(String(raw).replace(/[^0-9]/g, ''), 10)
        const isNew = !isNaN(days) && days < 180
        const isMed = !isNaN(days) && days < 730
        return (
            <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                borderRadius: '9999px', padding: '2px 9px',
                fontSize: '0.7rem', fontWeight: 600,
                background: isNew ? 'rgba(244,63,94,0.1)' : isMed ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)',
                border: `1px solid ${isNew ? 'rgba(244,63,94,0.25)' : isMed ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}`,
                color: isNew ? '#fb7185' : isMed ? '#fbbf24' : '#34d399',
            }}>
                {isNew ? <AlertTriangle size={10} /> : <CheckCircle2 size={10} />}
                {String(raw)}
            </span>
        )
    }

    function getAccessBadge(item) {
        const acc = item.erisilebilirlik
        if (!acc) return null
        const isActive = acc.is_active === true
        const durumText = acc.durum ?? (isActive ? 'SİTE AKTİF' : 'SİTE KAPALI')
        const statusCode = acc.status_code ? ` [${acc.status_code}]` : ''

        return (
            <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                borderRadius: '9999px', padding: '2px 9px',
                fontSize: '0.7rem', fontWeight: 600,
                background: isActive ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
                border: `1px solid ${isActive ? 'rgba(16,185,129,0.25)' : 'rgba(244,63,94,0.25)'}`,
                color: isActive ? '#34d399' : '#fb7185',
            }}>
                {isActive ? <Wifi size={10} /> : <WifiOff size={10} />}
                {durumText}{statusCode}
            </span>
        )
    }

    const groups = parseGroups(results)
    const totalDomains = groups.reduce((acc, g) => acc + g.items.length, 0)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Card>
                <CardHeader
                    title="SSL / CRT.sh Domain Sorgulama"
                    description="CRT.sh sertifika kayıtlarını tarayarak hedef marka/kelimeyi içeren tüm domainleri bulur ve VirusTotal ile doğrular."
                    icon={<Lock size={18} />}
                />
                <div style={{ padding: '20px', display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                    <Field
                        label="Arama Anahtar Kelimeleri"
                        htmlFor="ssl-keywords"
                    >
                        <TextInput
                            id="ssl-keywords"
                            value={keywords}
                            onChange={(e) => setState((prev) => ({ ...prev, keywords: e.target.value }))}
                            placeholder="Örn: vakifbank, banka"
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) startScan() }}
                        />
                    </Field>
                    <Field label="VirusTotal API Anahtarı" htmlFor="ssl-vt-key">
                        <SecretInput
                            id="ssl-vt-key"
                            value={vtKey}
                            onChange={(value) => setState((prev) => ({ ...prev, vtKey: value }))}
                            placeholder="VirusTotal anahtarınız (Opsiyonel)"
                        />
                    </Field>
                    <Field label="ScraperAPI Anahtarı" htmlFor="ssl-scraper-key">
                        <SecretInput
                            id="ssl-scraper-key"
                            value={scraperKey}
                            onChange={(value) => setState((prev) => ({ ...prev, scraperKey: value }))}
                            placeholder="ScraperAPI anahtarınız (Opsiyonel)"
                        />
                    </Field>
                </div>
                <div style={{ padding: '0 20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <Button size="lg" disabled={loading || !keywords.trim()} onClick={startScan}>
                        {loading ? (
                            <><Loader2 size={16} className="spinner" />Taranıyor...</>
                        ) : (
                            <><Key size={16} />SSL Sertifika Kayıtlarını Tara</>
                        )}
                    </Button>
                </div>
            </Card>

            {error ? (
                <div className="alert-error">
                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span>{error}</span>
                </div>
            ) : null}

            {loading && !results ? (
                <Card style={{ padding: '40px' }}>
                    <LoadingPanel message="CRT.sh sertifika kayıtları sorgulanıyor ve domainler analiz ediliyor..." />
                </Card>
            ) : null}

            {results && groups.length === 0 ? (
                <Card style={{ padding: '32px', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
                    <ShieldCheck size={28} style={{ color: '#34d399', marginBottom: '10px' }} />
                    <p>Eşleşen SSL sertifika kaydı bulunamadı.</p>
                </Card>
            ) : null}

            {groups.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Özet satırı */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: 600, color: '#d1d5db' }}>
                        <Lock size={15} style={{ color: '#6b7280' }} />
                        SSL Sertifika Sonuçları&nbsp;
                        <span style={{
                            background: 'rgba(99,102,241,0.15)',
                            border: '1px solid rgba(99,102,241,0.25)',
                            borderRadius: '9999px',
                            padding: '1px 8px',
                            fontSize: '0.75rem',
                            color: '#a5b4fc',
                            fontVariantNumeric: 'tabular-nums',
                        }}>
                            {totalDomains} Domain
                        </span>
                    </div>

                    {groups.map((group) => {
                        const isOpen = openGroups[group.keyword] !== false // varsayılan açık
                        return (
                            <Card key={group.keyword}>
                                {/* Accordion header */}
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(group.keyword)}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '16px 20px',
                                        background: 'transparent', border: 'none',
                                        cursor: 'none', textAlign: 'left',
                                        borderBottom: isOpen ? '1px solid rgba(255,255,255,0.06)' : 'none',
                                        transition: 'border-color 0.2s ease',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0,
                                            background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.12))',
                                            border: '1px solid rgba(99,102,241,0.3)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#818cf8',
                                        }}>
                                            <Key size={15} />
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: 600, color: '#f0f4ff', fontSize: '0.9375rem' }}>
                                                "{group.keyword}"
                                            </p>
                                            <p style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '2px' }}>
                                                {group.items.length} domain bulundu
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronDown
                                        size={16}
                                        style={{
                                            color: '#6b7280', flexShrink: 0,
                                            transition: 'transform 0.25s ease',
                                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                        }}
                                    />
                                </button>

                                {/* Accordion body */}
                                {isOpen ? (
                                    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {group.items.map((item, idx) => {
                                            const domainName = item.domain ?? item.name_value ?? item.common_name ?? item.site_adi ?? `#${idx + 1}`
                                            const siteUrl = item.url ?? (item.domain ? (item.domain.startsWith('http') ? item.domain : `https://${item.domain}`) : null)
                                            const crtLink = item.crtsh_url ?? item.crt_link ??
                                                (item.id ? `https://crt.sh/?id=${item.id}` : `https://crt.sh/?q=${encodeURIComponent(domainName)}`)
                                            const ageBadge = getAgeBadge(item)
                                            const vtBadge = getVtBadge(item)
                                            const accessBadge = getAccessBadge(item)
                                            const issuer = item.issuer ?? item.issuer_name ?? null
                                            const notBefore = item.not_before ?? item.registered_at ?? null
                                            const notAfter = item.not_after ?? item.expires_at ?? null

                                            return (
                                                <div
                                                    key={idx}
                                                    style={{
                                                        display: 'flex', flexWrap: 'wrap',
                                                        alignItems: 'center', justifyContent: 'space-between',
                                                        gap: '10px',
                                                        padding: '12px 14px',
                                                        borderRadius: '10px',
                                                        background: 'rgba(255,255,255,0.025)',
                                                        border: '1px solid rgba(99,102,241,0.1)',
                                                        transition: 'border-color 0.2s ease, background 0.2s ease',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'
                                                        e.currentTarget.style.background = 'rgba(99,102,241,0.05)'
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.1)'
                                                        e.currentTarget.style.background = 'rgba(255,255,255,0.025)'
                                                    }}
                                                >
                                                    {/* Sol: domain adı + detaylar */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <Globe size={12} style={{ color: '#818cf8', flexShrink: 0 }} />
                                                            <span style={{
                                                                fontWeight: 600, color: '#f0f4ff', fontSize: '0.875rem',
                                                                fontFamily: "'JetBrains Mono', monospace",
                                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                            }}>
                                                                {String(domainName)}
                                                            </span>
                                                        </div>
                                                        {issuer ? (
                                                            <p style={{ fontSize: '0.72rem', color: '#6b7280', marginLeft: '18px' }}>
                                                                Sertifika: {String(issuer)}
                                                            </p>
                                                        ) : null}
                                                        {(notBefore || notAfter) ? (
                                                            <p style={{ fontSize: '0.72rem', color: '#4b5563', marginLeft: '18px', fontFamily: "'JetBrains Mono', monospace" }}>
                                                                {notBefore ? `▶ ${String(notBefore).slice(0, 10)}` : ''}
                                                                {notBefore && notAfter ? ' → ' : ''}
                                                                {notAfter ? String(notAfter).slice(0, 10) : ''}
                                                            </p>
                                                        ) : null}
                                                    </div>

                                                    {/* Sağ: rozetler + linkler */}
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                                        {ageBadge}
                                                        {vtBadge}
                                                        {accessBadge}
                                                        {siteUrl ? (
                                                            <a
                                                                href={siteUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="link-btn"
                                                            >
                                                                <ExternalLink size={11} />Siteye Git
                                                            </a>
                                                        ) : null}
                                                        <a
                                                            href={crtLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="link-btn"
                                                            style={{ opacity: 0.8 }}
                                                        >
                                                            <ExternalLink size={11} />crt.sh
                                                        </a>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : null}
                            </Card>
                        )
                    })}
                </div>
            ) : null}
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Sekme 6: Kapsamlı Tehdit Raporu                                     */
/* ------------------------------------------------------------------ */

const FULL_REPORT_ENGINES = ['google_images', 'yandex_images', 'bing_images']

function normalizeQuery(q) {
    if (!q) return q
    // Eski kayıtlı 'VakıfBank' varyantlarını normalize et
    if (/^vak[iı]fbank$/i.test(q.trim())) return 'vakifbank'
    return q
}

function buildInitialFullReportState() {
    const saved = lsLoad(LS_KEY_FULL_REPORT)
    const mainSaved = lsLoad()
    return {
        query:        normalizeQuery(saved?.query)        ?? normalizeQuery(mainSaved?.query)        ?? 'vakifbank',
        serpKey:      saved?.serpKey      ?? mainSaved?.serpKey      ?? '',
        vtKey:        saved?.vtKey        ?? mainSaved?.vtKey        ?? '',
        scraperKey:   saved?.scraperKey   ?? mainSaved?.scraperKey   ?? mainSaved?.sslScraperKey ?? '',
        urlscanKey:   saved?.urlscanKey   ?? '',
        conf:         saved?.conf         ?? mainSaved?.conf         ?? 0.4,
        engines:      saved?.engines      ?? [...FULL_REPORT_ENGINES],
        whitelist:    saved?.whitelist    ?? DEFAULT_DOMAINS.join('\n'),
        // runtime
        loading:      false,
        error:        null,
        pdfBlob:      null,  // hazırlanan PDF blob
        scanDone:     false, // tarama tamamlandı mı?
    }
}

function FullReportTab({ apiBase, state, setState }) {
    const {
        query, serpKey, vtKey, scraperKey, urlscanKey, conf,
        engines, whitelist,
        loading, error, pdfBlob, scanDone,
    } = state

    /* Alanları güncelle + localStorage'a kaydet */
    function update(patch) {
        setState((prev) => {
            const next = { ...prev, ...patch }
            // Sadece kalıcı alanları kaydet (runtime state hariç)
            lsSave({
                query:      next.query,
                serpKey:    next.serpKey,
                vtKey:      next.vtKey,
                scraperKey: next.scraperKey,
                urlscanKey: next.urlscanKey,
                conf:       next.conf,
                engines:    next.engines,
                whitelist:  next.whitelist,
            }, LS_KEY_FULL_REPORT)
            return next
        })
    }

    function toggleEngine(eng) {
        const next = engines.includes(eng)
            ? engines.filter((e) => e !== eng)
            : [...engines, eng]
        update({ engines: next })
    }

    async function startScan() {
        if (!serpKey.trim()) {
            setState((prev) => ({ ...prev, error: 'SerpApi anahtarı zorunludur.' }))
            return
        }
        setState((prev) => ({ ...prev, loading: true, error: null, pdfBlob: null, scanDone: false }))
        const base = trimBase(apiBase)
        const params = new URLSearchParams()
        params.set('as_pdf', 'true')
        params.set('serp_api_key', serpKey.trim())
        // Backend keywords parametresi: virgülle ayrılmış TEK bir string bekliyor
        const keywordsStr = query.split(',').map((q) => q.trim()).filter(Boolean).join(', ')
        params.set('keywords', keywordsStr || 'vakifbank')
        params.set('conf', String(conf))
        if (vtKey.trim())       params.set('vt_api_key', vtKey.trim())
        if (scraperKey.trim())  params.set('scraper_api_key', scraperKey.trim())
        if (urlscanKey.trim())  params.set('urlscan_api_key', urlscanKey.trim())
        engines.forEach((e) => params.append('engines', e))
        const domains = whitelist.split('\n').map((d) => d.trim()).filter(Boolean)
        domains.forEach((d) => params.append('official_domains', d))

        try {
            const res = await fetch(`${base}/report/full-report?${params.toString()}`, {
                method: 'POST',
            })
            if (!res.ok) {
                const errData = await res.json().catch(() => null)
                throw new Error(errData?.detail || `Tarama başarısız (${res.status})`)
            }
            const blob = await res.blob()
            setState((prev) => ({ ...prev, pdfBlob: blob, scanDone: true, loading: false }))
        } catch (e) {
            setState((prev) => ({
                ...prev,
                error: e instanceof Error ? `Tarama yapılamadı: ${e.message}` : 'Bilinmeyen hata.',
                loading: false,
            }))
        }
    }

    function downloadPdf() {
        if (!pdfBlob) return
        const now = new Date()
        const pad = (n) => String(n).padStart(2, '0')
        const dd   = pad(now.getDate())
        const mm   = pad(now.getMonth() + 1)
        const yyyy = now.getFullYear()
        const hh   = pad(now.getHours())
        const min  = pad(now.getMinutes())
        const ss   = pad(now.getSeconds())
        const fileName = `tarama_raporu_${dd}${mm}${yyyy}_${hh}${min}${ss}.pdf`
        const url = URL.createObjectURL(pdfBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 5000)
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Ayar Formu */}
            <Card>
                <CardHeader
                    title="Kapsamlı Tehdit Raporu"
                    description="Tüm tarama motorlarını ve analiz araçlarını birleştirerek PDF formatında kapsamlı bir tehdit raporu oluşturur."
                    icon={<FileText size={18} />}
                />
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Arama Kelimeleri */}
                    <Field
                        label="Arama Kelimeleri"
                        htmlFor="fr-query"
                        hint="Virgülle ayrılmış terimler (Örn: vakifbank, vakıfbank)."
                    >
                        <textarea
                            id="fr-query"
                            className="input"
                            rows={2}
                            style={{ resize: 'vertical', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8125rem' }}
                            placeholder="vakifbank, vakıfbank"
                            value={query}
                            onChange={(e) => update({ query: e.target.value })}
                        />
                    </Field>

                    {/* API Anahtarları */}
                    <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                        <Field label="SerpApi Anahtarı" htmlFor="fr-serp" hint="Zorunlu. Görsel arama API anahtarı.">
                            <SecretInput
                                id="fr-serp"
                                value={serpKey}
                                onChange={(v) => update({ serpKey: v })}
                                placeholder="SerpApi anahtarınızı girin"
                            />
                        </Field>
                        <Field label="VirusTotal API Anahtarı" htmlFor="fr-vt" hint="VT taramaları için.">
                            <SecretInput
                                id="fr-vt"
                                value={vtKey}
                                onChange={(v) => update({ vtKey: v })}
                                placeholder="VirusTotal anahtarınızı girin"
                            />
                        </Field>
                        <Field label="ScraperAPI Anahtarı" htmlFor="fr-scraper" hint="Canlı erişilebilirlik taramaları için.">
                            <SecretInput
                                id="fr-scraper"
                                value={scraperKey}
                                onChange={(v) => update({ scraperKey: v })}
                                placeholder="ScraperAPI anahtarınızı girin"
                            />
                        </Field>
                        <Field label="URLScan.io API Anahtarı" htmlFor="fr-urlscan" hint="Favicon ve phishing HTML taraması için.">
                            <SecretInput
                                id="fr-urlscan"
                                value={urlscanKey}
                                onChange={(v) => update({ urlscanKey: v })}
                                placeholder="URLScan.io anahtarınızı girin"
                            />
                        </Field>
                        <Field label="YOLO Güven Eşiği" htmlFor="fr-conf">
                            <ConfSlider
                                id="fr-conf"
                                value={conf}
                                onChange={(v) => update({ conf: v })}
                            />
                        </Field>
                    </div>

                    {/* Görsel Arama Motorları */}
                    <Field label="Görsel Arama Motorları" htmlFor="fr-engines">
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {FULL_REPORT_ENGINES.map((eng) => {
                                const checked = engines.includes(eng)
                                return (
                                    <label
                                        key={eng}
                                        htmlFor={`fr-eng-${eng}`}
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                                            padding: '7px 14px', borderRadius: '10px',
                                            cursor: 'none',
                                            transition: 'all 0.2s ease',
                                            background: checked
                                                ? 'linear-gradient(135deg, rgba(99,102,241,0.22), rgba(139,92,246,0.14))'
                                                : 'rgba(255,255,255,0.04)',
                                            border: checked
                                                ? '1px solid rgba(99,102,241,0.5)'
                                                : '1px solid rgba(255,255,255,0.08)',
                                            color: checked ? '#c7d2fe' : '#6b7280',
                                            fontSize: '0.8125rem',
                                            fontWeight: checked ? 600 : 400,
                                            boxShadow: checked ? '0 0 10px rgba(99,102,241,0.15)' : 'none',
                                        }}
                                    >
                                        <input
                                            id={`fr-eng-${eng}`}
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleEngine(eng)}
                                            style={{ accentColor: '#818cf8', width: '14px', height: '14px' }}
                                        />
                                        {eng}
                                    </label>
                                )
                            })}
                        </div>
                    </Field>

                    {/* Beyaz Liste */}
                    <Field
                        label="Resmi Domainler / Beyaz Liste"
                        htmlFor="fr-whitelist"
                        hint="Her satıra bir domain. Taramadan hariç tutulacak resmi adresler."
                    >
                        <textarea
                            id="fr-whitelist"
                            className="input"
                            rows={5}
                            style={{
                                resize: 'vertical',
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '0.75rem',
                                lineHeight: 1.7,
                            }}
                            placeholder="vakifbank.com.tr"
                            value={whitelist}
                            onChange={(e) => update({ whitelist: e.target.value })}
                        />
                    </Field>

                    {/* Taramayı Başlat Butonu */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', paddingTop: '4px' }}>
                        {!serpKey.trim() && (
                            <p style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
                                Başlamadan önce SerpApi anahtarınızı girin.
                            </p>
                        )}
                        <Button
                            size="lg"
                            disabled={loading}
                            onClick={startScan}
                            style={{
                                minWidth: '260px',
                                background: loading
                                    ? 'rgba(99,102,241,0.3)'
                                    : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                boxShadow: loading ? 'none' : '0 4px 24px rgba(99,102,241,0.4)',
                            }}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="spinner" />
                                    Taramalar Yapılıyor, Lütfen Bekleyin...
                                </>
                            ) : (
                                <>
                                    <FileText size={16} />
                                    Taramayı Başlat
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Hata */}
            {error ? (
                <div className="alert-error">
                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span>{error}</span>
                </div>
            ) : null}

            {/* Yükleniyor paneli */}
            {loading ? (
                <Card style={{ padding: '48px' }}>
                    <LoadingPanel message="Tüm arama motorları taranıyor ve PDF raporu hazırlanıyor, bu işlem birkaç dakika sürebilir..." />
                </Card>
            ) : null}

            {/* Başarı kartı + İndir Butonu */}
            {scanDone && pdfBlob && !loading ? (
                <div
                    style={{
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.06))',
                        border: '1px solid rgba(16,185,129,0.35)',
                        padding: '28px 32px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '20px',
                        boxShadow: '0 0 40px rgba(16,185,129,0.1)',
                        animation: 'slideUp 0.35s ease',
                    }}
                >
                    {/* Başlık */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', textAlign: 'center' }}>
                        <div style={{
                            width: '56px', height: '56px', borderRadius: '50%',
                            background: 'rgba(16,185,129,0.18)',
                            border: '2px solid rgba(16,185,129,0.5)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 20px rgba(16,185,129,0.25)',
                        }}>
                            <CheckCircle2 size={28} style={{ color: '#34d399' }} />
                        </div>
                        <div>
                            <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f0f4ff', lineHeight: 1.3 }}>
                                ✅ Tarama Başarıyla Tamamlandı!
                            </p>
                            <p style={{ marginTop: '6px', fontSize: '0.875rem', color: '#6b7280' }}>
                                Raporunuz hazır. Aşağıdaki butondan PDF olarak indirebilirsiniz.
                            </p>
                        </div>
                    </div>

                    {/* Divider */}
                    <div style={{ width: '100%', height: '1px', background: 'rgba(16,185,129,0.2)' }} />

                    {/* İndir Butonu */}
                    <button
                        type="button"
                        onClick={downloadPdf}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '10px',
                            padding: '14px 36px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #059669, #10b981)',
                            border: '1px solid rgba(16,185,129,0.6)',
                            color: '#ecfdf5',
                            fontSize: '1rem', fontWeight: 700,
                            cursor: 'none',
                            boxShadow: '0 4px 24px rgba(16,185,129,0.35)',
                            transition: 'all 0.2s ease',
                            letterSpacing: '0.01em',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 6px 32px rgba(16,185,129,0.55)'
                            e.currentTarget.style.transform = 'translateY(-1px)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = '0 4px 24px rgba(16,185,129,0.35)'
                            e.currentTarget.style.transform = 'none'
                        }}
                    >
                        <Download size={20} />
                        Raporu İndir (PDF)
                    </button>
                </div>
            ) : null}
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Ana Sayfa / Panel                                                   */
/* ------------------------------------------------------------------ */

const TABS = [
    { key: 'detect',     label: 'Görsel Yükle & Tespit Et',           icon: <ScanSearch size={15} /> },
    { key: 'url',        label: 'URL ile Tarama',                      icon: <Link2 size={15} /> },
    { key: 'scan',       label: 'Multi-Engine Güvenlik Taraması',      icon: <ScanEye size={15} /> },
    { key: 'favicon',    label: 'Favicon & HTML Phishing Taraması',    icon: <ShieldAlert size={15} /> },
    { key: 'ssl',        label: 'SSL / CRT.sh Domain Sorgulama',       icon: <Lock size={15} /> },
    { key: 'fullreport', label: 'Kapsamlı Tehdit Raporu',              icon: <FileText size={15} /> },
]

export default function LogoDetectionDashboard() {
    const [tab, setTab] = useState('detect')
    const [apiBase, setApiBase] = useState(DEFAULT_API_BASE)
    const [isDark, setIsDark] = useState(true)
    const [detectState, setDetectState] = useState(INITIAL_DETECT_STATE)
    const [urlState, setUrlState] = useState(INITIAL_URL_STATE)
    const [scanState, setScanState] = useState(buildInitialScanState)
    const [faviconState, setFaviconState] = useState(buildInitialFaviconState)
    const [sslState, setSslState] = useState(buildInitialSslState)
    const [fullReportState, setFullReportState] = useState(buildInitialFullReportState)

    const detectRef = useRef(detectState)
    const urlRef = useRef(urlState)
    detectRef.current = detectState
    urlRef.current = urlState

    // Tema değiştirme — body.light class'ını toggle et
    useEffect(() => {
        if (isDark) {
            document.body.classList.remove('light')
        } else {
            document.body.classList.add('light')
        }
    }, [isDark])

    // Blob URL'lerini temizle
    useEffect(() => {
        return () => {
            const detect = detectRef.current
            const url = urlRef.current
            if (detect.previewUrl) URL.revokeObjectURL(detect.previewUrl)
            if (detect.resultImg) URL.revokeObjectURL(detect.resultImg)
            if (url.resultImg) URL.revokeObjectURL(url.resultImg)
        }
    }, [])

    // Tüm sekmelerin ayarları değiştiğinde ana localStorage kaydına 24 saatlik TTL ile kaydet
    useEffect(() => {
        lsSave({
            serpKey:           scanState.serpKey,
            vtKey:             scanState.vtKey,
            query:             scanState.query,
            conf:              scanState.conf,
            domains:           scanState.domains,
            sslKeywords:       sslState.keywords,
            sslVtKey:          sslState.vtKey,
            sslScraperKey:     sslState.scraperKey,
            faviconScraperKey: faviconState.scraperKey,
        })
    }, [
        scanState.serpKey, scanState.vtKey, scanState.query, scanState.conf, scanState.domains,
        sslState.keywords, sslState.vtKey, sslState.scraperKey, faviconState.scraperKey
    ])

    return (
        <>
            {/* Custom cursor */}
            <GlowCursor />

            {/* Background orbs */}
            <div className="bg-scene">
                <div className="bg-orb bg-orb-1" />
                <div className="bg-orb bg-orb-2" />
                <div className="bg-orb bg-orb-3" />
            </div>

            <div style={{ minHeight: '100dvh', position: 'relative', zIndex: 1 }}>
                {/* Header */}
                <header className="site-header">
                    <div style={{
                        maxWidth: '1200px', margin: '0 auto',
                        padding: '14px 24px',
                        display: 'flex', flexWrap: 'wrap', alignItems: 'center',
                        justifyContent: 'space-between', gap: '16px',
                    }}>
                        {/* Logo + Title */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div className="header-logo-ring">
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <h1 style={{
                                    fontSize: '1rem', fontWeight: 700, color: '#e8edf8',
                                    lineHeight: 1.25, letterSpacing: '-0.01em',
                                }}>
                                    Logo Tespit &amp; Siber Güvenlik Analiz Paneli
                                </h1>
                                <p style={{ fontSize: '0.78rem', color: '#7986b4', marginTop: '2px' }}>
                                    YOLOv11 tabanlı logo tespiti ve dolandırıcılık sitesi tespiti
                                </p>
                            </div>
                        </div>

                        {/* API Base input */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '34px', height: '34px', borderRadius: '9px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#6b7280',
                            }}>
                                <Server size={15} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <label
                                    htmlFor="api-base"
                                    style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4b5563' }}
                                >
                                    API Adresi
                                </label>
                                <TextInput
                                    id="api-base"
                                    value={apiBase}
                                    onChange={(e) => setApiBase(e.target.value)}
                                    className="input-mono"
                                    style={{ height: '32px', width: '240px', fontSize: '0.78rem' }}
                                    placeholder="http://localhost:8000"
                                />
                            </div>
                        </div>

                        {/* ── Tema Toggle Butonu — bağımsız, her zaman görünür ── */}
                        <button
                            id="theme-toggle"
                            className="theme-toggle-btn"
                            onClick={() => setIsDark((d) => !d)}
                            aria-label={isDark ? 'Açık Moda Geç' : 'Koyu Moda Geç'}
                            title={isDark ? 'Açık Moda Geç' : 'Koyu Moda Geç'}
                        >
                            {isDark
                                ? <Sun size={16} strokeWidth={2} />
                                : <Moon size={16} strokeWidth={2} />}
                        </button>
                    </div>
                </header>

                {/* Main */}
                <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '28px 24px' }}>
                    {/* Tab bar */}
                    <div className="tab-bar" role="tablist" aria-label="Analiz sekmeleri" style={{ marginBottom: '24px' }}>
                        {TABS.map((t) => {
                            const active = tab === t.key
                            return (
                                <button
                                    key={t.key}
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => setTab(t.key)}
                                    className={cn('tab-btn', active && 'active')}
                                >
                                    {t.icon}
                                    <span className="tab-label">{t.label}</span>
                                </button>
                            )
                        })}
                    </div>

                    {tab === 'detect' ? (
                        <DetectTab apiBase={apiBase} state={detectState} setState={setDetectState} />
                    ) : null}
                    {tab === 'url' ? (
                        <UrlTab apiBase={apiBase} state={urlState} setState={setUrlState} />
                    ) : null}
                    {tab === 'scan' ? (
                        <ScanTab apiBase={apiBase} state={scanState} setState={setScanState} />
                    ) : null}
                    {tab === 'favicon' ? (
                        <FaviconTab apiBase={apiBase} state={faviconState} setState={setFaviconState} />
                    ) : null}
                    {tab === 'ssl' ? (
                        <SslTab apiBase={apiBase} state={sslState} setState={setSslState} />
                    ) : null}
                    {tab === 'fullreport' ? (
                        <FullReportTab apiBase={apiBase} state={fullReportState} setState={setFullReportState} />
                    ) : null}
                </main>
            </div>
        </>
    )
}
