// InReal Animation System
// Premium easing: fast attack, gentle settle (Apple-style)
// Duration: 0.6–1.0s for section reveals, 0.3–0.4s for micro-interactions

export const EASE_PREMIUM = [0.22, 1, 0.36, 1]
export const EASE_SMOOTH = [0.16, 1, 0.3, 1]
export const EASE_BOUNCE = [0.34, 1.56, 0.64, 1]

// Fade up — the workhorse reveal animation
export const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: EASE_PREMIUM },
  },
}

// Fade in — no translate, just opacity
export const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3, ease: EASE_PREMIUM },
  },
}

// Scale up from slightly smaller
export const scaleUp = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: EASE_PREMIUM },
  },
}

// Slide in from left
export const slideLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: EASE_PREMIUM },
  },
}

// Slide in from right
export const slideRight = {
  hidden: { opacity: 0, x: 60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: EASE_PREMIUM },
  },
}

// Container for staggered children
export const staggerContainer = (staggerDelay = 0.1) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
      delayChildren: 0.1,
    },
  },
})

// Stagger item (child of staggerContainer)
export const staggerItem = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: EASE_PREMIUM },
  },
}

// Card hover effect
export const cardHover = {
  rest: {
    scale: 1,
    y: 0,
    transition: { duration: 0.3, ease: EASE_SMOOTH },
  },
  hover: {
    scale: 1.02,
    y: -4,
    transition: { duration: 0.3, ease: EASE_SMOOTH },
  },
}

// Number counter spring
export const counterSpring = {
  type: 'spring',
  stiffness: 60,
  damping: 20,
  mass: 1,
}

// Page section viewport trigger settings
export const sectionViewport = {
  once: true,
  amount: 0.15,
  margin: '-50px',
}

// Navigation animation
export const navSlide = {
  hidden: { y: -100, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: EASE_PREMIUM },
  },
}

// Hero text stagger (character by character feel)
export const heroTextReveal = {
  hidden: { opacity: 0, y: 60, skewY: 3 },
  visible: {
    opacity: 1,
    y: 0,
    skewY: 0,
    transition: { duration: 0.8, ease: EASE_PREMIUM },
  },
}

// Teal line draw animation
export const lineGrow = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 1, ease: EASE_PREMIUM, delay: 0.3 },
  },
}
