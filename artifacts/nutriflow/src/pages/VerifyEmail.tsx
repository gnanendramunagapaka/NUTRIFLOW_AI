import { useEffect } from "react";
import { useLocation } from "wouter";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/login");
  }, [setLocation]);

  return null;
}
