import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Route /dineout preserved for backward compatibility.
 * Redirects immediately to canonical Explore Dineout section: /discover?domain=dineout
 */
export default function Dineout() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/discover?domain=dineout", { replace: true });
  }, [setLocation]);

  return null;
}
