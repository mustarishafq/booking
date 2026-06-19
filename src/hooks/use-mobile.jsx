import * as React from "react"

const MOBILE_BREAKPOINT = 768
const COMPACT_NAV_BREAKPOINT = 1024

function useMediaQuery(maxWidth) {
  const [matches, setMatches] = React.useState(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${maxWidth - 1}px)`)
    const onChange = () => {
      setMatches(window.innerWidth < maxWidth)
    }
    mql.addEventListener("change", onChange)
    setMatches(window.innerWidth < maxWidth)
    return () => mql.removeEventListener("change", onChange)
  }, [maxWidth])

  return !!matches
}

export function useIsMobile() {
  return useMediaQuery(MOBILE_BREAKPOINT)
}

/** Mobile + tablet: compact user dock (profile hidden in dock for user role) */
export function useCompactNav() {
  return useMediaQuery(COMPACT_NAV_BREAKPOINT)
}
