import React, { useState } from "react";
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
  const [selectedSlot, setSelectedSlot] = useState("7:30 PM");
  const [selectedGuests, setSelectedGuests] = useState(2);
  const [showFoundationModal, setShowFoundationModal] = useState(false);

  if (!restaurant) return null;

  const dates = [
    { label: "Today", sub: "Oct 2" },
    { label: "Tomorrow", sub: "Oct 3" },
    { label: "Sunday", sub: "Oct 4" },
  ];

  const lunchSlots = ["12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM"];
  const dinnerSlots = ["7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM"];
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
            {restaurant.imageUrl ? (
              <img
                src={restaurant.imageUrl}
                alt={restaurant.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-muted/60 text-muted-foreground">
                <UtensilsCrossed className="h-8 w-8 text-muted-foreground/60 mb-1" />
                <span className="text-xs font-semibold">{restaurant.name}</span>
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
                {restaurant.name}
              </SheetTitle>
              <p className="text-xs text-white/80">{restaurant.cuisine}</p>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="px-4 py-2.5 border-b border-border/70 bg-card flex items-center justify-between text-xs text-muted-foreground shrink-0">
            <div className="flex items-center gap-3">
              {restaurant.rating !== undefined && (
                <span className="flex items-center gap-1 font-bold text-foreground">
                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                  <span>{restaurant.rating}</span>
                </span>
              )}
              <span className="font-semibold text-foreground">
                ₹{restaurant.costForTwo || 1000} for two
              </span>
            </div>

            {restaurant.locality && (
              <div className="flex items-center gap-1 truncate max-w-[150px]">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{restaurant.locality}</span>
              </div>
            )}
          </div>

          {/* Scrollable Content */}
          <ScrollArea className="flex-1 p-5">
            {step === "slots" ? (
              <div className="space-y-6 pb-6 text-left">
                {/* Active Offers */}
                {restaurant.offerText && (
                  <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-2xl flex items-start gap-2.5">
                    <Tag className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-0.5">
                      <span className="font-bold text-amber-800 dark:text-amber-400 block">
                        Special Dining Offer
                      </span>
                      <p className="text-muted-foreground leading-relaxed">
                        {restaurant.offerText}
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

                {/* 3. Available Slots */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span>3. Available Table Slots</span>
                  </label>

                  {/* Lunch */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground block">
                      Lunch Slots
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {lunchSlots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={cn(
                            "py-2 px-1 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer shadow-2xs",
                            selectedSlot === slot
                              ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                              : "bg-card border-border/80 text-foreground hover:bg-muted"
                          )}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dinner */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-muted-foreground block">
                      Dinner Slots
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {dinnerSlots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={cn(
                            "py-2 px-1 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer shadow-2xs",
                            selectedSlot === slot
                              ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                              : "bg-card border-border/80 text-foreground hover:bg-muted"
                          )}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
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
                        {restaurant.name}
                      </h5>
                      <p className="text-muted-foreground">{restaurant.cuisine}</p>
                    </div>
                    {restaurant.rating !== undefined && (
                      <span className="flex items-center gap-1 font-bold text-foreground bg-muted/80 px-2 py-0.5 rounded-md">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        <span>{restaurant.rating}</span>
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
                        <span className="truncate">{restaurant.locality || "Bengaluru"}</span>
                      </span>
                    </div>
                  </div>

                  {restaurant.offerText && (
                    <div className="pt-2 border-t border-border/50 flex items-center gap-2 text-amber-800 dark:text-amber-400 font-semibold">
                      <Tag className="h-3.5 w-3.5 text-amber-600" />
                      <span>{restaurant.offerText}</span>
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
              <PrimaryButton
                onClick={handleProceedToReview}
                className="w-full h-11 text-xs font-bold gap-2 bg-amber-600 hover:bg-amber-700"
              >
                <UtensilsCrossed className="h-4 w-4" />
                <span>Review Reservation ({selectedGuests} Guests • {selectedSlot})</span>
              </PrimaryButton>
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
              <span className="text-foreground">{restaurant.name}</span>
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
