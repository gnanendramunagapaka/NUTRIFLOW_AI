import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star,
  Clock,
  MapPin,
  Calendar,
  Users,
  Tag,
  Check,
  X,
  Info,
  UtensilsCrossed,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { DineoutRestaurantData } from "./DineoutRestaurantCard";
import { PrimaryButton, SecondaryButton, Pill } from "@/components/layout/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface DineoutBookingSheetProps {
  restaurant: DineoutRestaurantData | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DineoutBookingSheet({
  restaurant,
  isOpen,
  onClose,
}: DineoutBookingSheetProps) {
  const { toast } = useToast();

  const [step, setStep] = useState<"slots" | "review">("slots");
  const [selectedDate, setSelectedDate] = useState("Today");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [selectedGuests, setSelectedGuests] = useState(2);
  const [showFoundationModal, setShowFoundationModal] = useState(false);

  // 1. Live Restaurant Details via Swiggy Dineout MCP get_restaurant_details
  const { data: detailsData } = useQuery({
    queryKey: ["dineout-restaurant-details", restaurant?.id],
    queryFn: async () => {
      if (!restaurant?.id) return null;
      const res = await fetch("/api/swiggy/mcp/dineout/get_restaurant_details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ restaurant_id: String(restaurant.id) }),
      }).catch(() => null);
      if (!res || !res.ok) return null;
      const json = await res.json().catch(() => null);
      const content = json?.result?.structuredContent ?? json?.structuredContent ?? json?.result ?? json;
      return (content?.restaurant || content) as Record<string, any> | null;
    },
    enabled: isOpen && Boolean(restaurant?.id),
    staleTime: 5 * 60 * 1000,
  });

  // 2. Live Available Slots via Swiggy Dineout MCP get_available_slots
  const { data: mcpSlots, isLoading: isLoadingSlots } = useQuery<string[]>({
    queryKey: ["dineout-available-slots", restaurant?.id, selectedDate],
    queryFn: async () => {
      if (!restaurant?.id) return [];
      const res = await fetch("/api/swiggy/mcp/dineout/get_available_slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          restaurant_id: String(restaurant.id),
          date: selectedDate === "Today" ? undefined : selectedDate,
        }),
      }).catch(() => null);
      if (!res || !res.ok) return [];
      const json = await res.json().catch(() => null);
      const content = json?.result?.structuredContent ?? json?.structuredContent ?? json?.result ?? json;
      const rawSlots = content?.slots || content?.available_slots || content?.availableSlots || (Array.isArray(content) ? content : []);
      return Array.isArray(rawSlots) ? rawSlots.map(String).filter(Boolean) : [];
    },
    enabled: isOpen && Boolean(restaurant?.id),
    staleTime: 60 * 1000,
  });

  // Effective available slots from live MCP, or fallback to restaurant card metadata
  const effectiveSlots: string[] = useMemo(() => {
    if (mcpSlots && mcpSlots.length > 0) return mcpSlots;
    if (Array.isArray((restaurant as any)?.availableSlots) && (restaurant as any).availableSlots.length > 0) {
      return (restaurant as any).availableSlots;
    }
    return [];
  }, [mcpSlots, restaurant]);

  const hasSlots = effectiveSlots.length > 0;

  // Auto-select first real slot if available
  useEffect(() => {
    if (hasSlots) {
      if (!selectedSlot || !effectiveSlots.includes(selectedSlot)) {
        setSelectedSlot(effectiveSlots[0]);
      }
    } else {
      setSelectedSlot("");
    }
  }, [hasSlots, effectiveSlots, selectedSlot]);

  if (!restaurant) return null;

  // Real merged details
  const effectiveName = detailsData?.name || restaurant.name;
  const effectiveCuisine =
    (Array.isArray(detailsData?.cuisine)
      ? detailsData?.cuisine.join(", ")
      : detailsData?.cuisine) || restaurant.cuisine;
  const effectiveRating = detailsData?.avg_rating ?? detailsData?.rating ?? restaurant.rating;
  const effectiveCostForTwo = detailsData?.costForTwo ?? detailsData?.cost_for_two ?? restaurant.costForTwo;
  const effectiveLocality = detailsData?.locality ?? detailsData?.location ?? restaurant.locality;
  const effectiveImageUrl = detailsData?.imageUrl ?? detailsData?.image ?? restaurant.imageUrl;
  const effectiveOfferText =
    (Array.isArray(detailsData?.offers) ? detailsData?.offers[0] : detailsData?.offers) ||
    restaurant.offerText;

  const dates = [
    { label: "Today", sub: "Today" },
    { label: "Tomorrow", sub: "Tomorrow" },
    { label: "Upcoming", sub: "Later" },
  ];

  const guestOptions = [1, 2, 4, 6, 8];

  const handleProceedToReview = () => {
    setStep("review");
  };

  const handleContinueBooking = () => {
    setShowFoundationModal(true);
  };

  const handleSheetClose = () => {
    setStep("slots");
    onClose();
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && handleSheetClose()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg p-0 flex flex-col bg-background"
        >
          {/* Banner Image */}
          <div className="relative aspect-[16/9] bg-muted shrink-0 overflow-hidden">
            {effectiveImageUrl ? (
              <img
                src={effectiveImageUrl}
                alt={effectiveName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-muted/60 text-muted-foreground">
                <UtensilsCrossed className="h-8 w-8 text-muted-foreground/60 mb-1" />
                <span className="text-xs font-semibold">{effectiveName}</span>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20" />

            {/* Close button */}
            <button
              type="button"
              onClick={handleSheetClose}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
              aria-label="Close restaurant details"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Back button if in review step */}
            {step === "review" && (
              <button
                type="button"
                onClick={() => setStep("slots")}
                className="absolute top-3 left-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                aria-label="Back to slot selection"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Slots</span>
              </button>
            )}

            {/* Header text */}
            <div className="absolute bottom-3 left-4 right-4 text-white space-y-1">
              <span className="text-[10px] font-bold text-white bg-amber-600/90 px-2 py-0.5 rounded-md inline-flex items-center gap-1 shadow-xs">
                ⚡ Powered by Swiggy Dineout
              </span>
              <SheetTitle className="text-lg sm:text-xl font-extrabold text-white leading-tight">
                {effectiveName}
              </SheetTitle>
              <p className="text-xs text-white/80">{effectiveCuisine}</p>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="px-4 py-2.5 border-b border-border/70 bg-card flex items-center justify-between text-xs text-muted-foreground shrink-0">
            <div className="flex items-center gap-3">
              {effectiveRating !== undefined && (
                <span className="flex items-center gap-1 font-bold text-foreground">
                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                  <span>{effectiveRating}</span>
                </span>
              )}
              {effectiveCostForTwo != null && Number(effectiveCostForTwo) > 0 && (
                <span className="font-semibold text-foreground">
                  ₹{effectiveCostForTwo} for two
                </span>
              )}
            </div>

            {effectiveLocality && (
              <div className="flex items-center gap-1 truncate max-w-[150px]">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{effectiveLocality}</span>
              </div>
            )}
          </div>

          {/* Scrollable Content */}
          <ScrollArea className="flex-1 p-5">
            {step === "slots" ? (
              <div className="space-y-6 pb-6 text-left">
                {/* Active Offers */}
                {effectiveOfferText && (
                  <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-2xl flex items-start gap-2.5">
                    <Tag className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-0.5">
                      <span className="font-bold text-amber-800 dark:text-amber-400 block">
                        Special Dining Offer
                      </span>
                      <p className="text-muted-foreground leading-relaxed">
                        {effectiveOfferText}
                      </p>
                    </div>
                  </div>
                )}

                {/* 1. Date Selector */}
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span>1. Select Date</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {dates.map((d) => (
                      <button
                        key={d.label}
                        type="button"
                        onClick={() => setSelectedDate(d.label)}
                        className={cn(
                          "p-2.5 rounded-xl border text-center transition-all cursor-pointer shadow-2xs",
                          selectedDate === d.label
                            ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                            : "bg-card border-border/80 text-foreground hover:bg-muted"
                        )}
                      >
                        <span className="block text-xs font-bold">{d.label}</span>
                        <span className="block text-[10px] text-muted-foreground">{d.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Number of Guests */}
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span>2. Number of Guests</span>
                  </label>
                  <div className="flex gap-2">
                    {guestOptions.map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setSelectedGuests(num)}
                        className={cn(
                          "flex-1 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs",
                          selectedGuests === num
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-card border-border/80 text-foreground hover:bg-muted"
                        )}
                      >
                        {num} {num === 1 ? "Guest" : "Guests"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Available Slots (or Walk-in Only Partner) */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span>3. Available Table Slots</span>
                  </label>

                  {isLoadingSlots ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      <Skeleton className="h-9 w-full rounded-xl" />
                      <Skeleton className="h-9 w-full rounded-xl" />
                      <Skeleton className="h-9 w-full rounded-xl" />
                      <Skeleton className="h-9 w-full rounded-xl" />
                    </div>
                  ) : hasSlots ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {effectiveSlots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={cn(
                            "py-2 px-1 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer shadow-2xs text-center",
                            selectedSlot === slot
                              ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                              : "bg-card border-border/80 text-foreground hover:bg-muted"
                          )}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-muted/40 border border-border/80 p-4 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                        <UtensilsCrossed className="h-4 w-4 text-amber-600" />
                        <span>Walk-in Only Partner</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        This restaurant currently accepts walk-in dining without online table booking slots through Swiggy Dineout.
                      </p>
                    </div>
                  )}
                </div>

                {/* Informative Disclaimer */}
                <div className="p-3.5 bg-muted/40 rounded-2xl border border-border/70 text-xs text-muted-foreground flex items-start gap-2.5">
                  <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Table availability foundation preview. Dineout reservation booking and instant table confirmation will be enabled in Phase 2. No fees or charges applied.
                  </p>
                </div>
              </div>
            ) : (
              /* Step 2: Booking Review UI */
              <div className="space-y-5 pb-6 text-left">
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-foreground">
                    Review Reservation Details
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Check your dining details before continuing.
                  </p>
                </div>

                {/* Reservation Summary Card */}
                <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-3.5 text-xs">
                  <div className="flex justify-between items-start pb-2.5 border-b border-border/50">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Restaurant
                      </span>
                      <h5 className="text-sm font-bold text-foreground mt-0.5">
                        {effectiveName}
                      </h5>
                      <p className="text-muted-foreground">{effectiveCuisine}</p>
                    </div>
                    {effectiveRating !== undefined && (
                      <span className="flex items-center gap-1 font-bold text-foreground bg-muted/80 px-2 py-0.5 rounded-md">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        <span>{effectiveRating}</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-[10px] text-muted-foreground font-semibold block">Date</span>
                      <span className="font-bold text-foreground text-sm flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        {selectedDate}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground font-semibold block">Time Slot</span>
                      <span className="font-bold text-foreground text-sm flex items-center gap-1 mt-0.5">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        {selectedSlot}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
                    <div>
                      <span className="text-[10px] text-muted-foreground font-semibold block">Party Size</span>
                      <span className="font-bold text-foreground text-sm flex items-center gap-1 mt-0.5">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        {selectedGuests} {selectedGuests === 1 ? "Guest" : "Guests"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground font-semibold block">Location</span>
                      <span className="font-bold text-foreground text-sm flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate">{effectiveLocality || "Local Venue"}</span>
                      </span>
                    </div>
                  </div>

                  {effectiveOfferText && (
                    <div className="pt-2 border-t border-border/50 flex items-center gap-2 text-amber-800 dark:text-amber-400 font-semibold">
                      <Tag className="h-3.5 w-3.5 text-amber-600" />
                      <span>{effectiveOfferText}</span>
                    </div>
                  )}
                </div>

                {/* Phase 1 Controlled Notice */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Info className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Phase 1 Reservation Foundation</span>
                  </div>
                  <p className="leading-relaxed">
                    This step previews the Dineout reservation review flow. Live table booking confirmation and Swiggy table management will be connected in the transaction phase.
                  </p>
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Footer Action */}
          <div className="p-4 border-t border-border/70 bg-background/95 backdrop-blur-xs">
            {step === "slots" ? (
              hasSlots ? (
                <PrimaryButton
                  onClick={handleProceedToReview}
                  disabled={!selectedSlot}
                  className="w-full h-11 text-xs font-bold gap-2 bg-amber-600 hover:bg-amber-700"
                >
                  <UtensilsCrossed className="h-4 w-4" />
                  <span>Review Reservation ({selectedGuests} Guests • {selectedSlot})</span>
                </PrimaryButton>
              ) : (
                <SecondaryButton
                  disabled
                  className="w-full h-11 text-xs font-bold gap-2 opacity-70 cursor-not-allowed"
                >
                  <UtensilsCrossed className="h-4 w-4" />
                  <span>Walk-in Partner Only (No Online Slots)</span>
                </SecondaryButton>
              )
            ) : (
              <PrimaryButton
                onClick={handleContinueBooking}
                className="w-full h-11 text-xs font-bold gap-2 bg-amber-600 hover:bg-amber-700"
              >
                <Check className="h-4 w-4" />
                <span>Continue to Booking</span>
              </PrimaryButton>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Controlled Phase 1 Foundation Modal */}
      <Dialog open={showFoundationModal} onOpenChange={setShowFoundationModal}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto">
            <UtensilsCrossed className="h-6 w-6" />
          </div>

          <DialogHeader className="text-center sm:text-center space-y-1.5">
            <DialogTitle className="text-lg font-bold text-foreground">
              Booking Foundation Complete
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Booking foundation complete. Real Dineout reservation will be connected in the transaction phase.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted/40 p-3.5 rounded-2xl text-xs space-y-1 text-left border border-border/60">
            <div className="flex justify-between font-semibold">
              <span className="text-muted-foreground">Restaurant:</span>
              <span className="text-foreground">{effectiveName}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-muted-foreground">Time & Guests:</span>
              <span className="text-foreground">{selectedDate}, {selectedSlot} ({selectedGuests} guests)</span>
            </div>
          </div>

          <DialogFooter className="sm:justify-center">
            <Button
              type="button"
              onClick={() => {
                setShowFoundationModal(false);
                handleSheetClose();
              }}
              className="rounded-xl px-6 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs"
            >
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
