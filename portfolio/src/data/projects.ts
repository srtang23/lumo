// One entry per project. `home` and `work` control where each card appears.
export type Project = {
    slug: string
    href: string
    title: string // Work page card title
    homeTitle?: string // Home grid title, if different
    blurb: string
    image: string
    alt: string
}

export const projects: Project[] = [
    {
        slug: "smn",
        href: "/work/smn",
        title: "Spilt Milk Nannies",
        homeTitle: "Streamlining the Digital Caregiver Workflow",
        blurb: "Redesigning the nanny side of a childcare booking platform to give caregivers more agency.",
        image: "/images/card-smn.jpg",
        alt: "Five phone screens from the Spilt Milk Nannies redesign",
    },
    {
        slug: "pg",
        href: "/work/pg",
        title: "Procter & Gamble",
        blurb: "Research and strategy to shift home scenting from masking odors to creating moments of delight.",
        image: "/images/card-pg.jpg",
        alt: "P&G logo with household products",
    },
    {
        slug: "novera",
        href: "/work/novera",
        title: "Novera",
        blurb: "An AI-assisted contract workspace that speeds up legal review while keeping people in control.",
        image: "/images/card-novera.jpg",
        alt: "Novera contract workspace on a laptop",
    },
    {
        slug: "pitlane",
        href: "/work/pitlane",
        title: "Pitlane",
        blurb: "A real-time analytics product that takes data teams from raw events to decisions in seconds.",
        image: "/images/card-pitlane.jpg",
        alt: "Pitlane analytics dashboard on a tablet",
    },
    {
        slug: "sprout",
        href: "/work/sprout",
        title: "Sprout Redesign",
        blurb: "Rethinking habit tracking for student well-being",
        image: "/images/card-sprout.jpg",
        alt: "Sprout Redesign placeholder thumbnail",
    },
]

// Order on the Work page (Home uses the array order above).
export const workOrder = ["pg", "smn", "novera", "pitlane", "sprout"]

export const links = {
    resume: "https://drive.google.com/file/d/1Mk_Z4-TMrCxXZYJlwGhiEVzxTm4-wct0/view?usp=sharing",
    linkedin: "https://www.linkedin.com/in/sophiatang23",
}
