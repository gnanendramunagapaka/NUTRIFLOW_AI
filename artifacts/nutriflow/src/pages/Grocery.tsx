import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Route /grocery preserved for backward compatibility.
 * Redirects immediately to canonical Explore Instamart section: /discover?domain=instamart
 */
export default function Grocery() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/discover?domain=instamart", { replace: true });
  }, [setLocation]);

  return null;
}
