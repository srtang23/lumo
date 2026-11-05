// Draggable photo scatter for the About page. Click a photo to bring it to the
// centre with its story; click it again, or the background, to go back.
import { useEffect, useLayoutEffect, useRef, useState } from "react"

type Item = { image?: { src: string; alt?: string }; caption: string; x: number; y: number; w: number; h: number }

const DEFAULTS: Item[] = [
    { image: { src: "/images/about/mahjong.jpg", alt: "Mahjong tiles on a table" }, caption: "Mahjong is how my family connects. I love that you only ever see your own tiles, yet you make sense of everyone else’s through the patterns they leave on the table.", x: 9, y: 8, w: 230, h: 130 },
    { image: { src: "/images/about/park.jpg", alt: "Sunlit trees in a park in Vancouver" }, caption: "I love exploring cities through their parks. They offer little glimpses into how people live, connect, and spend their everyday moments. This is one I came across in Vancouver, Canada.", x: 37, y: 4, w: 140, h: 187 },
    { image: { src: "/images/about/graduation.jpg", alt: "Sophia at her University of Washington graduation" }, caption: "I recently graduated from the University of Washington with a degree in Human Centered Design & Engineering, and I’m currently pursuing a master’s in Engineering Design Innovation at Northwestern.", x: 63, y: 6, w: 135, h: 180 },
    { image: { src: "/images/about/night-walk.jpg", alt: "Stray cats around a park bench at night" }, caption: "I have a soft spot for night walks, when the streets grow quiet, familiar places feel a little different, and my thoughts have room to wander. I love having nowhere in particular to be and noticing little things I might otherwise walk past. This is what I spotted one night.", x: 80, y: 26, w: 126, h: 168 },
    { image: { src: "/images/about/barista.jpg", alt: "Sophia laughing behind the counter as a Starbucks barista" }, caption: "My coffee obsession started when I worked as a barista at my campus Starbucks. What started as making drinks for others turned into experimenting with my own little creations. Now, making coffee is one of my favorite parts of the day.", x: 4, y: 38, w: 135, h: 180 },
    { caption: "Placeholder · with friends", x: 15, y: 66, w: 140, h: 165 },
    { caption: "Placeholder · a hike", x: 47, y: 68, w: 150, h: 170 },
    { caption: "Placeholder · a little joy", x: 73, y: 64, w: 125, h: 165 },
]


type Props = {
    intro: string
    hint: string
    items?: Item[]
    textColor?: string
    captionColor?: string
    placeholderColor?: string
    font?: string
    bodyColor?: string
}

// Line-by-line swap: each visual line slides up out of a mask, then the new
// text's lines rise in one after another.
function Lines({ text, width, fontSize, color, lineHeight = 1.5 }: { text: string; width: number; fontSize: number; color: string; lineHeight?: number }) {
    const [shown, setShown] = useState({ text, width, fontSize, lineHeight, color })
    const [phase, setPhase] = useState<"idle" | "out" | "in">("idle")
    const [lines, setLines] = useState<string[]>([])
    const measure = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (text === shown.text && width === shown.width) return
        setPhase("out")
        const t = setTimeout(() => { setShown({ text, width, fontSize, lineHeight, color }); setPhase("in") }, 300 + Math.min(lines.length, 6) * 50)
        return () => clearTimeout(t)
    }, [text, width])

    useLayoutEffect(() => {
        const m = measure.current
        if (!m) return
        const out: string[] = []
        let top: number | null = null, cur = ""
        Array.from(m.children).forEach((el) => {
            const r = (el as HTMLElement).getBoundingClientRect()
            const w = (el.textContent || "")
            if (top === null || Math.abs(r.top - top) < 2) { cur += w } else { out.push(cur.trimEnd()); cur = w }
            top = r.top
        })
        if (cur) out.push(cur.trimEnd())
        setLines(out)
    }, [shown])

    const words = shown.text.split(/(?<=\s)/)
    const lh = shown.fontSize * shown.lineHeight
    return (
        <div style={{ position: "relative", width: shown.width, fontSize: shown.fontSize, lineHeight: shown.lineHeight, color: shown.color, letterSpacing: "0.01em" }}>
            <style>{`@keyframes lnIn{from{opacity:0}to{opacity:1}}@keyframes lnOut{from{opacity:1}to{opacity:0}}`}</style>
            <div ref={measure} aria-hidden style={{ position: "absolute", visibility: "hidden", width: shown.width, left: 0, top: 0 }}>
                {words.map((w, i) => <span key={i}>{w}</span>)}
            </div>
            <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{shown.text}</span>
            {lines.map((ln, i) => (
                <div key={shown.text + i} aria-hidden style={{ height: lh }}>
                    <div style={{
                        whiteSpace: "nowrap", willChange: "transform",
                        animation: phase === "out" ? `lnOut .3s ease ${i * 0.05}s both`
                            : phase === "in" ? `lnIn .6s ease ${0.15 + i * 0.12}s both` : "none",
                    }}>{ln}</div>
                </div>
            ))}
        </div>
    )
}

export default function AboutScatter(props: Props) {
    const { intro, hint, items = [], textColor = "#111111", captionColor = "#8A8A8A", placeholderColor = "#E6E3DC", font = 'var(--sans)', bodyColor = "#666666" } = props
    const list: Item[] = items && items.length ? items : DEFAULTS
    const ref = useRef<HTMLDivElement>(null)
    const [pos, setPos] = useState(list.map((it) => ({ x: it.x, y: it.y })))
    const [z, setZ] = useState(list.map((_, i) => i + 1))
    const [active, setActive] = useState<number | null>(null)
    const drag = useRef<{ i: number; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null)
    const [mobile, setMobile] = useState(false)
    const [size, setSize] = useState({ w: 1200, h: 800 })
    // k follows the site-wide desktop scaling (1rem = 16px below 1200px wide).
    const [k, setK] = useState(1)

    useEffect(() => setPos(list.map((it) => ({ x: it.x, y: it.y }))), [items])
    useEffect(() => {
        const el = ref.current
        if (!el || typeof ResizeObserver === "undefined") return
        const ro = new ResizeObserver(([e]) => { const kk = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1; setK(kk); setMobile(e.contentRect.width / kk < 640); setSize({ w: e.contentRect.width, h: e.contentRect.height }) })
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    const down = (i: number) => (e: React.PointerEvent) => {
        const r = ref.current!.getBoundingClientRect()
        drag.current = { i, sx: e.clientX, sy: e.clientY, ox: (pos[i].x / 100) * r.width, oy: (pos[i].y / 100) * r.height, moved: false }
        setZ((zz) => { const m = Math.max(...zz) + 1; const n = [...zz]; n[i] = m; return n })
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    }
    const move = (e: React.PointerEvent) => {
        const d = drag.current
        if (!d) return
        const dx = e.clientX - d.sx, dy = e.clientY - d.sy
        if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true
        const r = ref.current!.getBoundingClientRect()
        setPos((p) => { const n = [...p]; n[d.i] = { x: ((d.ox + dx) / r.width) * 100, y: ((d.oy + dy) / r.height) * 100 }; return n })
    }
    const up = () => {
        const d = drag.current
        drag.current = null
        if (d && !d.moved) setActive((a) => (a === d.i ? null : d.i))
        if (d && d.moved) setActive(null)
    }

    const scale = (mobile ? 0.62 : 1) * k
    // On narrow screens keep the middle band clear for the intro text.
    const my = (y: number) => (!mobile ? y : y < 45 ? y * 0.55 : 66 + (y - 45) * 0.5)
    const ease = "cubic-bezier(.22,.8,.25,1)"
    const textW = mobile ? Math.min(size.w * 0.84, 340 * k) : 340 * k
    const gap = (mobile ? 16 : 20) * k

    // Where the focused image and its text sit: side by side, centred as a group.
    const focus = (i: number) => {
        const it = list[i]
        const zoom = (mobile ? 0.9 : 1.15) * k
        const w = Math.min(it.w * zoom, mobile ? size.w * 0.7 : 320 * k), h = (it.h / it.w) * w
        if (mobile) return { x: (size.w - w) / 2, y: size.h / 2 - h - 12 * k, w, h, tx: (size.w - textW) / 2, ty: size.h / 2 + 8 * k }
        const total = w + gap + textW
        const x = (size.w - total) / 2, y = (size.h - h) / 2
        return { x, y, w, h, tx: x + w + gap, ty: size.h / 2 }
    }
    const f = active !== null ? focus(active) : null
    const introW = mobile ? Math.min(size.w * 0.84, 340 * k) : 560 * k

    return (
        <div ref={ref} onPointerMove={move} onPointerUp={up} onClick={(e) => { if (e.target === e.currentTarget) setActive(null) }} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", touchAction: "none", fontFamily: font }}>
            <style>{`@keyframes asFade{from{opacity:0;transform:translate(0,calc(-50% + 6px))}to{opacity:1;transform:translate(0,-50%)}}`}</style>
            <div style={{
                position: "absolute",
                left: active === null ? (size.w - introW) / 2 : f!.tx,
                top: active === null ? size.h / 2 : f!.ty,
                transform: active !== null && mobile ? "none" : "translate(0,-50%)",
                pointerEvents: "none", letterSpacing: "0.005em",
                transition: `left .9s ${ease}, top .9s ${ease}`,
            }}>
                <Lines text={active === null ? intro : list[active].caption} width={active === null ? introW : textW} fontSize={(active === null ? (mobile ? 15 : 16) : 14) * k} lineHeight={active === null ? 1.5 : 1.6} color={active === null ? textColor : bodyColor} />
                <p style={{ margin: `${14 * k}px 0 0`, fontSize: 14 * k, lineHeight: 1.5, color: captionColor, letterSpacing: "0.01em", opacity: active === null ? 1 : 0, transition: active === null ? "opacity .5s ease .4s" : "opacity .25s ease", height: active === null ? "auto" : 0 }}>{hint}</p>
            </div>
            {list.map((it, i) => {
                const on = active === i, dim = active !== null && !on
                const base = { x: (pos[i].x / 100) * size.w, y: (my(pos[i].y) / 100) * size.h, w: it.w * scale, h: it.h * scale }
                const r = on ? f! : base
                return (
                    <div
                        key={i}
                        onPointerDown={down(i)}
                        style={{
                            position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h,
                            zIndex: on ? 999 : z[i], cursor: "grab", userSelect: "none",
                            opacity: dim ? 0.4 : 1, filter: dim ? "saturate(.6) blur(1.5px)" : "none",
                            transform: dim ? "scale(.94)" : "none",
                            transition: drag.current?.i === i ? "none" : `left .6s ${ease}, top .6s ${ease}, width .6s ${ease}, height .6s ${ease}, opacity .4s ease, filter .4s ease, transform .4s ease`,
                            background: it.image?.src ? `center/cover url(${it.image.src})` : placeholderColor,
                            boxShadow: "0 1px 2px rgba(0,0,0,.06), 0 10px 24px -12px rgba(0,0,0,.25)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                    >
                        {!it.image?.src && <span style={{ fontSize: 11 * k, color: captionColor, letterSpacing: "0.04em" }}>IMAGE</span>}
                    </div>
                )
            })}
        </div>
    )
}

